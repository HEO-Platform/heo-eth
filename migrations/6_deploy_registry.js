const HEODAO = artifacts.require("HEODAO");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.deployed(); //TXSSdhGUh4iJrpz8SfgirhF5v4UDgxG5E7
        await deployer.deploy(HEOCampaignRegistry, iHEODao.address);
        const iRegistry = await HEOCampaignRegistry.deployed(); //TNurU7nqrsayxkjbYyezR9FKYThh5KdsLQ
        await iRegistry.transferOwnership(iHEODao.address);
        console.log(`HEOCampaignRegistry address on ${network}: ${iRegistry.address}`);
    }
}
