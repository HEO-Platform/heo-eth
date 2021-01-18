const HEOToken = artifacts.require("HEOToken");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEORewardFarm = artifacts.require("HEORewardFarm");
module.exports = function (deployer) {
  deployer.deploy(HEOToken).then(function () {
    return deployer.deploy(HEOManualDistribution, web3.utils.toWei("85000"), 0, "Private Sale", HEOToken.address).then(function() {
      return deployer.deploy(HEOCampaignRegistry).then(function() {
        return deployer.deploy(HEOGlobalParameters, 0, 20, 18, 86400, 365, HEOToken.address).then(function() {
          return deployer.deploy(HEOPriceOracle, HEOGlobalParameters.address).then(function() {
            return deployer.deploy(HEORewardFarm, HEOGlobalParameters.address, HEOPriceOracle.address, HEOCampaignRegistry.address);
          })
        });
      })
    })
  });


}
