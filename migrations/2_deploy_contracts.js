const HEOToken = artifacts.require("HEOToken");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
module.exports = async function (deployer) {
  deployer.deploy(HEOToken).then(function () {
    return deployer.deploy(HEOManualDistribution, web3.utils.toWei("85000"), 0, "Private Sale", HEOToken.address);
  });
  deployer.deploy(HEOCampaignRegistry);
  deployer.deploy(HEOGlobalParameters, 0, 20, 5, 86400, 365).then(function() {
    return deployer.deploy(HEOPriceOracle, HEOGlobalParameters.address);
  });
}
