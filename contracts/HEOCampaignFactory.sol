// SPDX-License-Identifier: MIT
pragma solidity >=0.6.1;

import "@openzeppelin/contracts@3.3.0/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@3.3.0/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts@3.3.0/access/Ownable.sol";
import "@openzeppelin/contracts@3.3.0/math/SafeMath.sol";
import "@openzeppelin/contracts@3.3.0/utils/ReentrancyGuard.sol";
import "./HEOCampaign.sol";
import "./IHEOPriceOracle.sol";
import "./IHEOCampaignFactory.sol";
import "./IHEOCampaignRegistry.sol";
import "./IHEORewardFarm.sol";
import "./HEOParameters.sol";
import "./HEODAO.sol";
import "./HEOLib.sol";

contract HEOCampaignFactory is IHEOCampaignFactory, Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    HEODAO private _dao;

    event CampaignDeployed (
        address indexed campaignAddress,
        address indexed owner,
        address indexed beneficiary,
        uint256 maxAmount,
        address token
    );

    constructor (HEODAO dao) public {
        require(address(dao) != address(0), "HEOCampaignFactory: DAO cannot be zero-address");
        _dao = dao;
    }

    /*
     @dev creates a campaign, registers it in campaign registry and transfers ownership of HEOCampaign instance
     to the caller.
    */
    function createCampaign(uint256 maxAmount, address token, address payable beneficiary, string memory metaData) external override nonReentrant {
        HEOCampaign campaign = new HEOCampaign(maxAmount, beneficiary, token, _dao, 0, 0, 0, 0, 0, address(0), metaData);
        IHEOCampaignRegistry registry = IHEOCampaignRegistry(_dao.heoParams().contractAddress(HEOLib.CAMPAIGN_REGISTRY));
        campaign.transferOwnership(_msgSender());
        registry.registerCampaign(address(campaign));
        emit CampaignDeployed(address(campaign), address(_msgSender()), beneficiary, maxAmount, token);
    }

    function createRewardCampaign(uint256 maxAmount, address token, address payable beneficiary, string memory metaData) external override nonReentrant {
        require(maxAmount > 0, "HEOCampaignFactory: maxAmount has to be greater than zero");
        address heoAddr = _dao.heoParams().contractAddress(HEOLib.PLATFORM_TOKEN_ADDRESS);
        (uint256 heoPrice, uint256 heoPriceDecimals) = IHEOPriceOracle(_dao.heoParams().contractAddress(HEOLib.PRICE_ORACLE)).getPrice(token);
        // Example 1: 1 HEO = 1USDC, maxAmount = 100 USDC, fee = 5% = 5 USDC = 2.5HEO
        // Example 2: 1 HEO = 0.01ETH, maxAmount = 10 ETH, fee = 2.5% = 0.25 ETH = 25HEO
        uint256 heoLocked = _dao.heoParams().calculateFee(maxAmount).div(heoPrice).mul(heoPriceDecimals);
        HEOCampaign campaign = new HEOCampaign(maxAmount, beneficiary, token, _dao,  heoLocked, heoPrice,
            heoPriceDecimals, _dao.heoParams().fundraisingFee(), _dao.heoParams().fundraisingFeeDecimals(), heoAddr, metaData);
        ERC20(heoAddr).safeTransferFrom(_msgSender(), address(campaign), heoLocked);

        IHEOCampaignRegistry registry = IHEOCampaignRegistry(_dao.heoParams().contractAddress(HEOLib.CAMPAIGN_REGISTRY));
        campaign.transferOwnership(_msgSender());
        registry.registerCampaign(address(campaign));
        emit CampaignDeployed(address(campaign), address(_msgSender()), beneficiary, maxAmount, token);
    }
    /*
    * Override default Ownable::renounceOwnership to make sure
    * this contract does not get orphaned.
    */
    function renounceOwnership() public override {
        revert("HEOCampaignFactory: Cannot renounce ownership.");
    }
}
