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
var ownerAccount, charityAccount, investorAccount1, investorAccount2,  investorAccount3, randomPerson, iRewardFarm, iRegistry, iToken, iGlobalParams, iPriceOracle, iDistribution, iCampaignFactory;
contract("HEORewardFarm - variable", (accounts) => {
    before(async () => {
        ownerAccount = accounts[0];
        charityAccount = accounts[1];
        investorAccount1 = accounts[2];
        investorAccount2 = accounts[3];
        investorAccount3 = accounts[4];
        randomPerson = accounts[5];
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
        var blockNumber = await web3.eth.getBlockNumber();
        var chainTime = (await web3.eth.getBlock(blockNumber)).timestamp;
        await iGlobalParams.setGlobalRewardStart(chainTime);
        console.log("Last block " + blockNumber);
        console.log("Last block time " + chainTime);
        console.log("Current period " + await iPriceOracle.getCurrentPeriod.call());
        await timeMachine.advanceTimeAndBlock(2);
    });

    it("Should calculate full reward of 2 ETH as 7.5 HEO when HEO price doubles for the second half of reward period", async() => {
        //test conditions
        await iGlobalParams.setRewardPeriod(REWARD_PERIOD);
        await iGlobalParams.setMaxRewardPeriods(40);
        //Set price to 0.2ETH per 1 HEO
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
        //deploy campaign for 100 ETH and burn 50 HEO (10 ETH worth of HEO)
        await iCampaignFactory.createCampaign(web3.utils.toWei("100") /* ETH */, web3.utils.toWei("50") /* HEO */,
            "0x0000000000000000000000000000000000000000", {from: charityAccount});
        var myCampaigns = await iRegistry.getMyCampaigns.call({from: charityAccount});
        var lastCampaign = await HEOCampaign.at(myCampaigns[myCampaigns.length-1]);
        var z = await lastCampaign.getZ.call();
        assert.isTrue(new BN("10").eq(z), "Expecting Z = 10, but got " + z.toString());
        var y = await lastCampaign.donationYield.call();
        assert.isTrue(new BN(web3.utils.toWei("2")).eq(y), "Expecting y = 2, but got " + y.toString());
        //Make donation of 1 ETH
        await lastCampaign.donateNative({from: investorAccount1, value: web3.utils.toWei("1", "ether")});
        //Advance time

        for(var i=0;i<20;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
            assert.isTrue(await advance(chainTimeBefore));
        }
        for(var i=0;i<20;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.4));
            assert.isTrue(await advance(chainTimeBefore));
        }
        /*        var numDonations = await iRewardFarm.numDonations(investorAccount2);
                var startPeriod = await iRewardFarm.startPeriod(investorAccount2);
                var rewardPeriods = await iRewardFarm.rewardPeriods(investorAccount2);
                var periodReward = await iRewardFarm.periodReward(investorAccount2);
                var firstReward = await iRewardFarm.firstReward(investorAccount2);
                var donationAmount = await iRewardFarm.donationAmount(investorAccount2);
                var periodPrice1 = await iRewardFarm.periodPrice(investorAccount2, 0);
                var periodPrice2 = await iRewardFarm.periodPrice(investorAccount2, 1);
                var periodPrice300 = await iRewardFarm.periodPrice(investorAccount2, 300);
                var x = await iGlobalParams.profitabilityCoefficient();
                console.log(`Y = ${y}, Z = ${z}, X = ${x}`);
                console.log(`donationAmount: ${donationAmount}, numDonations: ${numDonations}, startPeriod: ${startPeriod}, rewardPeriods: ${rewardPeriods}, periodReward: ${periodReward}, firstReward: ${firstReward}`);
                console.log(`periodPrice1: ${periodPrice1},periodPrice2: ${periodPrice2}, periodPrice300: ${periodPrice300}`);
        */
        //Check reward
        var myReward = await iRewardFarm.calculateReward(investorAccount1, 0);
        //claim reward to another account
        var investorBalanceBefore = await iToken.balanceOf.call(investorAccount1);
        var randomsBalanceBefore = await iToken.balanceOf.call(randomPerson);
        await iRewardFarm.claimReward(randomPerson, 0, myReward, {from: investorAccount1});
        var investorBalanceAfter = await iToken.balanceOf.call(investorAccount1);
        var randomsBalanceAfter = await iToken.balanceOf.call(randomPerson);
        //console.log("Expecting reward of 7.5 HEO, but got " + Math.round(myReward.div(new BN("10000000000000000")).toNumber()/100));
        //should get 2 ETH worth of HEO, which at HEO = 0.2ETH is 10 HEO
        assert.isTrue(new BN("7500000000000000000").eq(myReward), "Expecting reward of 7.5 HEO, but got " + myReward.toString());
        assert.isTrue(investorBalanceAfter.eq(investorBalanceBefore), `Expecting investor's HEO balance to remain the same. Balance after: ${investorBalanceAfter}. Balance before: ${investorBalanceBefore}`);
        assert.isTrue(randomsBalanceAfter.sub(randomsBalanceBefore).eq(myReward), `Expecting account5's HEO balance to increase by 7.5 HEO. Balance after: ${randomsBalanceAfter}. Balance before: ${randomsBalanceBefore}`);
    });

    it("Should calculate full reward of 2 ETH as 4.76 НЕО when HEO price doubles every quarter", async() => {
        //test conditions
        await iGlobalParams.setRewardPeriod(REWARD_PERIOD);
        await iGlobalParams.setMaxRewardPeriods(365);
        //await timeMachine.advanceBlock();
        //Set price to 0.2ETH per 1 HEO
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
        //await timeMachine.advanceBlock();
        //deploy campaign for 100 ETH and burn 50 HEO (10 ETH worth of HEO)
        await iCampaignFactory.createCampaign(web3.utils.toWei("100") /* ETH */, web3.utils.toWei("50") /* HEO */,
            "0x0000000000000000000000000000000000000000", {from: charityAccount});
        //await timeMachine.advanceBlock();
        var myCampaigns = await iRegistry.getMyCampaigns.call({from: charityAccount});
        var lastCampaign = await HEOCampaign.at(myCampaigns[myCampaigns.length-1]);
        var z = await lastCampaign.getZ.call();
        assert.isTrue(new BN("10").eq(z), "Expecting Z = 10, but got " + z.toString());
        var y = await lastCampaign.donationYield.call();
        assert.isTrue(new BN(web3.utils.toWei("2")).eq(y), "Expecting y = 2, but got " + y.toString());
        var investorBalanceBefore = await iToken.balanceOf.call(investorAccount3);
        //Make donation of 1 ETH
        await lastCampaign.donateNative({from: investorAccount3, value: web3.utils.toWei("1", "ether")});
        //await timeMachine.advanceBlock();

        var blockNumber = await web3.eth.getBlockNumber();
        var chainTimeStart = (await web3.eth.getBlock(blockNumber)).timestamp;
        console.log(`Starting to advance time and change price. Current block time: ${chainTimeStart} / ${new Date(chainTimeStart*1000).toTimeString()}`);
        for(var i=0;i<90;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;

            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
            assert.isTrue(await advance(chainTimeBefore));

        }
        console.log(`Advanced time by ${REWARD_PERIOD * 90} seconds.`);
        for(var i=0;i<91;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;

            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.4));
            assert.isTrue(await advance(chainTimeBefore));
        }
        console.log(`Advanced time by ${REWARD_PERIOD * 91} seconds.`);
        for(var i=0;i<92;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;

            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.8));
            assert.isTrue(await advance(chainTimeBefore));
        }
        console.log(`Advanced time by ${REWARD_PERIOD * 92} seconds.`);
        for(var i=0;i<92;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;

            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+1.2));
            assert.isTrue(await advance(chainTimeBefore));
        }
        console.log(`Advanced time by ${REWARD_PERIOD * 92} seconds.`);
        blockNumber = await web3.eth.getBlockNumber();
        var chainTimeEnd = (await web3.eth.getBlock(blockNumber)).timestamp;
        console.log(`Current block time:  ${chainTimeEnd}  / ${new Date(chainTimeEnd*1000).toTimeString()}`);
        var elapsed = (chainTimeEnd - chainTimeStart);
        assert.equal(elapsed, 365 * REWARD_PERIOD, `Expecting blockchain to advance ${365 * REWARD_PERIOD} seconds, but got ${elapsed}`);
        //Check reward
        var myReward = await iRewardFarm.calculateReward(investorAccount3, 0);

        //claim reward
        await iRewardFarm.claimReward(investorAccount3, 0, myReward, {from: investorAccount3});
        var investorBalanceAfter = await iToken.balanceOf.call(investorAccount3);
        //console.log("Expecting reward of 7.5 HEO, but got " + Math.round(myReward.div(new BN("10000000000000000")).toNumber()/100));
        //should get 2 ETH worth of HEO, which at HEO = 0.2ETH is 10 HEO
        assert.isTrue(new BN("4762557077625600000").eq(myReward), "Expecting reward of 4.76 HEO, but got " + myReward.toString());
        assert.isTrue(investorBalanceAfter.sub(investorBalanceBefore).eq(myReward), `Expecting investor's HEO balance to increase by 4.76 HEO. Balance after: ${investorBalanceAfter.toString()}. Balance before: ${investorBalanceBefore.toString()}`);

        //check claimed reward
        var claimedReward = await iRewardFarm.claimedReward(investorAccount3, 0);
        assert.isTrue(claimedReward.eq(myReward), `Expecting claimed reward (${claimedReward.toString()}) to be equal ${myReward.toString()}`);

        //check that reward calculation is still correct after claiming
        var myReward2 = await iRewardFarm.calculateReward(investorAccount3, 0);
        assert.isTrue(myReward2.eq(myReward), `Expecting to see ${myReward.toString()} HEO reward after claiming, but got ${myReward2.toString()}`);
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