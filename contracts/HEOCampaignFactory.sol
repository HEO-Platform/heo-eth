// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./HEOCampaign.sol";
import "./IHEOCampaignFactory.sol";
import "./HEODAO.sol";

contract HEOCampaignFactory is IHEOCampaignFactory, Context, Ownable, ReentrancyGuard {
    using SafeERC20 for ERC20;

    HEODAO private _dao;

    event CampaignDeployed (
        address indexed campaignAddress,
        address indexed owner,
        address indexed beneficiary,
        uint256 maxAmount
    );

    constructor (HEODAO dao) Ownable(msg.sender) public {
        require(address(dao) != address(0));
        _dao = dao;
    }

    /*
     @dev creates a campaign, registers it in campaign registry and transfers ownership of HEOCampaign instance
     to the caller.
    */
    function createCampaign(uint256 maxAmount, address payable beneficiary, string memory metaData) external override nonReentrant {
        HEOCampaign campaign = new HEOCampaign(maxAmount, beneficiary, _dao, metaData);
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
