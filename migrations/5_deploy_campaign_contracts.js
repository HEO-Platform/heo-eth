const HEOToken = artifacts.require("HEOToken");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEORewardFarm = artifacts.require("HEORewardFarm");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
module.exports = function (deployer) {
  deployer.deploy(HEOToken, {overwrite: false}).then(
      function () {
        return deployer.deploy(HEOCampaignRegistry).then(
          function() {
            return deployer.deploy(HEOGlobalParameters, 0, 20, 86400, 365, HEOToken.address,
                {overwrite: false}).then(
              function() {
                return deployer.deploy(HEOPriceOracle, HEOGlobalParameters.address, {overwrite: false}).then(
                  function() {
                    return deployer.deploy(HEORewardFarm, HEOGlobalParameters.address,
                        HEOPriceOracle.address, HEOCampaignRegistry.address).then(
                      function() {
                        return deployer.deploy(HEOCampaignFactory, HEOCampaignRegistry.address,
                          HEOGlobalParameters.address, HEOPriceOracle.address, HEORewardFarm.address).then(
                          function() {
                            HEOCampaignRegistry.deployed().then(function(instance) {
                              return instance.setFactory(HEOCampaignFactory.address);
                            });
                            HEOToken.deployed().then(function(instance) {
                              return instance.addBurner(HEOCampaignFactory.address);
                            });
                          });
                      });
                  })
              });
          });
      });

}
