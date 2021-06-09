const HEOParameters = artifacts.require("HEOParameters");
const HEODAO = artifacts.require("HEODAO");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.deployed();
        await deployer.deploy(HEOParameters);
        const iHEOParams = await HEOParameters.deployed();
        await iHEOParams.transferOwnership(iHEODao.address);
        await iHEODao.setParams(iHEOParams.address);
        console.log(`HEOParameters address on ${network}: ${iHEOParams.address}`);
    }
}
