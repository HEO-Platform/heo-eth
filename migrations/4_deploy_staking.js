const HEODAO = artifacts.require("HEODAO");
const HEOStaking = artifacts.require("HEOStaking");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.deployed();
        await deployer.deploy(HEOStaking);
        const iStaking = await HEOStaking.deployed();
        console.log(`HEOStaking address on ${network}: ${iStaking.address}`);

        let txReceipt = await iStaking.transferOwnership(iHEODao.address);
        console.log(`transferOwnership transaction cost: ${txReceipt.receipt.gasUsed}`);
        console.log(`transferOwnership transaction hash: ${txReceipt.receipt.transactionHash}`);
        console.log(`transferOwnership transaction block hash: ${txReceipt.receipt.blockHash}`);

        txReceipt = await iHEODao.setStaking(iStaking.address);
        console.log(`setStaking transaction cost: ${txReceipt.receipt.gasUsed}`);
        console.log(`setStaking transaction hash: ${txReceipt.receipt.transactionHash}`);
        console.log(`setStaking transaction block hash: ${txReceipt.receipt.blockHash}`);
    }
}
