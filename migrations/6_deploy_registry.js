const HEODAO = artifacts.require("HEODAO");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.deployed();
        await deployer.deploy(HEOCampaignRegistry, iHEODao.address);
        const iRegistry = await HEOCampaignRegistry.deployed();
        console.log(`HEOCampaignRegistry address on ${network}: ${iRegistry.address}`);

        let txReceipt = await iRegistry.transferOwnership(iHEODao.address);
        console.log(`transferOwnership transaction cost: ${txReceipt.receipt.gasUsed}`);
        console.log(`transferOwnership transaction hash: ${txReceipt.receipt.transactionHash}`);
        console.log(`transferOwnership transaction block hash: ${txReceipt.receipt.blockHash}`);

    }
}
