// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import "./IHEOCampaignFactory.sol";

interface IHEOCampaignRegistry {
    function registerCampaign(address campaign) external;
    function getOwner(address campaign) external view returns (address);
}
