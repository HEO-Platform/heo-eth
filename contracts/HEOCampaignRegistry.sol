pragma solidity >=0.6.1 <0.7.0;

import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "./IHEOCampaignFactory.sol";
import "./IHEOCampaign.sol";
import "./IHEOCampaignRegistry.sol";

contract HEOCampaignRegistry is IHEOCampaignRegistry, Ownable {
    /**
    * Maps owners do their campaigns
    */
    mapping(address => IHEOCampaign[]) private _ownersToCampaigns;

    /**
    * Reverse map of campaigns to owners
    */
    mapping(address => address) private _campaignsToOwners;

    //use interface, so that we can replace the factory contract
    IHEOCampaignFactory private _factory;

    /**
    * Override default Ownable::renounceOwnership to make sure
    * this contract does not get orphaned.
    */
    function renounceOwnership() public override  {
        revert("HEOCampaignRegistry: Cannot renounce ownership");
    }

    function getFactory() public view returns (IHEOCampaignFactory) {
        return _factory;
    }

    function setFactory(IHEOCampaignFactory factory) public onlyOwner {
        _factory = factory;
    }

    function registerCampaign(address beneficiary, IHEOCampaign campaign) external override {
        _ownersToCampaigns[beneficiary].push(campaign);
        _campaignsToOwners[address(campaign)] = beneficiary;
    }
}
