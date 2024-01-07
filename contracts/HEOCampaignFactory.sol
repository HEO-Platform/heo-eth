// SPDX-License-Identifier: MIT
pragma solidity >=0.6.1;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "./HEOCampaign.sol";
import "./IHEOCampaignFactory.sol";
import "./HEODAO.sol";

contract HEOCampaignFactory is IHEOCampaignFactory, Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    HEODAO private _dao;

    event CampaignDeployed (
        address indexed campaignAddress,
        address indexed owner,
        address indexed beneficiary,
        uint256 maxAmount
    );

    constructor (HEODAO dao) public {
        require(address(dao) != address(0));
        _dao = dao;
    }

    /*
     @dev creates a campaign, registers it in campaign registry and transfers ownership of HEOCampaign instance
     to the caller.
    */
    function createCampaign(uint256 maxAmount, address payable beneficiary, string memory metaData) external override nonReentrant {
        HEOCampaign campaign = new HEOCampaign(maxAmount, beneficiary, _dao, 0, 0, 0, 0, 0, address(0), metaData);
        campaign.transferOwnership(_msgSender());
        emit CampaignDeployed(address(campaign), address(_msgSender()), beneficiary, maxAmount);
    }

    /*
    * Override default Ownable::renounceOwnership to make sure
    * this contract does not get orphaned.
    */
    function renounceOwnership() public override {
        revert();
    }
}
