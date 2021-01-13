pragma solidity >=0.6.1;

import "./IHEOCampaign.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./HEOPriceOracle.sol";
import "./IHEORewardFarm.sol";
import "./HEOCampaignFactory.sol";
import "./HEOGlobalParameters.sol";
import "./HEOToken.sol";

contract HEOCampaign is IHEOCampaign, Ownable {
    using SafeMath for uint256;

    uint256 private _maxAmount; //campaign limit in wei/wad/tknBits of the target crypto asset
    address private _beneficiary;
    uint256 private _profitabilityCoefficient; //X - set by the platform
    uint256 private _serviceFee;
    uint256 private _burntHeo; //amount of burnt HEO in tknBits
    uint256 private _raisedFunds; //how many wei/wad/tknBits of the target crypto asset this campaign has raised
    uint256 private _heoPrice; //price of 1 HEO in wei/wad/tknBits of the target crypto asset
    bool private _isNative;

    /**
    * Fundraising ROI (Z) is set by burning beneficiary's HEO tokens.
    * This property is determined by the formula Z = maxAmount/(burntHeo * heoPrice).
    * Owner of the campaign is the instance of HEOCampaignFactory
    */
    constructor (uint256 maxAmount, address beneficiary, uint256 profitabilityCoefficient,
        uint256 burntHeo, uint256 heoPrice, address currency, uint256 serviceFee) public {
        require(beneficiary != address(0), "HEOCampaign: beneficiary cannot be a zero address.");
        require(maxAmount > 0, "HEOCampaign: _maxAmount cannot be 0.");
        require(burntHeo > 0, "HEOCampaign: _burntHeo cannot be 0.");
        require(heoPrice > 0, "HEOCampaign: HEO price cannot be 0.");

        _maxAmount = maxAmount;
        _beneficiary = beneficiary;
        _serviceFee = serviceFee;
        _heoPrice = heoPrice;
        _burntHeo = burntHeo;
        _profitabilityCoefficient = profitabilityCoefficient;
        if(currency == address(0)) {
            _isNative = true;
        }
    }

    /**
    * Donate to the campaign in native tokens (ETH).
    */
    function donateNative() public payable {
        require(_isNative, "HEOCampaign: this campaign does not accept ETH.");
        require(msg.value > 0, "HEOCampaign: must send non-zero amount of ETH.");
        uint256 raisedFunds = _raisedFunds.add(msg.value);
        require(raisedFunds <= _maxAmount, "HEOCampaign: this contribution will exceed maximum allowed for this campaign.");
        _raisedFunds = raisedFunds;
        IHEORewardFarm(HEOCampaignFactory(owner()).rewardFarm()).addDonation(_msgSender(), msg.value, address(0));
    }

    receive() external payable {
        donateNative();
    }
    /**
    * By burning additional tokens, the beneficiary can increase yield (Y)
    * for donors. Doing so automatically lowers Z (inverse fundraising cost)
    */
    function increaseYield(uint256 burntHeo) public onlyOwner {
        require(burntHeo > 0, "HEOCampaign: burntHeo cannot be 0.");
        require(_raisedFunds < _maxAmount, "HEOCampaign: campaign is not active.");
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
        uint8 decimals = HEOGlobalParameters(HEOCampaignFactory(owner()).globalParams()).yDecimals();
        return _profitabilityCoefficient.mul(uint256(10)**uint256(decimals)).div(getZ());
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
        uint8 decimals = HEOToken(HEOCampaignFactory(owner()).heoToken()).decimals();
        return _maxAmount.mul(uint256(10)**uint256(decimals)).div(_burntHeo).div(_heoPrice);
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
        return (_raisedFunds < _maxAmount);
    }

    function beneficiary() external view override returns (address) {
        return _beneficiary;
    }

    function burntHeo() external view override returns (uint256) {
        return _burntHeo;
    }
}
