pragma solidity >=0.8.20;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./IHEOPriceOracle.sol";

contract HEOPriceOracle is IHEOPriceOracle, Ownable {

    struct Price {
        uint256 price;
        uint256 decimals;
    }

    //current price of HEO in currency identified by address
    mapping (address => Price) private priceMap;

    constructor() Ownable(msg.sender) public {
    }

    /*
    * Sets the price of HEO in {token}s.
    * If {token} is a zero-address, then the price is in native tokens of the blockchain (ETH, BSC, NEAR).
    */
    function setPrice(address token, uint256 price, uint256 decimals) public onlyOwner {
        priceMap[token].price = price;
        priceMap[token].decimals = decimals;
    }

    /*
    * Get price of HEO in {token}s.
    * If {token} is a zero-address, then the price is in native tokens of the blockchain (ETH, BSC, NEAR).
    */
    function getPrice(address token) external view override returns(uint256 price, uint256 decimals) {
        price = priceMap[token].price;
        decimals = priceMap[token].decimals;
    }
}
