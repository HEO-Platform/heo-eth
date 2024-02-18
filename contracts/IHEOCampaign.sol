// SPDX-License-Identifier: MIT

pragma solidity >=0.8.20;

interface IHEOCampaign {
    function maxAmount() external view returns (uint256);
    function isActive() external view returns (bool);
    function beneficiary() external view returns (address);
    function heoLocked() external view returns (uint256);
    function raisedAmount() external view returns (uint256);
    function close() external;
    function updateMaxAmount(uint256 newMaxAmount) external;
    function metaData() external view returns (string memory);
    function updateMetaData(string memory newMetaData) external;
    function update(uint256 newMaxAmount, string memory newMetaData) external;
}

