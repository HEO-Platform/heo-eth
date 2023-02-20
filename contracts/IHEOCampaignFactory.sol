// SPDX-License-Identifier: MIT

pragma solidity >=0.6.1;

interface IHEOCampaignFactory {
    function createCampaign(uint256 maxAmount,
        address payable beneficiary, string memory metaData) external;
}
