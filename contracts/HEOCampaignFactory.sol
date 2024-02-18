// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./HEOCampaign.sol";
import "./IHEOCampaignFactory.sol";

contract HEOCampaignFactory is IHEOCampaignFactory, Context, Ownable, ReentrancyGuard {
    address _dao;
    constructor (address dao) Ownable(msg.sender)  {
        require(dao != address(0));
        _dao = dao;
    }

    /*
     @dev creates a campaign, registers it in campaign registry and transfers ownership of HEOCampaign instance
     to the caller.
    */
    function createCampaign(address payable beneficiary) external override  {
        HEOCampaign campaign = new HEOCampaign(beneficiary, _dao);
        campaign.transferOwnership(_msgSender());
    }

    /*
    * Override default Ownable::renounceOwnership to make sure
    * this contract does not get orphaned.
    */
    function renounceOwnership() public pure override {
        revert();
    }
}
