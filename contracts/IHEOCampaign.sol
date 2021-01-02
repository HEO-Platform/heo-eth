pragma solidity >=0.6.1;

interface IHEOCampaign {
    function maxAmount() external view returns (uint256);
    function donationYield() external view returns (uint256);
    function profitabilityCoefficient() external view returns (uint256);
    function z() external view returns (uint256);
    function serviceFee() external view returns (uint256);
    function isActive() external view returns (bool);
    function heoPrice() external view returns (uint256);
    function beneficiary() external view returns (address);
}
