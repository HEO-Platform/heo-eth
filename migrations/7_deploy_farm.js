const HEODAO = artifacts.require("HEODAO");
const HEORewardFarm = artifacts.require("HEORewardFarm");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.deployed();
        await deployer.deploy(HEORewardFarm, iHEODao.address);
        const iRewardFarm = await HEORewardFarm.deployed(); //TKcvNr4sifHFgakEjZgcmXz4Z6dmeQaTbZ
        console.log(`HEORewardFarm address on ${network}: ${iRewardFarm.address}`);
    }
}
