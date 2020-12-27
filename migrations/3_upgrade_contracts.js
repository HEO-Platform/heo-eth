const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const HEOToken = artifacts.require("HEOToken");

module.exports = async function (deployer) {
    const existing = await HEOToken.deployed();
    const instance = await upgradeProxy(existing.address, HEOToken, { deployer });
    console.log("Upgraded", instance.address);
};