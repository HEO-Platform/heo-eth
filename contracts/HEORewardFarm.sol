pragma solidity >=0.6.1;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/math/Math.sol";
import "openzeppelin-solidity/contracts/GSN/Context.sol";
import "./HEOGlobalParameters.sol";
import "./HEOPriceOracle.sol";
import "./IHEOCampaign.sol";
import "./IHEOCampaignRegistry.sol";
import "./IHEORewardFarm.sol";

contract HEORewardFarm is IHEORewardFarm, Context {
    using SafeMath for uint256;
    struct Donation {
        uint256 amount;
        address token;
        address donor;
        IHEOCampaign campaign;
        uint256 ts;
    }

    mapping(address => Donation[]) activeDonations;
    mapping(address => Donation[]) passiveDonations;
    struct Earning {
        uint256 amount;
        uint256 ts;
    }

    mapping(address => Earning) private earningsCache;
    HEOGlobalParameters private _globalParams;
    HEOPriceOracle private _priceOracle;
    IHEOCampaignRegistry private _registry;

    constructor(HEOGlobalParameters globalParams, HEOPriceOracle priceOracle, IHEOCampaignRegistry registry) {
        _globalParams = globalParams;
        _priceOracle = priceOracle;
        _registry = registry;
    }

    function addDonation(address donor, uint256 amount, address token) external override {
        require(_registry.getOwner(IHEOCampaign(_msgSender())) != address(0), "HEORewardFarm: campaign is not registered");
        require(amount > 0, "HEORewardFarm: amount has to be greater than zero");
        activeDonations[donor].push(Donation(amount, token, donor, IHEOCampaign(_msgSender()), block.timestamp));
    }
//test start
    function numDonations(address donor) external view returns (uint256) {
        return activeDonations[donor].length;
    }

    function startPeriod(address donor) external view returns (uint256) {
        Donation memory donation = activeDonations[donor][0];
        return donation.ts.sub(_globalParams.globalRewardStart()).div(_globalParams.rewardPeriod());
    }

    function rewardPeriods(address donor) external view returns (uint256) {
        Donation memory donation = activeDonations[donor][0];
        return Math.min(block.timestamp.sub(donation.ts).div(_globalParams.rewardPeriod()), _globalParams.maxRewardPeriods());
    }

    function donationAmount(address donor) external view returns (uint256) {
        Donation memory donation = activeDonations[donor][0];
        return donation.amount;
    }

    function periodReward(address donor) external view returns (uint256) {
        Donation memory donation = activeDonations[donor][0];
        return donation.campaign.donationYield().mul(donation.amount).div(_globalParams.maxRewardPeriods());
    }

    function periodPrice(address donor, uint256 period) external view returns (uint256) {
        Donation memory donation = activeDonations[donor][0];
        uint256 startPeriod = donation.ts.sub(_globalParams.globalRewardStart()).div(_globalParams.rewardPeriod());
        uint256 globalPeriod = startPeriod.add(period);
        return _priceOracle.getPriceAtPeriod(donation.token, globalPeriod);
    }

    function firstReward(address donor) external view returns (uint256) {
        Donation memory donation = activeDonations[donor][0];
        uint256 startPeriod = donation.ts.sub(_globalParams.globalRewardStart()).div(_globalParams.rewardPeriod());
        //reward per period in tknBits/wei of donation currency identified by donation.token
        uint256 periodReward = donation.campaign.donationYield().mul(donation.amount).div(_globalParams.maxRewardPeriods());
        uint256 globalPeriod = startPeriod.add(0);
        //price of 1 HEO in tknBits/wei of donation currency at global period
        uint256 periodPrice = _priceOracle.getPriceAtPeriod(donation.token, globalPeriod);
        return periodReward.div(periodPrice);
    }

    //test end
    function calculateReward(address donor) external view override returns (uint256) {
        uint256 rewardHEO = 0;
        uint256 maxRewardPeriods = _globalParams.maxRewardPeriods();
        for(uint256 i=0; i < activeDonations[donor].length; i++) {
            Donation memory donation = activeDonations[donor][i];
            uint256 startPeriod = donation.ts.sub(_globalParams.globalRewardStart()).div(_globalParams.rewardPeriod());
            uint256 rewardPeriods = Math.min(block.timestamp.sub(donation.ts).div(_globalParams.rewardPeriod()), _globalParams.maxRewardPeriods());
            //reward per period in tknBits/wei of donation currency identified by donation.token
            uint256 periodReward = donation.campaign.donationYield().mul(donation.amount).div(_globalParams.maxRewardPeriods());
            for(uint256 k = 0; k < rewardPeriods; k++) {
                uint256 globalPeriod = startPeriod.add(k);
                //price of 1 HEO in tknBits/wei of donation currency at global period
                uint256 periodPrice = _priceOracle.getPriceAtPeriod(donation.token, globalPeriod);
                rewardHEO = rewardHEO.add(periodReward.div(periodPrice));
            }
        }
        uint256 tmp = rewardHEO.div(1000);
        tmp = tmp.mul(1000);
        uint256 dif = 1000 - rewardHEO.sub(tmp);
        if(dif < 500) {
            rewardHEO = rewardHEO.add(dif);
        } else {
            rewardHEO = rewardHEO.sub(dif);
        }

        return rewardHEO;
    }
}

