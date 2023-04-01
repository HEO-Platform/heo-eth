const HEOPriceOracle = artifacts.require("HEOPriceOracle");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        await deployer.deploy(HEOPriceOracle);
        const iPriceOracle = await HEOPriceOracle.deployed(); //TPEHYtQjkxJpxK6ZK4WcNa63ts9y9p5jSj
        console.log(`HEOPriceOracle address on ${network}: ${iPriceOracle.address}`);
    }
}
