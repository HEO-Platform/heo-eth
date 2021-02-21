
module.exports = async (callback) => {
    const HEOToken = artifacts.require("HEOToken");
    const HEOCampaign = artifacts.require("HEOCampaign");
    const HEOManualDistribution = artifacts.require("HEOManualDistribution");
    const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
    const HEOPriceOracle = artifacts.require("HEOPriceOracle");
    const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
    const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
    const HEORewardFarm = artifacts.require("HEORewardFarm");
    const StableCoinForTests = artifacts.require("StableCoinForTests");
    //deploy contracts
    let iRegistry = await HEOCampaignRegistry.deployed();
    let iToken = await HEOToken.deployed();
    let iGlobalParams = await HEOGlobalParameters.deployed();
    let iPriceOracle = await HEOPriceOracle.deployed();
    let iDistribution = await HEOManualDistribution.deployed();
    let iRewardFarm = await HEORewardFarm.deployed();
    let iCampaignFactory = await HEOCampaignFactory.deployed();
    let iTestCoin = await StableCoinForTests.new("TUSD");
    console.log("Deployed stable coin TUSD at " + iTestCoin.address);
    //set initial values
    let accounts = await web3.eth.getAccounts();
    let ownerAccount = accounts[0];
    let charityAccount1 = accounts[1];
    let charityAccount2 = accounts[2];
    await iTestCoin.transfer("0x748351f954Af3C95a41b88ba7563453Ab98eA085", web3.utils.toWei("10000"));
    await iTestCoin.transfer("0x02C364e8048C60c980d4C1abb9918f66D716d603", web3.utils.toWei("10000"));
    await iTestCoin.transfer("0x6CFe06BCC19444b90fe5f8729eb619c51Fcb7e3A", web3.utils.toWei("10000"));

    await iRegistry.setFactory(iCampaignFactory.address);
    await iToken.addMinter(iDistribution.address, {from: ownerAccount});
    await iToken.addBurner(iCampaignFactory.address, {from: ownerAccount});
    await iPriceOracle.setPrice(iTestCoin.address, web3.utils.toWei("1"));


    await iDistribution.distribute(charityAccount1, web3.utils.toWei("100"), {from: ownerAccount});
    let balance1 = await iToken.balanceOf(charityAccount1);
    console.log(`Chartity account 1 (${charityAccount1}) has balance of ${web3.utils.fromWei(balance1.toString())} HEO`);
    await iDistribution.distribute(charityAccount2, web3.utils.toWei("100"), {from: ownerAccount});
    let balance2 = await iToken.balanceOf(charityAccount2);
    console.log(`Chartity account 1 (${charityAccount2}) has balance of ${web3.utils.fromWei(balance2.toString())} HEO`);
    //deploy demo campaigns
/*    let charityAccount1 = accounts[1];
    let charityAccount2 = accounts[2];
    await iDistribution.distribute(charityAccount1, web3.utils.toWei("100"), {from: ownerAccount});
    let balance1 = await iToken.balanceOf(charityAccount1);
    console.log(`Chartity account 1 (${charityAccount1}) has balance of ${web3.utils.fromWei(balance1.toString())} HEO`);
    await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("1"),
        iTestCoin.address, "https://heometa.s3.us-east-2.amazonaws.com/json/campaign1.json", {from: charityAccount1});
    var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount1});
    console.log(`Account ${charityAccount1} deployed campaign at ${myCampaigns[0]}`)

    await iDistribution.distribute(charityAccount2, web3.utils.toWei("100"), {from: ownerAccount});
    let balance2 = await iToken.balanceOf(charityAccount2);
    console.log(`Chartity account 2 (${charityAccount2}) has balance of ${web3.utils.fromWei(balance2.toString())} HEO`);
    await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("0"),
        iTestCoin.address, "https://heometa.s3.us-east-2.amazonaws.com/json/campaign1.json", {from: charityAccount2});
    myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount2});
    console.log(`Account ${charityAccount2} deployed campaign at ${myCampaigns[0]}`);*/
    callback();
}