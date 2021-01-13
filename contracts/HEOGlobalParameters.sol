pragma solidity >=0.6.1;
import "openzeppelin-solidity/contracts/access/Ownable.sol";
contract HEOGlobalParameters is Ownable {
    uint256 private _serviceFee;
    uint256 private _profitabilityCoefficient; //X
    uint8 private _yDecimals = 5;
    uint256 private _rewardPeriod; //seconds in one reward period, i.e. 86400 seconds in a day
    uint256 private _maxRewardPeriods; //how many times, the reward is being mined. E.g. 365 for daily rewards that last a year.
    uint256 private _globalRewardStart; //when period 0 starts

    constructor(uint256 serviceFee, uint256 profitabilityCoefficient, uint8 yDecimals, uint256 rewardPeriod,
        uint256 maxRewardPeriods) public {
        _serviceFee = serviceFee;
        _profitabilityCoefficient = profitabilityCoefficient;
        _yDecimals = yDecimals;
        _rewardPeriod = rewardPeriod; //86400
        _maxRewardPeriods = maxRewardPeriods; //365
        _globalRewardStart = block.timestamp;
    }

    function setServiceFee (uint256 serviceFee) external onlyOwner {
        _serviceFee = serviceFee;
    }

    function setProfitabilityCoefficient(uint256 profitabilityCoefficient) external onlyOwner {
        _profitabilityCoefficient = profitabilityCoefficient;
    }

    function setGlobalRewardStart(uint256 globalRewardStart) external onlyOwner {
        _globalRewardStart = globalRewardStart;
    }

    function setRewardPeriod(uint256 rewardPeriod) external onlyOwner {
        _rewardPeriod = rewardPeriod;
    }

    function setMaxRewardPeriods(uint256 maxRewardPeriods) external onlyOwner {
        _maxRewardPeriods = maxRewardPeriods;
    }

    function profitabilityCoefficient() external view returns (uint256) {
        return _profitabilityCoefficient;
    }

    function serviceFee() external view returns (uint256) {
        return _serviceFee;
    }

    function yDecimals() external view returns(uint8) {
        return _yDecimals;
    }

    function rewardPeriod() external view returns(uint256) {
        return _rewardPeriod;
    }

    function maxRewardPeriods() external view returns(uint256) {
        return _maxRewardPeriods;
    }

    function globalRewardStart() external view returns(uint256) {
        return _globalRewardStart;
    }
}
