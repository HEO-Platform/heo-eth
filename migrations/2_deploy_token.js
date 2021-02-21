const HEOToken = artifacts.require("HEOToken");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
module.exports = function (deployer) {
  deployer.deploy(HEOToken);
}
