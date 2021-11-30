// SPDX-License-Identifier: MIT
pragma solidity >=0.6.1;

import "openzeppelin-solidity/contracts/math/Math.sol";
import "openzeppelin-solidity/contracts/GSN/Context.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "./IHEOPriceOracle.sol";
import "./IHEOCampaign.sol";
import "./IHEOCampaignRegistry.sol";
import "./HEODAO.sol";
import "./HEOLib.sol";

contract HEOSale is IHEOBudget, Context, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;
    struct Sale {
        bytes32 key;
        uint256 amount; //amount donated
        address token; //currency token
        address investor; //who donated
        uint256 ts; //timestamp when sale was made
        uint256 equity; //how much HEO this investor will get
        uint256 claimed; //how much HEO have been claimed
        uint256 vestEndTs;
    }

    mapping(bytes32 => Sale) private _sales;
    mapping(address => bytes32[]) private _salesByInvestor;
    uint256 public totalSales;
    uint256 public totalRaised;
    uint256 public unsoldBalance; //balance of equity tokens that has not been assigned to sales yet
    address public acceptedToken;
    address public treasurer;
    HEODAO _dao;

    address payable private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event InvestmentReceived(address indexed investor, uint256 indexed amount, uint256 indexed equity);

    /**
    * @dev Throws if called by any account other than the owner.
    */
    modifier onlyOwner() {
        require(_owner == _msgSender(), "HEOSale: caller is not the owner");
        _;
    }

    constructor(HEODAO dao) public {
        require(address(dao) != address(0), "DAO cannot be a zero address");
        _dao = dao;
        emit OwnershipTransferred(address(0), address(dao));
        _owner = payable(address(dao));
    }

    function calculateEquity(uint256 amount, address token) external view returns (uint256) {
        (uint256 heoPrice, uint256 priceDecimals) = IHEOPriceOracle(_dao.heoParams().contractAddress(HEOLib.PRICE_ORACLE)).getPrice(token);
        uint256 equity = amount.div(heoPrice).mul(priceDecimals);
        return equity;
    }

    function sell(uint256 amount) external nonReentrant {
        require(amount > 0, "HEOSale: amount has to be greater than zero");
        require(acceptedToken != address(0), "HEOSale: aceptedToken is not set");
        (uint256 heoPrice, uint256 priceDecimals) = IHEOPriceOracle(_dao.heoParams().contractAddress(HEOLib.PRICE_ORACLE)).getPrice(acceptedToken);
        require(heoPrice > 0, "HEOSale: HEO price is not set acceptedToken");
        uint256 equity = amount.div(heoPrice).mul(priceDecimals);
        require(unsoldBalance >= equity, "HEOSale: not enough HEO to sell");

        bytes32 key = keccak256(abi.encodePacked(_msgSender(), amount, block.timestamp));
        require(_sales[key].amount == 0, "HEOSale: please wait until next block to make the next investment");

        Sale memory sale;
        sale.key = key;
        sale.amount = amount;
        sale.token = acceptedToken;
        sale.investor = _msgSender();
        sale.ts = block.timestamp;
        sale.equity = equity;
        sale.vestEndTs = block.timestamp.add(_dao.heoParams().intParameterValue(HEOLib.INVESTMENT_VESTING_SECONDS));

        _sales[key] = sale;
        _salesByInvestor[_msgSender()].push(key);

        unsoldBalance = unsoldBalance.sub(equity);
        totalSales = totalSales.add(1);
        totalRaised = totalRaised.add(amount);
        ERC20 paymentToken = ERC20(acceptedToken);
        paymentToken.safeTransferFrom(_msgSender(), address(_dao), amount);
        emit InvestmentReceived(_msgSender(), amount, equity);
    }

    function saleEquity(bytes32 key) public view returns (uint256) {
        return _sales[key].equity;
    }

    function vestedEquity(bytes32 key) public view returns (uint256) {
        if(block.timestamp >= _sales[key].vestEndTs) {
            return _sales[key].equity;
        }
        return _sales[key].equity.div(_sales[key].vestEndTs.sub(_sales[key].ts)).mul(block.timestamp - _sales[key].ts);
    }

    function getSaleAmount(bytes32 key) external view returns(uint256) {
        return _sales[key].amount;
    }

    function getSaleToken(bytes32 key) external view returns(address) {
        return _sales[key].token;
    }

    function investorsSales(address investor) external view returns (bytes32[] memory) {
        return _salesByInvestor[investor];
    }

    function claimedEquity(bytes32 key) public view returns (uint256) {
        return _sales[key].claimed;
    }

    function claimEquity(address destination, bytes32 key, uint256 amount) public {
        Sale storage sale = _sales[key];
        require(sale.investor == _msgSender(), "HEOSale: caller is not the investor");
        uint256 newClaimed = sale.claimed.add(amount);
        require(newClaimed <= vestedEquity(key), "HEOSale: claim exceeds vested equity");
        sale.claimed = newClaimed;
        ERC20(_dao.heoParams().contractAddress(HEOLib.PLATFORM_TOKEN_ADDRESS)).safeTransfer(destination, amount);
    }

    /**
    @dev withdraw funds back to DAO
    */
    function withdraw(address _token) external override onlyOwner {
        ERC20 token = ERC20(_token);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "token balance is zero");
        if(balance > 0) {
            token.safeTransfer(address(_dao), balance);
        }
    }

    function replenish(address _token, uint256 _amount) external override onlyOwner {
        require(_token == _dao.heoParams().contractAddress(HEOLib.PLATFORM_TOKEN_ADDRESS),
        "Private Sale accepts only platform token as equity");
        ERC20(_token).safeTransferFrom(_msgSender(), address(this), _amount);
        unsoldBalance = unsoldBalance.add(_amount);
    }

    function assignTreasurer(address _treasurer) external override onlyOwner {
        require(_treasurer != address(0), "HEOSale: _treasurer cannot be zero address");
        treasurer = _treasurer;
    }

    modifier onlyTreasurer() {
        require(treasurer == _msgSender(), "HEOSale: caller is not the treasurer");
        _;
    }

    /**
    * @dev Transfers ownership of the contract to a new account (`newOwner`).
    * Can only be called by the current owner.
     */
    function transferOwnership(address payable newOwner) public override onlyOwner {
        require(newOwner != address(0), "owner cannot be a zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    function setAcceptedToken(address _token) external onlyTreasurer {
        acceptedToken = _token;
    }
}

