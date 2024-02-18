// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import "./IHEOBudget.sol";

interface IHEORewardFarm is IHEOBudget {
    function addDonation(address donor, uint256 amount, address token) external;
    function fullReward(uint256 amount, uint256 heoPrice, uint256 priceDecimals) external view returns(uint256);
}
