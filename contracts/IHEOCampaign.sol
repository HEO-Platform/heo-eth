// SPDX-License-Identifier: MIT

pragma solidity >=0.6.1;

interface IHEOCampaign {
    function maxAmount() external view returns (uint256);
    function isActive() external view returns (bool);
    function beneficiary() external view returns (address);
    function heoLocked() external view returns (uint256);
    function raisedAmount() external view returns (uint256);
    function currency() external view returns (address);
    function close() external;
    function changeMaxAmount(uint256 newMaxAmount) external;
    function metaData() external view returns (string memory);
    function updateMetaData(string memory metaData) external;
}
