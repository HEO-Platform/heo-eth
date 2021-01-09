pragma solidity >=0.6.1;

interface IHEORewardFarm {
    function addDonation(address donor, uint256 amount, address token) external;
    function calculateReward(address donor) external view returns (uint256);
}
