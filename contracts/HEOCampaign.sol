pragma solidity >=0.6.1;

import "./IHEOCampaign.sol";
import "./HEOToken.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract HEOCampaign is IHEOCampaign, Ownable {
    using SafeMath for uint256;

    uint256 private _maxAmount;
    address private _beneficiary;
    uint256 private _profitabilityCoefficient; //X - set by the platform
    uint256 private _z; //Z - fundraising ROI.
    uint256 private _serviceFee;
    uint256 private _burntHeo;
    uint256 private _raisedFunds;
    uint256 private _heoPrice;
    bool private _active;

    /**
    * Fundraising ROI (Z) is set by burning beneficiary's HEO tokens.
    * This property is determined by the formula Z = maxAmount/(burntHeo * heoPrice).
    * Owner of the campaign is the instance of HEOCampaignFactory
    */
    constructor (uint256 maxAmount, address beneficiary, uint256 profitabilityCoefficient,
        uint256 burntHeo, uint256 heoPrice, uint256 serviceFee) public {
        require(beneficiary != address(0), "HEOCampaign: beneficiary cannot be a zero address");

        _maxAmount = maxAmount;
        _beneficiary = beneficiary;
        _serviceFee = serviceFee;
        _heoPrice = heoPrice;
        _burntHeo = burntHeo;
        _profitabilityCoefficient = profitabilityCoefficient;
        _setZ();
    }

    function _setZ() private {
        require(_heoPrice > 0, "HEOCampaign: HEO price cannot be 0");
        require(_maxAmount > 0, "HEOCampaign: _maxAmount cannot be 0");
        require(_burntHeo > 0, "HEOCampaign: _burntHeo cannot be 0");
        _z = _maxAmount.div(_burntHeo.mul(_heoPrice));
    }

    /**
    * By burning additional tokens, the beneficiary can increase yield (Y)
    * for donors. Doing so automatically lowers Z (inverse fundraising cost)
    */
    function increaseYield(uint256 burntHeo) public onlyOwner {
        require(burntHeo > 0, "HEOCampaign: burntHeo cannot be 0");
        _burntHeo = _burntHeo.add(burntHeo);
        _setZ();
    }
    //getters

    /**
    * How many units of target currency can be raised by this campaign.
    */
    function maxAmount() external view override returns (uint256) {
        return _maxAmount;
    }

    /**
    * Donation Yield (Y) based on formula Y = X/Z
    */
    function donationYield() external view override returns (uint256) {
        return _profitabilityCoefficient/_z;
    }

    /**
    * Profitability Coefficient (X) set when campaign was created
    */
    function profitabilityCoefficient() external view override returns (uint256) {
        return _profitabilityCoefficient;
    }

    /**
    * Campaign fundraising ROI. Value of crypto raised by the campaign divided
    * by value of HEO burnt to activate the campaign.
    */
    function z() external view override returns (uint256) {
        return _z;
    }

    /**
    * Price of HEO for calculating amount of HEO that the user has to burn.
    * The price is in units of target currency. This price is set when the
    * user creates the campaign.
    */
    function heoPrice() external view override returns (uint256) {
        return _heoPrice;
    }

    function serviceFee() external view override returns (uint256) {
        return _serviceFee;
    }

    function isActive() external view override returns (bool) {
        return _active;
    }

    function beneficiary() external view override returns (address) {
        return _beneficiary;
    }
}
