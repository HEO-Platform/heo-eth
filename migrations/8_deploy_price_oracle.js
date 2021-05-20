const HEOPriceOracle = artifacts.require("HEOPriceOracle");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        await deployer.deploy(HEOPriceOracle);
        const iPriceOracle = await HEOPriceOracle.deployed();
        console.log(`HEOPriceOracle coin address on ${network}: ${iPriceOracle.address}`);
    }
}
