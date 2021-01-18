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
const MAX_CAMPAIGNS = 25;
var BN = web3.utils.BN;
var ownerAccount, charityAccount, investorAccount1, iRewardFarm, iRegistry, iToken, iGlobalParams, iPriceOracle, iDistribution, iCampaignFactory;
contract("HEORewardFarm - scale", (accounts) => {
    before(async () => {
        ownerAccount = accounts[0];
        charityAccount = accounts[1];
        investorAccount1 = accounts[3];
        web3.eth.sendTransaction({from: accounts[3], to:investorAccount1, value: web3.utils.toWei("90", 'ether')});
        web3.eth.sendTransaction({from: accounts[4], to:investorAccount1, value: web3.utils.toWei("90", 'ether')});
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
        //distribute HEO to charity, so it can deploy campaigns
        await iDistribution.distribute(charityAccount, web3.utils.toWei("2000"), {from: ownerAccount});
        var blockNumber = await web3.eth.getBlockNumber();
        var chainTime = (await web3.eth.getBlock(blockNumber)).timestamp;
        await iGlobalParams.setGlobalRewardStart(chainTime);
        //console.log("Last block " + blockNumber);
        //console.log("Last block time " + chainTime);
        //console.log("Current period " + await iPriceOracle.getCurrentPeriod.call());
        await timeMachine.advanceTimeAndBlock(2);
    });

    it(`Should calculate rewards from ${MAX_CAMPAIGNS*2} investments into ${MAX_CAMPAIGNS} campaigns`, async () => {
        //test conditions
        await iGlobalParams.setRewardPeriod(REWARD_PERIOD);
        await iGlobalParams.setMaxRewardPeriods(365);
        //Set price to 0.2ETH per 1 HEO
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
        //deploy campaigns
        var campaignAmount = 100;
        var burnHeo = 50;

        for (var i=0;i<MAX_CAMPAIGNS;i++) {
            await iCampaignFactory.createCampaign(web3.utils.toWei(`${campaignAmount}`), web3.utils.toWei(`${burnHeo}`),
                "0x0000000000000000000000000000000000000000", {from: charityAccount});
        }

        //Make donations
        var myCampaigns = await iRegistry.getMyCampaigns.call({from: charityAccount});
        for(var i=0; i < myCampaigns.length; i++) {
            var campaign = await HEOCampaign.at(myCampaigns[i]);
            await campaign.donateNative({from: investorAccount1, value: web3.utils.toWei("1", "ether")});
        }

        //Set prices and advance time
        for(var i=0;i<180;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
            assert.isTrue(await advance(chainTimeBefore));
        }

        //Make more donations
        for(var i=0; i < myCampaigns.length; i++) {
            var campaign = await HEOCampaign.at(myCampaigns[i]);
            await campaign.donateNative({from: investorAccount1, value: web3.utils.toWei("1", "ether")});
        }

        //Set prices and advance time
        for(var i=0;i<185;i++) {
            var blockNumber = await web3.eth.getBlockNumber();
            var chainTimeBefore = (await web3.eth.getBlock(blockNumber)).timestamp;
            await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+0.2));
            assert.isTrue(await advance(chainTimeBefore), "Failed to advance time");
        }
        for(var i = 365; i >= 0; i--) {
            var periodPrice = await iPriceOracle.getPriceAtPeriod('0x0000000000000000000000000000000000000000', i);
            assert.isFalse(new BN("0").eq(periodPrice), `Period price is ${periodPrice.toString()} at period ${i}`)
        }
        //Check reward
        var myDonations = (await iRewardFarm.getDonationCount.call(investorAccount1)).toNumber();
        var totalReward = new BN("0");
        for(var i = 0; i < myDonations; i++) {
            try {
                var myReward = await iRewardFarm.calculateReward.call(investorAccount1, new BN("" + i));
                totalReward = totalReward.add(myReward);
                //console.log(`My reward for donation ${i} is ${myReward}`);
                //console.log(`My total reward so far is ${totalReward}`);
            } catch (err) {
                console.log("Exception on step " + i);
                console.log(err);
                break;
            }
        }
        assert.equal(myDonations, MAX_CAMPAIGNS*2, `Expecting to have made ${MAX_CAMPAIGNS*2} donations, but found ${myDonations}`);
        assert.isTrue(new BN("376712328767121568500").eq(totalReward), `Expecting reward of ${web3.utils.fromWei("376712328767123268500")} HEO, but got ${totalReward.toString()}`);
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