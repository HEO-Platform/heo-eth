// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

interface IHEOBudget {
    function assignTreasurer(address _treasurer) external;
    function withdraw(address _token) external;
    function transferOwnership(address payable newOwner) external;
    function replenish(address _token, uint256 _amount) external;
}
