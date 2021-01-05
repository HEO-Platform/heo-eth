pragma solidity >=0.6.1;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/math/Math.sol";
import "./HEOGlobalParameters.sol";
import "./HEOPriceOracle.sol";

contract HEORewardFarm {
    using SafeMath for uint256;
    struct Donation {
        uint256 amount;
        address token;
        address donor;
        uint256 y;
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

    constructor(HEOGlobalParameters globalParams, HEOPriceOracle priceOracle) public {
        _globalParams = globalParams;
        _priceOracle = priceOracle;
    }

    function calculateReward(address donor) public view returns (uint256) {
        uint256 rewardHEO = 0;
        for(uint256 i=0; i < activeDonations[donor].length; i++) {
            Donation memory donation = activeDonations[donor][i];
            uint256 startPeriod = donation.ts.sub(_globalParams.globalRewardStart()).div(_globalParams.rewardPeriod());
            uint256 rewardPeriods = Math.min(block.timestamp.sub(donation.ts).div(_globalParams.rewardPeriod()), _globalParams.maxRewardPeriods());
            //reward per period in tknBits/wei of donation currency identified by donation.token
            uint256 periodReward = donation.y.mul(donation.amount).div(_globalParams.maxRewardPeriods());
            for(uint256 k = 0; k < rewardPeriods; k++) {
                uint256 globalPeriod = startPeriod.add(k);
                //prive of 1 HEO in tknBits/wei of donation currency at global period
                uint256 periodPrice = _priceOracle.getPriceAtPeriod(donation.token, globalPeriod);
                rewardHEO = rewardHEO.add(periodReward.div(periodPrice));
            }
        }
        return rewardHEO;
    }
}

