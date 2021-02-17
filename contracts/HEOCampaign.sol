pragma solidity >=0.6.1;

import "./IHEOCampaign.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "./HEOPriceOracle.sol";
import "./IHEORewardFarm.sol";
import "./HEOCampaignFactory.sol";
import "./HEOGlobalParameters.sol";
import "./HEOToken.sol";

contract HEOCampaign is IHEOCampaign, Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    uint256 private _maxAmount; //campaign limit in wei/wad/tknBits of the target crypto asset
    address payable private _beneficiary;
    uint256 private _profitabilityCoefficient; //X - set by the platform
    uint256 private _serviceFee;
    uint256 private _burntHeo; //amount of burnt HEO in tknBits
    uint256 private _raisedFunds; //how many wei/wad/tknBits of the target crypto asset this campaign has raised
    uint256 private _heoPrice; //price of 1 HEO in wei/wad/tknBits of the target crypto asset
    bool private _isNative;
    string private _metaDataUrl; //URL of off-chain metadata file that has tagline, description, images, etc
    address private _currency; //Address of the token accepted by this campaign

    /**
    * Fundraising ROI (Z) is set by burning beneficiary's HEO tokens.
    * This property is determined by the formula Z = maxAmount/(burntHeo * heoPrice).
    * Owner of the campaign is the instance of HEOCampaignFactory
    */
    constructor (uint256 maxAmount, address payable beneficiary, uint256 profitabilityCoefficient,
        uint256 burntHeo, uint256 heoPrice, address currency, uint256 serviceFee, string memory metaDataUrl) public {
        require(beneficiary != address(0), "HEOCampaign: beneficiary cannot be a zero address.");
        require(maxAmount > 0, "HEOCampaign: _maxAmount cannot be 0.");
        //require(burntHeo > 0, "HEOCampaign: _burntHeo cannot be 0.");
        require(heoPrice > 0, "HEOCampaign: HEO price cannot be 0.");

        _maxAmount = maxAmount;
        _beneficiary = beneficiary;
        _serviceFee = serviceFee;
        _heoPrice = heoPrice;
        _burntHeo = burntHeo;
        _profitabilityCoefficient = profitabilityCoefficient;
        _metaDataUrl = metaDataUrl;
        if(currency == address(0)) {
            _isNative = true;
        }
        _currency = currency;
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
        _beneficiary.transfer(msg.value);
        IHEORewardFarm(HEOCampaignFactory(owner()).rewardFarm()).addDonation(_msgSender(), msg.value, address(0));
    }

    function donateERC20(uint256 amount) public nonReentrant {
        require(!_isNative, "HEOCampaign: this campaign does not accept ERC-20 tokens.");
        require(amount > 0, "HEOCampaign: must send non-zero amount of ERC-20 tokens.");
        ERC20 paymentToken = ERC20(_currency);
        uint256 raisedFunds = _raisedFunds.add(amount);
        require(raisedFunds <= _maxAmount, "HEOCampaign: this contribution will exceed maximum allowed for this campaign.");
        _raisedFunds = raisedFunds;
        paymentToken.safeTransferFrom(msg.sender, address(_beneficiary), amount);
        IHEORewardFarm(HEOCampaignFactory(owner()).rewardFarm()).addDonation(_msgSender(), amount, _currency);
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

    function updateMetaDataUrl(string memory metaDataUrl) public onlyOwner {
        _metaDataUrl = metaDataUrl;
    }
    //getters

    /**
    * Address of the token accepted by this campaign. Zero address is used for native
    * coin of the underlying blockchain.
    */
    function currency() external view override returns (address) {
        return _currency;
    }

    /**
    * How many units of target currency can be raised by this campaign.
    */
    function maxAmount() external view override returns (uint256) {
        return _maxAmount;
    }


    /**
    * How many units of target currency have been raised by this campaign.
    */
    function raisedAmount() external view override returns (uint256) {
        return _raisedFunds;
    }

    /**
    * Donation Yield (Y) based on formula Y = X/Z
    */
    function donationYield() external view override returns (uint256) {
        if(_burntHeo == 0) {
            return 0;
        }
        return _profitabilityCoefficient.mul(uint256(10)**uint256(18)).div(getZ());
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
        if(_burntHeo == 0) {
            return 0;
        }
        uint8 decimals = HEOToken(HEOGlobalParameters(HEOCampaignFactory(owner()).globalParams()).heoToken()).decimals();
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

    function metaDataUrl() external view returns (string memory) {
        return _metaDataUrl;
    }
}
