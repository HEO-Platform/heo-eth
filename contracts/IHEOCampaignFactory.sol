// SPDX-License-Identifier: MIT

pragma solidity >=0.8.20;

interface IHEOCampaignFactory {
    function createCampaign(uint256 maxAmount,
        address payable beneficiary, string memory metaData) external;
}
