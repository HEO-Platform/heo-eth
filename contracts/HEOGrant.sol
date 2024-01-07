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
import "./HEODAO.sol";
import "./HEOLib.sol";

contract HEOGrant is IHEOBudget, Context, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;
    struct Grant {
        bytes32 key;
        uint256 amount; //amount granted
        address token; //currency token
        address grantee; //address that will receive vested tokens
        uint256 vesting_start_ts; //vesting commencement timestamp
        uint256 termination_ts; //date when vesting stops. This is to be used to terminate a vesting contract
        uint256 claimed; //how much HEO have been claimed
        uint256 vestingSeconds; //duration of vesting in seconds
    }

    address payable private _owner;
    address public treasurer;
    uint256 public tge; //timestamp for TGE
    HEODAO _dao;

    mapping(address => uint256) public tokensClaimed; //how much have been claimed by token address
    mapping(address => uint256) public tokensGranted; //how much have been granted by token address
    mapping(bytes32 => Grant) private grants;
    mapping(address => bytes32[]) private _grantsByGrantee; //maps grantees to grants

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
    * @dev Throws if called by any account other than the owner.
    */
    modifier onlyOwner() {
        require(_owner == _msgSender(), "HEOGrant: caller is not the owner");
        _;
    }


    modifier onlyTreasurer() {
        require(treasurer == _msgSender(), "HEOGrant: caller is not the treasurer");
        _;
    }

    constructor(HEODAO dao) public {
        require(address(dao) != address(0), "DAO cannot be a zero address");
        _dao = dao;
        emit OwnershipTransferred(address(0), address(dao));
        _owner = payable(address(dao));
    }

    function vestedAmount(bytes32 key, uint256 toDate) public view returns (uint256) {
        require(grants[key].amount > 0, "HEOGrant: this grant has zero amount");
        uint256 endDate = toDate;
        if(endDate == 0) {
            endDate = block.timestamp;
        }
        if(tge == 0 || endDate < tge) {
            return 0;
        }

        //before vesting starts - return 0
        if(grants[key].vesting_start_ts >= endDate) {
            return 0;
        }
        uint256 vestingStartTS = Math.max(tge, grants[key].vesting_start_ts);
        uint256 vestingEnd = grants[key].vestingSeconds.add(vestingStartTS);

        //check if vesting was terminated early
        if(grants[key].termination_ts > 0 && grants[key].termination_ts < vestingEnd) {
            vestingEnd = grants[key].termination_ts;
        }

        if(endDate > vestingEnd) {
            endDate = vestingEnd;
        }

        return grants[key].amount.mul(endDate.sub(vestingStartTS)).div(grants[key].vestingSeconds);
    }

    function grantAmount(bytes32 key) external view returns(uint256) {
        return grants[key].amount;
    }

    function grantToken(bytes32 key) external view returns(address) {
        return grants[key].token;
    }

    function grantVestingSeconds(bytes32 key) external view returns(uint256) {
        return grants[key].vestingSeconds;
    }
    function grantVestingStart(bytes32 key) external view returns(uint256) {
        if(tge == 0) {
            return 0;
        }
        return Math.max(tge, grants[key].vesting_start_ts);
    }
    function grantsByGrantee(address grantee) external view returns (bytes32[] memory) {
        return _grantsByGrantee[grantee];
    }

    function claimedFromGrant(bytes32 key) public view returns (uint256) {
        return grants[key].claimed;
    }

    function remainsInGrant(bytes32 key) public view returns (uint256) {
        return vestedAmount(key, block.timestamp).sub(grants[key].claimed);
    }

    function claim(address destination, bytes32 key, uint256 amount) public {
        Grant storage grant = grants[key];
        require(grant.grantee == _msgSender(), "HEOGrant: caller is not the grantee");
        uint256 unClaimed = vestedAmount(key, block.timestamp).sub(grant.claimed);
        require(unClaimed >= amount, "HEOGrant: claim exceeds vested equity");
        if(amount == 0) {
            //claim the remainder
            amount = unClaimed;
        }
        require(amount > 0, "HEOGrant: no vested equity to claim");
        grant.claimed = grant.claimed.add(amount); //update claimed amount in the grant
        tokensClaimed[grant.token] = tokensClaimed[grant.token].add(amount); //update total claimed amount
        ERC20(grant.token).safeTransfer(destination, amount);
    }

    /**
    * Treasurer's methods
    */
    function setTGE(uint256 _tge) external onlyTreasurer {
        tge = _tge;
    }

    function createGrant(address grantee, uint256 amount, uint256 commencementTs, uint256 vestingSeconds, address token) external onlyTreasurer {
        bytes32 key = keccak256(abi.encodePacked(_msgSender(), amount, block.timestamp));
        require(grants[key].amount == 0, "HEOGrant: grant already exists");

        Grant memory grant;
        grant.key = key;
        grant.claimed = 0;
        grant.amount = amount; //amount granted
        grant.token = token; //vesting token
        grant.grantee = grantee; //address that will receive vested tokens
        grant.vesting_start_ts = commencementTs; //vesting commencement timestamp
        grant.vestingSeconds = vestingSeconds; //duration of vesting in seconds
        grant.termination_ts = 0;

        grants[key] = grant;
        _grantsByGrantee[grantee].push(key);
        tokensGranted[token] = tokensGranted[token].add(amount);
    }

    function terminateGrant(bytes32 key, uint256 termination_ts) external onlyTreasurer {
        grants[key].termination_ts = termination_ts;
        //reduce total granted amount of tokens by how much tokens are being un-granted
        uint256 vestableAmount = vestedAmount(key, termination_ts);
        uint256 amountToTerminate = grants[key].amount.sub(vestableAmount);
        tokensGranted[grants[key].token] = tokensGranted[grants[key].token].sub(amountToTerminate);
        grants[key].termination_ts = termination_ts;
    }


    /**
    * HEOBudget methods
    */
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
        ERC20(_token).safeTransferFrom(_msgSender(), address(this), _amount);
    }

    function assignTreasurer(address _treasurer) external override onlyOwner {
        require(_treasurer != address(0), "HEOGrant: _treasurer cannot be zero address");
        treasurer = _treasurer;
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
}
