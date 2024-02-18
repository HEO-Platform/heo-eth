// SPDX-License-Identifier: MIT

pragma solidity >=0.8.20;

interface IHEOCampaignFactory {
    function createCampaign(address payable beneficiary) external;
}
