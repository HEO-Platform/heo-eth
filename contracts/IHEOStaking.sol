// SPDX-License-Identifier: MIT
pragma solidity >=0.6.1;

interface IHEOStaking {
    function increaseStake(uint256 _amount, address _token, address _voter) external;

    function reduceStake(uint256 _amount, address _token, address _voter) external;

    function isVoter(address _voter) external view returns(bool);

    function stakedTokensByVoter(address voter, address token) external view returns(uint256);

    function stakedVoterByToken(address token, uint256 index) external view returns(address);

    function numStakedVotersByToken(address token) external view returns(uint256);

    function voterStake(address voter) external view returns(uint256);

    function stakedTokens(address token) external view returns(uint256);

    function totalAmountStaked() external view returns (uint256);

    function numVoters() external view returns(uint256);

    function setParams(address params) external;

    function unstakeAll() external;
}
