const HEOParameters = artifacts.require("HEOParameters");
const HEODAO = artifacts.require("HEODAO");

var BN = web3.utils.BN;

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        console.log(`Network is ${network}`);
        if(!accounts[1]) {
            accounts[1] = "0x451e8791483CC82ADfd9d5a349D0DF03FBDcF44c";
        }
        if(!accounts[2]) {
            accounts[2] = "0xCcB643dC88B49687a41dbE7F39404D4Fa23beDAA";
        }
        console.log(`Accounts are ${accounts[0]}, ${accounts[1]}, ${accounts[2]}`);
        const KEY_PLATFORM_TOKEN_ADDRESS = 5;

        //deploy the DAO
        const iHEODao = await HEODAO.deployed();

        //instantiate main contracts
        const iHEOParams = await HEOParameters.deployed();

        await iHEODao.initVoters([accounts[0], accounts[1], accounts[2]]);

        //deply HEO token via the DAO
        await iHEODao.deployPlatformToken(new BN("100000000000000000000000000"),
            "Help Each Other platform token", "HEO", {from: accounts[0]});

        //register initial 3 voters
        const platformTokenAddress = await iHEOParams.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        console.log(`HEO coin address: ${platformTokenAddress}`);
    }
}
