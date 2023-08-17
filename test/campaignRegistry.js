
const ganache = require('ganache');
const Web3 = require('web3');
const [web3, provider] = require('tronbox-web3')(new Web3(Web3.givenProvider), ganache.provider());
const HEOCampaign = artifacts.require("HEOCampaign");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEODAO = artifacts.require("HEODAO");
const HEOParameters = artifacts.require("HEOParameters");
const HEOToken = artifacts.require("HEOToken");
const HEOStaking = artifacts.require("HEOStaking");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEORewardFarm = artifacts.require("HEORewardFarm");
const StableCoinForTests = artifacts.require("StableCoinForTests");
const HEOBudget = artifacts.require("HEOBudget");
const fs = require('fs');
const { compress, decompress } = require('shrink-string');

const ONE_COIN = web3.utils.toWei("1");
var BN = web3.utils.BN;

var iHEOParams, iStaking, iDAO, iRegistry, iPriceOracle, iRewardFarm, iTestCoin;
var founder1, founder2, founder3, charityAccount1, charityAccount2, charityAccount3, treasurer;

var platformTokenAddress;

const KEY_PLATFORM_TOKEN_ADDRESS = 5;
const KEY_CAMPAIGN_FACTORY = 0;
const KEY_CAMPAIGN_REGISTRY = 1;
const KEY_ACCEPTED_COINS = 4;
const KEY_PRICE_ORACLE = 4;
const KEY_TREASURER = 6;
const KEY_REWARD_FARM = 2;

var RAW_META = {
    title:"Testing branch addToDb-40. Test 1",
    description:"BLah Blah blah",
    mainImageURL:"https://heodevmeta.s3.amazonaws.com/images/0331735-8dc-a3d8-1552-a5e646d2553.jpeg",
    fn:"Greg",
    ln:"Solovyev",
    org:"HEO Dev",
    cn:"",
    vl:"https://youtu.be/uODBjB9Y7so"
}
var compressed_meta;
contract("HEOCampaignRegistry", (accounts) => {
    before(async () => {
        founder1 = accounts[0];
        founder2 = accounts[1];
        founder3 = accounts[2];
        charityAccount1 = accounts[3];
        charityAccount2 = accounts[4];
        charityAccount3 = accounts[5];
        treasurer = accounts[6];
        iHEOParams = await HEOParameters.new();
        iStaking = await HEOStaking.new();
        iDAO = await HEODAO.new();
        iRegistry = await HEOCampaignRegistry.new(iDAO.address);

        iPriceOracle = await HEOPriceOracle.new();
        iRewardFarm = await HEORewardFarm.new(iDAO.address);
        await iHEOParams.transferOwnership(iDAO.address);
        await iStaking.transferOwnership(iDAO.address);
        await iRegistry.transferOwnership(iDAO.address);

        await iDAO.setParams(iHEOParams.address);
        await iDAO.setStaking(iStaking.address);
        await iDAO.initVoters([founder1, founder2, founder3]);
        await iDAO.deployPlatformToken(new BN("100000000000000000000000000"),
            "Help Each Other platform token", "HEO", {from: founder1});

        //register voters
        platformTokenAddress = await iHEOParams.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        iToken = await HEOToken.at(platformTokenAddress);
        for(let i=0; i < 3; i++) {
            try {
                await iToken.approve(iStaking.address, web3.utils.toWei("1"), {from: accounts[i]})
                await iDAO.registerToVote(web3.utils.toWei("1"), platformTokenAddress, {from: accounts[i]});
            } catch (err) {
                assert.fail(`${accounts[i]} should be able to register to vote. Error: ${err}`);
            }
            let tokenBalance = await iToken.balanceOf.call( accounts[i]);
            assert.isTrue(tokenBalance.eq(new BN("0")),
                `Expecting account ${i} to have to be 0 HEO after registering to vote, but found ${tokenBalance}`);
        }

        //initialize test stable-coin
        iTestCoin = await StableCoinForTests.new("TUSD");
        //add stable-coin to accepted currencies
        await iDAO.proposeVote(1, 0, KEY_ACCEPTED_COINS, [iTestCoin.address], [1], 259201, 51,
            {from: founder1});
        let events = await iDAO.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //set campaign registry address by vote
        await iDAO.proposeVote(3, 0, KEY_CAMPAIGN_REGISTRY, [iRegistry.address], [1], 259201, 51,
            {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //set reward farm by vote
        await iDAO.proposeVote(3, 0, KEY_REWARD_FARM, [iRewardFarm.address], [1], 259201, 51,
            {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //assign treasurer by vote
        await iDAO.proposeVote(3, 0, KEY_TREASURER, [treasurer], [1], 259201, 51,
            {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;
        //cast votes for treasurer
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder1});

        //create a budget that will give HEO to charities
        iCharityBudget = await HEOBudget.new(treasurer, {from: founder1});
        await iCharityBudget.transferOwnership(iDAO.address);
        await iDAO.proposeVote(2, 3, 0, [iCharityBudget.address, platformTokenAddress],
            [web3.utils.toWei("10000")], 259201, 51, {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        //cast votes for budget
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //set price oracle by vote
        await iDAO.proposeVote(3, 0, KEY_PRICE_ORACLE, [iPriceOracle.address], [1], 259201, 51,
            {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        RAW_META.description = fs.readFileSync("README.md", "utf-8");
        compressed_meta = await compress(JSON.stringify(RAW_META));
    });
    it("Should not register campaigns when factory address is not set", async() => {
        let myCampaignsBefore = await iRegistry.myCampaigns.call({from: charityAccount1});
        let ch1Campaign1 = await HEOCampaign.new(web3.utils.toWei("11"), charityAccount1, iTestCoin.address,
            iDAO.address, 0, 0, 0, 0, 0, platformTokenAddress, compressed_meta, {from: charityAccount1});
        try {
            await iRegistry.registerCampaign(ch1Campaign1.address);
            assert.fail("Should not allow registering campaign from non-factory account");
        } catch(err) {
            assert.equal(err.reason, "HEOCampaignRegistry: authorized instance of IHEOCampaignFactory is not set",
                `Wrong error: ${err}`);
        }
        let myCampaignsAfter = await iRegistry.myCampaigns.call({from: charityAccount1});
        assert.equal(myCampaignsBefore.length, myCampaignsAfter.length,
            `Number of campaigns changed from ${myCampaignsBefore.length} to ${myCampaignsAfter.length}`);
    });
    it("Should register campaigns correctly", async () => {
        //set campaign factory to founder1 by vote
        await iDAO.proposeVote(3, 0, KEY_CAMPAIGN_FACTORY, [founder1], [1], 259201, 51,
            {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //check that initial campaign counters are 0
        let myCampaigns1 = await iRegistry.myCampaigns.call({from: charityAccount1});
        assert.equal(0, myCampaigns1.length, "Expecting to have 0 campaigns registered from charityAccount1");
        let myCampaigns2 = await iRegistry.myCampaigns.call({from: charityAccount2});
        assert.equal(0, myCampaigns2.length, "Expecting to have 0 campaigns registered from charityAccount2");
        let myCampaigns3 = await iRegistry.myCampaigns.call({from: charityAccount3});
        assert.equal(0, myCampaigns3.length, "Expecting to have 0 campaigns registered from charityAccount3");
        let totalCampaigns = (await iRegistry.totalCampaigns.call()).toNumber();
        assert.equal(0, totalCampaigns, "Should have 0 campaign registered in total.");
        let allCampaigns = await iRegistry.allCampaigns.call();
        assert.equal(0, allCampaigns.length, "Expecting array of all campaigns to be zero-length");

        //create campaigns
        let ch1Campaign1 = await HEOCampaign.new(web3.utils.toWei("11"), charityAccount1, iTestCoin.address,
            iDAO.address, 0, 0, 0, 0, 0, platformTokenAddress, compressed_meta, {from: charityAccount1});
        let ch1Campaign2 = await HEOCampaign.new(web3.utils.toWei("12"), charityAccount1, iTestCoin.address,
            iDAO.address, 0, 0, 0, 0, 0, platformTokenAddress, compressed_meta, {from: charityAccount1});
        let ch1Campaign3 = await HEOCampaign.new(web3.utils.toWei("13"), charityAccount1, iTestCoin.address,
            iDAO.address, 0, 0, 0, 0, 0, platformTokenAddress, compressed_meta, {from: charityAccount1});

        let ch2Campaign1 = await HEOCampaign.new(web3.utils.toWei("21"), charityAccount2, iTestCoin.address,
            iDAO.address, 0, 0, 0, 0, 0, platformTokenAddress, compressed_meta, {from: charityAccount2});
        let ch2Campaign2 = await HEOCampaign.new(web3.utils.toWei("22"), charityAccount2, iTestCoin.address,
            iDAO.address, 0, 0, 0, 0, 0, platformTokenAddress, compressed_meta, {from: charityAccount2});

        let ch3Campaign1 = await HEOCampaign.new(web3.utils.toWei("31"), charityAccount3, iTestCoin.address,
            iDAO.address, 0, 0, 0, 0, 0, platformTokenAddress, compressed_meta, {from: charityAccount3});
        let ch3Campaign2 = await HEOCampaign.new(web3.utils.toWei("32"), founder1, iTestCoin.address,
            iDAO.address, 0, 0, 0, 0, 0, platformTokenAddress, compressed_meta, {from: charityAccount3});
        let ch3Campaign3 = await HEOCampaign.new(web3.utils.toWei("33"), treasurer, iTestCoin.address,
            iDAO.address, 0, 0, 0, 0, 0, platformTokenAddress, compressed_meta, {from: charityAccount3});

        //counts should not have changed after creating campaigns
        myCampaigns1 = await iRegistry.myCampaigns.call({from: charityAccount1});
        assert.equal(0, myCampaigns1.length, "Expecting to have 0 campaigns registered from charityAccount1");
        myCampaigns2 = await iRegistry.myCampaigns.call({from: charityAccount2});
        assert.equal(0, myCampaigns2.length, "Expecting to have 0 campaigns registered from charityAccount2");
        myCampaigns3 = await iRegistry.myCampaigns.call({from: charityAccount3});
        assert.equal(0, myCampaigns3.length, "Expecting to have 0 campaigns registered from charityAccount3");
        totalCampaigns = (await iRegistry.totalCampaigns.call()).toNumber();
        assert.equal(0, totalCampaigns, "Should have 0 campaign registered in total.");
        allCampaigns = await iRegistry.allCampaigns.call();
        assert.equal(0, allCampaigns.length, "Expecting array of all campaigns to be zero-length");

        //register all campaigns
        iRegistry.registerCampaign(ch1Campaign1.address);
        iRegistry.registerCampaign(ch1Campaign2.address);
        iRegistry.registerCampaign(ch1Campaign3.address);

        iRegistry.registerCampaign(ch2Campaign1.address);
        iRegistry.registerCampaign(ch2Campaign2.address);

        iRegistry.registerCampaign(ch3Campaign1.address);
        iRegistry.registerCampaign(ch3Campaign2.address);
        iRegistry.registerCampaign(ch3Campaign3.address);

        //check counts
        myCampaigns1 = await iRegistry.myCampaigns.call({from: charityAccount1});
        assert.equal(3, myCampaigns1.length, "Expecting to have 3 campaigns registered from charityAccount1");
        myCampaigns2 = await iRegistry.myCampaigns.call({from: charityAccount2});
        assert.equal(2, myCampaigns2.length, "Expecting to have 2 campaigns registered from charityAccount2");
        myCampaigns3 = await iRegistry.myCampaigns.call({from: charityAccount3});
        assert.equal(3, myCampaigns3.length, "Expecting to have 3 campaigns registered from charityAccount3");
        totalCampaigns = (await iRegistry.totalCampaigns.call()).toNumber();
        assert.equal(8, totalCampaigns, "Should have 8 campaign registered in total.");
        allCampaigns = await iRegistry.allCampaigns.call();
        assert.equal(8, allCampaigns.length, "Expecting array of all campaigns to be zero-length");

        //check each campaign
        assert.equal(myCampaigns1[0], ch1Campaign1.address, `Unexpected campaign in myCampaigns1[0]`);
        assert.equal(myCampaigns1[1], ch1Campaign2.address, `Unexpected campaign in myCampaigns1[1]`);
        assert.equal(myCampaigns1[2], ch1Campaign3.address, `Unexpected campaign in myCampaigns1[2]`);
        assert.equal(myCampaigns2[0], ch2Campaign1.address, `Unexpected campaign in myCampaigns2[0]`);
        assert.equal(myCampaigns2[1], ch2Campaign2.address, `Unexpected campaign in myCampaigns2[1]`);
        assert.equal(myCampaigns3[0], ch3Campaign1.address, `Unexpected campaign in myCampaigns3[0]`);
        assert.equal(myCampaigns3[1], ch3Campaign2.address, `Unexpected campaign in myCampaigns3[1]`);
        assert.equal(myCampaigns3[2], ch3Campaign3.address, `Unexpected campaign in myCampaigns3[2]`);

        assert.equal((await ch3Campaign1.beneficiary.call()), charityAccount3, `Unexpected beneficiary in ch3Campaign1`);
        assert.equal((await ch3Campaign2.beneficiary.call()), founder1, `Unexpected beneficiary in ch3Campaign2`);
        assert.equal((await ch1Campaign1.beneficiary.call()), charityAccount1, `Unexpected beneficiary in ch1Campaign1`);
        assert.equal((await ch2Campaign2.beneficiary.call()), charityAccount2, `Unexpected beneficiary in ch2Campaign2`);
    });

    it("Should not register campaigns from non-factory address", async() => {
        let myCampaignsBefore = await iRegistry.myCampaigns.call({from: charityAccount1});
        let ch1Campaign1 = await HEOCampaign.new(web3.utils.toWei("11"), charityAccount1, iTestCoin.address,
            iDAO.address, 0, 0, 0, 0, 0, platformTokenAddress, compressed_meta, {from: charityAccount1});
        try {
            await iRegistry.registerCampaign(ch1Campaign1.address, {from: founder2});
            assert.fail("Should not allow registering campaign from non-factory account");
        } catch(err) {
            assert.equal(err.reason, "HEOCampaignRegistry: caller must be the authorized instance of IHEOCampaignFactory",
                `Wrong error: ${err}`);
        }
        let myCampaignsAfter = await iRegistry.myCampaigns.call({from: charityAccount1});
        assert.equal(myCampaignsBefore.length, myCampaignsAfter.length,
            `Number of campaigns changed from ${myCampaignsBefore.length} to ${myCampaignsAfter.length}`);
    });


});
        