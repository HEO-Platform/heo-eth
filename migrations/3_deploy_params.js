const HEOParameters = artifacts.require("HEOParameters");
const HEODAO = artifacts.require("HEODAO");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.deployed(); //TXSSdhGUh4iJrpz8SfgirhF5v4UDgxG5E7
        await deployer.deploy(HEOParameters);
        const iHEOParams = await HEOParameters.deployed(); //TL8cQrCc6GTf5tmrxU51kNXbH9m2w1MFir
        await iHEOParams.transferOwnership(iHEODao.address); //done
        await iHEODao.setParams(iHEOParams.address); //done
        console.log(`HEOParameters address on ${network}: ${iHEOParams.address}`);
    }
}
