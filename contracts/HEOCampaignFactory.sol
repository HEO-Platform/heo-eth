pragma solidity >=0.6.1 <0.7.0;

import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "./HEOCampaign.sol";
import "./IHEOCampaignFactory.sol";
import "./IHEOCampaignRegistry.sol";

contract HEOCampaignFactory is IHEOCampaignFactory, Ownable {
    IHEOCampaignRegistry private _registry;
    constructor () public {

    }

    function createCampaign(uint256 maxAmount) public {
        _registry.registerCampaign(_msgSender(), new HEOCampaign(maxAmount, _msgSender()));
    }

    /**
    * Override default Ownable::renounceOwnership to make sure
    * this contract does not get orphaned.
    */
    function renounceOwnership() public override {
        revert("HEOCampaignFactory: Cannot renounce ownership");
    }

    function setRegistry(IHEOCampaignRegistry registry) external {
        _registry = registry;
    }
}
