const HEODAO = artifacts.require("HEODAO");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.deployed();
        await deployer.deploy(HEOCampaignFactory, iHEODao.address);
        const iCampaignFactory = await HEOCampaignFactory.deployed();
        console.log(`HEOCampaignFactory address on ${network}: ${HEOCampaignFactory.address}`);

        let txReceipt = await iCampaignFactory.transferOwnership(iHEODao.address);
        console.log(`transferOwnership transaction cost: ${txReceipt.receipt.gasUsed}`);
        console.log(`transferOwnership transaction hash: ${txReceipt.receipt.transactionHash}`);
        console.log(`transferOwnership transaction block hash: ${txReceipt.receipt.blockHash}`);
    }
}
