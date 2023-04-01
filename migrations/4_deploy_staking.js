const HEODAO = artifacts.require("HEODAO");
const HEOStaking = artifacts.require("HEOStaking");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.deployed(); //TXSSdhGUh4iJrpz8SfgirhF5v4UDgxG5E7
        await deployer.deploy(HEOStaking);
        const iStaking = await HEOStaking.deployed(); //TWoVz2wsjbdFmx7zMUWh3ZY4UzbVfT4fkr
        await iStaking.transferOwnership(iHEODao.address); //done
        await iHEODao.setStaking(iStaking.address); //done
        console.log(`HEOStaking address on ${network}: ${iStaking.address}`);
    }
}
