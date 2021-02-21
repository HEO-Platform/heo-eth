const HEOToken = artifacts.require("HEOToken");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEORewardFarm = artifacts.require("HEORewardFarm");
module.exports = function (deployer) {
  deployer.deploy(HEOToken, {overwrite: false}).then(function () {
    return deployer.deploy(HEOManualDistribution, web3.utils.toWei("85000"), 0, "Private Sale", HEOToken.address).then(
        function(iDistribution) {
          HEOToken.deployed().then(function(instance) {
              instance.addMinter(iDistribution.address);
            })
        });
  });
}
