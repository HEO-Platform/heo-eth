pragma solidity >=0.6.1 <0.7.0;

interface IHEOCampaign {
    function maxAmount() external view returns (uint256);
    function donationYield() external view returns (uint256);
    function profitabilityCoefficient() external view returns (uint256);
    function fundRaisingCost() external view returns (uint256);
}
