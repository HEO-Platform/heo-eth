const HEOParameters = artifacts.require("HEOParameters");
const HEOToken = artifacts.require("HEOToken");
const HEODAO = artifacts.require("HEODAO");
const HEOStaking = artifacts.require("HEOStaking");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEORewardFarm = artifacts.require("HEORewardFarm");
const HEOBudget = artifacts.require("HEOBudget");

const fs = require('fs');
module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        console.log(`Network is ${network}`);
        try {
            fs.mkdirSync(`./build/web/${network}`);
        } catch (err) {

        }

        //HEODao
        let instance = await HEODAO.deployed();
        _writeFile("HEODAO", false, instance, network);

        //HEOCampaignFactory
        instance = await HEOCampaignFactory.deployed();
        _writeFile("HEOCampaignFactory", false, instance, network);

        //HEOParameters
        instance = await HEOParameters.deployed();
        _writeFile("HEOParameters", false, instance, network);

        //HEOCampaignRegistry
        instance = await HEOCampaignRegistry.deployed();
        _writeFile("HEOCampaignRegistry", false, instance, network);

        //HEOPriceOracle
        instance = await HEOPriceOracle.deployed();
        _writeFile("HEOPriceOracle", false, instance, network);

        //HEORewardFarm
        instance = await HEORewardFarm.deployed();
        _writeFile("HEORewardFarm", false, instance, network);

        //HEORewardFarm
        instance = await HEOStaking.deployed();
        _writeFile("HEOStaking", false, instance, network);

        //HEOBudget
        _writeFile("HEOCampaign", true,null, network);

        //HEOBudget
        _writeFile("HEOBudget", true, null, network);

        //ERC20
        _writeFile("ERC20", true, null, network);

        //HEOToken
        const KEY_PLATFORM_TOKEN_ADDRESS = 5;
        const iHEOParams = await HEOParameters.deployed();
        const platformTokenAddress = await iHEOParams.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        instance = await HEOToken.at(platformTokenAddress);
        _writeFile("HEOToken", false, instance, network);
    }

}

function _writeFile(artifactName, abiOnly, instance, network) {
    const contractJSON = fs.readFileSync(`./build/contracts/${artifactName}.json`);
    const contractABI = JSON.parse(contractJSON).abi;
    const data = JSON.stringify(contractABI);
    try {
        fs.mkdirSync(`./build/web/${network}`);
    } catch (err) {

    }
    if(abiOnly) {
        fs.writeFileSync(`./build/web/${network}/${artifactName}.js`, `//${artifactName} ABI\n`);
    } else {
        fs.writeFileSync(`./build/web/${network}/${artifactName}.js`, `//${artifactName} ABI and address\n`);
    }

    let fd = fs.openSync(`./build/web/${network}/${artifactName}.js`, 'a');
    fs.appendFileSync(fd, "const abi=");
    fs.appendFileSync(fd, data);

    if(abiOnly) {
        fs.appendFileSync(fd, ";\n\n");
        fs.appendFileSync(fd, "export default abi;\n");
    } else {
        fs.appendFileSync(fd, `;\nconst address = "${instance.address}";\n`);
        fs.appendFileSync(fd,"\nexport {abi, address};\n");
    }

    fs.closeSync(fd);
}