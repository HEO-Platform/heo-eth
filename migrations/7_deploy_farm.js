const HEODAO = artifacts.require("HEODAO");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.deployed();
        await deployer.deploy(HEOPriceOracle);
        const iRewardFarm = await HEOPriceOracle.deployed();
        console.log(`HEORewardFarm coin address on ${network}: ${iRewardFarm.address}`);
    }
}
