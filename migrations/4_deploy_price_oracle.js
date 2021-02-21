const HEOToken = artifacts.require("HEOToken");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEORewardFarm = artifacts.require("HEORewardFarm");
module.exports = function (deployer) {
  deployer.deploy(HEOToken, {overwrite: false}).then(function () {
    return deployer.deploy(HEOGlobalParameters, 0, 20, 86400, 365, HEOToken.address, {overwrite: false}).then(function() {
      return deployer.deploy(HEOPriceOracle, HEOGlobalParameters.address);
    });
  });


}
