pragma solidity >=0.6.1;

import "./IHEOCampaign.sol";
import "./HEOToken.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract HEOCampaign is IHEOCampaign, Ownable {
    using SafeMath for uint256;

    uint256 private _maxAmount; //campaign limit in wei/wad/tknBits of the target crypto asset
    address private _beneficiary;
    uint256 private _profitabilityCoefficient; //X - set by the platform
    uint256 private _serviceFee;
    uint256 private _burntHeo; //amount of burnt HEO in tknBits
    uint256 private _raisedFunds; //how many wei/wad/tknBits of the target crypto asset this campaign has raised
    uint256 private _heoPrice; //price of 1 HEO in wei/wad/tknBits of the target crypto asset
    uint8 private _heoDecimals;
    uint8 private _donationYieldDecimals = 5;
    bool private _active;

    /**
    * Fundraising ROI (Z) is set by burning beneficiary's HEO tokens.
    * This property is determined by the formula Z = maxAmount/(burntHeo * heoPrice).
    * Owner of the campaign is the instance of HEOCampaignFactory
    */
    constructor (uint256 maxAmount, address beneficiary, uint256 profitabilityCoefficient,
        uint256 burntHeo, uint256 heoPrice, uint8 heoDecimals, uint256 serviceFee) public {
        require(beneficiary != address(0), "HEOCampaign: beneficiary cannot be a zero address");
        require(maxAmount > 0, "HEOCampaign: _maxAmount cannot be 0");
        require(burntHeo > 0, "HEOCampaign: _burntHeo cannot be 0");
        require(heoPrice > 0, "HEOCampaign: HEO price cannot be 0");

        _maxAmount = maxAmount;
        _beneficiary = beneficiary;
        _serviceFee = serviceFee;
        _heoPrice = heoPrice;
        _burntHeo = burntHeo;
        _heoDecimals = heoDecimals;
        _profitabilityCoefficient = profitabilityCoefficient;
    }

    /**
    * By burning additional tokens, the beneficiary can increase yield (Y)
    * for donors. Doing so automatically lowers Z (inverse fundraising cost)
    */
    function increaseYield(uint256 burntHeo) public onlyOwner {
        require(burntHeo > 0, "HEOCampaign: burntHeo cannot be 0");
        _burntHeo = _burntHeo.add(burntHeo);
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
        return _profitabilityCoefficient.mul(uint256(10)**uint256(_donationYieldDecimals)).div(getZ());
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
    function getZ() public view returns (uint256) {
        return _maxAmount.mul(uint256(10)**uint256(_heoDecimals)).div(_burntHeo).div(_heoPrice);
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

    function burntHeo() external view override returns (uint256) {
        return _burntHeo;
    }

    function donationYieldDecimals() external view override returns (uint256) {
        return _donationYieldDecimals;
    }
}
