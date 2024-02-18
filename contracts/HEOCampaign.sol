// SPDX-License-Identifier: MIT

pragma solidity >=0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./IHEOCampaign.sol";
import "./HEODAO.sol";

contract HEOCampaign is IHEOCampaign, Ownable {
    using SafeERC20 for ERC20;

    address payable private _beneficiary;
    address private _dao;
    address private _heoAddr;

    constructor (address payable b, address dao) Ownable(msg.sender)  {
        require(b != address(0));
        _beneficiary = b;
        _dao = dao;
    }

    modifier _canDonate() {
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
        heoFee = HEODAO(payable(_dao)).heoParams().calculateFee(balance);
        uint256 toBeneficiary = balance - heoFee;
        coinInstans.safeTransfer(_dao, heoFee);
        coinInstans.safeTransfer(this.beneficiary(), toBeneficiary);
    }

    function beneficiary() external view override returns (address) {
        return _beneficiary;
    }

    function renounceOwnership() public pure override {
        revert();
    }
}
