const HEODAO = artifacts.require("HEODAO");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.deployed();
        await deployer.deploy(HEOCampaignFactory, iHEODao.address);
        const iCampaignFactory = await HEOCampaignFactory.deployed();
        await iCampaignFactory.transferOwnership(iHEODao.address);
        console.log(`HEOCampaignFactory address on ${network}: ${HEOCampaignFactory.address}`);
    }
}
