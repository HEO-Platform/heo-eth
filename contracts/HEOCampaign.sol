// SPDX-License-Identifier: MIT

pragma solidity >=0.6.1;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "./IHEOCampaign.sol";
import "./IHEORewardFarm.sol";
import "./HEOParameters.sol";
import "./HEODAO.sol";
import "./HEOLib.sol";

contract HEOCampaign is IHEOCampaign, Ownable, ReentrancyGuard {
    using SafeMath for uint256;
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
    event Approve(address owner, address spender, uint256 value);

    constructor (uint256 maxAmount, address payable beneficiary,HEODAO dao,
        uint256 heoLocked, uint256 heoPrice, uint256 heoPriceDecimals, uint256 fee, uint256 feeDecimals,
        address heoAddr, string memory metaData) public {
        require(beneficiary != address(0), "HEOCampaign: beneficiary cannot be a zero address");
        if(heoLocked > 0) {
            require(maxAmount > 0, "HEOCampaign: maxAmount has to be greater than zero");
            //check White List
            if(dao.heoParams().intParameterValue(HEOLib.ENABLE_FUNDRAISER_WHITELIST) > 0) {
                if(dao.heoParams().addrParameterValue(HEOLib.FUNDRAISER_WHITE_LIST, beneficiary) == 0) {
                    require(maxAmount <= dao.heoParams().intParameterValue(HEOLib.ANON_CAMPAIGN_LIMIT),
                        "HEOCampaign: amount over allowed limit for non-white listed accounts");
                }
            }
            _heoAddr = heoAddr;
            _heoPrice = heoPrice;
            _heoPriceDecimals = heoPriceDecimals;
            _heoLocked = heoLocked;
            _fee = fee;
            _feeDecimals = feeDecimals;
        } else {
            //check White List
            if(dao.heoParams().intParameterValue(HEOLib.ENABLE_FUNDRAISER_WHITELIST) > 0) {
                require(dao.heoParams().addrParameterValue(HEOLib.FUNDRAISER_WHITE_LIST, beneficiary) > 0,
                "HEOCampaign: account must be white listed");
            }
        }
        _maxAmount = maxAmount;
        _beneficiary = beneficiary;
        _dao = dao;
        _isActive = true;
        _metaData = metaData;
    }

    modifier _canDonate() {
        require(_isActive, "HEOCampaign: this campaign is no longer active");
        require(_msgSender() != _beneficiary, "HEOCampaign: cannot donate to yourself");
        require(_msgSender() != owner(), "HEOCampaign: cannot donate to your own camapaign");
        _;
    }
    
    function donateToBeneficiary(address inCurrency) public payable {
        ERC20 coinInstans = ERC20(inCurrency);
        require(((_msgSender() == owner())||(_msgSender() == _beneficiary)), "HEOCampaign: only owners or benificars can withdraw donations from the company");
        uint256 balance = coinInstans.balanceOf(address(this));
        require(balance > 0, "Campaign balance less than or equal to zero");
        uint256 heoFee;
        if(_heoLocked > 0) heoFee = _calculateFee(balance).div(_heoPrice).mul(_heoPriceDecimals);
        else heoFee = _dao.heoParams().calculateFee(balance);
        uint256 toBeneficiary = balance.sub(heoFee);
        coinInstans.safeTransfer(address(_dao), heoFee);
        coinInstans.safeTransfer(this.beneficiary(), toBeneficiary);
    }
    
    /**
    * Donate to the campaign in native tokens (ETH).
    */
    function donateNative() public payable _canDonate {
        require(msg.value > 0, "HEOCampaign: must send non-zero amount of ETH");
        if(_heoLocked > 0) {
            uint256 raisedFunds = _raisedFunds.add(msg.value);
            require(raisedFunds <= _maxAmount,"HEOCampaign: this contribution will exceed maximum allowed for this campaign");
            address(this).transfer(msg.value);
            _raisedFunds = raisedFunds;
        } else {
            address(this).transfer(msg.value);
            _raisedFunds = _raisedFunds.add(msg.value);
        }
    }

    function _calculateFee(uint256 amount) internal view returns(uint256) {
        return amount.mul(_fee).div(_feeDecimals);
    }

    receive() external payable {
        donateNative();
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
        require(newMaxAmount >= _raisedFunds, "HEOCampaign: newMaxAmount cannot be lower than amount raised");
        if(_heoLocked > 0) {
            uint256 heoRequired = _dao.heoParams().calculateFee(newMaxAmount).div(_heoPrice).mul(_heoPriceDecimals);
            if(heoRequired > _heoLocked) {
                //lock more HEO
                uint256 heoDelta = heoRequired.sub(_heoLocked);
                ERC20(_heoAddr).safeTransferFrom(_msgSender(), address(this), heoDelta);
                _heoLocked = _heoLocked.add(heoDelta);
            } else if(heoRequired < _heoLocked) {
                //refund some HEO
                uint256 heoDelta = _heoLocked.sub(heoRequired);
                ERC20(_heoAddr).safeTransfer(_msgSender(), heoDelta);
                _heoLocked = _heoLocked.sub(heoDelta);
            }
        }
        _maxAmount = newMaxAmount;
    }

    function close() external override onlyOwner() {
        require(_isActive, "HEOCampaign: this campaign is no longer active");
        //refund unspent HEO
        if(_heoLocked > 0) {
            uint256 balance = ERC20(_heoAddr).balanceOf(address(this));
            if(balance > 0) {
                ERC20(_heoAddr).safeTransfer(_msgSender(), balance);
            }
        }
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
