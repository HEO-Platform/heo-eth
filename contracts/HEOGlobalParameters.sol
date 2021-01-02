pragma solidity >=0.6.1;
import "openzeppelin-solidity/contracts/access/Ownable.sol";
contract HEOGlobalParameters is Ownable {
    uint256 private _serviceFee;
    uint256 private _profitabilityCoefficient; //X

    constructor(uint256 serviceFee, uint256 profitabilityCoefficient) public {
        _serviceFee = serviceFee;
        _profitabilityCoefficient = profitabilityCoefficient;
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
}
