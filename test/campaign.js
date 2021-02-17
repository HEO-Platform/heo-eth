const HEOToken = artifacts.require("HEOToken");
const HEOCampaign = artifacts.require("HEOCampaign");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEORewardFarm = artifacts.require("HEORewardFarm");
const StableCoinForTests = artifacts.require("StableCoinForTests");
const timeMachine = require('ganache-time-traveler');
const REWARD_PERIOD = 10;
const MAX_CAMPAIGNS = 25;
var BN = web3.utils.BN;
var iTestCoin, ownerAccount, charityAccount, investorAccount, iRewardFarm, iRegistry, iToken, iGlobalParams, iPriceOracle, iDistribution, iCampaignFactory;
contract("HEOCampaign", (accounts) => {
    before(async () => {
        ownerAccount = accounts[0];
        charityAccount = accounts[1];
        investorAccount = accounts[3];
        iTestCoin = await StableCoinForTests.new("TUSD");
        await iTestCoin.transfer(investorAccount, web3.utils.toWei("10000"));
        //deploy contracts and set initial values
        iRegistry = await HEOCampaignRegistry.deployed();
        iToken = await HEOToken.deployed();
        iGlobalParams = await HEOGlobalParameters.deployed();
        iPriceOracle = await HEOPriceOracle.deployed();
        iDistribution = await HEOManualDistribution.deployed();
        iRewardFarm = await HEORewardFarm.deployed();
        await iPriceOracle.setPrice(iTestCoin.address, web3.utils.toWei("10"));
        iCampaignFactory = await HEOCampaignFactory.new(iRegistry.address,
            iGlobalParams.address, iPriceOracle.address, iRewardFarm.address);
        await iRegistry.setFactory(iCampaignFactory.address);
        await iToken.addMinter(iDistribution.address, {from: ownerAccount});
        await iToken.addBurner(iCampaignFactory.address, {from: ownerAccount});
        await iToken.addMinter(iRewardFarm.address, {from: ownerAccount});
        //distribute HEO to charity, so it can deploy campaigns
        await iDistribution.distribute(charityAccount, web3.utils.toWei("2000"), {from: ownerAccount});
        var blockNumber = await web3.eth.getBlockNumber();
        var chainTime = (await web3.eth.getBlock(blockNumber)).timestamp;
        await iGlobalParams.setGlobalRewardStart(chainTime);
        await timeMachine.advanceTimeAndBlock(2);
    });

    it("Should disallow ETH donations when campaign is set to accept stable a coin.", async() => {
        //test conditions
        var charityCoinBalanceBefore = await iTestCoin.balanceOf.call(charityAccount);
        await iGlobalParams.setRewardPeriod(REWARD_PERIOD);
        await iGlobalParams.setMaxRewardPeriods(12);
        //Set price to 0.2ETH per 1 HEO
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iPriceOracle.setPrice(iTestCoin.address, web3.utils.toWei("2"));
        //deploy campaign for 100 ETH and burn 5 HEO (1 ETH worgh of HEO)
        await iCampaignFactory.createCampaign(web3.utils.toWei("200"), web3.utils.toWei("1"),
            iTestCoin.address, "https://someurl1", {from: charityAccount});
        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var lastCampaign = await HEOCampaign.at(myCampaigns[myCampaigns.length-1]);
        var z = await lastCampaign.getZ.call();
        assert.equal(z.toString(), "100", "Expecting Z = 100, but got " + z.toString());
        var y = await lastCampaign.donationYield.call();
        assert.isTrue(new BN(web3.utils.toWei("0.2")).eq(y), "Expecting y = 0.2, but got " + y.toString());
        //Make a donation
        await iTestCoin.approve(lastCampaign.address, web3.utils.toWei("10"), {from: investorAccount});
        try {
            await lastCampaign.donateNative({from: investorAccount, value: web3.utils.toWei("1", "ether")});
            assert.fail(`Should fail to donate ETH when campaign accepts ${iTestCoin.address}`);
        } catch (err) {
            assert.equal(err.reason, "HEOCampaign: this campaign does not accept ETH.",
                `Wrong error message: ${err.reason}`);
        }
        //Make sure beneficiary's balance of stablecoin has not changed
        var charityCoinBalanceAfter = await iTestCoin.balanceOf.call(charityAccount);
        assert.isTrue(charityCoinBalanceAfter.eq(charityCoinBalanceBefore),
            `Expecting charity balance to remain ${charityCoinBalanceBefore}, but found ${charityCoinBalanceAfter}`);
    });

    it("Should calculate full reward of 2 TUSD (1 HEO) after full reward time with constant HEO price of 2 TUSD by" +
        " donating 10 TUSD to a campaign with Y=0.2", async() => {
        //test conditions
        await iGlobalParams.setRewardPeriod(REWARD_PERIOD);
        await iGlobalParams.setMaxRewardPeriods(12);
        var charityCoinBalanceBefore = await iTestCoin.balanceOf.call(charityAccount);
        //Set price to 0.2ETH per 1 HEO
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iPriceOracle.setPrice(iTestCoin.address, web3.utils.toWei("2"));
        //deploy campaign for 100 ETH and burn 5 HEO (1 ETH worgh of HEO)
        await iCampaignFactory.createCampaign(web3.utils.toWei("200"), web3.utils.toWei("1"),
            iTestCoin.address, "https://someurl1", {from: charityAccount});
        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        var lastCampaign = await HEOCampaign.at(myCampaigns[myCampaigns.length-1]);
        var z = await lastCampaign.getZ.call();
        assert.equal(z.toString(), "100", "Expecting Z = 100, but got " + z.toString());
        var y = await lastCampaign.donationYield.call();
        assert.isTrue(new BN(web3.utils.toWei("0.2")).eq(y), "Expecting y = 0.2, but got " + y.toString());
        //Make a donation
        await iTestCoin.approve(lastCampaign.address, web3.utils.toWei("10"), {from: investorAccount});
        await lastCampaign.donateERC20(web3.utils.toWei("10"), {from: investorAccount});
        var charityCoinBalanceAfter = await iTestCoin.balanceOf.call(charityAccount);
        assert.isTrue(charityCoinBalanceBefore.add(new BN(web3.utils.toWei("10"))).eq(charityCoinBalanceAfter),
            `Expecting charity balance to increase by 10 TUSD, but found ${charityCoinBalanceAfter}`);
        //Advance time
        for(var i=0;i<20;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
            await iPriceOracle.setPrice(iTestCoin.address, web3.utils.toWei("2"));
            assert.isTrue(await advance(chainTimeBefore));
        }
        //Check reward
        var myReward = await iRewardFarm.calculateReward(investorAccount, 0);
        //var x = await iGlobalParams.profitabilityCoefficient();
        //console.log(`Y = ${y}, Z = ${z}, X = ${x}`);

        //claim reward
        var investorBalanceBefore = await iToken.balanceOf.call(investorAccount);
        await iRewardFarm.claimReward(investorAccount, 0, myReward, {from: investorAccount});
        var investorBalanceAfter = await iToken.balanceOf.call(investorAccount);
        var myReward2 = await iRewardFarm.calculateReward(investorAccount, 0);

        //should get 2 TUSD worth of HEO, which at HEO = 0.2ETH is 5 HEO
        assert.isTrue(new BN(web3.utils.toWei("1")).eq(myReward),
            "Expecting reward of 1 HEO, but got " + myReward.toString());
        assert.isTrue(investorBalanceAfter.sub(investorBalanceBefore).eq(myReward),
            `Expecting investor's HEO balance to increase by 1 HEO. Balance after: ${investorBalanceAfter.toString()}.\
             Balance before: ${investorBalanceBefore.toString()}`);
        //check that reward calculation is still correct after claiming
        assert.isTrue(myReward2.eq(myReward),
            `Expecting to see ${myReward.toString()} HEO reward after claiming, but got ${myReward2.toString()}`);
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
//100000000000000000
//1134439500000000000