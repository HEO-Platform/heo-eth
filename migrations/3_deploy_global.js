const HEOToken = artifacts.require("HEOToken");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
module.exports = function (deployer) {
  deployer.deploy(HEOTokenm, {overwrite: false}).then(function () {
      return deployer.deploy(HEOGlobalParameters, 0, 20, 86400, 365, HEOToken.address);
  });
}
