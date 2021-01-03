pragma solidity >=0.6.1;

import "./IHEOCampaign.sol";

interface IHEOCampaignRegistry {
    function registerCampaign(IHEOCampaign campaign) external;
    function getOwner(IHEOCampaign campaign) external view returns (address);
}
