const HEOToken = artifacts.require("HEOToken");

const { deployProxy } = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer) {
  const instance = await deployProxy(HEOToken, [], { deployer});
  console.log('Deployed', instance.address);
}
