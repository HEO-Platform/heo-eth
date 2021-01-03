const HEOToken = artifacts.require("HEOToken");
const HEOCampaign = artifacts.require("HEOCampaign");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
var BN = web3.utils.BN;
var ownerAccount, iRegistry, iToken, iGlobalParams, iPriceOracle, iDistribution, iCampaignFactory;
contract("HEOCampaignFactory", (accounts) => {
    before(async() => {
        ownerAccount = accounts[0];
        //deploy contracts and set initial values
        iRegistry = await HEOCampaignRegistry.deployed();
        iToken = await HEOToken.deployed();
        iGlobalParams = await HEOGlobalParameters.new(0, 20);
        iPriceOracle = await HEOPriceOracle.new();
        iDistribution = await HEOManualDistribution.deployed();
        await iPriceOracle.setPrice("0x0000000000000000000000000000000000000000", web3.utils.toWei("1", "ether"));
        iCampaignFactory = await HEOCampaignFactory.new(iRegistry.address, iToken.address,
            iGlobalParams.address, iPriceOracle.address);
        await iRegistry.setFactory(iCampaignFactory.address);
        await iToken.addMinter(iDistribution.address, {from: ownerAccount});
        await iToken.addBurner(iCampaignFactory.address, {from: ownerAccount});
    });

    it("Should deploy a campaign for raising 100 ETH with Y=0.2, Z = 100, by burning 1 HEO", async () => {
        //give 1 HEO to charityAccount
        let charityAccount = accounts[1];
        await iDistribution.distribute(charityAccount, web3.utils.toWei("1"), {from: ownerAccount});
        //charityAccount should be able to start a campaign
        var myCampaigns = await iRegistry.getMyCampaigns.call({from: charityAccount});
        var countBefore = myCampaigns.length;
        assert.equal(0, countBefore, "Expecting to have 0 campaigns registered");
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("1"),
            "0x0000000000000000000000000000000000000000", {from: charityAccount});
        myCampaigns = await iRegistry.getMyCampaigns.call({from: charityAccount});
        var countAfter = myCampaigns.length;
        assert.equal(1, countAfter, "Should have one campaign registered.");
        var lastCampaign = myCampaigns[0];
        assert.isNotNull(lastCampaign);
        lastCampaign = await HEOCampaign.at(lastCampaign);
        assert.isNotNull(lastCampaign);
        var maxAmount = await lastCampaign.maxAmount.call();
        assert.isTrue(new BN(maxAmount).eq(new BN(web3.utils.toWei("100"))));
        var heoPrice = await lastCampaign.heoPrice.call();
        assert.isTrue(new BN(heoPrice).eq(new BN(web3.utils.toWei("1"))));
        var burntHeo = await lastCampaign.burntHeo.call();
        assert.isTrue(new BN(burntHeo).eq(new BN(web3.utils.toWei("1"))));
        var x = await lastCampaign.profitabilityCoefficient.call();
        assert.isTrue(new BN(x).eq(new BN("20")), "Expecting X = 20, but found " + x);
        var z = await lastCampaign.getZ.call();
        var decimals = await iToken.decimals.call();
        var yieldDecimals = await lastCampaign.donationYieldDecimals.call();
        var expectedZ = maxAmount.mul(new BN("10").pow(decimals)).div(burntHeo).div(heoPrice); //_maxAmount.div(_burntHeo.mul(_heoPrice))
        assert.isTrue(z.eq(expectedZ), "Expecting Z to be " + expectedZ.toString() + ", but got " + z.toString());
        var y = await lastCampaign.donationYield.call();
        /*console.log("Z " + z);
        console.log("Y " + y);
        console.log("Donation yield: " + y.toNumber()/10**yieldDecimals.toNumber())*/
        assert.isTrue(new BN("20000").eq(y), "Expecting Y to be 20000 but got " + y);
    });

    it("Should fail to deploy campaign w/o burning HEO", async () => {
        let userAccount = accounts[2];
        try {
            await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("0"),
                "0x0000000000000000000000000000000000000000", {from: userAccount});
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
                "0xf472ba1716a3a6f4c15def3df7487057300f597a", {from: userAccount});
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
                "0x0000000000000000000000000000000000000000", {from: userAccount});
            assert.fail("Should throw an exception trying to deploy a campaign w/o HEO");
        } catch (err) {
            assert.equal(err.reason, "ERC20: burn amount exceeds balance", "Wrong error message: " + err.reason);
        }
        //give 2 HEO to userAccount
        await iDistribution.distribute(userAccount, web3.utils.toWei("2"), {from: ownerAccount});
        try {
            await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("3"),
                "0x0000000000000000000000000000000000000000", {from: userAccount});
            assert.fail("Should throw an exception trying to deploy a campaign with insufficient HEO");
        } catch (err) {
            assert.equal(err.reason, "ERC20: burn amount exceeds balance", "Wrong error message: " + err.reason);
        }

        try {
            await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("2.5"),
                "0x0000000000000000000000000000000000000000", {from: userAccount});
            assert.fail("Should throw an exception trying to deploy a campaign with insufficient HEO");
        } catch (err) {
            assert.equal(err.reason, "ERC20: burn amount exceeds balance", "Wrong error message: " + err.reason);
        }
    });

    it("Should deploy a campaign for raising 100 ETH with Y = 0.1, Z = 200 by burning 0.5 HEO", async() => {
        let charityAccount = accounts[1];
        await iDistribution.distribute(charityAccount, web3.utils.toWei("1"), {from: ownerAccount});
        //charityAccount should be able to start a campaign
        var balanceBefore = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(web3.utils.fromWei(balanceBefore) > 0.5, "Expecting " + balanceBefore + " to be > 0.5");
        var myCampaigns = await iRegistry.getMyCampaigns.call({from: charityAccount});
        var countBefore = myCampaigns.length;
        var tx = await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("0.5"),
            "0x0000000000000000000000000000000000000000", {from: charityAccount});
        assert.isNotNull(tx, "Transaction should not be null.");
        var events = tx.logs;
        assert.isNotNull(events, "Should have emitted events.");
        assert.equal(events.length, 2, "Should have emitted 2 events.");
        var deployEvent = events[1];
        assert.isNotNull(deployEvent);
        assert.isNotNull(deployEvent.args);
        assert.isNotNull(deployEvent.args.campaignAddress, "Expecting campaignAddress argument in deploy event.");
        myCampaigns = await iRegistry.getMyCampaigns.call({from: charityAccount});
        var countAfter = myCampaigns.length;
        assert.equal(countBefore+1, countAfter, "Should have one more campaign registered.");
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
        var yieldDecimals = await lastCampaign.donationYieldDecimals.call();
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
        console.log("Donation yield: " + y.toNumber()/10**yieldDecimals.toNumber())*/
        assert.isTrue(new BN("20").mul(new BN("10").pow(yieldDecimals)).div(z).eq(y), "Expecting Y to be 10000 but got " + y);
    });

    it("Should deploy a campaign for raising 10,000 ETH with Y = 2, Z = 10 by burning 1000 HEO", async() => {
        let charityAccount = accounts[1];
        await iDistribution.distribute(charityAccount, web3.utils.toWei("1000"), {from: ownerAccount});
        //charityAccount should be able to start a campaign
        var balanceBefore = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(web3.utils.fromWei(balanceBefore) >= 1000, "Expecting " + balanceBefore + " to be 1000+.");
        var myCampaigns = await iRegistry.getMyCampaigns.call({from: charityAccount});
        var countBefore = myCampaigns.length;
        var tx = await iCampaignFactory.createCampaign(web3.utils.toWei("10000"), web3.utils.toWei("1000"),
            "0x0000000000000000000000000000000000000000", {from: charityAccount});
        assert.isNotNull(tx, "Transaction should not be null.");
        var events = tx.logs;
        assert.isNotNull(events, "Should have emitted events.");
        assert.equal(events.length, 2, "Should have emitted 2 events.");
        var deployEvent = events[1];
        assert.isNotNull(deployEvent);
        assert.isNotNull(deployEvent.args);
        assert.isNotNull(deployEvent.args.campaignAddress, "Expecting campaignAddress argument in deploy event.");
        myCampaigns = await iRegistry.getMyCampaigns.call({from: charityAccount});
        var countAfter = myCampaigns.length;
        assert.equal(countBefore+1, countAfter, "Should have one more campaign registered.");
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
        var yieldDecimals = await lastCampaign.donationYieldDecimals.call();
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
        console.log("Donation yield: " + y.toNumber()/10**yieldDecimals.toNumber())*/
        assert.isTrue(new BN("20").mul(new BN("10").pow(yieldDecimals)).div(z).eq(y), "Expecting Y to be 10000 but got " + y);
    });
});
