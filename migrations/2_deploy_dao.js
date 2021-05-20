const HEODAO = artifacts.require("HEODAO");

module.exports = async function(deployer, network, accounts) {
  if(network != "test") {
    console.log(`Network is ${network}`);

    //deploy the DAO
    await deployer.deploy(HEODAO);
    const iHEODao = await HEODAO.deployed();
    await iHEODao.transferOwnership(accounts[0]);
    console.log(`HEODAO coin address on ${network}: ${iHEODao.address}`);
  }
}
