const HEOToken = artifacts.require("HEOToken");

module.exports = async function (deployer) {
  deployer.deploy(HEOToken);
}
