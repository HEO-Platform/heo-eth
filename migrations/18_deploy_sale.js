const HEODAO = artifacts.require("HEODAO");
const HEOSale = artifacts.require("HEOSale");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.at("0x125a5d1ad1bEE45D9A701D751495D90D8a22d1f1");
        await deployer.deploy(HEOSale, iHEODao.address);
        const iSale = await HEOSale.deployed();
        console.log(`HEOSale address on ${network}: ${iSale.address}`);
    }
}
