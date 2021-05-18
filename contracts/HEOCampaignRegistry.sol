// SPDX-License-Identifier: MIT
pragma solidity >=0.6.1;

import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "./IHEOCampaignFactory.sol";
import "./IHEOCampaign.sol";
import "./IHEOCampaignRegistry.sol";
import "./HEODAO.sol";
import "./HEOLib.sol";

/*
* This contract acts as storage for campaigns.
*/
contract HEOCampaignRegistry is IHEOCampaignRegistry, Ownable {
    HEODAO private _dao;

    /*
    * Maps owners do their campaigns
    */
    mapping(address => address[]) private _ownersToCampaigns;

    /*
    * Reverse map of campaigns to owners
    */
    mapping(address => address) private _campaignsToOwners;

    /*
    * List of all campaigns
    */
    address[] private _campaigns;

    constructor (HEODAO dao) public {
        require(address(dao) != address(0), "HEOCampaignFactory: DAO cannot be zero-address");
        _dao = dao;
    }
    /*
    * Override default Ownable::renounceOwnership to make sure
    * this contract does not get orphaned.
    */
    function renounceOwnership() public override  {
        revert("HEOCampaignRegistry: Cannot renounce ownership");
    }

    function registerCampaign(address campaign) external override {
        address factory = _dao.heoParams().contractAddress(HEOLib.CAMPAIGN_FACTORY);
        require(factory != address(0), "HEOCampaignRegistry: authorized instance of IHEOCampaignFactory is not set");
        require(factory == _msgSender(), "HEOCampaignRegistry: caller must be the authorized instance of IHEOCampaignFactory");
        address campaignOwner = Ownable(campaign).owner();
        _ownersToCampaigns[campaignOwner].push(campaign);
        _campaignsToOwners[campaign] = campaignOwner;
        _campaigns.push(campaign);
    }

    function myCampaigns() public view returns (address[] memory) {
        return _ownersToCampaigns[_msgSender()];
    }

    function allCampaigns() public view returns (address[] memory) {
        return _campaigns;
    }

    function totalCampaigns() public view returns (uint256) {
        return _campaigns.length;
    }

    function getOwner(address campaign) external view override returns (address) {
        return _campaignsToOwners[campaign];
    }
}
