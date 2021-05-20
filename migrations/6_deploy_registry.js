const HEODAO = artifacts.require("HEODAO");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.deployed();
        await deployer.deploy(HEOCampaignRegistry, iHEODao.address);
        const iRegistry = await HEOCampaignRegistry.deployed();
        await iRegistry.transferOwnership(iHEODao.address);
        console.log(`HEOCampaignFactory coin address on ${network}: ${iRegistry.address}`);
    }
}
