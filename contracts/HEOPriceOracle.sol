pragma solidity >=0.6.1;
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./HEOGlobalParameters.sol";
contract HEOPriceOracle is Ownable {
    using SafeMath for uint256;

    //current price of 1 HEO in tknBts/Wei of the currency identified by address
    mapping (address => uint256) private priceMap;
    //address of currency token => [global reward period] => price of 1 HEO in tknBits/Wei
    mapping(address => mapping(uint256 => uint256)) private historicalPriceMap;

    HEOGlobalParameters private _globalParams;

    constructor(HEOGlobalParameters globalParams) public {
        _globalParams = globalParams;
    }

    /*
    * Sets the price of HEO in {token}s.
    * If {token} is a zero-address, then the price is in native tokens of the blockchain (ETH, BSC, NEAR).
    */
    function setPrice(address token, uint256 price) public onlyOwner {
        priceMap[token] = price;
        uint256 currentPeriod = getCurrentPeriod();
        historicalPriceMap[token][currentPeriod] = price;
        //Fill gaps if any
        if(currentPeriod > 0) {
            currentPeriod = currentPeriod.sub(1);
            while(currentPeriod > 0 && historicalPriceMap[token][currentPeriod] == 0) {
                historicalPriceMap[token][currentPeriod] = price;
                currentPeriod = currentPeriod.sub(1);
            }
        }
    }

    function getCurrentPeriod() public view returns(uint256) {
        return block.timestamp.sub(_globalParams.globalRewardStart()).div(_globalParams.rewardPeriod());
    }
    /*
    * Get price of HEO in {token}s.
    * If {token} is a zero-address, then the price is in native tokens of the blockchain (ETH, BSC, NEAR).
    */
    function getPrice(address token) external view returns(uint256) {
        return priceMap[token];
    }

    /*
    * Get price of HEO in {token}s at {period}.
    * {period} is the number of _globalParams.rewardPeriod() since globalParams.globalRewardStart().
    * If {token} is a zero-address, then the price is in native tokens of the blockchain (ETH, BSC, NEAR).
    */
    function getPriceAtPeriod(address token, uint256 period) external view returns(uint256) {
        uint256 price = historicalPriceMap[token][period];
        while(price == 0 && period > 0) {
            period = period.sub(1);
            price = historicalPriceMap[token][period];
        }
        return price;
    }
}
