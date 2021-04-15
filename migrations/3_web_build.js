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
        try {
            fs.mkdirSync('./build/web');
        } catch (err) {

        }

        //HEODao
        let instance = await HEODAO.deployed();
        _writeFile("HEODAO", false, instance);

        //HEOCampaignFactory
        instance = await HEOCampaignFactory.deployed();
        _writeFile("HEOCampaignFactory", false, instance);

        //HEOParameters
        instance = await HEOParameters.deployed();
        _writeFile("HEOParameters", false, instance);

        //HEOCampaignRegistry
        instance = await HEOCampaignRegistry.deployed();
        _writeFile("HEOCampaignRegistry", false, instance);

        //HEOPriceOracle
        instance = await HEOPriceOracle.deployed();
        _writeFile("HEOPriceOracle", false, instance);

        //HEORewardFarm
        instance = await HEORewardFarm.deployed();
        _writeFile("HEORewardFarm", false, instance);

        //HEORewardFarm
        instance = await HEOStaking.deployed();
        _writeFile("HEOStaking", false, instance);

        //HEOBudget
        _writeFile("HEOCampaign", true);

        //HEOBudget
        _writeFile("HEOBudget", true);

        //ERC20
        _writeFile("ERC20", true);

        //HEOToken
        const KEY_PLATFORM_TOKEN_ADDRESS = 5;
        const iHEOParams = await HEOParameters.deployed();
        const platformTokenAddress = await iHEOParams.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        instance = await HEOToken.at(platformTokenAddress);
        _writeFile("HEOToken", false, instance);
    }

}

function _writeFile(artifactName, abiOnly, instance) {
    const contractJSON = fs.readFileSync(`./build/contracts/${artifactName}.json`);
    const contractABI = JSON.parse(contractJSON).abi;
    const data = JSON.stringify(contractABI);
    try {
        fs.mkdirSync('./build/web');
    } catch (err) {

    }
    if(abiOnly) {
        fs.writeFileSync(`./build/web/${artifactName}.js`, `//${artifactName} ABI\n`);
    } else {
        fs.writeFileSync(`./build/web/${artifactName}.js`, `//${artifactName} ABI and address\n`);
    }

    let fd = fs.openSync(`./build/web/${artifactName}.js`, 'a');
    if(!abiOnly) {
        fs.appendFileSync(fd, "import web3 from './web3';\n");
    }
    fs.appendFileSync(fd, "const abi=");
    fs.appendFileSync(fd, data);

    if(abiOnly) {
        fs.appendFileSync(fd, ";\n\n");
        fs.appendFileSync(fd, "export default abi;\n");
    } else {
        fs.appendFileSync(fd, `;\nconst address = "${instance.address}";\n`);
        fs.appendFileSync(fd, "const instance = new web3.eth.Contract(\n");
        fs.appendFileSync(fd, "    abi,\n");
        fs.appendFileSync(fd, "    address,\n");
        fs.appendFileSync(fd, ");\n\n");
        fs.appendFileSync(fd, "export default instance;\n");
    }

    fs.closeSync(fd);
}