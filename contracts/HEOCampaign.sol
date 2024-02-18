// SPDX-License-Identifier: MIT

pragma solidity >=0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./IHEOCampaign.sol";
import "./HEOParameters.sol";
import "./HEODAO.sol";
import "./HEOLib.sol";

contract HEOCampaign is IHEOCampaign, Ownable, ReentrancyGuard {
    using SafeERC20 for ERC20;

    uint256 private _maxAmount; //campaign limit in wei/wad/tknBits of the target crypto asset
    address payable private _beneficiary;
    uint256 private _heoLocked; //amount of HEO locked (in tknBits)
    uint256 private _raisedFunds; //how much wei/wad/tknBits of the target crypto asset this campaign has raised
    uint256 private _heoPrice; //price of HEO in target crypto asset
    uint256 private _heoPriceDecimals; //decimals in the price of HEO
    uint256 private _fee;
    uint256 private _feeDecimals;
    bool private _isActive;
    address private _currency; //Address of the token accepted by this campaign
    HEODAO private _dao;
    address private _heoAddr;
    string private _metaData;

    constructor (uint256 maxAmount, address payable beneficiary, HEODAO dao, string memory metaData) Ownable(msg.sender) public {
        require(beneficiary != address(0));
        _maxAmount = maxAmount;
        _beneficiary = beneficiary;
        _dao = dao;
        _isActive = true;
        _metaData = metaData;
    }

    modifier _canDonate() {
        require(_isActive);
        require(_msgSender() != _beneficiary);
        require(_msgSender() != owner());
        _;
    }

    function donateToBeneficiary(address inCurrency) public payable {
        ERC20 coinInstans = ERC20(inCurrency);
        require(((_msgSender() == owner())||(_msgSender() == _beneficiary)));
        uint256 balance = coinInstans.balanceOf(address(this));
        require(balance > 0);
        uint256 heoFee;
        heoFee = _dao.heoParams().calculateFee(balance);
        uint256 toBeneficiary = balance - heoFee;
        coinInstans.safeTransfer(address(_dao), heoFee);
        coinInstans.safeTransfer(this.beneficiary(), toBeneficiary);
    }

    function _calculateFee(uint256 amount) internal view returns(uint256) {
        return amount * (_fee) / (_feeDecimals);
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
    * Price of HEO for calculating amount of HEO that the user has to burn.
    * The price is in units of target currency. This price is set when the
    * user creates the campaign.
    */
    function heoPrice() external view returns (uint256) {
        return _heoPrice;
    }
    function heoPriceDecimals() external view returns (uint256) {
        return _heoPriceDecimals;
    }
    function fee() external view returns (uint256) {
        return _fee;
    }
    function feeDecimals() external view returns (uint256) {
        return _feeDecimals;
    }
    function isActive() external view override returns (bool) {
        if(_maxAmount == 0) {
            return _isActive;
        } else {
            return (_raisedFunds < _maxAmount && _isActive);
        }
    }

    function beneficiary() external view override returns (address) {
        return _beneficiary;
    }

    function heoLocked() external view override returns (uint256) {
        return _heoLocked;
    }

    function metaData() external view override returns (string memory) {
        return _metaData;
    }

    //updates
    function updateMetaData(string memory newMetaData) external override onlyOwner {
        require(_isActive, "HEOCampaign: this campaign is no longer active");
        _metaData = newMetaData;
    }

    function update(uint256 newMaxAmount, string memory newMetaData) external override onlyOwner {
        require(_isActive, "HEOCampaign: this campaign is no longer active");
        if(newMaxAmount != _maxAmount) {
            _updateMaxAmount(newMaxAmount);
        }
        _metaData = newMetaData;
    }

    function updateMaxAmount(uint256 newMaxAmount) external override onlyOwner() {
        require(_isActive, "HEOCampaign: this campaign is no longer active");
        if(newMaxAmount != _maxAmount) {
            _updateMaxAmount(newMaxAmount);
        }
    }

    function _updateMaxAmount(uint256 newMaxAmount) private {
        require(newMaxAmount >= _raisedFunds);
        _maxAmount = newMaxAmount;
    }

    function close() external override onlyOwner() {
        require(_isActive);
        _isActive = false;
    }
    /*
    * Override default Ownable::renounceOwnership to make sure
    * this contract does not get orphaned.
    */
    function renounceOwnership() public override {
        revert("cannot renounce ownership.");
    }
}
