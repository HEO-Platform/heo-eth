pragma solidity >=0.6.1;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/math/Math.sol";
import "openzeppelin-solidity/contracts/GSN/Context.sol";
import "./HEOGlobalParameters.sol";
import "./HEOPriceOracle.sol";
import "./IHEOCampaign.sol";
import "./IHEOCampaignRegistry.sol";
import "./IHEORewardFarm.sol";
import "./HEOToken.sol";

contract HEORewardFarm is IHEORewardFarm, Context {
    using SafeMath for uint256;
    struct Donation {
        uint256 amount; //amount donated
        address token; //currency token
        address donor; //who donated
        IHEOCampaign campaign; //campaign for which the donation is made
        uint256 ts; //timestamp when donation was made
        uint256 reward; //how much HEO this donation has earned
        uint256 lastCalculated; //period number when reward was last calculated
        uint256 claimed; //how much HEO have been claimed
        uint8 active;
    }

    mapping(address => Donation[]) donations;
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
        donations[donor].push(Donation(amount, token, donor, IHEOCampaign(_msgSender()), block.timestamp, 0, 0, 0, 1));
    }

    function getDonation(address donor, uint256 di) external view returns(uint256) {
        return donations[donor][di].amount;
    }

    function getDonationCampaign(address donor, uint256 di) external view returns(IHEOCampaign) {
        return donations[donor][di].campaign;
    }

    function getDonationToken(address donor, uint256 di) external view returns(address) {
        return donations[donor][di].token;
    }

    function getDonationCount(address donor) external view returns (uint256) {
        return donations[donor].length;
    }

    function claimedReward(address donor, uint256 di) public view returns (uint256) {
        Donation storage donation = donations[donor][di];
        return donation.claimed;
    }

    function claimReward(address destination, uint256 di, uint256 amount) public {
        address donor = _msgSender();
        Donation storage donation = donations[donor][di];
        require(donation.donor == donor, "HEORewardFarm: caller is not the donor.");
        require(donation.amount > 0, "HEORewardFarm: zero-donation.");
        uint256 reward = calculateReward(donor, di);
        //cache pre-calculated reward
        donation.reward = reward;
        uint256 rewardPeriod = _globalParams.rewardPeriod();
        uint256 maxRewardPeriods = _globalParams.maxRewardPeriods();
        uint256 rewardPeriods = Math.min(block.timestamp.sub(donation.ts).div(rewardPeriod), maxRewardPeriods);
        if(rewardPeriods == maxRewardPeriods) {
            //donation is fully claimed
            donation.active = 0;
        }
        donation.lastCalculated = rewardPeriods; //we have calculated reward for this donation up to this period
        require(reward >= donation.claimed.add(amount), "HEORewardFarm: claim amount is higher than available reward.");
        require(destination != address(0), "HEORewardFarm: invalid destination for reward.");
        donation.claimed = donation.claimed.add(amount);
        HEOToken(_globalParams.heoToken()).mint(destination, amount);
    }

    function calculateReward(address donor, uint256 di) public view returns (uint256) {
        if(di >= donations[donor].length) {
            return 0;
        }
        uint256 rewardHEO = 0;
        uint256 maxRewardPeriods = _globalParams.maxRewardPeriods();
        uint256 rewardPeriod = _globalParams.rewardPeriod();
        Donation memory donation = donations[donor][di];
        rewardHEO = rewardHEO.add(donation.reward);
        if(donation.active == 0) {
            return rewardHEO; //this donation is fully claimed
        }
        if(donation.campaign.donationYield() == 0) {
            return 0;
        }
        uint256 startPeriod = donation.ts.sub(_globalParams.globalRewardStart()).div(rewardPeriod);
        uint256 rewardPeriods = Math.min(block.timestamp.sub(donation.ts).div(rewardPeriod), maxRewardPeriods);
        //reward per period in tknBits/wei of donation currency identified by donation.token
        uint256 periodReward = donation.campaign.donationYield().mul(donation.amount).div(maxRewardPeriods);
        uint256 start = donation.lastCalculated;
        for(uint256 k = start; k < rewardPeriods; k++) {
            uint256 globalPeriod = startPeriod.add(k);
            //price of 1 HEO in tknBits/wei of donation currency at global period
            uint256 periodPrice = _priceOracle.getPriceAtPeriod(donation.token, globalPeriod);
            rewardHEO = rewardHEO.add(periodReward.div(periodPrice));
        }
        //round the decimals
        uint256 precision = 100000;
        uint256 remainder = rewardHEO.mod(precision);
        uint256 dif = precision.sub(remainder);
        if(remainder > 0) {
            if(dif < precision.div(2)) {
                rewardHEO = rewardHEO.add(dif);
            } else {
                rewardHEO = rewardHEO.sub(dif);
            }
        }
        return rewardHEO;
    }
}

