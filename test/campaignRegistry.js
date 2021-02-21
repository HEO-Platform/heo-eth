const HEOToken = artifacts.require("HEOToken");
const HEOCampaign = artifacts.require("HEOCampaign");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEORewardFarm = artifacts.require("HEORewardFarm");
var ownerAccount, iRegistry, iToken, iGlobalParams, iPriceOracle, iDistribution, iCampaignFactory;
contract("HEOCampaignRegistry", (accounts) => {
    before(async () => {
        ownerAccount = accounts[0];
        //deploy contracts and set initial values
        iRegistry = await HEOCampaignRegistry.deployed();
        iToken = await HEOToken.deployed();
        iGlobalParams = await HEOGlobalParameters.deployed();
        iPriceOracle = await HEOPriceOracle.deployed();
        iDistribution = await HEOManualDistribution.deployed();
        iRewardFarm = await HEORewardFarm.deployed();
        await iPriceOracle.setPrice("0x0000000000000000000000000000000000000000", web3.utils.toWei("1", "ether"));
        iCampaignFactory = await HEOCampaignFactory.new(iRegistry.address,
            iGlobalParams.address, iPriceOracle.address, iRewardFarm.address);
        await iRegistry.setFactory(iCampaignFactory.address);
        await iToken.addMinter(iDistribution.address, {from: ownerAccount});
        await iToken.addBurner(iCampaignFactory.address, {from: ownerAccount});
    });

    it("Should register campaigns correctly when deploying via Campaign Factory", async () => {
        //give some HEO to each charity account
        let charityAccount1 = accounts[1];
        let charityAccount2 = accounts[2];
        let charityAccount3 = accounts[3];
        await iDistribution.distribute(charityAccount1, web3.utils.toWei("1"), {from: ownerAccount});
        await iDistribution.distribute(charityAccount2, web3.utils.toWei("1"), {from: ownerAccount});
        await iDistribution.distribute(charityAccount3, web3.utils.toWei("10"), {from: ownerAccount});

        //check that initial campaign counters are 0
        var charityBalance = web3.utils.fromWei(await iToken.balanceOf.call(charityAccount1));
        console.log(`Charity account has ${charityBalance} HEO`);
        var myCampaigns1 = await iRegistry.myCampaigns.call({from: charityAccount1});
        assert.equal(0, myCampaigns1.length, "Expecting to have 0 campaigns registered from charityAccount1");
        var myCampaigns2 = await iRegistry.myCampaigns.call({from: charityAccount2});
        assert.equal(0, myCampaigns2.length, "Expecting to have 0 campaigns registered from charityAccount2");
        var myCampaigns3 = await iRegistry.myCampaigns.call({from: charityAccount3});
        assert.equal(0, myCampaigns3.length, "Expecting to have 0 campaigns registered from charityAccount3");
        var totalCampaignsBefore = (await iRegistry.totalCampaigns.call()).toNumber();
        assert.equal(0, totalCampaignsBefore, "Should have 0 campaign registered in total.");
        var allCampaigns = await iRegistry.allCampaigns.call();
        assert.equal(0, allCampaigns.length, "Expecting array of all campaigns to be zero-length");

        //create campaigns
        //from charity account 1
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("1"),
            "0x0000000000000000000000000000000000000000", "https://someurl1", {from: charityAccount1});
        myCampaigns1 = await iRegistry.myCampaigns.call({from: charityAccount1});
        var totalCampaignsAfter = (await iRegistry.totalCampaigns.call()).toNumber();
        var countAfter = myCampaigns1.length;
        assert.equal(1, countAfter, "Should have 1 campaign registered for charity account 1.");
        assert.equal(1, totalCampaignsAfter, "Should have 1 campaign registered in total.");

        //from charity account 2
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("1"),
            "0x0000000000000000000000000000000000000000", "https://someurl2", {from: charityAccount2});
        myCampaigns2 = await iRegistry.myCampaigns.call({from: charityAccount2});
        totalCampaignsAfter = (await iRegistry.totalCampaigns.call()).toNumber();
        assert.equal(1, myCampaigns2.length, "Should have 1 campaign registered for charity account 2.");
        assert.equal(2, totalCampaignsAfter, `Should have 2 campaign registered in total, but found ${totalCampaignsAfter}`);
        myCampaigns1 = await iRegistry.myCampaigns.call({from: charityAccount1});
        assert.equal(1, myCampaigns1.length,
            `Should still have 1 campaign registered for charity account 1, but found ${myCampaigns1.length}`);
        myCampaigns3 = await iRegistry.myCampaigns.call({from: charityAccount3});
        assert.equal(0, myCampaigns3.length,
            `Should still have 0 campaigns registered for charity account 3, but found ${myCampaigns3.length}`);

        //from charity account 3
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("1"),
            "0x0000000000000000000000000000000000000000", "https://someurl2", {from: charityAccount3});
        myCampaigns3 = await iRegistry.myCampaigns.call({from: charityAccount3});
        assert.equal(1, myCampaigns3.length,
            `Should have 1 campaign registered for charity account 3, but found ${myCampaigns3.length}`);
        totalCampaignsAfter = (await iRegistry.totalCampaigns.call()).toNumber();
        assert.equal(3, totalCampaignsAfter, `Should have 3 campaign registered in total, but found ${totalCampaignsAfter}`);
        myCampaigns1 = await iRegistry.myCampaigns.call({from: charityAccount1});
        assert.equal(1, myCampaigns1.length,
            `Should still have 1 campaign registered for charity account 1, but found ${myCampaigns1.length}`);
        myCampaigns2 = await iRegistry.myCampaigns.call({from: charityAccount2});
        assert.equal(1, myCampaigns2.length,
            `Should still have 1 campaign registered for charity account 2, but found ${myCampaigns2.length}`);

        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("1"),
            "0x0000000000000000000000000000000000000000", "https://someurl2", {from: charityAccount3});
        myCampaigns3 = await iRegistry.myCampaigns.call({from: charityAccount3});
        assert.equal(2, myCampaigns3.length,
            `Should have 2 campaign registered for charity account 3, but found ${myCampaigns3.length}`);
        totalCampaignsAfter = (await iRegistry.totalCampaigns.call()).toNumber();
        assert.equal(4, totalCampaignsAfter, `Should have 4 campaign registered in total, but found ${totalCampaignsAfter}`);
        allCampaigns = await iRegistry.allCampaigns.call();
        assert.equal(4, allCampaigns.length, "Expecting array of all campaigns to have 4 elements");
        assert.equal(allCampaigns[0], myCampaigns1[0],
            `Expecting the 1st campaign in all campaigns array to be ${myCampaigns1[0]}, but found ${allCampaigns[0]}`);
        assert.equal(allCampaigns[1], myCampaigns2[0],
            `Expecting the 2d campaign in all campaigns array to be ${myCampaigns2[0]}, but found ${allCampaigns[1]}`);
        assert.equal(allCampaigns[2], myCampaigns3[0],
            `Expecting the 3d campaign in all campaigns array to be ${myCampaigns3[0]}, but found ${allCampaigns[2]}`);
        assert.equal(allCampaigns[3], myCampaigns3[1],
            `Expecting the 4th campaign in all campaigns array to be ${myCampaigns3[1]}, but found ${allCampaigns[3]}`);
    });
});