pragma solidity >=0.6.1;

import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "./HEOCampaign.sol";
import "./HEOToken.sol";
import "./IHEOCampaignFactory.sol";
import "./IHEOCampaignRegistry.sol";
import "./HEOGlobalParameters.sol";
import "./HEOPriceOracle.sol";

contract HEOCampaignFactory is IHEOCampaignFactory, Ownable {
    IHEOCampaignRegistry private _registry;
    HEOToken private _heoToken;
    HEOGlobalParameters private _globalParams;
    HEOPriceOracle private _priceOracle;

    /**
    * {registry} is the storage contract that holds maps of
    * campaigns and owners.
    * {heoToken} instance of HEOToken
    */
    constructor (IHEOCampaignRegistry registry, HEOToken heoToken, HEOGlobalParameters globalParams,
        HEOPriceOracle priceOracle) public {
        require(address(registry) != address(0), "HEOCampaignFactory: IHEOCampaignRegistry cannot be zero-address");
        require(address(heoToken) != address(0), "HEOCampaignFactory: HEOToken cannot be zero-address");
        require(address(globalParams) != address(0), "HEOCampaignFactory: HEOGlobalParameters cannot be zero-address");
        require(address(priceOracle) != address(0), "HEOCampaignFactory: HEOPriceOracle cannot be zero-address");

        _registry = registry;
        _heoToken = heoToken;
        _globalParams = globalParams;
        _priceOracle = priceOracle;
    }

    /**
    * In order to create a campaign we have to burn beneficiary's HEO.
    * To do that this factory has to be registered in HEOToken._burners map.
    */
    function createCampaign(uint256 maxAmount, uint256 heoToBurn, address token) public {
        require(heoToBurn > 0, "HEOCampaignFactory: cannot create a campaign without burning HEO tokens");
        uint256 x = _globalParams.profitabilityCoefficient();
        uint256 fee = _globalParams.serviceFee();
        uint256 price = _priceOracle.getPrice(token);
        _heoToken.burn(_msgSender(), heoToBurn);
        uint8 decimals = _heoToken.decimals();
        _registry.registerCampaign(new HEOCampaign(maxAmount, _msgSender(), x, heoToBurn, price, decimals, fee));
    }

    /**
    * Override default Ownable::renounceOwnership to make sure
    * this contract does not get orphaned.
    */
    function renounceOwnership() public override {
        revert("HEOCampaignFactory: Cannot renounce ownership");
    }

    function setRegistry(IHEOCampaignRegistry registry) external {
        _registry = registry;
    }
}
