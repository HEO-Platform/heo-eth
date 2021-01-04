pragma solidity >=0.6.1;
import "openzeppelin-solidity/contracts/access/Ownable.sol";
contract HEOGlobalParameters is Ownable {
    uint256 private _serviceFee;
    uint256 private _profitabilityCoefficient; //X
    uint8 private _yDecimals = 5;

    constructor(uint256 serviceFee, uint256 profitabilityCoefficient, uint8 yDecimals) public {
        _serviceFee = serviceFee;
        _profitabilityCoefficient = profitabilityCoefficient;
        _yDecimals = yDecimals;
    }

    function setServiceFee (uint256 serviceFee) external onlyOwner {
        _serviceFee = serviceFee;
    }

    function setProfitabilityCoefficient(uint256 profitabilityCoefficient) external onlyOwner {
        _profitabilityCoefficient = profitabilityCoefficient;
    }

    function profitabilityCoefficient() external view returns (uint256) {
        return _profitabilityCoefficient;
    }

    function serviceFee() external view returns (uint256) {
        return _serviceFee;
    }

    function yDecimals() external view returns(uint8) {
        return _yDecimals;
    }
}
