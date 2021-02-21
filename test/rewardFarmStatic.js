const HEOToken = artifacts.require("HEOToken");
const HEOCampaign = artifacts.require("HEOCampaign");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEORewardFarm = artifacts.require("HEORewardFarm");
const timeMachine = require('ganache-time-traveler');
const REWARD_PERIOD = 10;
var BN = web3.utils.BN;
var ownerAccount, charityAccount, charityAccount2, investorAccount1, investorAccount2,  investorAccount3,
    investorAccount4, investorAccount5, iRewardFarm, iRegistry, iToken, iGlobalParams, iPriceOracle, iDistribution, iCampaignFactory;
contract("HEORewardFarm - static", (accounts) => {
    before(async () => {
        ownerAccount = accounts[0];
        charityAccount = accounts[1];
        charityAccount2 = accounts[2];
        investorAccount1 = accounts[3];
        investorAccount2 = accounts[4];
        investorAccount3 = accounts[5];
        investorAccount4 = accounts[6];
        investorAccount5 = accounts[7];
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
        await iToken.addMinter(iRewardFarm.address, {from: ownerAccount});
        //distribute HEO to charity, so it can deploy campaigns
        await iDistribution.distribute(charityAccount, web3.utils.toWei("200"), {from: ownerAccount});
        await iDistribution.distribute(charityAccount2, web3.utils.toWei("200"), {from: ownerAccount});
        var blockNumber = await web3.eth.getBlockNumber();
        var chainTime = (await web3.eth.getBlock(blockNumber)).timestamp;
        await iGlobalParams.setGlobalRewardStart(chainTime);
        console.log("Last block " + blockNumber);
        console.log("Last block time " + chainTime);
        console.log("Current period " + await iPriceOracle.getCurrentPeriod.call());
        await timeMachine.advanceTimeAndBlock(2);
    });

    it("Should calculate full reward of 0.2 ETH (1 HEO) after full reward time with constant HEO price of 0.2ETH by" +
        " donating 1ETH to a campaign with Y=0.2", async() => {
        //test conditions
        await iGlobalParams.setRewardPeriod(REWARD_PERIOD);
        await iGlobalParams.setMaxRewardPeriods(12);
        //Set price to 0.2ETH per 1 HEO
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
        //deploy campaign for 100 ETH and burn 5 HEO (1 ETH worgh of HEO)
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("5"),
            "0x0000000000000000000000000000000000000000", "https://someurl1", {from: charityAccount});
        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var lastCampaign = await HEOCampaign.at(myCampaigns[myCampaigns.length-1]);
        var z = await lastCampaign.getZ.call();
        assert.equal(z.toString(), "100", "Expecting Z = 100, but got " + z.toString());
        var y = await lastCampaign.donationYield.call();
        assert.isTrue(new BN(web3.utils.toWei("0.2")).eq(y), "Expecting y = 0.2, but got " + y.toString());
        //Make donation of 1 ETH
        await lastCampaign.donateNative({from: investorAccount1, value: web3.utils.toWei("1", "ether")});
        //Advance time
        for(var i=0;i<20;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
            assert.isTrue(await advance(chainTimeBefore));
        }
        //Check reward
        var myReward = await iRewardFarm.calculateReward(investorAccount1, 0);
        //var x = await iGlobalParams.profitabilityCoefficient();
        //console.log(`Y = ${y}, Z = ${z}, X = ${x}`);

        //claim reward
        var investorBalanceBefore = await iToken.balanceOf.call(investorAccount1);
        await iRewardFarm.claimReward(investorAccount1, 0, myReward, {from: investorAccount1});
        var investorBalanceAfter = await iToken.balanceOf.call(investorAccount1);
        var myReward2 = await iRewardFarm.calculateReward(investorAccount1, 0);

        //should get 1 ETH worth of HEO, which at HEO = 0.2ETH is 5 HEO
        assert.isTrue(new BN(web3.utils.toWei("1")).eq(myReward),
            "Expecting reward of 1 HEO, but got " + myReward.toString());
        assert.isTrue(investorBalanceAfter.sub(investorBalanceBefore).eq(myReward),
            `Expecting investor's HEO balance to increase by 1 HEO. Balance after: ${investorBalanceAfter.toString()}.\
             Balance before: ${investorBalanceBefore.toString()}`);
        //check that reward calculation is still correct after claiming
        assert.isTrue(myReward2.eq(myReward),
            `Expecting to see ${myReward.toString()} HEO reward after claiming, but got ${myReward2.toString()}`);
    });

    it("Should calculate half reward after half reward time with constant HEO price" +
        " of 0.2ETH by donating 1ETH to a campaign with Y=0.2", async() => {
        //test conditions
        await iGlobalParams.setRewardPeriod(REWARD_PERIOD);
        await iGlobalParams.setMaxRewardPeriods(12);
        //Set price to 0.2ETH per 1 HEO
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
        //deploy campaign for 100 ETH and burn 5 HEO (1 ETH worgh of HEO)
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("5"),
            "0x0000000000000000000000000000000000000000", "https://someurl2", {from: charityAccount});
        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var lastCampaign = await HEOCampaign.at(myCampaigns[myCampaigns.length-1]);
        var z = await lastCampaign.getZ.call();
        assert.equal(z.toString(), "100", "Expecting Z = 100, but got " + z.toString());
        var y = await lastCampaign.donationYield.call();
        assert.isTrue(new BN(web3.utils.toWei("0.2")).eq(y), "Expecting y = 0.2, but got " + y.toString());

        //Make donation of 1 ETH
        await lastCampaign.donateNative({from: investorAccount2, value: web3.utils.toWei("1", "ether")});

        //Advance time
        for(var i=0;i<6;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
            assert.isTrue(await advance(chainTimeBefore));
        }

        //Check reward
        var investorBalanceBefore = await iToken.balanceOf.call(investorAccount2);
        var myReward1 = await iRewardFarm.calculateReward(investorAccount2, 0);

        //claim reward
        await iRewardFarm.claimReward(investorAccount2, 0, myReward1, {from: investorAccount2});
        var myReward2 = await iRewardFarm.calculateReward(investorAccount2, 0);
        var investorBalanceAfter = await iToken.balanceOf.call(investorAccount2);

        assert.isTrue(new BN(web3.utils.toWei("0.5")).eq(myReward1),
            "Expecting reward of 0.5 HEO, but got " + myReward1.toString());
        assert.isTrue(investorBalanceAfter.sub(investorBalanceBefore).eq(myReward1),
            `Expecting investor's HEO balance to increase by 0.5 HEO. Balance after: ${investorBalanceAfter.toString()}.\
             Balance before: ${investorBalanceBefore.toString()}`);
        //check that reward calculation is still correct after claiming
        assert.isTrue(myReward2.eq(myReward1),
            `Expecting to see ${myReward1.toString()} HEO reward after claiming, but got ${myReward2.toString()}`);

        //Advance time to go past full reward time
        for(var i=0;i<7;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
            assert.isTrue(await advance(chainTimeBefore));
        }
        var myReward3 = await iRewardFarm.calculateReward(investorAccount2, 0);
        assert.isTrue(new BN(web3.utils.toWei("1")).eq(myReward3),
            "Expecting reward of 1 HEO, but got " + myReward3.toString());

        try {
            await iRewardFarm.claimReward(investorAccount2, 0, myReward3, {from: investorAccount2});
            assert.fail(`Should fail to claim full reward of ${myReward3} after claiming ${myReward1}`)
        } catch (err) {
            assert.equal(err.reason, "HEORewardFarm: claim amount is higher than available reward.");
        }
        await iRewardFarm.claimReward(investorAccount2, 0, myReward3.sub(myReward1), {from: investorAccount2});
        investorBalanceAfter = await iToken.balanceOf.call(investorAccount2);
        assert.isTrue(investorBalanceAfter.eq(myReward3), `Investor's balance should be ${myReward3.toString()}, \
            but found ${investorBalanceAfter.toString()}`);
    });

    it("Should calculate full reward of 2 ETH (10 HEO) after full reward time of 365 reward periods with constant HEO " +
        "price of 0.2ETH by donating 1ETH to a campaign with Y=2", async() => {
        //test conditions
        await iGlobalParams.setRewardPeriod(REWARD_PERIOD);
        await iGlobalParams.setMaxRewardPeriods(365);
        //Set price to 0.2ETH per 1 HEO
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
        //deploy campaign for 100 ETH and burn 50 HEO (10 ETH worth of HEO)
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("50"),
            "0x0000000000000000000000000000000000000000", "https://someurl3", {from: charityAccount});
        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var lastCampaign = await HEOCampaign.at(myCampaigns[myCampaigns.length-1]);
        var z = await lastCampaign.getZ.call();
        assert.isTrue(new BN("10").eq(z), "Expecting Z = 10, but got " + z.toString());
        var y = await lastCampaign.donationYield.call();
        assert.isTrue(new BN(web3.utils.toWei("2")).eq(y), "Expecting y = 2, but got " + y.toString());
        //Make donation of 1 ETH
        await lastCampaign.donateNative({from: investorAccount3, value: web3.utils.toWei("1", "ether")});
        //Advance time

        for(var i=0;i<365;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
            assert.isTrue(await advance(chainTimeBefore));
        }

        //Check reward
        var myReward = await iRewardFarm.calculateReward(investorAccount3, 0);
        console.log(`Expecting reward of 10 HEO. Got ${myReward.toString()} wei`);
        //should get 2 ETH worth of HEO, which at HEO = 0.2ETH is 10 HEO
        assert.isTrue(new BN(web3.utils.toWei("10")).eq(myReward),
            "Expecting reward of 10 HEO, but got " + myReward.toString());
    });

    it("Should calculate rewards from 2 donations", async () => {
        //test conditions
        await iGlobalParams.setRewardPeriod(REWARD_PERIOD);
        await iGlobalParams.setMaxRewardPeriods(12);
        //Set price to 0.2ETH per 1 HEO
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
        //deploy campaign for 100 ETH and burn 5 HEO (1 ETH worgh of HEO)
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("5"),
            "0x0000000000000000000000000000000000000000", "https://someurl4", {from: charityAccount});
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("5"),
            "0x0000000000000000000000000000000000000000", "https://someurl5", {from: charityAccount2});
        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var campaign1 = await HEOCampaign.at(myCampaigns[myCampaigns.length-1]);
        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount2});
        var campaign2 = await HEOCampaign.at(myCampaigns[myCampaigns.length-1]);

        //Make the first donation
        var blockNumber = await web3.eth.getBlockNumber();
        var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
        await campaign1.donateNative({from: investorAccount4, value: web3.utils.toWei("1", "ether")});

        //Advance time
        blockNumber = await web3.eth.getBlockNumber();
        var chainTimeAfter = (await web3.eth.getBlock(blockNumber)).timestamp;
        var elapsed = chainTimeAfter - chainTimeBefore;
        for(var i=0;i<6;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
            assert.isTrue(await advance(chainTimeBefore));
        }
        //claim reward earned so far
        var myReward = await iRewardFarm.calculateReward(investorAccount4, 0);
        var investorBalanceBefore = await iToken.balanceOf.call(investorAccount4);
        await iRewardFarm.claimReward(investorAccount4, 0, myReward, {from: investorAccount4});
        var investorBalanceAfter = await iToken.balanceOf.call(investorAccount4);
        //console.log(`Partial reward from the first donation: ${myReward}`);
        assert.isTrue(myReward.eq(new BN(web3.utils.toWei("0.5"))),
            `Expecting partial reward from the first donation to be 0.5HEO, but got ${myReward}`);
        assert.isTrue(investorBalanceAfter.sub(investorBalanceBefore).eq(myReward),
            `Expecting investor's HEO balance to increase by 0.5 HEO. Balance after: ${investorBalanceAfter.toString()}. \
             Balance before: ${investorBalanceBefore.toString()}`);

        //Make the second donation
        blockNumber = await web3.eth.getBlockNumber();
        chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
        await campaign2.donateNative({from: investorAccount4, value: web3.utils.toWei("1", "ether")});

        //Advance time again
        blockNumber = await web3.eth.getBlockNumber();
        chainTimeAfter = (await web3.eth.getBlock(blockNumber)).timestamp;
        elapsed = chainTimeAfter - chainTimeBefore;
        for(var i=0;i<6;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
            assert.isTrue(await advance(chainTimeBefore));
        }
        //Check reward
        var myDonations = (await iRewardFarm.getDonationCount.call(investorAccount4)).toNumber();
        assert.equal(myDonations, 2, `Expecting to have made 2 donations, but found ${myDonations}`);
        var myReward1 = await iRewardFarm.calculateReward(investorAccount4, 0);
        var myReward2 = await iRewardFarm.calculateReward(investorAccount4, 1);
        var totalReward = myReward1.add(myReward2);
        //this should fail, because we have already claimed part of the reward
        try {
            await iRewardFarm.claimReward(investorAccount4, 0, myReward1, {from: investorAccount4});
            assert.fail("Should have failed to claim the entire reward from the first donation.");
        } catch (err) {
            assert.equal(err.reason, "HEORewardFarm: claim amount is higher than available reward.");
        }
        //this should succeed
        await iRewardFarm.claimReward(investorAccount4, 0, myReward1.sub(myReward), {from: investorAccount4});
        investorBalanceAfter = await iToken.balanceOf.call(investorAccount4);
        assert.isTrue(investorBalanceAfter.sub(investorBalanceBefore).eq(myReward1),
            `Expecting investor's HEO balance to increase by ${myReward1}. Balance after: ${investorBalanceAfter.toString()}. \
            Balance before: ${investorBalanceBefore.toString()}`);
        assert.isTrue(new BN(web3.utils.toWei("1.5")).eq(totalReward),
            `Expecting reward of 1.5 HEO, but got ${myReward1.toString()} and ${myReward2.toString()}`);
    });

    it("Should calculate rewards from 2 donations and claim part of the reward before making the second donation",
        async () => {
        //test conditions
        await iGlobalParams.setRewardPeriod(REWARD_PERIOD);
        await iGlobalParams.setMaxRewardPeriods(12);
        //Set price to 0.2ETH per 1 HEO
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
        //deploy campaign for 100 ETH and burn 5 HEO (1 ETH worgh of HEO)
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("5"),
            "0x0000000000000000000000000000000000000000", "https://someurl6", {from: charityAccount});
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("5"),
            "0x0000000000000000000000000000000000000000", "https://someurl7", {from: charityAccount2});
        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var campaign1 = await HEOCampaign.at(myCampaigns[myCampaigns.length-1]);
        var raisedAmount = await campaign1.raisedAmount.call();
        assert.isTrue(new BN(raisedAmount).eq(new BN(web3.utils.toWei("0"))),
            `Expected raisedAmount to be 0, but got ${raisedAmount.toString()}`);
        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount2});
        var campaign2 = await HEOCampaign.at(myCampaigns[myCampaigns.length-1]);

        //Make the first donation
        var blockNumber = await web3.eth.getBlockNumber();
        var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
        await campaign1.donateNative({from: investorAccount5, value: web3.utils.toWei("1", "ether")});

        raisedAmount = await campaign1.raisedAmount.call();
        assert.isTrue(new BN(raisedAmount).eq(new BN(web3.utils.toWei("1"))),
            `Expected raisedAmount to be 1 ETH, but got ${raisedAmount.toString()}`);
        //Advance time
        blockNumber = await web3.eth.getBlockNumber();
        var chainTimeAfter = (await web3.eth.getBlock(blockNumber)).timestamp;
        var elapsed = chainTimeAfter - chainTimeBefore;
        for(var i=0;i<6;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
            assert.isTrue(await advance(chainTimeBefore));
        }
        //Make the second donation
        blockNumber = await web3.eth.getBlockNumber();
        chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
        await campaign2.donateNative({from: investorAccount5, value: web3.utils.toWei("1", "ether")});
        raisedAmount = await campaign2.raisedAmount.call();
        assert.isTrue(new BN(raisedAmount).eq(new BN(web3.utils.toWei("1"))),
            `Expected raisedAmount to be 1 ETH, but got ${raisedAmount.toString()}`);
        //Advance time again
        blockNumber = await web3.eth.getBlockNumber();
        chainTimeAfter = (await web3.eth.getBlock(blockNumber)).timestamp;
        elapsed = chainTimeAfter - chainTimeBefore;
        for(var i=0;i<6;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
            assert.isTrue(await advance(chainTimeBefore));
        }
        //Check reward
        var myDonations = (await iRewardFarm.getDonationCount.call(investorAccount5)).toNumber();
        assert.equal(myDonations, 2, `Expecting to have made 2 donations, but found ${myDonations}`);
        var myReward1 = await iRewardFarm.calculateReward(investorAccount5, 0);
        var myReward2 = await iRewardFarm.calculateReward(investorAccount5, 1);
        assert.isTrue(new BN(web3.utils.toWei("1.5")).eq(myReward1.add(myReward2)),
            `Expecting reward of 1.5 HEO, but got ${myReward1.toString()} and ${myReward2.toString()}`);
    });
});

advance = async (chainTimeBefore) => {
    var blockNumber = await web3.eth.getBlockNumber();
    var chainTimeAfter = (await web3.eth.getBlock(blockNumber)).timestamp;
    var elapsed = chainTimeAfter - chainTimeBefore;
    if(elapsed < REWARD_PERIOD) {
        await timeMachine.advanceTimeAndBlock((REWARD_PERIOD - elapsed));
    } else if(elapsed > REWARD_PERIOD) {
        console.log("Transaction taking too long " + elapsed);
        return false;
    }
    return true;
}
//1416666666666667000
//200000000000000000