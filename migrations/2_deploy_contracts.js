const HEOToken = artifacts.require("HEOToken");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");

module.exports = async function (deployer) {
  deployer.deploy(HEOToken).then(function () {
    return deployer.deploy(HEOManualDistribution, 85000, 0, "Private Sale", HEOToken.address);
  });
}
