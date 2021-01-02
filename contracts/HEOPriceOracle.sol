pragma solidity >=0.6.1;
import "openzeppelin-solidity/contracts/access/Ownable.sol";
contract HEOPriceOracle is Ownable {
    mapping (address => uint256) private priceMap;
    constructor() public {

    }

    /**
    * Sets the price of HEO in {token}s.
    * If {token} is a zero-address, then the price is in native tokens of the blockchain (ETH, BSC, NEAR).
    */
    function setPrice(address token, uint256 price) public onlyOwner {
        priceMap[token] = price;
    }

    /**
    * Get price of HEO in {token}s.
    * If {token} is a zero-address, then the price is in native tokens of the blockchain (ETH, BSC, NEAR).
    */
    function getPrice(address token) external view returns(uint256) {
        return priceMap[token];
    }
}
