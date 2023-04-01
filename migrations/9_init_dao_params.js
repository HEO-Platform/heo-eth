const HEOParameters = artifacts.require("HEOParameters");
const HEODAO = artifacts.require("HEODAO");

var BN = web3.utils.BN;

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        console.log(`Network is ${network}`);
        console.log(`Accounts are ${accounts[0]}, ${accounts[1]}, ${accounts[2]}`);
        const KEY_PLATFORM_TOKEN_ADDRESS = 5;

        //deploy the DAO
        const iHEODao = await HEODAO.deployed(); //TXSSdhGUh4iJrpz8SfgirhF5v4UDgxG5E7

        //instantiate main contracts
        const iHEOParams = await HEOParameters.deployed();

        await iHEODao.initVoters([accounts[0], accounts[1], accounts[2]]); //https://shasta.tronscan.org/#/transaction/2499c75c2d150028216703936fd7e49fbd7801cd243e43e3961a3c5ed433847a

        //deply HEO token via the DAO
        await iHEODao.deployPlatformToken(new BN("100000000000000000000000000"),
            "Help Each Other platform token", "HEO", {from: accounts[0]}); //https://shasta.tronscan.org/#/transaction/721f92e2a46e7e2317d1bd8c581bb3adc46b91fb271a6499a8c84949b78a698f

        //register initial 3 voters
        const platformTokenAddress = await iHEOParams.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        console.log(`HEO coin address: ${platformTokenAddress}`);
    }
}
