pragma solidity >=0.6.1 <0.7.0;

import "./IHEOCampaign.sol";

interface IHEOCampaignRegistry {
    function registerCampaign(address beneficiary, IHEOCampaign campaign) external;
}
