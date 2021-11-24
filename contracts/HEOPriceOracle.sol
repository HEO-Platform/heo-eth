pragma solidity >=0.6.1;
import "@openzeppelin/contracts@3.3.0/access/Ownable.sol";
import "@openzeppelin/contracts@3.3.0/math/SafeMath.sol";
import "./IHEOPriceOracle.sol";

contract HEOPriceOracle is IHEOPriceOracle, Ownable {
    using SafeMath for uint256;

    struct Price {
        uint256 price;
        uint256 decimals;
    }

    //current price of HEO in currency identified by address
    mapping (address => Price) private priceMap;

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
