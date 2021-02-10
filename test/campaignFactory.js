const HEOToken = artifacts.require("HEOToken");
const HEOCampaign = artifacts.require("HEOCampaign");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEORewardFarm = artifacts.require("HEORewardFarm");
var BN = web3.utils.BN;
var ownerAccount, iRegistry, iToken, iGlobalParams, iPriceOracle, iDistribution, iCampaignFactory;
contract("HEOCampaignFactory", (accounts) => {
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

    it("Should deploy a campaign for raising 100 ETH with Y=0.2, Z = 100, by burning 1 HEO", async () => {
        //give 1 HEO to charityAccount
        let charityAccount = accounts[1];
        await iDistribution.distribute(charityAccount, web3.utils.toWei("1"), {from: ownerAccount});
        //charityAccount should be able to start a campaign
        var charityBalance = web3.utils.fromWei(await iToken.balanceOf.call(charityAccount));
        console.log(`Charity account has ${charityBalance} HEO`);
        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var countBefore = myCampaigns.length;
        assert.equal(0, countBefore, "Expecting to have 0 campaigns registered");
        var totalCampaignsBefore = (await iRegistry.totalCampaigns.call()).toNumber();
        assert.equal(0, totalCampaignsBefore, "Should have one campaign registered in total.");
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("1"),
            "0x0000000000000000000000000000000000000000", "https://someurl1", {from: charityAccount});
        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var totalCampaignsAfter = (await iRegistry.totalCampaigns.call()).toNumber();
        var countAfter = myCampaigns.length;
        assert.equal(1, countAfter, "Should have one campaign registered.");
        assert.equal(1, totalCampaignsAfter, "Should have one campaign registered in total.");
        var lastCampaign = myCampaigns[0];
        assert.isNotNull(lastCampaign, "Last campaign address is null");
        lastCampaign = await HEOCampaign.at(lastCampaign);
        assert.isNotNull(lastCampaign, "Last campaign is null");
        var maxAmount = await lastCampaign.maxAmount.call();
        assert.isTrue(new BN(maxAmount).eq(new BN(web3.utils.toWei("100"))), "Expected maxAmount to be 100, but got " + maxAmount.toString());
        var heoPrice = await lastCampaign.heoPrice.call();
        assert.isTrue(new BN(heoPrice).eq(new BN(web3.utils.toWei("1"))), "Expected HEO price to be 1, but got " + heoPrice.toString());
        var burntHeo = await lastCampaign.burntHeo.call();
        assert.isTrue(new BN(burntHeo).eq(new BN(web3.utils.toWei("1"))), "Expected burnt amount to be 1, but got " + burntHeo.toString());
        var raisedAmount = await lastCampaign.raisedAmount.call();
        assert.isTrue(new BN(raisedAmount).eq(new BN(web3.utils.toWei("0"))), "Expected raisedAmount to be 0, but got " + raisedAmount.toString());
        var targetToken = await lastCampaign.currency.call();
        assert.equal("0x0000000000000000000000000000000000000000", targetToken,
            `Expected campaign currency address to be 0x0000000000000000000000000000000000000000, but got ${targetToken}`);
        var x = await lastCampaign.profitabilityCoefficient.call();
        assert.isTrue(new BN(x).eq(new BN("20")), "Expecting X = 20, but found " + x);
        var z = await lastCampaign.getZ.call();
        var decimals = await iToken.decimals.call();
        var expectedZ = maxAmount.mul(new BN("10").pow(decimals)).div(burntHeo).div(heoPrice);
        assert.isTrue(z.eq(expectedZ), "Expecting Z to be " + expectedZ.toString() + ", but got " + z.toString());
        var y = await lastCampaign.donationYield.call();
        /*console.log("Z " + z);
        console.log("Y " + y);
        console.log("Donation yield: " + y.toNumber()/10**yieldDecimals.toNumber())*/
        assert.isTrue(new BN("200000000000000000").eq(y), "Expecting Y to be 200000000000000000 but got " + y);
    });

    it("Should fail to deploy campaign w/o burning HEO", async () => {
        let userAccount = accounts[2];
        try {
            await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("0"),
                "0x0000000000000000000000000000000000000000", "https://someurl1",
                {from: userAccount});
            assert.fail("Should throw an exception trying to deploy a campaign w/o burning HEO");
        } catch (err) {
            assert.equal(err.reason, "HEOCampaignFactory: cannot create a campaign without burning HEO tokens.",
                "Wrong error message: " + err.reason);
        }
    });

    it("Should fail to deploy campaign with unsupported currency", async () => {
        let userAccount = accounts[2];
        try {
            //this is PAXG address on Ropsten
            await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("1"),
                "0xf472ba1716a3a6f4c15def3df7487057300f597a", "https://someurl2", {from: userAccount});
            assert.fail("Should throw an exception trying to deploy a campaign with unsupported currency");
        } catch (err) {
            assert.equal(err.reason, "HEOCampaignFactory: currency at given address is not supported.",
                "Wrong error message: " + err.reason);
        }
    });

    it("Should fail to deploy campaign w/o sufficient funds", async () => {
        let userAccount = accounts[2];
        //userAccount has 0 HEO, so it should not be able to deploy a campaign
        try {
            await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("1"),
                "0x0000000000000000000000000000000000000000", "https://someurl3", {from: userAccount});
            assert.fail("Should throw an exception trying to deploy a campaign w/o HEO");
        } catch (err) {
            assert.equal(err.reason, "ERC20: burn amount exceeds balance", "Wrong error message: " + err.reason);
        }
        //give 2 HEO to userAccount
        await iDistribution.distribute(userAccount, web3.utils.toWei("2"), {from: ownerAccount});
        try {
            await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("3"),
                "0x0000000000000000000000000000000000000000", "https://someurl4", {from: userAccount});
            assert.fail("Should throw an exception trying to deploy a campaign with insufficient HEO");
        } catch (err) {
            assert.equal(err.reason, "ERC20: burn amount exceeds balance", "Wrong error message: " + err.reason);
        }

        try {
            await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("2.5"),
                "0x0000000000000000000000000000000000000000", "https://someurl5", {from: userAccount});
            assert.fail("Should throw an exception trying to deploy a campaign with insufficient HEO");
        } catch (err) {
            assert.equal(err.reason, "ERC20: burn amount exceeds balance", "Wrong error message: " + err.reason);
        }
    });

    it("Should deploy a campaign for raising 100 ETH with Y = 0.1, Z = 200 by burning 0.5 HEO", async () => {
        let charityAccount = accounts[1];
        await iDistribution.distribute(charityAccount, web3.utils.toWei("1"), {from: ownerAccount});
        //charityAccount should be able to start a campaign
        var balanceBefore = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(web3.utils.fromWei(balanceBefore) > 0.5, "Expecting " + balanceBefore + " to be > 0.5");
        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var countBefore = myCampaigns.length;
        var tx = await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("0.5"),
            "0x0000000000000000000000000000000000000000", "https://someurl6", {from: charityAccount});
        assert.isNotNull(tx, "Transaction should not be null.");
        var events = tx.logs;
        assert.isNotNull(events, "Should have emitted events.");
        assert.equal(events.length, 2, "Should have emitted 2 events.");
        var deployEvent = events[1];
        assert.isNotNull(deployEvent);
        assert.isNotNull(deployEvent.args);
        assert.isNotNull(deployEvent.args.campaignAddress, "Expecting campaignAddress argument in deploy event.");
        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var countAfter = myCampaigns.length;
        assert.equal(countBefore + 1, countAfter, "Should have one more campaign registered.");
        var lastCampaign = await HEOCampaign.at(deployEvent.args.campaignAddress);
        assert.isNotNull(lastCampaign, "Deployed HEOCampaign should not be null.");
        var maxAmount = await lastCampaign.maxAmount.call();
        assert.isTrue(new BN(maxAmount).eq(new BN(web3.utils.toWei("100"))));
        var heoPrice = await lastCampaign.heoPrice.call();
        assert.isTrue(new BN(heoPrice).eq(new BN(web3.utils.toWei("1"))));
        var burntHeo = await lastCampaign.burntHeo.call();
        assert.isTrue(new BN(burntHeo).eq(new BN(web3.utils.toWei("0.5"))));
        var x = await lastCampaign.profitabilityCoefficient.call();
        assert.isTrue(new BN(x).eq(new BN("20")), "Expecting X = 20, but found " + x);
        var decimals = await iToken.decimals.call();
        var yieldDecimals = await iGlobalParams.yDecimals.call();
        assert.equal(decimals, 18, "Expecting 18 decimals in HEOToken.");
        var expectedZ = maxAmount.mul(new BN("10").pow(decimals)).div(burntHeo).div(heoPrice);
        var z = await lastCampaign.getZ.call();
        assert.isTrue(z.eq(expectedZ), "Expecting Z to be " + expectedZ.toString() + ", but got " + z.toString());
        var balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceBefore.sub(balanceAfter).eq(new BN(web3.utils.toWei("0.5"))),
            balanceBefore.toString() + "-" + balanceAfter.toString() + " != " + web3.utils.toWei("0.5"));
        var y = await lastCampaign.donationYield.call();
        /*console.log("Z " + z);
        console.log("Y " + y);
        console.log("Donation yield: " + y.toNumber()/10**yieldDecimals.toNumber());*/
        assert.isTrue(new BN("20").mul(new BN("10").pow(yieldDecimals)).div(z).eq(y),
            "Expecting Y to be 10000 but got " + y);
    });

    it("Should deploy a campaign for raising 10,000 ETH with Y = 2, Z = 10 by burning 1000 HEO", async () => {
        let charityAccount = accounts[1];
        await iDistribution.distribute(charityAccount, web3.utils.toWei("1000"), {from: ownerAccount});
        //charityAccount should be able to start a campaign
        var balanceBefore = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(web3.utils.fromWei(balanceBefore) >= 1000, "Expecting " + balanceBefore + " to be 1000+.");
        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var countBefore = myCampaigns.length;
        var tx = await iCampaignFactory.createCampaign(web3.utils.toWei("10000"), web3.utils.toWei("1000"),
            "0x0000000000000000000000000000000000000000", "https://someurl7", {from: charityAccount});
        assert.isNotNull(tx, "Transaction should not be null.");
        var events = tx.logs;
        assert.isNotNull(events, "Should have emitted events.");
        assert.equal(events.length, 2, "Should have emitted 2 events.");
        var deployEvent = events[1];
        assert.isNotNull(deployEvent);
        assert.isNotNull(deployEvent.args);
        assert.isNotNull(deployEvent.args.campaignAddress, "Expecting campaignAddress argument in deploy event.");
        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var countAfter = myCampaigns.length;
        assert.equal(countBefore + 1, countAfter, "Should have one more campaign registered.");
        var lastCampaign = await HEOCampaign.at(deployEvent.args.campaignAddress);
        assert.isNotNull(lastCampaign, "Deployed HEOCampaign should not be null.");
        var maxAmount = await lastCampaign.maxAmount.call();
        assert.isTrue(new BN(maxAmount).eq(new BN(web3.utils.toWei("10000"))));
        var heoPrice = await lastCampaign.heoPrice.call();
        assert.isTrue(new BN(heoPrice).eq(new BN(web3.utils.toWei("1"))));
        var burntHeo = await lastCampaign.burntHeo.call();
        assert.isTrue(new BN(burntHeo).eq(new BN(web3.utils.toWei("1000"))));
        var x = await lastCampaign.profitabilityCoefficient.call();
        assert.isTrue(new BN(x).eq(new BN("20")), "Expecting X = 20, but found " + x);
        var decimals = await iToken.decimals.call();
        var yieldDecimals = await iGlobalParams.yDecimals.call();
        assert.equal(decimals, 18, "Expecting 18 decimals in HEOToken.");
        var expectedZ = maxAmount.mul(new BN("10").pow(decimals)).div(burntHeo).div(heoPrice);
        var z = await lastCampaign.getZ.call();
        assert.isTrue(z.eq(expectedZ), "Expecting Z to be " + expectedZ.toString() + ", but got " + z.toString());
        var balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceBefore.sub(balanceAfter).eq(new BN(web3.utils.toWei("1000"))),
            balanceBefore.toString() + "-" + balanceAfter.toString() + " != " + web3.utils.toWei("1000"));
        var y = await lastCampaign.donationYield.call();
        /*console.log("Z " + z);
        console.log("Y " + y);
        console.log("Donation yield: " + y.toNumber()/10**yieldDecimals.toNumber());*/
        assert.isTrue(new BN("20").mul(new BN("10").pow(yieldDecimals)).div(z).eq(y),
            "Expecting Y to be 200000 but got " + y);
    });

    it("Should enforce restrictions on changing Donation Yield", async() => {
        let charityAccount = accounts[4];
        let friendAccount = accounts[5];
        await iDistribution.distribute(charityAccount, web3.utils.toWei("1000"), {from: ownerAccount});
        await iDistribution.distribute(friendAccount, web3.utils.toWei("300"), {from: ownerAccount});
        //charityAccount should be able to start a campaign
        var balanceBefore = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(web3.utils.fromWei(balanceBefore) >= 1000, "Expecting " + balanceBefore + " to be 1000+.");
        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var countBefore = myCampaigns.length;
        var tx = await iCampaignFactory.createCampaign(web3.utils.toWei("10000"), web3.utils.toWei("300"),
            "0x0000000000000000000000000000000000000000", "https://someurl8", {from: charityAccount});
        assert.isNotNull(tx, "Transaction should not be null.");
        var events = tx.logs;
        assert.isNotNull(events, "Should have emitted events.");
        assert.equal(events.length, 2, "Should have emitted 2 events.");
        var deployEvent = events[1];
        assert.isNotNull(deployEvent);
        assert.isNotNull(deployEvent.args);
        assert.isNotNull(deployEvent.args.campaignAddress, "Expecting campaignAddress argument in deploy event.");
        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var countAfter = myCampaigns.length;
        assert.equal(countBefore + 1, countAfter, "Should have one more campaign registered.");
        var lastCampaign = await HEOCampaign.at(deployEvent.args.campaignAddress);
        assert.isNotNull(lastCampaign, "Deployed HEOCampaign should not be null.");
        var y = await lastCampaign.donationYield.call();
        assert.isTrue(new BN("606060606060606060").eq(y), "Expecting Y to be 606060606060606060 but got " + y);
        var z = await lastCampaign.getZ.call();
        assert.isTrue(z.eq(new BN("33")), "Expecting Z to be 33, but got " + z.toString());

        //Only the beneficiary can increase Y
        try {
            await iCampaignFactory.increaseYield(deployEvent.args.campaignAddress, web3.utils.toWei("500"),
                {from: friendAccount});
            assert.fail("Should throw an exception when non-beneficiary is tryint to increase yield");
        } catch (err) {
            assert.equal(err.reason, "HEOCampaignFactory: only beneficiary can increase campaign yield.");
            let balanceAfter = await iToken.balanceOf.call(friendAccount);
            assert.isTrue(balanceAfter.eq(new BN(web3.utils.toWei("300"))),
                "Balance of friendAccount should not have changed after failed traisaction");
        }

        //Try increasing yield with 0 HEO
        try {
            await iCampaignFactory.increaseYield(deployEvent.args.campaignAddress, web3.utils.toWei("0"),
                {from: charityAccount});
            assert.fail("Should throw an exception when trying to increase yield with 0 HEO");
        } catch (err) {
            assert.equal(err.reason, "HEOCampaignFactory: cannot increase yield by burning zero tokens.");
            let balanceAfter = await iToken.balanceOf.call(charityAccount);
            assert.isTrue(balanceAfter.eq(new BN(web3.utils.toWei("700"))),
                "Balance of charityAccount should not have changed after failed traisaction");
        }

        //Try increasing yield with 0-address
        try {
            await iCampaignFactory.increaseYield("0x0000000000000000000000000000000000000000", web3.utils.toWei("500"),
                {from: charityAccount});
            assert.fail("Should throw an exception when passing zero-address as campaign argument");
        } catch (err) {
            assert.equal(err.reason, "HEOCampaignFactory: campaign cannot be zero-address.");
            let balanceAfter = await iToken.balanceOf.call(charityAccount);
            assert.isTrue(balanceAfter.eq(new BN(web3.utils.toWei("700"))),
                "Balance of charityAccount should not have changed after failed traisaction");
        }

        //Try increasing yield with unregistered campaign address
        try {
            let rogueCampaign = await HEOCampaign.new(web3.utils.toWei("100"), charityAccount, 20,
                web3.utils.toWei("1"), web3.utils.toWei("1"), "0x0000000000000000000000000000000000000000", 0, "https://url1");
            assert.isNotNull(rogueCampaign, "Rogue campaign should be deployed");
            assert.isNotNull(rogueCampaign.address, "Rogue campaign should have an address");
            let beneficiary = await rogueCampaign.beneficiary.call();
            assert.equal(beneficiary, charityAccount, "Expecting charityAccount to be the beneficiary");
            await iCampaignFactory.increaseYield(rogueCampaign.address, web3.utils.toWei("500"),
                {from: charityAccount});
            assert.fail("Should throw an exception when passing unregistered address as campaign argument");
        } catch (err) {
            assert.equal(err.reason, "HEOCampaignFactory: campaign is not registered.", err);
            let balanceAfter = await iToken.balanceOf.call(charityAccount);
            assert.isTrue(balanceAfter.eq(new BN(web3.utils.toWei("700"))),
                "Balance of charityAccount should not have changed after failed traisaction");
        }

        //Try increasing yield with non-campaign address
        try {
            await iCampaignFactory.increaseYield("0xad6d458402f60fd3bd25163575031acdce07538d", web3.utils.toWei("500"),
                {from: charityAccount});
            assert.fail("Should throw an exception when passing non-campaign address as campaign argument");
        } catch (err) {
            let balanceAfter = await iToken.balanceOf.call(charityAccount);
            assert.isTrue(balanceAfter.eq(new BN(web3.utils.toWei("700"))),
                "Balance of charityAccount should not have changed after failed traisaction");
        }

        var newY = await lastCampaign.donationYield.call();
        assert.isTrue(new BN("606060606060606060").eq(newY), "Expecting Y to remain 606060606060606060 but got " + y);
        var newZ = await lastCampaign.getZ.call();
        assert.isTrue(newZ.eq(new BN("33")), "Expecting Z to remain 33, but got " + z.toString());
    });

    it("Should increase Y from 1 to 2 by doubling the number of burnt HEO.", async () => {
        let charityAccount = accounts[3];
        await iDistribution.distribute(charityAccount, web3.utils.toWei("1000"), {from: ownerAccount});
        //charityAccount should be able to start a campaign
        var balanceBefore = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(web3.utils.fromWei(balanceBefore) >= 1000, "Expecting " + balanceBefore + " to be 1000+.");
        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var countBefore = myCampaigns.length;
        var totalCampaignsBefore = (await iRegistry.totalCampaigns.call()).toNumber();
        var tx = await iCampaignFactory.createCampaign(web3.utils.toWei("10000"), web3.utils.toWei("500"),
            "0x0000000000000000000000000000000000000000", "https://someurl9", {from: charityAccount});
        assert.isNotNull(tx, "Transaction should not be null.");
        var events = tx.logs;
        assert.isNotNull(events, "Should have emitted events.");
        assert.equal(events.length, 2, "Should have emitted 2 events.");
        var deployEvent = events[1];
        assert.isNotNull(deployEvent);
        assert.isNotNull(deployEvent.args);
        assert.isNotNull(deployEvent.args.campaignAddress, "Expecting campaignAddress argument in deploy event.");
        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var totalCampaignsAfter = (await iRegistry.totalCampaigns.call()).toNumber();
        var countAfter = myCampaigns.length;
        assert.equal(countBefore + 1, countAfter, "Should have one more campaign registered.");
        assert.equal(totalCampaignsBefore + 1, totalCampaignsAfter, "Should have one more campaign registered total.");
        var lastCampaign = await HEOCampaign.at(deployEvent.args.campaignAddress);
        assert.isNotNull(lastCampaign, "Deployed HEOCampaign should not be null.");
        var maxAmount = await lastCampaign.maxAmount.call();
        assert.isTrue(new BN(maxAmount).eq(new BN(web3.utils.toWei("10000"))));
        var heoPrice = await lastCampaign.heoPrice.call();
        assert.isTrue(new BN(heoPrice).eq(new BN(web3.utils.toWei("1"))));
        var metaDataUrl = await lastCampaign.metaDataUrl.call();
        assert.equal("https://someurl9", metaDataUrl,
            `Expecting metadata URL to be https://someurl9, but got ${metaDataUrl}`);
        var burntHeo = await lastCampaign.burntHeo.call();
        assert.isTrue(new BN(burntHeo).eq(new BN(web3.utils.toWei("500"))));
        var x = await lastCampaign.profitabilityCoefficient.call();
        assert.isTrue(new BN(x).eq(new BN("20")), "Expecting X = 20, but found " + x);
        var decimals = await iToken.decimals.call();
        assert.equal(decimals, 18, "Expecting 18 decimals in HEOToken.");
        var z = await lastCampaign.getZ.call();
        assert.isTrue(z.eq(new BN("20")), "Expecting Z to be 20, but got " + z.toString());
        var balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceBefore.sub(balanceAfter).eq(new BN(web3.utils.toWei("500"))),
            balanceBefore.toString() + "-" + balanceAfter.toString() + " != " + web3.utils.toWei("500"));
        var y = await lastCampaign.donationYield.call();
        assert.isTrue(new BN("1000000000000000000").eq(y), "Expecting Y to be 1000000000000000000 but got " + y);

        //Burn another 500 HEO to double the Yield
        await iCampaignFactory.increaseYield(deployEvent.args.campaignAddress, web3.utils.toWei("500"),
            {from: charityAccount});
        balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceBefore.sub(balanceAfter).eq(new BN(web3.utils.toWei("1000"))),
            balanceBefore.toString() + "-" + balanceAfter.toString() + " != " + web3.utils.toWei("1000"));
        var newZ = await lastCampaign.getZ.call();
        var newY = await lastCampaign.donationYield.call();
        assert.isTrue(newZ.eq(new BN("10"))), "Expected Z to change to 10";
        assert.isTrue(newY.eq(new BN("2000000000000000000")), "Expected Y to change to 200000");
    });
});
