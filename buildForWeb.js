const fs = require('fs');
module.exports = async (callback) => {
    try {
        fs.mkdirSync('./build/web');
    } catch (err) {

    }

    //HEOCampaignFactory
    const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
    let instance = await HEOCampaignFactory.deployed();
    let contractJSON = fs.readFileSync('./build/contracts/HEOCampaignFactory.json');
    let contractABI = JSON.parse(contractJSON).abi;
    let data = JSON.stringify(contractABI);
    fs.writeFileSync('./build/web/HEOCampaignFactory.js', "//HEOCampaignFactory ABI and address\n");
    let fd = fs.openSync('./build/web/HEOCampaignFactory.js', 'a');
    fs.appendFileSync(fd, "import web3 from './web3';\n");
    fs.appendFileSync(fd, `const address = "${instance.address}";\n`);
    fs.appendFileSync(fd, "const abi=");
    fs.appendFileSync(fd, data);
    fs.appendFileSync(fd, ";\nconst instance = new web3.eth.Contract(\n");
    fs.appendFileSync(fd, "    abi,\n");
    fs.appendFileSync(fd, "    address,\n");
    fs.appendFileSync(fd, ");\n");
    fs.appendFileSync(fd, "export default instance;\n");
    fs.closeSync(fd);

    //HEOCampaign
    const HEOCampaign = artifacts.require("HEOCampaign");
    contractJSON = fs.readFileSync('./build/contracts/HEOCampaign.json');
    contractABI = JSON.parse(contractJSON).abi;
    data = JSON.stringify(contractABI);
    try {
        fs.mkdirSync('./build/web');
    } catch (err) {

    }
    fs.writeFileSync('./build/web/HEOCampaign.js', "//HEOCampaign ABI\n");
    fd = fs.openSync('./build/web/HEOCampaign.js', 'a');
    fs.appendFileSync(fd, "const abi=");
    fs.appendFileSync(fd, data);
    fs.appendFileSync(fd, ";\n\n");
    fs.appendFileSync(fd, "export default abi;\n");
    fs.closeSync(fd);

    //HEOGlobalParameters
    const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
    instance = await HEOGlobalParameters.deployed();
    contractJSON = fs.readFileSync('./build/contracts/HEOGlobalParameters.json');
    contractABI = JSON.parse(contractJSON).abi;
    data = JSON.stringify(contractABI);
    try {
        fs.mkdirSync('./build/web');
    } catch (err) {

    }
    fs.writeFileSync('./build/web/HEOGlobalParameters.js', "//HEOGlobalParameters ABI and address\n");
    fd = fs.openSync('./build/web/HEOGlobalParameters.js', 'a');
    fs.appendFileSync(fd, "import web3 from './web3';\n");
    fs.appendFileSync(fd, `const address = "${instance.address}";\n`);
    fs.appendFileSync(fd, "const abi=");
    fs.appendFileSync(fd, data);
    fs.appendFileSync(fd, ";\nconst instance = new web3.eth.Contract(\n");
    fs.appendFileSync(fd, "    abi,\n");
    fs.appendFileSync(fd, "    address,\n");
    fs.appendFileSync(fd, ");\n");
    fs.appendFileSync(fd, "export default instance;\n");
    fs.closeSync(fd);

    //HEOCampaignRegistry
    const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
    instance = await HEOCampaignRegistry.deployed();
    contractJSON = fs.readFileSync('./build/contracts/HEOCampaignRegistry.json');
    contractABI = JSON.parse(contractJSON).abi;
    data = JSON.stringify(contractABI);
    try {
        fs.mkdirSync('./build/web');
    } catch (err) {

    }
    fs.writeFileSync('./build/web/HEOCampaignRegistry.js', "//HEOCampaignRegistry ABI and address\n");
    fd = fs.openSync('./build/web/HEOCampaignRegistry.js', 'a');
    fs.appendFileSync(fd, "import web3 from './web3';\n");
    fs.appendFileSync(fd, `const address = "${instance.address}";\n`);
    fs.appendFileSync(fd, "const abi=");
    fs.appendFileSync(fd, data);
    fs.appendFileSync(fd, ";\nconst instance = new web3.eth.Contract(\n");
    fs.appendFileSync(fd, "    abi,\n");
    fs.appendFileSync(fd, "    address,\n");
    fs.appendFileSync(fd, ");\n");
    fs.appendFileSync(fd, "export default instance;\n");
    fs.closeSync(fd);
    callback();
}