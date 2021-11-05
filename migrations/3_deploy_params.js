const HEOParameters = artifacts.require("HEOParameters");
const HEODAO = artifacts.require("HEODAO");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.deployed();
        await deployer.deploy(HEOParameters);
        const iHEOParams = await HEOParameters.deployed();
        console.log(`HEOParameters address on ${network}: ${iHEOParams.address}`);

        let txReceipt = await iHEOParams.transferOwnership(iHEODao.address);
        console.log(`transferOwnership transaction cost: ${txReceipt.receipt.gasUsed}`);
        console.log(`transferOwnership transaction hash: ${txReceipt.receipt.transactionHash}`);
        console.log(`transferOwnership transaction block hash: ${txReceipt.receipt.blockHash}`);

        txReceipt = await iHEODao.setParams(iHEOParams.address);
        console.log(`setParams transaction cost: ${txReceipt.receipt.gasUsed}`);
        console.log(`setParams transaction hash: ${txReceipt.receipt.transactionHash}`);
        console.log(`setParams transaction block hash: ${txReceipt.receipt.blockHash}`);
    }
}
