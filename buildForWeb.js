const fs = require('fs');
module.exports = async (callback) => {
    try {
        fs.mkdirSync('./build/web');
    } catch (err) {

    }

    //HEOCampaignFactory
    const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
    let instance = await HEOCampaignFactory.deployed();
    _writeFile("HEOCampaignFactory", false, instance);

    //HEOCampaign
    _writeFile("HEOCampaign", true);

    //HEOGlobalParameters
    const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
    instance = await HEOGlobalParameters.deployed();
    _writeFile("HEOGlobalParameters", false, instance);

    //HEOCampaignRegistry
    const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
    instance = await HEOCampaignRegistry.deployed();
    _writeFile("HEOCampaignRegistry", false, instance);

    //HEOPriceOracle
    const HEOPriceOracle = artifacts.require("HEOPriceOracle");
    instance = await HEOPriceOracle.deployed();
    _writeFile("HEOPriceOracle", false, instance);

    //HEORewardFarm
    const HEORewardFarm = artifacts.require("HEORewardFarm");
    instance = await HEORewardFarm.deployed();
    _writeFile("HEORewardFarm", false, instance);

    //HEOPublicSale
//    const HEOPublicSale = artifacts.require("HEOPublicSale");
//    instance = await HEOPublicSale.deployed();
    _writeFile("HEOPublicSale", true);
    callback();
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