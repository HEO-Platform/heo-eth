// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import "./IHEORewardFarm.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./IHEOPriceOracle.sol";
import "./IHEOCampaign.sol";
import "./IHEOCampaignRegistry.sol";
import "./HEODAO.sol";
import "./HEOLib.sol";

contract HEORewardFarm is IHEORewardFarm, Context {
    using SafeERC20 for ERC20;
    struct Donation {
        bytes32 key;
        uint256 amount; //amount donated
        address token; //currency token
        address donor; //who donated
        address campaign; //campaign for which the donation is made
        uint256 ts; //timestamp when donation was made
        uint256 reward; //how much HEO this donation will earn
        uint256 claimed; //how much HEO have been claimed
        uint256 vestEndTs;
    }

    uint256 private _unassignedBalance; //balance of reward tokens that has not been assigned to donations yet

    mapping(bytes32 => Donation) private _donations;
    mapping(address => bytes32[]) private _donationsByDonor;
    mapping(address => bytes32[]) private _donationsByCampaign;
    uint256 public totalDonations;

    HEODAO _dao;

    address payable private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event DonationReceived(address indexed campaign, address indexed donor, uint256 indexed amount);

    /**
    * @dev Throws if called by any account other than the owner.
    */
    modifier onlyOwner() {
        require(_owner == _msgSender(), "HEORewardFarm: caller is not the owner");
        _;
    }

    constructor(HEODAO dao) public {
        require(address(dao) != address(0), "DAO cannot be a zero address");
        _dao = dao;
        emit OwnershipTransferred(address(0), address(dao));
        _owner = payable(address(dao));
    }

    function addDonation(address donor, uint256 amount, address token) external override {
        IHEOCampaignRegistry registry = IHEOCampaignRegistry(_dao.heoParams().contractAddress(HEOLib.CAMPAIGN_REGISTRY));
        require(registry.getOwner(_msgSender()) != address(0), "HEORewardFarm: campaign is not registered");
        require(amount > 0, "HEORewardFarm: amount has to be greater than zero");
        (uint256 heoPrice, uint256 priceDecimals) = IHEOPriceOracle(_dao.heoParams().contractAddress(HEOLib.PRICE_ORACLE)).getPrice(token);
        uint256 reward = _fullReward(amount, heoPrice, priceDecimals);
        bytes32 key = keccak256(abi.encodePacked(donor, amount, _msgSender(), block.timestamp));
        //check if there is already an identical donation in this block
        require(_donations[key].amount == 0, "HEORewardFarm: please wait until next block to make the next donation");
        Donation memory donation;
        donation.key = key;
        donation.amount = amount;
        donation.token = token;
        donation.donor = donor;
        donation.campaign = _msgSender();
        donation.ts = block.timestamp;
        donation.reward = reward;
        donation.vestEndTs = block.timestamp + (_dao.heoParams().intParameterValue(HEOLib.DONATION_VESTING_SECONDS));

        _donations[key] = donation;
        _donationsByDonor[donor].push(key);
        _donationsByCampaign[_msgSender()].push(key);
        if(_unassignedBalance > reward) {
            _unassignedBalance = _unassignedBalance - (reward);
        } else {
            _unassignedBalance = 0;
        }
        totalDonations = totalDonations + (1);
        emit DonationReceived(_msgSender(), donor, amount);
    }

    function _fullReward(uint256 amount, uint256 heoPrice, uint256 priceDecimals) internal view returns(uint256) {
        uint256 donationYieldDecimals = _dao.heoParams().intParameterValue(HEOLib.DONATION_YIELD_DECIMALS);
        return amount * (_currentX()) / (donationYieldDecimals) / (heoPrice) * (priceDecimals);
    }

    function _currentX() internal view returns(uint256) {
        uint256 donationYield = _dao.heoParams().intParameterValue(HEOLib.DONATION_YIELD);
        return _unassignedBalance / (donationYield);
    }

    function fullReward(uint256 amount, uint256 heoPrice, uint256 priceDecimals) external view override returns(uint256) {
        return _fullReward(amount, heoPrice, priceDecimals);
    }

    function donationReward(bytes32 key) public view returns (uint256) {
        return _donations[key].reward;
    }

    function vestedReward(bytes32 key) public view returns (uint256) {
        if(block.timestamp >= _donations[key].vestEndTs) {
            return _donations[key].reward;
        }
        return _donations[key].reward / (_donations[key].vestEndTs - (_donations[key].ts)) * (block.timestamp - _donations[key].ts);
    }

    function unassignedBalance() external view returns(uint256) {
        return _unassignedBalance;
    }

    function getDonationAmount(bytes32 key) external view returns(uint256) {
        return _donations[key].amount;
    }

    function getDonationCampaign(bytes32 key) external view returns(address) {
        return _donations[key].campaign;
    }

    function getDonationToken(bytes32 key) external view returns(address) {
        return _donations[key].token;
    }

    function donorsDonations(address donor) external view returns (bytes32[] memory) {
        return _donationsByDonor[donor];
    }
    function cmapaignDonations(address campaign) external view returns (uint256) {
        return _donationsByCampaign[campaign].length;
    }
    function claimedReward(bytes32 key) public view returns (uint256) {
        return _donations[key].claimed;
    }

    function claimReward(address destination, bytes32 key, uint256 amount) public {
        Donation storage donation = _donations[key];
        require(donation.donor == _msgSender(), "HEORewardFarm: caller is not the donor");
        uint256 newClaimed = donation.claimed + (amount);
        require(newClaimed <= vestedReward(key), "HEORewardFarm: claim exceeds vested reward");
        donation.claimed = newClaimed;
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
        "Reward farm accepts only platform token");
        ERC20(_token).safeTransferFrom(_msgSender(), address(this), _amount);
        _unassignedBalance = _unassignedBalance + (_amount);
    }

    function assignTreasurer(address _treasurer) external override onlyOwner {
        // do nothing
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

