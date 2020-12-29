pragma solidity >=0.6.1 <0.7.0;

import "./IHEOCampaign.sol";

contract HEOCampaign is IHEOCampaign {
    uint256 private _maxAmount;
    address private _beneficiary;
    uint256 _donationYield;
    uint256 _profitabilityCoefficient;
    uint256 _fundRaisingCost;

    constructor (uint256 maxAmount, address beneficiary) public {
        _maxAmount = maxAmount;
        _beneficiary = beneficiary;
    }

    function maxAmount() external view override returns (uint256) {
        return _maxAmount;
    }

    function donationYield() external view override returns (uint256) {
        return _donationYield;
    }

    function profitabilityCoefficient() external view override returns (uint256) {
        return _profitabilityCoefficient;
    }

    function fundRaisingCost() external view override returns (uint256) {
        return _fundRaisingCost;
    }
}
