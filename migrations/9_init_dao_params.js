const HEOParameters = artifacts.require("HEOParameters");
const HEODAO = artifacts.require("HEODAO");

var BN = web3.utils.BN;

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        console.log(`Network is ${network}`);
        console.log(`Accounts are ${accounts[0]}, ${accounts[1]}, ${accounts[2]}`);
        const KEY_PLATFORM_TOKEN_ADDRESS = 5;

        //deploy the DAO
        const iHEODao = await HEODAO.deployed();

        //instantiate main contracts
        const iHEOParams = await HEOParameters.deployed();

        let txReceipt = await iHEODao.initVoters([accounts[0], accounts[1], accounts[2]]);
        console.log(`initVoters transaction cost: ${txReceipt.receipt.gasUsed}`);
        console.log(`initVoters transaction hash: ${txReceipt.receipt.transactionHash}`);
        console.log(`initVoters transaction block hash: ${txReceipt.receipt.blockHash}`);
        if(network == "auroratest" || network=="aurora") {
            console.log(`initVoters NEAR transaction hash: ${txReceipt.receipt.nearTransactionHash}`);
            console.log(`initVoters NEAR receipt hash: ${txReceipt.receipt.nearReceiptHash}`);
        }
        console.log(`initVoters transaction block number: ${txReceipt.receipt.blockNumber}`);

        //deploy HEO token via the DAO
        txReceipt = await iHEODao.deployPlatformToken(new BN("100000000000000000000000000"),
            "Help Each Other platform token", "HEO", {from: accounts[0]});
        console.log(`deployPlatformToken transaction cost: ${txReceipt.receipt.gasUsed}`);
        console.log(`deployPlatformToken transaction hash: ${txReceipt.receipt.transactionHash}`);
        console.log(`deployPlatformToken transaction block hash: ${txReceipt.receipt.blockHash}`);
        if(network == "auroratest" || network=="aurora") {
            console.log(`deployPlatformToken NEAR transaction hash: ${txReceipt.receipt.nearTransactionHash}`);
            console.log(`deployPlatformToken NEAR receipt hash: ${txReceipt.receipt.nearReceiptHash}`);
        }
        console.log(`deployPlatformToken transaction block number: ${txReceipt.receipt.blockNumber}`);

        //register initial 3 voters
        const platformTokenAddress = await iHEOParams.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        console.log(`HEO coin address: ${platformTokenAddress}`);
    }
}
