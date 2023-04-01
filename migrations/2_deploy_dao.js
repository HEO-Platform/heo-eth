const HEODAO = artifacts.require("HEODAO");

module.exports = async function(deployer, network, accounts) {
  if(network != "test") {
    console.log(`Network is ${network}`);

    //deploy the DAO
    //await deployer.deploy(HEODAO);
    const iHEODao = await HEODAO.at("TXSSdhGUh4iJrpz8SfgirhF5v4UDgxG5E7");
    console.log(`HEODAO address on ${network}: ${iHEODao.address}`);
    console.log(`Transfering ownership to ${accounts[0]}`);
    await iHEODao.transferOwnership("TRTdxxyWoK4k6c9aQ4DRwe41d5dJKea1bn"); //done

  }
}
