const HEODAO = artifacts.require("HEODAO");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.at("TXSSdhGUh4iJrpz8SfgirhF5v4UDgxG5E7");
        await deployer.deploy(HEOCampaignFactory, iHEODao.address); //TVRDVuFxuFY2gXCDxUrBDLU1rvcgfiBkBn
        const iCampaignFactory = await HEOCampaignFactory.deployed(); //TVRDVuFxuFY2gXCDxUrBDLU1rvcgfiBkBn
        await iCampaignFactory.transferOwnership(iHEODao.address);
        console.log(`HEOCampaignFactory address on ${network}: ${HEOCampaignFactory.address}`);
    }
}
