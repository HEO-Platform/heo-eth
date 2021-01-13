const HEOToken = artifacts.require("HEOToken");
const HEOCampaign = artifacts.require("HEOCampaign");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEORewardFarm = artifacts.require("HEORewardFarm");
const timeMachine = require('ganache-time-traveler');
var BN = web3.utils.BN;
var ownerAccount, charityAccount, investorAccount1, investorAccount2,  investorAccount3, iRewardFarm, iRegistry, iToken, iGlobalParams, iPriceOracle, iDistribution, iCampaignFactory;
contract("HEORewardFarm", (accounts) => {
    before(async () => {
        ownerAccount = accounts[0];
        charityAccount = accounts[1];
        investorAccount1 = accounts[2];
        investorAccount2 = accounts[3];
        investorAccount3 = accounts[4];
        //deploy contracts and set initial values
        iRegistry = await HEOCampaignRegistry.deployed();
        iToken = await HEOToken.deployed();
        iGlobalParams = await HEOGlobalParameters.deployed();
        iPriceOracle = await HEOPriceOracle.deployed();
        iDistribution = await HEOManualDistribution.deployed();
        iRewardFarm = await HEORewardFarm.deployed();
        await iPriceOracle.setPrice("0x0000000000000000000000000000000000000000", web3.utils.toWei("1", "ether"));
        iCampaignFactory = await HEOCampaignFactory.new(iRegistry.address, iToken.address,
            iGlobalParams.address, iPriceOracle.address, iRewardFarm.address);
        await iRegistry.setFactory(iCampaignFactory.address);
        await iToken.addMinter(iDistribution.address, {from: ownerAccount});
        await iToken.addBurner(iCampaignFactory.address, {from: ownerAccount});
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

    it("Should calculate full reward of 0.2 ETH (1 HEO) after 12 reward periods of 2s each with constant HEO price of 0.2ETH by donating 1ETH to a campaign with Y=0.2", async() => {
        //test conditions
        await iGlobalParams.setRewardPeriod(2);//set reward period to 1 second for testing
        await iGlobalParams.setMaxRewardPeriods(12);
        //Set price to 0.2ETH per 1 HEO
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
        //deploy campaign for 100 ETH and burn 5 HEO (1 ETH worgh of HEO)
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("5"),
            "0x0000000000000000000000000000000000000000", {from: charityAccount});
        var myCampaigns = await iRegistry.getMyCampaigns.call({from: charityAccount});
        var lastCampaign = await HEOCampaign.at(myCampaigns[myCampaigns.length-1]);
        var z = await lastCampaign.getZ.call();
        assert.equal(z.toString(), "100", "Expecting Z = 100, but got " + z.toString());
        var y = await lastCampaign.donationYield.call();
        assert.isTrue(new BN(web3.utils.toWei("0.2")).eq(y), "Expecting y = 0.2, but got " + y.toString());
        //Make donation of 1 ETH
        await lastCampaign.donateNative({from: investorAccount1, value: web3.utils.toWei("1", "ether")});
        //Advance time
        await timeMachine.advanceTimeAndBlock(30);
        //Check reward
        var myReward = await iRewardFarm.calculateReward(investorAccount1);
        var numDonations = await iRewardFarm.numDonations(investorAccount1);
        var startPeriod = await iRewardFarm.startPeriod(investorAccount1);
        var rewardPeriods = await iRewardFarm.rewardPeriods(investorAccount1);
        var periodReward = await iRewardFarm.periodReward(investorAccount1);
        var firstReward = await iRewardFarm.firstReward(investorAccount1);
        var donationAmount = await iRewardFarm.donationAmount(investorAccount1);
        var x = await iGlobalParams.profitabilityCoefficient();
        console.log(`Y = ${y}, Z = ${z}, X = ${x}`);
        console.log(`donationAmount: ${donationAmount}, numDonations: ${numDonations}, startPeriod: ${startPeriod}, rewardPeriods: ${rewardPeriods}, periodReward: ${periodReward}, firstReward: ${firstReward}`);
        //should get 1 ETH worth of HEO, which at HEO = 0.2ETH is 5 HEO
        assert.isTrue(new BN(web3.utils.toWei("1")).eq(myReward), "Expecting reward of 1 HEO, but got " + myReward.toString());
    });

    it("Should calculate full reward of 2 ETH (10 HEO) after 365 reward periods of 2s each with constant HEO price of 0.2ETH by donating 1ETH to a campaign with Y=2", async() => {
        //test conditions
        await iGlobalParams.setRewardPeriod(2);//set reward period to 1 second for testing
        await iGlobalParams.setMaxRewardPeriods(365);
        //Set price to 0.2ETH per 1 HEO
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
        //deploy campaign for 100 ETH and burn 50 HEO (10 ETH worth of HEO)
        await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("50"),
            "0x0000000000000000000000000000000000000000", {from: charityAccount});
        var myCampaigns = await iRegistry.getMyCampaigns.call({from: charityAccount});
        var lastCampaign = await HEOCampaign.at(myCampaigns[myCampaigns.length-1]);
        var z = await lastCampaign.getZ.call();
        assert.isTrue(new BN("10").eq(z), "Expecting Z = 10, but got " + z.toString());
        var y = await lastCampaign.donationYield.call();
        assert.isTrue(new BN(web3.utils.toWei("2")).eq(y), "Expecting y = 2, but got " + y.toString());
        //Make donation of 1 ETH
        await lastCampaign.donateNative({from: investorAccount2, value: web3.utils.toWei("1", "ether")});
        //Advance time

        for(var i=0;i<500;i++) {
            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
            await timeMachine.advanceTimeAndBlock(2);
        }

        //Check reward
        var myReward = await iRewardFarm.calculateReward(investorAccount2);
        console.log("Expecting reward of 10 HEO, but got " + myReward.toString());
        //should get 2 ETH worth of HEO, which at HEO = 0.2ETH is 10 HEO
        assert.isTrue(new BN(web3.utils.toWei("10")).eq(myReward), "Expecting reward of 10 HEO, but got " + myReward.toString());
    });
});