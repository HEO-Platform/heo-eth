const HEODAO = artifacts.require("HEODAO");
const HEOStaking = artifacts.require("HEOStaking");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        const iHEODao = await HEODAO.deployed();
        await deployer.deploy(HEOStaking);
        const iStaking = await HEOStaking.deployed();
        await iStaking.transferOwnership(iHEODao.address);
        await iHEODao.setStaking(iStaking.address);
        console.log(`HEOStaking address on ${network}: ${iStaking.address}`);
    }
}
