const HEOToken = artifacts.require("HEOToken");
const HEOBudget = artifacts.require("HEOBudget");
const HEODAO = artifacts.require("HEODAO");
const HEOParameters = artifacts.require("HEOParameters");
const HEOStaking = artifacts.require("HEOStaking");
const HEOCampaign = artifacts.require("HEOCampaign");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const StableCoinForTests = artifacts.require("StableCoinForTests");
const HEORewardFarm = artifacts.require("HEORewardFarm");
const ONE_COIN = web3.utils.toWei("1");
var BN = web3.utils.BN;
const timeMachine = require('ganache-time-traveler');
var founder1, founder2, founder3, charityAccount, donorAccount2, donorAccount, treasurer;
var iRegistry, iTestCoin, iToken, iPriceOracle, iRewardFarm, iDistribution, iCampaignFactory, iCharityBudget;
var iHEOParams, iDAO, iStaking;
var platformTokenAddress;

const KEY_PLATFORM_TOKEN_ADDRESS = 5;
const KEY_CAMPAIGN_FACTORY = 0;
const KEY_CAMPAIGN_REGISTRY = 1;
const KEY_ACCEPTED_COINS = 4;
const KEY_PRICE_ORACLE = 4;
const KEY_TREASURER = 6;
const KEY_REWARD_FARM = 2;
const KEY_FUNDRAISING_FEE = 8; //default value is 250, which corresponds to 2.5% (0.025)
contract("HEORewardFarm", (accounts) => {
    before(async () => {
        founder1 = accounts[0];
        founder2 = accounts[1];
        founder3 = accounts[2];
        charityAccount = accounts[3];
        donorAccount = accounts[4];
        treasurer = accounts[5];
        donorAccount2 = accounts[6];
    });
    beforeEach(async () => {
        iHEOParams = await HEOParameters.new();
        iStaking = await HEOStaking.new();
        iDAO = await HEODAO.new();
        iCampaignFactory = await HEOCampaignFactory.new(iDAO.address);
        iPriceOracle = await HEOPriceOracle.new();

        await iHEOParams.transferOwnership(iDAO.address);
        await iStaking.transferOwnership(iDAO.address);
        await iCampaignFactory.transferOwnership(iDAO.address);

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
            let tokenBalance = await iToken.balanceOf.call(accounts[i]);
            assert.isTrue(tokenBalance.eq(new BN("0")),
                `Expecting account ${i} to have to be 0 HEO after registering to vote, but found ${tokenBalance}`);
        }

        //initialize test stable-coin
        iTestCoin = await StableCoinForTests.new("TUSD");
        await iTestCoin.transfer(donorAccount, web3.utils.toWei("1000000"));
        await iTestCoin.transfer(donorAccount2, web3.utils.toWei("1000000"));

        //add stable-coin to accepted currencies
        await iDAO.proposeVote(1, 0, KEY_ACCEPTED_COINS, [iTestCoin.address], [1], 259201, 51,
            {from: founder1});
        let events = await iDAO.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //set campaign factory address by vote
        await iDAO.proposeVote(3, 0, KEY_CAMPAIGN_FACTORY, [iCampaignFactory.address], [1], 259201, 51,
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
            [web3.utils.toWei("1000000")], 259201, 51, {from: founder1});
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

        iRegistry = await HEOCampaignRegistry.new(iDAO.address);
        await iRegistry.transferOwnership(iDAO.address);
        iRewardFarm = await HEORewardFarm.new(iDAO.address);
        //set reward farm by vote
        await iDAO.proposeVote(3, 0, KEY_REWARD_FARM, [iRewardFarm.address], [1], 259201, 51,
            {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

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

    });
    it("Donation to an unregistered campaign should fail", async() => {
        //send 25M HEO to the reward farm
        await iDAO.proposeVote(2, 3, 0, [iRewardFarm.address, platformTokenAddress],
            [web3.utils.toWei("25000000")], 259201, 51, {from: founder1});
        let events = await iDAO.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        //cast votes
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});

        //execute the proposal
        await iDAO.executeProposal(proposalId, {from: founder1});

        //deploy campaign for 100 USDT
        let campaign = await HEOCampaign.new(web3.utils.toWei("100"), charityAccount, iTestCoin.address, "https://someu",
            iDAO.address, web3.utils.toWei("5"), 100, 10, 500, 10000, platformTokenAddress, {from: charityAccount});

        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        assert.equal(myCampaigns.length, 0, `Should not have any registered campaigns. Found ${myCampaigns}`);
        let heoLocked = await campaign.heoLocked.call();
        assert.isTrue(heoLocked.eq(new BN(web3.utils.toWei("5"))), `Expecting heoLocked = 5 HEO, but got ${heoLocked}`);
        let maxAmount = await campaign.maxAmount.call();
        assert.isTrue(maxAmount.eq(new BN(web3.utils.toWei("100"))), `Expecting maxAmount = 100  USDT, but got ${maxAmount}`);
        let heoPrice = (await campaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice, 100, `Expecting heoPrice = 100, but got ${heoPrice}`);
        let heoPriceDecimals = (await campaign.heoPriceDecimals.call()).toNumber();
        assert.equal(heoPriceDecimals, 10, `Expecting heoPriceDecimals = 10, but got ${heoPriceDecimals}`);
        let isActive = (await campaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);

        //donate ERC20
        await iTestCoin.approve(campaign.address, web3.utils.toWei("10"), {from: donorAccount});
        try {
            await campaign.donateERC20(web3.utils.toWei("10"), {from: donorAccount});
        } catch (err) {
            assert.equal(err.reason, "HEORewardFarm: campaign is not registered", `Wrong error: ${err}`);
        }
    });
    it("Should calculate reward of 10 HEO for a donation of 100 USDT with 1 HEO = 25 USDT", async() => {
        //send 25M HEO to the reward farm
        await iDAO.proposeVote(2, 3, 0, [iRewardFarm.address, platformTokenAddress],
            [web3.utils.toWei("25000000")], 259201, 51, {from: founder1});
        let events = await iDAO.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        //cast votes
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});

        //execute the proposal
        await iDAO.executeProposal(proposalId, {from: founder1});

        //set HEO price
        iPriceOracle.setPrice(iTestCoin.address, 25, 1);
        //create a campaign via factory
        // default fee is 2.5% ($25 for $1000 campaign), which is the price of 1HEO
        await iCharityBudget.sendTo(charityAccount, platformTokenAddress, web3.utils.toWei("1"), {from: treasurer});
        await iToken.approve(iCampaignFactory.address, web3.utils.toWei("1"), {from: charityAccount});
        await iCampaignFactory.createRewardCampaign(web3.utils.toWei("1000"), iTestCoin.address,
            "https://someurl1", charityAccount, {from: charityAccount});
        let myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let campaign = myCampaigns[0];

        //calculate full reward before making the donation
        let fullReward = await iRewardFarm.fullReward(web3.utils.toWei("100"), 25, 1);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("10"))), `Expecting reward of 10, got ${fullReward}`);

        //check reward percentage
        fullReward = await iRewardFarm.fullReward(100, 1, 1);
        assert.isTrue(fullReward.eq(new BN("250")), `Expecting reward of 250%, got ${fullReward}`);

        //check unassignedBalance
        let unassignedBalance = await iRewardFarm.unassignedBalance();
        assert.isTrue(unassignedBalance.eq(new BN(web3.utils.toWei("25000000"))),
            `Expecting balance of 25M, got ${unassignedBalance}`);

        //donate 100 USDT
        await iTestCoin.approve(campaign, web3.utils.toWei("100"), {from: donorAccount});
        campaign = await HEOCampaign.at(campaign);
        await campaign.donateERC20(web3.utils.toWei("100"), {from: donorAccount});

        //check unassignedBalance
        unassignedBalance = await iRewardFarm.unassignedBalance();
        assert.isTrue(unassignedBalance.eq(new BN(web3.utils.toWei("24999990"))),
            `Expecting balance of 24999990, got ${unassignedBalance}`);

        let donations = await iRewardFarm.donorsDonations.call(donorAccount);
        assert.equal(donations.length, 1, `Expecting 1 donation, but got ${donations}`);
        fullReward = await iRewardFarm.donationReward(donations[0]);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("10"))), `Expecting reward of 10 but found ${fullReward}`);
        let amount = await iRewardFarm.getDonationAmount(donations[0]);
        assert.isTrue(amount.eq(new BN(web3.utils.toWei("100"))), `Expecting donation amount = 100. Found ${amount}`);
        let addrCheck = await iRewardFarm.getDonationCampaign(donations[0]);
        assert.equal(addrCheck, campaign.address, `Unexpected campaign address for donation: ${addrCheck}`);
        addrCheck = await iRewardFarm.getDonationToken(donations[0]);
        assert.equal(addrCheck, iTestCoin.address, `Unexpected token address for donation: ${addrCheck}`);
        let claimedReward  = await iRewardFarm.claimedReward(donations[0]);
        assert.isTrue(claimedReward.eq(new BN("0")), `Expecting 0 claimed reward, found : ${claimedReward}`);
        let vestedReward  = await iRewardFarm.vestedReward(donations[0]);
        assert.isTrue(vestedReward.eq(new BN("0")), `Expecting 0 vested reward, found : ${vestedReward}`);
        //advance 36.5 days
        await timeMachine.advanceTimeAndBlock(3153600);
        vestedReward  = await iRewardFarm.vestedReward(donations[0]);
        assert.isTrue(vestedReward.lt(new BN(web3.utils.toWei("1.1"))) && vestedReward.gt(new BN(web3.utils.toWei("0.9"))),
            `Expecting to vest 1 HEO after 36.5 days, found: ${vestedReward} (${web3.utils.fromWei(vestedReward)}) HEO`);
        //advance to 0.5 year
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        vestedReward  = await iRewardFarm.vestedReward(donations[0]);
        assert.isTrue(vestedReward.lt(new BN(web3.utils.toWei("5.1"))) && vestedReward.gt(new BN(web3.utils.toWei("4.9"))),
            `Expecting to vest 5 HEO after half a year, found: ${vestedReward} (${web3.utils.fromWei(vestedReward)}) HEO`);
        await timeMachine.advanceTimeAndBlock(15768000);
        vestedReward  = await iRewardFarm.vestedReward(donations[0]);
        assert.isTrue(vestedReward.eq(new BN(web3.utils.toWei("10"))),
            `Expecting to vest 10 HEO after a year, found: ${vestedReward} (${web3.utils.fromWei(vestedReward)}) HEO`);

        //check unassignedBalance
        unassignedBalance = await iRewardFarm.unassignedBalance();
        assert.isTrue(unassignedBalance.eq(new BN(web3.utils.toWei("24999990"))),
            `Expecting balance of 24999990, got ${unassignedBalance}`);

        //check reward percentage
        fullReward = await iRewardFarm.fullReward(100, 1, 1);
        assert.isTrue(fullReward.eq(new BN("249")), `Expecting reward of 249%, got ${fullReward}`);
    });

    it("Reward percentage should go down when donations are made", async() => {
        //send 10M HEO to the reward farm
        await iDAO.proposeVote(2, 3, 0, [iRewardFarm.address, platformTokenAddress],
            [web3.utils.toWei("10000000")], 259201, 51, {from: founder1});
        let events = await iDAO.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        //cast votes
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});

        //execute the proposal
        await iDAO.executeProposal(proposalId, {from: founder1});

        //check reward percentage
        let fullReward = await iRewardFarm.fullReward(100, 1, 1);
        assert.isTrue(fullReward.eq(new BN("100")), `Expecting reward of 100%, got ${fullReward}`);

        //check full reward
        fullReward = await iRewardFarm.fullReward(web3.utils.toWei("500000"), 1, 10);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("5000000"))),
            `Expecting reward of 5M, got ${fullReward} (${web3.utils.fromWei(fullReward)})`);

        //check unassignedBalance
        let unassignedBalance = await iRewardFarm.unassignedBalance();
        assert.isTrue(unassignedBalance.eq(new BN(web3.utils.toWei("10000000"))),
            `Expecting balance of 10M, got ${unassignedBalance}`);

        //set HEO price
        iPriceOracle.setPrice(iTestCoin.address, 1, 10);
        //default fee is 2.5% ($25,000 for $1,000,000 campaign)
        //create a campaign by paying 250K HEO at HEO price of $0.1
        await iCharityBudget.sendTo(charityAccount, platformTokenAddress, web3.utils.toWei("250000"), {from: treasurer});
        await iToken.approve(iCampaignFactory.address, web3.utils.toWei("250000"), {from: charityAccount});
        await iCampaignFactory.createRewardCampaign(web3.utils.toWei("1000000"), iTestCoin.address,
            "https://someurl1", charityAccount, {from: charityAccount});
        let myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let campaign = myCampaigns[0];
        campaign = await HEOCampaign.at(campaign);

        //donate $500K
        await iTestCoin.approve(campaign.address, web3.utils.toWei("500000"), {from: donorAccount});
        await campaign.donateERC20(web3.utils.toWei("500000"), {from: donorAccount});

        unassignedBalance = await iRewardFarm.unassignedBalance();
        assert.isTrue(unassignedBalance.eq(new BN(web3.utils.toWei("5000000"))),
            `Expecting balance to go down to 5M, got ${unassignedBalance}`);

        //check reward percentage
        fullReward = await iRewardFarm.fullReward(100, 1, 1);
        assert.isTrue(fullReward.eq(new BN("50")), `Expecting reward of 50%, got ${fullReward}`);

        //check full reward
        fullReward = await iRewardFarm.fullReward(web3.utils.toWei("100000"), 1, 10);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("500000"))),
            `Expecting reward of 500K, got ${fullReward} (${web3.utils.fromWei(fullReward)})`);

        //donate $100K from another donor
        await iTestCoin.approve(campaign.address, web3.utils.toWei("100000"), {from: donorAccount2});
        await campaign.donateERC20(web3.utils.toWei("100000"), {from: donorAccount2});

        unassignedBalance = await iRewardFarm.unassignedBalance();
        assert.isTrue(unassignedBalance.eq(new BN(web3.utils.toWei("4500000"))),
            `Expecting balance to go down to 4.5M, got ${unassignedBalance} (${web3.utils.fromWei(unassignedBalance)})`);

        //check reward percentage
        fullReward = await iRewardFarm.fullReward(100, 1, 1);
        assert.isTrue(fullReward.eq(new BN("45")), `Expecting reward of 45%, got ${fullReward}`);

        //set HEO price to 0.0001
        iPriceOracle.setPrice(iTestCoin.address, 1, 10000);

        //check full reward
        fullReward = await iRewardFarm.fullReward(web3.utils.toWei("10000"), 1, 10000);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("45000000"))),
            `Expecting reward of 45,000,000, got ${fullReward} (${web3.utils.fromWei(fullReward)})`);

        //donate $10K
        await iTestCoin.approve(campaign.address, web3.utils.toWei("10000"), {from: donorAccount2});
        await campaign.donateERC20(web3.utils.toWei("10000"), {from: donorAccount2});
        unassignedBalance = await iRewardFarm.unassignedBalance();
        assert.isTrue(unassignedBalance.eq(new BN(web3.utils.toWei("0"))),
            `Expecting balance to go down to 0, got ${unassignedBalance} (${web3.utils.fromWei(unassignedBalance)})`);

        //check reward percentage
        fullReward = await iRewardFarm.fullReward(100, 1, 1);
        assert.isTrue(fullReward.eq(new BN("0")), `Expecting reward of 0%, got ${fullReward}`);

        //check full reward
        fullReward = await iRewardFarm.fullReward(web3.utils.toWei("20000"), 1, 1);
        assert.isTrue(fullReward.eq(new BN("0")),
            `Expecting reward of 0, got ${fullReward} (${web3.utils.fromWei(fullReward)})`);
    });

    it("Reward percentage should go up when Reward Farm is replenished", async() => {
        //send 25M HEO to the reward farm
        await iDAO.proposeVote(2, 3, 0, [iRewardFarm.address, platformTokenAddress],
            [web3.utils.toWei("25000000")], 259201, 51, {from: founder1});
        let events = await iDAO.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        //cast votes
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});

        //execute the proposal
        await iDAO.executeProposal(proposalId, {from: founder1});

        //set HEO price to 0.1
        iPriceOracle.setPrice(iTestCoin.address, 1, 10);

        //calculate full reward before making the donation
        let fullReward = await iRewardFarm.fullReward(web3.utils.toWei("1000"), 1, 10000);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("25000000"))),
            `Expecting reward of 25M, got ${fullReward} (${web3.utils.fromWei(fullReward)})`);

        //check reward percentage
        fullReward = await iRewardFarm.fullReward(100, 1, 1);
        assert.isTrue(fullReward.eq(new BN("250")), `Expecting reward of 250%, got ${fullReward}`);

        //check unassignedBalance
        let unassignedBalance = await iRewardFarm.unassignedBalance();
        assert.isTrue(unassignedBalance.eq(new BN(web3.utils.toWei("25000000"))),
            `Expecting balance of 25M, got ${unassignedBalance}`);

        //create a campaign by paying 250K HEO at HEO price of $0.1
        await iCharityBudget.sendTo(charityAccount, platformTokenAddress, web3.utils.toWei("250000"), {from: treasurer});
        await iToken.approve(iCampaignFactory.address, web3.utils.toWei("250000"), {from: charityAccount});
        await iCampaignFactory.createRewardCampaign(web3.utils.toWei("1000000"), iTestCoin.address,
            "https://someurl1", charityAccount, {from: charityAccount});
        let myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let campaign = myCampaigns[0];
        campaign = await HEOCampaign.at(campaign);

        //set HEO price to 0.0001
        iPriceOracle.setPrice(iTestCoin.address, 1, 10000);

        //donate $1,000
        await iTestCoin.approve(campaign.address, web3.utils.toWei("1000"), {from: donorAccount});
        await campaign.donateERC20(web3.utils.toWei("1000"), {from: donorAccount});

        //check that balance have gone to zero
        unassignedBalance = await iRewardFarm.unassignedBalance();
        assert.isTrue(unassignedBalance.eq(new BN(web3.utils.toWei("0"))),
            `Expecting balance to go down to 0, got ${unassignedBalance} (${web3.utils.fromWei(unassignedBalance)})`);

        //send 2.3M HEO to the reward farm
        await iDAO.proposeVote(2, 3, 0, [iRewardFarm.address, platformTokenAddress],
            [web3.utils.toWei("2300000")], 259201, 51, {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        //cast votes
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});

        //execute the proposal
        await iDAO.executeProposal(proposalId, {from: founder1});

        //check reward percentage
        fullReward = await iRewardFarm.fullReward(100, 1, 1);
        assert.isTrue(fullReward.eq(new BN("23")), `Expecting reward of 23%, got ${fullReward}`);
    });

    it("Should process donations for multiple campaigns", async() => {
        //send 25M HEO to the reward farm
        await iDAO.proposeVote(2, 3, 0, [iRewardFarm.address, platformTokenAddress],
            [web3.utils.toWei("25000000")], 259201, 51, {from: founder1});
        let events = await iDAO.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        //cast votes
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});

        //execute the proposal
        await iDAO.executeProposal(proposalId, {from: founder1});
        let expectedUnassigned = new BN(web3.utils.toWei("25000000"));
        let unassignedBalance = await iRewardFarm.unassignedBalance();
        assert.isTrue(unassignedBalance.eq(expectedUnassigned),
            `Expecting unassigned balance of 25M. Found ${unassignedBalance}`);
        //set HEO price to $0.1
        iPriceOracle.setPrice(iTestCoin.address, 1, 10);

        //create 1st campaign, amount: $5K, fee: $125 (1250 HEO)
        await iCharityBudget.sendTo(charityAccount, platformTokenAddress, web3.utils.toWei("1250"), {from: treasurer});
        await iToken.approve(iCampaignFactory.address, web3.utils.toWei("1250"), {from: charityAccount});
        await iCampaignFactory.createRewardCampaign(web3.utils.toWei("5000"), iTestCoin.address,
            "https://someurl1", charityAccount, {from: charityAccount});
        let myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let campaign = myCampaigns[0];
        campaign = await HEOCampaign.at(campaign);

        //change HEO price to $0.2
        iPriceOracle.setPrice(iTestCoin.address, 2, 10);

        //create 2d campaign
        await iCharityBudget.sendTo(founder1, platformTokenAddress, web3.utils.toWei("625"), {from: treasurer});
        await iToken.approve(iCampaignFactory.address, web3.utils.toWei("625"), {from: founder1});
        await iCampaignFactory.createRewardCampaign(web3.utils.toWei("5000"), iTestCoin.address,
            "https://someurl1", founder1, {from: founder1});
        myCampaigns = await iRegistry.myCampaigns.call({from: founder1});
        let campaign2 = myCampaigns[0];
        campaign2 = await HEOCampaign.at(campaign2)

        //1st donation: donor1 donates $20 to 1st campaign
        await iTestCoin.approve(campaign.address, web3.utils.toWei("20"), {from: donorAccount});
        await campaign.donateERC20(web3.utils.toWei("20"), {from: donorAccount});

        //check that 1st donor's full reward from 1st donation to 1st campaign is $50 in HEO (250 HEO)
        let donations = await iRewardFarm.donorsDonations.call(donorAccount);
        assert.equal(donations.length, 1, `Expecting 1 donation, but got ${donations}`);
        let fullReward = await iRewardFarm.donationReward(donations[0]);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("250"))), `Expecting reward of 250 but found ${fullReward}`);
        let expected
        let amount = await iRewardFarm.getDonationAmount(donations[0]);
        assert.isTrue(amount.eq(new BN(web3.utils.toWei("20"))), `Expecting donation amount = 20. Found ${amount}`);
        let addrCheck = await iRewardFarm.getDonationCampaign(donations[0]);
        assert.equal(addrCheck, campaign.address, `Unexpected campaign address for donation: ${addrCheck}`);
        addrCheck = await iRewardFarm.getDonationToken(donations[0]);
        assert.equal(addrCheck, iTestCoin.address, `Unexpected token address for donation: ${addrCheck}`);
        let claimedReward  = await iRewardFarm.claimedReward(donations[0]);
        assert.isTrue(claimedReward.eq(new BN("0")), `Expecting 0 claimed reward, found : ${claimedReward}`);
        let vestedReward  = await iRewardFarm.vestedReward(donations[0]);
        assert.isTrue(vestedReward.eq(new BN("0")), `Expecting 0 vested reward, found : ${vestedReward}`);
        //check that unassigned balance have reduced by the amount of full reward
        unassignedBalance = await iRewardFarm.unassignedBalance();
        expectedUnassigned = expectedUnassigned.sub(fullReward);
        assert.isTrue(unassignedBalance.eq(expectedUnassigned),
            `Expecting unassigned balance of ${expectedUnassigned}. Found ${unassignedBalance}`);

        //change HEO price to $0.45
        iPriceOracle.setPrice(iTestCoin.address, 45, 100);

        //2d donation: donor1 donates $15 to 2d campaign
        await iTestCoin.approve(campaign2.address, web3.utils.toWei("15"), {from: donorAccount});
        await campaign2.donateERC20(web3.utils.toWei("15"), {from: donorAccount});

        //check that 1st donor's full reward from 2d donation to 1st campaign is $37.49 in HEO (83 HEO)
        donations = await iRewardFarm.donorsDonations.call(donorAccount);
        assert.equal(donations.length, 2, `Expecting 2 donations, but got ${donations}`);
        fullReward = await iRewardFarm.donationReward(donations[1]);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("83.3325"))),
            `Expecting reward of 83.3325 but found ${fullReward}`);
        //check that unassigned balance have reduced by the amount of full reward
        unassignedBalance = await iRewardFarm.unassignedBalance();
        expectedUnassigned = expectedUnassigned.sub(fullReward);
        assert.isTrue(unassignedBalance.eq(expectedUnassigned),
            `Expecting unassigned balance of ${expectedUnassigned}. Found ${unassignedBalance}`);
        amount = await iRewardFarm.getDonationAmount(donations[1]);
        assert.isTrue(amount.eq(new BN(web3.utils.toWei("15"))), `Expecting donation amount = 15. Found ${amount}`);
        addrCheck = await iRewardFarm.getDonationCampaign(donations[1]);
        assert.equal(addrCheck, campaign2.address,
            `Unexpected campaign address. Donation: ${donations[1]}, address: ${addrCheck}, donor ${donorAccount}
            Campaign2: ${campaign2.address}, Campaign1: ${campaign.address}`);
        addrCheck = await iRewardFarm.getDonationToken(donations[1]);
        assert.equal(addrCheck, iTestCoin.address, `Unexpected token address for donation: ${addrCheck}`);
        claimedReward  = await iRewardFarm.claimedReward(donations[1]);
        assert.isTrue(claimedReward.eq(new BN("0")), `Expecting 0 claimed reward, found : ${claimedReward}`);
        vestedReward  = await iRewardFarm.vestedReward(donations[1]);
        assert.isTrue(vestedReward.eq(new BN("0")), `Expecting 0 vested reward, found : ${vestedReward}`);

        //3rd donation: donor2 donates $15 to 2d campaign
        await iTestCoin.approve(campaign2.address, web3.utils.toWei("15"), {from: donorAccount2});
        await campaign2.donateERC20(web3.utils.toWei("15"), {from: donorAccount2});

        //check that 2d donor's full reward from 1st donation to 2d campaign is $37.49 in HEO (83.332222225 HEO)
        donations = await iRewardFarm.donorsDonations.call(donorAccount2);
        assert.equal(donations.length, 1, `Expecting 1 donation, but got ${donations}`);
        fullReward = await iRewardFarm.donationReward(donations[0]);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("83.332222225"))),
            `Expecting reward of 83.332222225 but found ${fullReward}`);
        //check that unassigned balance have reduced by the amount of full reward
        unassignedBalance = await iRewardFarm.unassignedBalance();
        expectedUnassigned = expectedUnassigned.sub(fullReward);
        assert.isTrue(unassignedBalance.eq(expectedUnassigned),
            `Expecting unassigned balance of ${expectedUnassigned}. Found ${unassignedBalance}`);
        amount = await iRewardFarm.getDonationAmount(donations[0]);
        assert.isTrue(amount.eq(new BN(web3.utils.toWei("15"))), `Expecting donation amount = 15. Found ${amount}`);
        addrCheck = await iRewardFarm.getDonationCampaign(donations[0]);
        assert.equal(addrCheck, campaign2.address, `Unexpected campaign address for donation: ${addrCheck}`);
        addrCheck = await iRewardFarm.getDonationToken(donations[0]);
        assert.equal(addrCheck, iTestCoin.address, `Unexpected token address for donation: ${addrCheck}`);
        claimedReward  = await iRewardFarm.claimedReward(donations[0]);
        assert.isTrue(claimedReward.eq(new BN("0")), `Expecting 0 claimed reward, found : ${claimedReward}`);
        vestedReward  = await iRewardFarm.vestedReward(donations[0]);
        assert.isTrue(vestedReward.eq(new BN("0")), `Expecting 0 vested reward, found : ${vestedReward}`);

        //4th donation: donor2 donates to 2d campaign again
        await iTestCoin.approve(campaign2.address, web3.utils.toWei("25"), {from: donorAccount2});
        await campaign2.donateERC20(web3.utils.toWei("25"), {from: donorAccount2});

        //check that 2d donor's full reward from 2d donation to 2d campaign is $62.4 in HEO (138.8 HEO)
        donations = await iRewardFarm.donorsDonations.call(donorAccount2);
        assert.equal(donations.length, 2, `Expecting 2 donations, but got ${donations}`);
        fullReward = await iRewardFarm.donationReward(donations[1]);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("138.886574084876527700"))),
            `Expecting reward of 138.886574084876527700 but found ${fullReward}`);
        //check that unassigned balance have reduced by the amount of full reward
        unassignedBalance = await iRewardFarm.unassignedBalance();
        expectedUnassigned = expectedUnassigned.sub(fullReward);
        assert.isTrue(unassignedBalance.eq(expectedUnassigned),
            `Expecting unassigned balance of ${expectedUnassigned}. Found ${unassignedBalance}`);
        amount = await iRewardFarm.getDonationAmount(donations[1]);
        assert.isTrue(amount.eq(new BN(web3.utils.toWei("25"))), `Expecting donation amount = 25. Found ${amount}`);
        addrCheck = await iRewardFarm.getDonationCampaign(donations[1]);
        assert.equal(addrCheck, campaign2.address, `Unexpected campaign address for donation: ${addrCheck}`);
        addrCheck = await iRewardFarm.getDonationToken(donations[1]);
        assert.equal(addrCheck, iTestCoin.address, `Unexpected token address for donation: ${addrCheck}`);
        claimedReward  = await iRewardFarm.claimedReward(donations[1]);
        assert.isTrue(claimedReward.eq(new BN("0")), `Expecting 0 claimed reward, found : ${claimedReward}`);
        vestedReward  = await iRewardFarm.vestedReward(donations[1]);
        assert.isTrue(vestedReward.eq(new BN("0")),
            `Expecting 0 vested reward from 2d donor's 2d donation, found : ${vestedReward}`);

        //change HEO price to $1.2
        iPriceOracle.setPrice(iTestCoin.address, 12, 10);

        //5th donation: donor2 donates the same amount to 2d campaign again
        await iTestCoin.approve(campaign2.address, web3.utils.toWei("25"), {from: donorAccount2});
        try {
            await campaign2.donateERC20(web3.utils.toWei("25"), {from: donorAccount2});
        } catch (err) {
            assert.equal(err.reason, "HEORewardFarm: please wait until next block to make the next donation",
                `Unexpected exception: ${err}`);
            await timeMachine.advanceTimeAndBlock(10);
            await campaign2.donateERC20(web3.utils.toWei("25"), {from: donorAccount2});
        }
        //check that 2d donor's full reward from 2d donation to 2d campaign is $62.4 in HEO (52 HEO)
        donations = await iRewardFarm.donorsDonations.call(donorAccount2);
        assert.equal(donations.length, 3, `Expecting 2 donations, but got ${donations}`);
        fullReward = await iRewardFarm.donationReward(donations[2]);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("52.082175934799354420"))),
            `Expecting reward of 138.886574084876527700 but found ${fullReward}`);

        //check that unassigned balance have reduced by the amount of full reward
        unassignedBalance = await iRewardFarm.unassignedBalance();
        expectedUnassigned = expectedUnassigned.sub(fullReward);
        assert.isTrue(unassignedBalance.eq(expectedUnassigned),
            `Expecting unassigned balance of ${expectedUnassigned}. Found ${unassignedBalance}`);
        amount = await iRewardFarm.getDonationAmount(donations[2]);
        assert.isTrue(amount.eq(new BN(web3.utils.toWei("25"))), `Expecting donation amount = 25. Found ${amount}`);
        addrCheck = await iRewardFarm.getDonationCampaign(donations[2]);
        assert.equal(addrCheck, campaign2.address, `Unexpected campaign address for donation: ${addrCheck}`);
        addrCheck = await iRewardFarm.getDonationToken(donations[2]);
        assert.equal(addrCheck, iTestCoin.address, `Unexpected token address for donation: ${addrCheck}`);
        claimedReward  = await iRewardFarm.claimedReward(donations[2]);
        assert.isTrue(claimedReward.eq(new BN("0")), `Expecting 0 claimed reward, found : ${claimedReward}`);
        vestedReward  = await iRewardFarm.vestedReward(donations[2]);
        assert.isTrue(vestedReward.eq(new BN("0")),
            `Expecting 0 vested reward from 2d donor's 2d donation, found : ${vestedReward}`);

        let totalDonations = await iRewardFarm.totalDonations.call();
        assert.equal(totalDonations, 5, `Expecting 5 donations, found ${totalDonations}`);
        //fast forward time 6 months
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        // claim rewards
        donations = await iRewardFarm.donorsDonations.call(donorAccount);

        //donor1 donation 1: full reward should not have changed after price changes
        fullReward = await iRewardFarm.donationReward(donations[0]);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("250"))), `Expecting reward of 250 but found ${fullReward}`);
        vestedReward  = await iRewardFarm.vestedReward(donations[0]);
        assert.isTrue(vestedReward.gt(fullReward.div(new BN("2"))),
            `Should have vested more than ${fullReward.div(new BN("2"))}, but found ${vestedReward}`);
        claimedReward = await iRewardFarm.claimedReward(donations[0]);
        let before = await iToken.balanceOf.call(donorAccount);
        let beforeAll = before;
        assert.isTrue(claimedReward.eq(new BN("0")), `Expecting 0 claimed reward, found : ${claimedReward}`);
        try {
            await iRewardFarm.claimReward(donorAccount, donations[0], web3.utils.toWei("1"), {from: donorAccount2});
            assert.fail("Should not be able to claim another donor's reward");
        } catch (err) {
            assert.equal(err.reason, "HEORewardFarm: caller is not the donor",
                `Wrong error: ${err}`);
        }
        await iRewardFarm.claimReward(donorAccount, donations[0], vestedReward, {from: donorAccount});
        claimedReward = await iRewardFarm.claimedReward(donations[0]);
        assert.isTrue(claimedReward.eq(vestedReward), `Expecting ${vestedReward} claimed reward, found : ${claimedReward}`);
        try {
            await iRewardFarm.claimReward(donorAccount, donations[0], web3.utils.toWei("1"), {from: donorAccount});
            assert.fail("Should not be able to claim more than vested");
        } catch (err) {
            assert.equal(err.reason, "HEORewardFarm: claim exceeds vested reward",
                `Wrong error: ${err}`);
        }
        //check that donor's HEO balance increased by claimedReward
        let after = await iToken.balanceOf.call(donorAccount);
        assert.isTrue(before.eq(after.sub(claimedReward)),
            `Donor's HEO balance should have increased from ${before} by ${claimedReward}, but found ${after}`);

        //donor2 donation 1: full reward should not have changed after price changes
        donations = await iRewardFarm.donorsDonations.call(donorAccount2);
        fullReward = await iRewardFarm.donationReward(donations[0]);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("83.332222225"))),
            `Expecting reward of 83.332222225 but found ${fullReward}`);
        vestedReward  = await iRewardFarm.vestedReward(donations[0]);
        assert.isTrue(vestedReward.gt(fullReward.div(new BN("2"))),
            `Should have vested more than ${fullReward.div(new BN("2"))}, but found ${vestedReward}`);
        assert.isTrue(vestedReward.lt(fullReward),
            `Should have vested less than ${fullReward}, but found ${vestedReward}`);
        claimedReward = await iRewardFarm.claimedReward(donations[0]);
        let beforeFounder = await iToken.balanceOf.call(founder1);
        let beforeDonor = await iToken.balanceOf.call(donorAccount2);
        assert.isTrue(claimedReward.eq(new BN("0")), `Expecting 0 claimed reward, found : ${claimedReward}`);
        try {
            await iRewardFarm.claimReward(donorAccount, donations[0], web3.utils.toWei("1"), {from: donorAccount});
            assert.fail("Should not be able to claim another donor's reward");
        } catch (err) {
            assert.equal(err.reason, "HEORewardFarm: caller is not the donor",
                `Wrong error: ${err}`);
        }
        await iRewardFarm.claimReward(founder1, donations[0], vestedReward, {from: donorAccount2});
        claimedReward = await iRewardFarm.claimedReward(donations[0]);
        assert.isTrue(claimedReward.eq(vestedReward), `Expecting ${vestedReward} claimed reward, found : ${claimedReward}`);
        try {
            await iRewardFarm.claimReward(donorAccount2, donations[0], web3.utils.toWei("1"), {from: donorAccount2});
            assert.fail("Should not be able to claim more than vested");
        } catch (err) {
            assert.equal(err.reason, "HEORewardFarm: claim exceeds vested reward",
                `Wrong error: ${err}`);
        }
        //check that donor's HEO balance increased by claimedReward
        let afterDonor = await iToken.balanceOf.call(donorAccount2);
        let afterFounder = await iToken.balanceOf.call(founder1);
        assert.isTrue(beforeFounder.eq(afterFounder.sub(claimedReward)),
            `Founder's HEO balance should have increased from ${beforeFounder} by ${claimedReward}, but found ${afterFounder}`);
        assert.isTrue(beforeDonor.eq(afterDonor),
            `Donor's HEO balance should have istayed ${beforeDonor}, but found ${afterDonor}`);

        //donor1 donation 2: full reward should not have changed after price changes
        donations = await iRewardFarm.donorsDonations.call(donorAccount);
        fullReward = await iRewardFarm.donationReward(donations[1]);
        assert.isTrue(fullReward.eq(new BN(web3.utils.toWei("83.3325"))),
            `Expecting reward of 83.3325 but found ${fullReward}`);
        vestedReward  = await iRewardFarm.vestedReward(donations[1]);
        assert.isTrue(vestedReward.gt(fullReward.div(new BN("2"))),
            `Should have vested more than ${fullReward.div(new BN("2"))}, but found ${vestedReward}`);
        claimedReward = await iRewardFarm.claimedReward(donations[1]);
        before = await iToken.balanceOf.call(donorAccount);
        assert.isTrue(claimedReward.eq(new BN("0")), `Expecting 0 claimed reward, found : ${claimedReward}`);
        try {
            await iRewardFarm.claimReward(donorAccount2, donations[1], web3.utils.toWei("1"), {from: donorAccount2});
            assert.fail("Should not be able to claim another donor's reward");
        } catch (err) {
            assert.equal(err.reason, "HEORewardFarm: caller is not the donor",
                `Wrong error: ${err}`);
        }
        await iRewardFarm.claimReward(donorAccount, donations[1], vestedReward, {from: donorAccount});
        claimedReward = await iRewardFarm.claimedReward(donations[1]);
        assert.isTrue(claimedReward.eq(vestedReward), `Expecting ${vestedReward} claimed reward, found : ${claimedReward}`);
        try {
            await iRewardFarm.claimReward(donorAccount, donations[1], vestedReward, {from: donorAccount});
            assert.fail("Should not be able to claim more than vested");
        } catch (err) {
            assert.equal(err.reason, "HEORewardFarm: claim exceeds vested reward",
                `Wrong error: ${err}`);
        }
        //check that donor's HEO balance increased by claimedReward
        after = await iToken.balanceOf.call(donorAccount);
        assert.isTrue(before.eq(after.sub(claimedReward)),
            `Donor's HEO balance should have increased from ${before} by ${claimedReward}, but found ${after}`);
        //fast forward time 6 months
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);

        //claim remaining reward from 2d donation
        await iRewardFarm.claimReward(donorAccount, donations[1], fullReward.sub(vestedReward), {from: donorAccount});
        after = await iToken.balanceOf.call(donorAccount);
        claimedReward = await iRewardFarm.claimedReward(donations[1]);
        assert.isTrue(fullReward.eq(claimedReward),
            `Claimed reward ${claimedReward} should be equal full reward ${fullReward}`);
        assert.isTrue((after.sub(fullReward)).eq(before),
            `Donor's HEO balance should have increased from ${before} by ${fullReward}, but found ${after}`);
        try {
            await iRewardFarm.claimReward(donorAccount, donations[1], vestedReward, {from: donorAccount});
            assert.fail("Should not be able to claim more than vested");
        } catch (err) {
            assert.equal(err.reason, "HEORewardFarm: claim exceeds vested reward",
                `Wrong error: ${err}`);
        }
        //fast forward time 6 months
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        await timeMachine.advanceTimeAndBlock(3153600);
        try {
            await iRewardFarm.claimReward(donorAccount, donations[1], web3.utils.toWei("0.01"), {from: donorAccount});
            assert.fail("Should not be able to claim more than vested");
        } catch (err) {
            assert.equal(err.reason, "HEORewardFarm: claim exceeds vested reward",
                `Wrong error: ${err}`);
        }
        //claim remaining reward from 1st donation
        before = await iToken.balanceOf.call(donorAccount);
        fullReward = await iRewardFarm.donationReward(donations[0]);
        let fullReward2 = await iRewardFarm.donationReward(donations[1]);
        claimedReward = await iRewardFarm.claimedReward(donations[0]);
        assert.isTrue(claimedReward.lt(fullReward),
            `Claimed reward ${claimedReward} should be less than full reward ${fullReward}`);
        await iRewardFarm.claimReward(donorAccount, donations[0], fullReward.sub(claimedReward), {from: donorAccount});
        after = await iToken.balanceOf.call(donorAccount);
        assert.isTrue((after.sub(fullReward).sub(fullReward2)).eq(beforeAll),
            `Donor's HEO balance should have increased from ${beforeAll} by ${fullReward.add(fullReward2)}, but found ${after}`);
        assert.isTrue((after.sub(fullReward.sub(claimedReward))).eq(before),
            `Donor's HEO balance should have increased from ${before} by ${fullReward.sub(claimedReward)}, but found ${after}`);
        claimedReward = await iRewardFarm.claimedReward(donations[0]);
        assert.isTrue(claimedReward.eq(fullReward),
            `Claimed reward ${claimedReward} should be equal full reward ${fullReward}`);

        //donor2 claim full reward from donations 1, 2, and 3
        donations = await iRewardFarm.donorsDonations.call(donorAccount2);
        before = await iToken.balanceOf.call(donorAccount2);
        let r1 = await iRewardFarm.donationReward(donations[0]);
        let r2 = await iRewardFarm.donationReward(donations[1]);
        let r3 = await iRewardFarm.donationReward(donations[2]);
        let c1 = await iRewardFarm.claimedReward(donations[0]);
        let c2 = await iRewardFarm.claimedReward(donations[1]);
        let c3 = await iRewardFarm.claimedReward(donations[2]);
        assert.isTrue(new BN(c1).gt(r1.div(new BN("2"))),
            `Claimed reward from donor2's 1st donation should be more than half. Found ${c1}`)
        assert.isTrue(new BN(c2).eq(new BN("0")), `Claimed reward from donor2's 2d donation should be 0. Found ${c2}`)
        assert.isTrue(new BN(c3).eq(new BN("0")), `Claimed reward from donor2's 3rd donation should be 0. Found ${c3}`)
        await iRewardFarm.claimReward(donorAccount2, donations[0], r1.sub(c1), {from: donorAccount2});
        await iRewardFarm.claimReward(donorAccount2, donations[1], r2, {from: donorAccount2});
        await iRewardFarm.claimReward(donorAccount2, donations[2], r3, {from: donorAccount2});
        after = await iToken.balanceOf.call(donorAccount2);
        let diff = r3.add(r2).add(r1).sub(c1)
        assert.isTrue(after.sub(diff).eq(before),
            `Donor's HEO balance should have increased from ${before} by ${diff}, but found ${after}`);
    });
});
