pragma solidity >=0.6.1;

import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";

import "./HEOGlobalParameters.sol";
import "./HEOToken.sol";
import "./HEOPriceOracle.sol";

contract HEOPublicSale is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;
    using SafeERC20 for HEOToken;

    HEOPriceOracle private _priceOracle;
    HEOGlobalParameters private _globalParams;
    address private _currency; //Address of the token accepted for payment
    event TokensSold(address indexed buyer, uint256 amount, uint256 cost);

    constructor(address currency, HEOPriceOracle priceOracle, HEOGlobalParameters globalParams) public {
        require(currency != address(0), "HEOPublicSale: currency should not be zero-address.");
        _currency = currency;
        _priceOracle = priceOracle;
        _globalParams = globalParams;
    }

    /**
    amount is expected in full tokens rather than token bits
    */
    function sellTokens(uint16 amount) public nonReentrant {
        require(amount >= 1, "HEOPublicSale: cannot sell less than a full token.");
        uint256 tokenPrice = _priceOracle.getPrice(_currency);
        require(tokenPrice > 0, "HEOPublicSale: HEO price cannot be 0.");
        uint256 cost = uint256(amount).mul(tokenPrice);
        ERC20 paymentToken = ERC20(_currency);
        paymentToken.safeTransferFrom(_msgSender(), owner(), cost);
        uint8 decimals = HEOToken(_globalParams.heoToken()).decimals();
        uint256 amountInTokenBits = uint256(amount).mul(uint256(10)**uint256(decimals));
        HEOToken(_globalParams.heoToken()).safeTransfer(_msgSender(), amountInTokenBits);
        emit TokensSold(_msgSender(), amountInTokenBits, cost);
    }

    /**
    * Address of the token accepted by this sale
    */
    function currency() external view returns (address) {
        return _currency;
    }
}
