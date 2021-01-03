pragma solidity >=0.6.1;

import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "./IHEOCampaignFactory.sol";
import "./IHEOCampaign.sol";
import "./IHEOCampaignRegistry.sol";

/**
* This contract acts as storage for campaigns.
**/
contract HEOCampaignRegistry is IHEOCampaignRegistry, Ownable {
    /**
    * Maps owners do their campaigns
    */
    mapping(address => address[]) private _ownersToCampaigns;

    /**
    * Reverse map of campaigns to owners
    */
    mapping(address => address) private _campaignsToOwners;

    //use interface, so that we can replace the factory contract
    IHEOCampaignFactory private _factory;

    constructor () public {
    }
    /**
    * Override default Ownable::renounceOwnership to make sure
    * this contract does not get orphaned.
    */
    function renounceOwnership() public override  {
        revert("HEOCampaignRegistry: Cannot renounce ownership");
    }

    /**
    * Instance of IHEOCampaignFactory that is authorized to store
    * campaigns in this contract.
    */
    function getFactory() public view returns (IHEOCampaignFactory) {
        return _factory;
    }

    function setFactory(IHEOCampaignFactory factory) public onlyOwner {
        _factory = factory;
    }

    function registerCampaign(IHEOCampaign campaign) external override {
        require(address(_factory) != address(0), "HEOCampaignRegistry: authorized instance of IHEOCampaignFactory is not set.");
        require(address(_factory) == _msgSender(), "HEOCampaignRegistry: caller must be the authorized instance of IHEOCampaignFactory.");
        _ownersToCampaigns[campaign.beneficiary()].push(address(campaign));
        _campaignsToOwners[address(campaign)] = campaign.beneficiary();
    }

    function getMyCampaigns() public view returns (address[] memory) {
        return _ownersToCampaigns[_msgSender()];
    }

    function getOwner(IHEOCampaign campaign) external view override returns (address) {
        return _campaignsToOwners[address(campaign)];
    }
}
