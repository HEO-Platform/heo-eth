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
        uint256 reward;
    }

    mapping(address => Donation[]) activeDonations;
    mapping(address => Donation[]) passiveDonations;
    HEOGlobalParameters private _globalParams;
    HEOPriceOracle private _priceOracle;
    IHEOCampaignRegistry private _registry;

    constructor(HEOGlobalParameters globalParams, HEOPriceOracle priceOracle, IHEOCampaignRegistry registry) public {
        _globalParams = globalParams;
        _priceOracle = priceOracle;
        _registry = registry;
    }

    function addDonation(address donor, uint256 amount, address token) external override {
        require(_registry.getOwner(IHEOCampaign(_msgSender())) != address(0), "HEORewardFarm: campaign is not registered");
        require(amount > 0, "HEORewardFarm: amount has to be greater than zero");
        activeDonations[donor].push(Donation(amount, token, donor, IHEOCampaign(_msgSender()), block.timestamp, 0));
    }

    function getActiveDonationCount(address donor) external view returns (uint256) {
        return activeDonations[donor].length;
    }

    function getPassiveDonationCount(address donor) external view returns (uint256) {
        return passiveDonations[donor].length;
    }

    function calculateReward(address donor, uint256 di) external view returns (uint256) {
        require(di < activeDonations[donor].length, "HEORewardFarm: donation does not exist");
        uint256 rewardHEO = 0;
        uint256 maxRewardPeriods = _globalParams.maxRewardPeriods();
        uint256 rewardPeriod = _globalParams.rewardPeriod();
        Donation memory donation = activeDonations[donor][di];
        uint256 startPeriod = donation.ts.sub(_globalParams.globalRewardStart()).div(rewardPeriod);
        uint256 rewardPeriods = Math.min(block.timestamp.sub(donation.ts).div(rewardPeriod), maxRewardPeriods);
        //reward per period in tknBits/wei of donation currency identified by donation.token
        uint256 periodReward = donation.campaign.donationYield().mul(donation.amount).div(maxRewardPeriods);
        for(uint256 k = 0; k < rewardPeriods; k++) {
            uint256 globalPeriod = startPeriod.add(k);
            //price of 1 HEO in tknBits/wei of donation currency at global period
            uint256 periodPrice = _priceOracle.getPriceAtPeriod(donation.token, globalPeriod);
            //uint256 periodPrice = _priceOracle.getPrice(donation.token);
            rewardHEO = rewardHEO.add(periodReward.div(periodPrice));
        }
        //round the decimals
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

