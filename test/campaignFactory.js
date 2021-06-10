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
const fs = require('fs');
const { compress, decompress } = require('shrink-string');

const ONE_COIN = web3.utils.toWei("1");
var BN = web3.utils.BN;

var founder1, founder2, founder3, charityAccount, charityWorker, donorAccount, treasurer;
var iRegistry, iTestCoin, iToken, iPriceOracle, iRewardFarm, iDistribution, iCampaignFactory, iCharityBudget;
var iHEOParams, iDAO, iStaking;
var platformTokenAddress;

const KEY_ENABLE_FUNDRAISER_WHITELIST = 11;
const KEY_FUNDRAISER_WHITE_LIST = 5;
const KEY_ANON_CAMPAIGN_LIMIT = 12;
const KEY_PLATFORM_TOKEN_ADDRESS = 5;
const KEY_CAMPAIGN_FACTORY = 0;
const KEY_CAMPAIGN_REGISTRY = 1;
const KEY_ACCEPTED_COINS = 4;
const KEY_PRICE_ORACLE = 4;
const KEY_TREASURER = 6;
const KEY_REWARD_FARM = 2;
const KEY_FUNDRAISING_FEE = 8; //default value is 250, which corresponds to 2.5% (0.025)
var RAW_META = {title:"Test Title", vl:"https://youtube.com/url"};
var compressed_meta;

contract("HEOCampaignFactory", (accounts) => {
    before(async () => {
        RAW_META.description = fs.readFileSync("README.md", "utf-8");
        compressed_meta = await compress(JSON.stringify(RAW_META));

        founder1 = accounts[0];
        founder2 = accounts[1];
        founder3 = accounts[2];
        charityAccount = accounts[3];
        donorAccount = accounts[4];
        treasurer = accounts[5];
        charityWorker = accounts[6];
        iHEOParams = await HEOParameters.new();
        iStaking = await HEOStaking.new();
        iDAO = await HEODAO.new();
        iRegistry = await HEOCampaignRegistry.new(iDAO.address);
        iCampaignFactory = await HEOCampaignFactory.new(iDAO.address);
        iPriceOracle = await HEOPriceOracle.new();
        iRewardFarm = await HEORewardFarm.new(iDAO.address);
        await iHEOParams.transferOwnership(iDAO.address);
        await iStaking.transferOwnership(iDAO.address);
        await iRegistry.transferOwnership(iDAO.address);
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
            let tokenBalance = await iToken.balanceOf.call( accounts[i]);
            assert.isTrue(tokenBalance.eq(new BN("0")),
                `Expecting account ${i} to have to be 0 HEO after registering to vote, but found ${tokenBalance}`);
        }

        //initialize test stable-coin
        iTestCoin = await StableCoinForTests.new("TUSD");
        await iTestCoin.transfer(donorAccount, web3.utils.toWei("10000"));

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
    });
    it("Should be able to deploy a campaign w/o spending HEO", async () => {
        let myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let countBefore = myCampaigns.length;

        //deploy a campaign
        await iCampaignFactory.createCampaign(0, "0x0000000000000000000000000000000000000000",
            charityAccount, compressed_meta, {from: charityAccount});
        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let countAfter = myCampaigns.length;
        assert.equal(countBefore+1, countAfter, "Should have one more campaign registered.");

        var lastCampaign = myCampaigns[countAfter-1];
        lastCampaign = await HEOCampaign.at(lastCampaign);
        assert.isNotNull(lastCampaign, "Last campaign is null");
        var maxAmount = (await lastCampaign.maxAmount.call()).toNumber();
        assert.equal(maxAmount, 0, `Expected maxAmount to be 0, but got ${maxAmount}`);
        var heoPrice = (await lastCampaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice,0 , `Expected HEO price to be 0, but got ${heoPrice}`);
        let heoPriceDecimals = (await lastCampaign.heoPriceDecimals.call()).toNumber();
        assert.equal(heoPriceDecimals, 0, `Expecting heoPriceDecimals = 0, but got ${heoPriceDecimals}`);
        var heoLocked = (await lastCampaign.heoLocked.call()).toNumber();
        assert.equal(heoLocked, 0, `Expected heoLocked to be 0, but got ${heoLocked}`);
        var raisedAmount = (await lastCampaign.raisedAmount.call()).toNumber()
        assert.equal(raisedAmount, 0, `Expected raisedAmount to be 0, but got ${raisedAmount}`);
        var targetToken = await lastCampaign.currency.call();
        assert.equal("0x0000000000000000000000000000000000000000", targetToken,
            `Expected campaign currency address to be 0x0000000000000000000000000000000000000000, but got ${targetToken}`);

        let metaCheckCompressed = await lastCampaign.metaData.call();
        let metaCheck = await decompress(metaCheckCompressed);
        assert.equal(compressed_meta, metaCheckCompressed, `Wrong compressed metadata returned from blockchain`);
        assert.equal(metaCheck, JSON.stringify(RAW_META), `Wrong uncompressed metadata`);
        metaCheck = JSON.parse(metaCheck);
        for(var attr in RAW_META) {
            assert.equal(RAW_META[attr], metaCheck[attr], `Expecting ${attr}=${RAW_META[attr]} but found ${metaCheck[attr]}`);
        }

        let isActive = (await lastCampaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);
        //try closing by non-owner
        try {
            await lastCampaign.close({from: founder1});
            assert.fail("Non-owner should not be able to close the campaign");
        } catch(err) {
            assert.equal(err.reason,
                "Ownable: caller is not the owner", `Wrong error message ${err}`);
        }
        isActive = (await lastCampaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active after failed attempt to close, but got ${isActive}`);
        //close by owner
        await lastCampaign.close({from: charityAccount});
        isActive = (await lastCampaign.isActive.call());
        assert.isFalse(isActive, `Expecting campaign to be closed after successful attempt to close, but got ${isActive}`);

    });

    it("Should deploy a reward campaign for raising 100 ETH by spending 5 HEO when HEO price is 1 ETH", async () => {
        let myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let countBefore = myCampaigns.length;
        // set fee to 5%
        await iDAO.proposeVote(0, 0, KEY_FUNDRAISING_FEE, [], [500], 259201, 51, {from: founder1});
        let events = await iDAO.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //give some HEO to the charity account
        let balanceBefore = await iToken.balanceOf.call(charityAccount);
        await iCharityBudget.sendTo(charityAccount, platformTokenAddress, web3.utils.toWei("5"), {from: treasurer});
        let balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceAfter.eq(balanceBefore.add(new BN(web3.utils.toWei("5")))),
            `Expecting charity's HEO balance to go up by 5 HEO, but found ${balanceAfter}`);
        iPriceOracle.setPrice("0x0000000000000000000000000000000000000000", 1, 1);

        //deploy a campaign
        try {
            await iCampaignFactory.createRewardCampaign(web3.utils.toWei("100"), "0x0000000000000000000000000000000000000000",
                charityAccount, compressed_meta, {from: charityAccount});
            assert.fail("This should fail, because charityAccount did not authorize HEO to be spent by the factory")
        } catch(err) {
            assert.equal(err.reason, "ERC20: transfer amount exceeds allowance", `Wrong error: ${err}`);
        }
        await iToken.approve(iCampaignFactory.address, web3.utils.toWei("5"), {from: charityAccount});
        await iCampaignFactory.createRewardCampaign(web3.utils.toWei("100"), "0x0000000000000000000000000000000000000000",
            charityAccount, compressed_meta, {from: charityAccount});

        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let countAfter = myCampaigns.length;
        assert.equal(countBefore+1, countAfter, "Should have one more campaign registered.");

        balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceAfter.eq(balanceBefore),
            `Expecting charity's HEO balance to go down by 5 HEO, but found ${balanceAfter}`);

        var lastCampaign = myCampaigns[countAfter-1];

        balanceAfter = await iToken.balanceOf.call(lastCampaign);
        assert.isTrue(balanceAfter.eq(new BN(web3.utils.toWei("5"))),
            `Expecting campaign to have 5 HEO, but found ${balanceAfter}`);

        lastCampaign = await HEOCampaign.at(lastCampaign);
        assert.isNotNull(lastCampaign, "Last campaign is null");
        var maxAmount = await lastCampaign.maxAmount.call();
        assert.isTrue(maxAmount.eq(new BN(web3.utils.toWei("100"))), `Expected maxAmount to be 100 ETH, but got ${maxAmount}`);
        var heoPrice = (await lastCampaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice, 1, `Expected HEO price to be 1, but got ${heoPrice}`);
        let heoPriceDecimals = (await lastCampaign.heoPriceDecimals.call()).toNumber();
        assert.equal(heoPriceDecimals, 1, `Expecting heoPriceDecimals = 1, but got ${heoPriceDecimals}`);
        var heoLocked = await lastCampaign.heoLocked.call();
        assert.isTrue(heoLocked.eq(new BN(web3.utils.toWei("5"))), `Expected heoLocked to be 5 HEO, but got ${heoLocked}`);
        var raisedAmount = (await lastCampaign.raisedAmount.call()).toNumber()
        assert.equal(raisedAmount, 0, `Expected raisedAmount to be 0, but got ${raisedAmount}`);
        var targetToken = await lastCampaign.currency.call();
        assert.equal("0x0000000000000000000000000000000000000000", targetToken,
            `Expected campaign currency address to be 0x0000000000000000000000000000000000000000, but got ${targetToken}`);

        let isActive = (await lastCampaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);
        //try closing by non-owner
        balanceBefore = await iToken.balanceOf.call(charityAccount);
        try {
            await lastCampaign.close({from: founder1});
            assert.fail("Non-owner should not be able to close the campaign");
        } catch(err) {
            assert.equal(err.reason,
                "Ownable: caller is not the owner", `Wrong error message ${err}`);
        }
        isActive = (await lastCampaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active after failed attempt to close, but got ${isActive}`);
        balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceAfter.eq(balanceBefore),
            `Expecting charity's HEO balance to remain unchanged, but found ${balanceAfter}`);

        //close by owner
        await lastCampaign.close({from: charityAccount});
        isActive = (await lastCampaign.isActive.call());
        assert.isFalse(isActive, `Expecting campaign to be closed after successful attempt to close, but got ${isActive}`);

        //verify that HEO was refunded
        balanceAfter = await iToken.balanceOf.call(lastCampaign.address);
        assert.isTrue(balanceAfter.eq(new BN(web3.utils.toWei("0"))),
            `Expecting campaign to have 0 HEO after it was closed, but found ${balanceAfter}`);
        balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceAfter.eq(balanceBefore.add(new BN(web3.utils.toWei("5")))),
            `Expecting charity's HEO balance to go up by 5 HEO, but found ${balanceAfter}`);
    });

    it("A 100 ETH reward campaign should cost 102.94 HEO with 3.5% fee, when HEO price=0.034 ETH", async () => {
        let myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});

        let countBefore = myCampaigns.length;
        //102941176470588
        //1000000000000000000
        // set fee to 3.5%
        await iDAO.proposeVote(0, 0, KEY_FUNDRAISING_FEE, [], [350], 259201, 51, {from: founder1});
        let events = await iDAO.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //give some HEO to the charity account
        let balanceBefore = await iToken.balanceOf.call(charityAccount);
        await iCharityBudget.sendTo(charityAccount, platformTokenAddress, web3.utils.toWei("105"), {from: treasurer});
        let balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceAfter.eq(balanceBefore.add(new BN(web3.utils.toWei("105")))),
            `Expecting charity's HEO balance to go up by 105 HEO, but found ${balanceAfter}`);
        // update balanceBefore, so we can compare it after locking HEO for campaign
        balanceBefore = balanceAfter;
        iPriceOracle.setPrice("0x0000000000000000000000000000000000000000", 34, 1000);

        //try deploying a campaign w/o approving enough HEO
        await iToken.approve(iCampaignFactory.address, web3.utils.toWei("5"), {from: charityAccount});
        try {
            await iCampaignFactory.createRewardCampaign(web3.utils.toWei("100"), "0x0000000000000000000000000000000000000000",
                charityAccount, compressed_meta, {from: charityAccount});
            assert.fail("This should fail, because charityAccount did not authorize enough HEO to be spent by the factory")
        } catch(err) {
            assert.equal(err.reason, "ERC20: transfer amount exceeds allowance", `Wrong error: ${err}`);
        }
        balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceAfter.eq(balanceBefore),
            `Charity's HEO balance should stay ${balanceBefore} after failing to deploy a campaign. Found ${balanceAfter}`);
        //approve more HEO and deploy the campaign
        let toApprove = "102941176470588235000";
        await iToken.approve(iCampaignFactory.address, toApprove, {from: charityAccount});
        await iCampaignFactory.createRewardCampaign(web3.utils.toWei("100"), "0x0000000000000000000000000000000000000000",
            charityAccount, compressed_meta, {from: charityAccount});

        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let countAfter = myCampaigns.length;
        assert.equal(countBefore+1, countAfter, "Should have one more campaign registered.");

        var lastCampaign = myCampaigns[countAfter-1];
        lastCampaign = await HEOCampaign.at(lastCampaign);
        assert.isNotNull(lastCampaign, "Last campaign is null");
        var maxAmount = await lastCampaign.maxAmount.call();
        assert.isTrue(maxAmount.eq(new BN(web3.utils.toWei("100"))), `Expected maxAmount to be 100 ETH, but got ${maxAmount}`);
        var heoPrice = await lastCampaign.heoPrice.call();
        assert.isTrue(heoPrice.eq(new BN("34")), `Expected HEO price to be 34, but got ${heoPrice}`);
        let heoPriceDecimals = (await lastCampaign.heoPriceDecimals.call());
        assert.isTrue(heoPriceDecimals.eq(new BN("1000")), `Expecting heoPriceDecimals = 1000, but got ${heoPriceDecimals}`);
        let fee = (await lastCampaign.fee.call());
        assert.isTrue(fee.eq(new BN("350")), `Expected fee to be 350, but got ${fee}`);
        let feeDecimals = (await lastCampaign.feeDecimals.call());
        assert.isTrue(feeDecimals.eq(new BN("10000")), `Expected feeDecimals to be 10000, but got ${feeDecimals}`);
        let heoLocked = await lastCampaign.heoLocked.call();
        let expectedLockedHEO = new BN(web3.utils.toWei("100")).mul(fee).div(feeDecimals).div(heoPrice).mul(heoPriceDecimals);
        assert.isTrue(heoLocked.eq(expectedLockedHEO), `Expected heoLocked to be ${expectedLockedHEO} HEO, but got ${heoLocked}`);
        assert.isTrue(heoLocked.eq(new BN(toApprove)), `Expected heoLocked to be ${toApprove} HEO, but got ${heoLocked}`);
        var raisedAmount = (await lastCampaign.raisedAmount.call()).toNumber()
        assert.equal(raisedAmount, 0, `Expected raisedAmount to be 0, but got ${raisedAmount}`);
        var targetToken = await lastCampaign.currency.call();
        assert.equal("0x0000000000000000000000000000000000000000", targetToken,
            `Expected campaign currency address to be 0x0000000000000000000000000000000000000000, but got ${targetToken}`);

        balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceAfter.eq(balanceBefore.sub(new BN(toApprove))),
            `Expecting charity's HEO balance to go down by ${toApprove} HEObits, but found ${balanceAfter}`);

        balanceAfter = await iToken.balanceOf.call(lastCampaign.address);
        assert.isTrue(balanceAfter.eq(new BN(toApprove)),
            `Expecting campaign to have ${toApprove} HEObits, but found ${balanceAfter}`);
    });

    it("A 55000 USD reward campaign should cost 62.5 HEO with 2.5% fee, when HEO price=22USD", async () => {
        let myCampaigns = await iRegistry.myCampaigns.call({from: charityWorker});
        let countBefore = myCampaigns.length;
        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let thisShouldNotChange = myCampaigns.length;
        // set fee to 2.5%
        await iDAO.proposeVote(0, 0, KEY_FUNDRAISING_FEE, [], [250], 259201, 51, {from: founder1});
        let events = await iDAO.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //give some HEO to the charity worker, who will be creating the campaign
        let balanceBefore = await iToken.balanceOf.call(charityWorker);
        await iCharityBudget.sendTo(charityWorker, platformTokenAddress, web3.utils.toWei("100"), {from: treasurer});
        let balanceAfter = await iToken.balanceOf.call(charityWorker);
        assert.isTrue(balanceAfter.eq(balanceBefore.add(new BN(web3.utils.toWei("100")))),
            `Expecting charity's HEO balance to go up by 100 HEO, but found ${balanceAfter}`);
        // update balanceBefore, so we can compare it after locking HEO for campaign
        balanceBefore = balanceAfter;
        iPriceOracle.setPrice(iTestCoin.address, 220, 10);

        //try deploying a campaign w/o approving enough HEO
        await iToken.approve(iCampaignFactory.address, web3.utils.toWei("50"), {from: charityWorker});
        try {
            await iCampaignFactory.createRewardCampaign(web3.utils.toWei("55000"), iTestCoin.address,
                charityAccount, compressed_meta, {from: charityWorker});
            assert.fail("This should fail, because charityAccount did not authorize enough HEO to be spent by the factory")
        } catch(err) {
            assert.equal(err.reason, "ERC20: transfer amount exceeds allowance", `Wrong error: ${err}`);
        }
        balanceAfter = await iToken.balanceOf.call(charityWorker);
        assert.isTrue(balanceAfter.eq(balanceBefore),
            `Charity worker's HEO balance should stay ${balanceBefore} after failing to deploy a campaign. Found ${balanceAfter}`);
        //approve more HEO and deploy the campaign
        let toApprove = "62500000000000000000";
        await iToken.approve(iCampaignFactory.address, toApprove, {from: charityWorker});
        await iCampaignFactory.createRewardCampaign(web3.utils.toWei("55000"), iTestCoin.address,
            charityAccount, compressed_meta, {from: charityWorker});

        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let countAfter = myCampaigns.length;
        assert.equal(thisShouldNotChange, countAfter, "charityAccount should not have more campaigns registered");

        myCampaigns = await iRegistry.myCampaigns.call({from: charityWorker});
        countAfter = myCampaigns.length;
        assert.equal(countBefore+1, countAfter, "charityWorker should have one more campaign registered");

        var lastCampaign = myCampaigns[countAfter-1];
        lastCampaign = await HEOCampaign.at(lastCampaign);
        assert.isNotNull(lastCampaign, "Last campaign is null");
        var maxAmount = await lastCampaign.maxAmount.call();
        assert.isTrue(maxAmount.eq(new BN(web3.utils.toWei("55000"))), `Expected maxAmount to be 55000 USD, but got ${maxAmount}`);
        var heoPrice = await lastCampaign.heoPrice.call();
        assert.isTrue(heoPrice.eq(new BN("220")), `Expected HEO price to be 220, but got ${heoPrice}`);
        let heoPriceDecimals = (await lastCampaign.heoPriceDecimals.call());
        assert.isTrue(heoPriceDecimals.eq(new BN("10")), `Expecting heoPriceDecimals = 10, but got ${heoPriceDecimals}`);
        let fee = (await lastCampaign.fee.call());
        assert.isTrue(fee.eq(new BN("250")), `Expected fee to be 250, but got ${fee}`);
        let feeDecimals = (await lastCampaign.feeDecimals.call());
        assert.isTrue(feeDecimals.eq(new BN("10000")), `Expected feeDecimals to be 10000, but got ${feeDecimals}`);
        let heoLocked = await lastCampaign.heoLocked.call();
        let expectedLockedHEO = new BN(web3.utils.toWei("55000")).mul(fee).div(feeDecimals).div(heoPrice).mul(heoPriceDecimals);
        assert.isTrue(heoLocked.eq(expectedLockedHEO), `Expected heoLocked to be ${expectedLockedHEO} HEO, but got ${heoLocked}`);
        assert.isTrue(heoLocked.eq(new BN(toApprove)), `Expected heoLocked to be ${toApprove} HEO, but got ${heoLocked}`);
        var raisedAmount = (await lastCampaign.raisedAmount.call()).toNumber()
        assert.equal(raisedAmount, 0, `Expected raisedAmount to be 0, but got ${raisedAmount}`);
        var targetToken = await lastCampaign.currency.call();
        assert.equal(iTestCoin.address, targetToken,
            `Expected campaign currency address to be ${iTestCoin.address}, but got ${targetToken}`);

        balanceAfter = await iToken.balanceOf.call(charityWorker);
        assert.isTrue(balanceAfter.eq(balanceBefore.sub(new BN(toApprove))),
            `Expecting charity's HEO balance to go down by ${toApprove} HEObits, but found ${balanceAfter}`);

        balanceAfter = await iToken.balanceOf.call(lastCampaign.address);
        assert.isTrue(balanceAfter.eq(new BN(toApprove)),
            `Expecting campaign to have ${toApprove} HEObits, but found ${balanceAfter}`);

        balanceBefore = await iTestCoin.balanceOf(donorAccount);
        let charityBalanceBefore = await iTestCoin.balanceOf(charityAccount);
        let daoHeoBefore = await iToken.balanceOf(iDAO.address);
        await iTestCoin.approve(lastCampaign.address, web3.utils.toWei("55"), {from: donorAccount});
        await lastCampaign.donateERC20(web3.utils.toWei("55"), {from: donorAccount});
        balanceAfter = await iTestCoin.balanceOf(donorAccount);
        let charityBalanceAfter = await iTestCoin.balanceOf(charityAccount);
        let daoHeoAfter = await iToken.balanceOf(iDAO.address);
        assert.isTrue(balanceBefore.sub(new BN(web3.utils.toWei("55"))).eq(balanceAfter),
            `Donor's USDC balance should go down by 55. Found after: ${balanceAfter}, before: ${balanceBefore}`);
        assert.isTrue(charityBalanceBefore.add(new BN(web3.utils.toWei("55"))).eq(charityBalanceAfter),
            `Charity's USDC balance should go up by 55. Found after: ${charityBalanceAfter}, before: ${charityBalanceBefore}`);
        let heoSpent = new BN(toApprove).div(new BN("1000"));
        assert.isTrue(daoHeoBefore.add(heoSpent).eq(daoHeoAfter),
            `DAO's HEO balance should go up by ${heoSpent}. Found after: ${daoHeoAfter}, before: ${daoHeoBefore}`);

        let isActive = (await lastCampaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active after failed attempt to close, but got ${isActive}`);
        //close by owner
        balanceBefore = await iToken.balanceOf.call(charityWorker);
        daoHeoBefore = await iToken.balanceOf(iDAO.address);
        await lastCampaign.close({from: charityWorker});
        daoHeoAfter = await iToken.balanceOf(iDAO.address);
        balanceAfter = await iToken.balanceOf.call(charityWorker);
        isActive = (await lastCampaign.isActive.call());
        assert.isFalse(isActive, `Expecting campaign to be closed after successful attempt to close, but got ${isActive}`);
        let delta = heoLocked.sub(heoSpent);
        assert.isTrue(balanceBefore.add(delta).eq(balanceAfter),
            `Expecting charity's HEO balance to go up by ${delta}. Found before: ${balanceBefore}, after: ${balanceAfter}`);
        assert.isTrue(daoHeoBefore.eq(daoHeoAfter),
            `Expecting DAO's HEO balance to remain the same. Found before: ${daoHeoBefore}, after: ${daoHeoAfter}`);
        assert.isFalse(isActive, `Expecting campaign to be inactive after it was closed, but got ${isActive}`);
    });

    it("Should enforce white list for creating campaigns", async () => {
        //enable fundraiser whitelist by vote
        await iDAO.proposeVote(0, 0, KEY_ENABLE_FUNDRAISER_WHITELIST, [], [1], 259201, 51,
            {from: founder1});
        let events = await iDAO.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //set anonymous campaign limit by vote
        await iDAO.proposeVote(0, 0, KEY_ANON_CAMPAIGN_LIMIT, [], [web3.utils.toWei("10000")], 259201, 51,
            {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});        
        
        let myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let countBefore = myCampaigns.length;

        //try to deploy a campaign
        let newCoin = await StableCoinForTests.new("USDC");
        try {
            await iCampaignFactory.createCampaign(0, iTestCoin.address,
                charityAccount, compressed_meta, {from: charityAccount});
            assert.fail(`Should fail to deploy unbound campaign from non-whitelisted account`);
        } catch(err) {
            assert.equal(err.reason, "HEOCampaign: account must be white listed", `Wrong error: ${err}`);
        }

        try {
            await iCampaignFactory.createCampaign(web3.utils.toWei("10000"), "0x0000000000000000000000000000000000000000",
                charityAccount, compressed_meta, {from: charityAccount});
            assert.fail(`Should fail to deploy native campaign from non-whitelisted account`);
        } catch(err) {
            assert.equal(err.reason, "HEOCampaign: account must be white listed to raise ETH", `Wrong error: ${err}`);
        }

        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let countAfter = myCampaigns.length;
        assert.equal(countBefore, countAfter, "Should have the same number of registered campaigns.");

        //add charityAccount to white list
        await iDAO.proposeVote(1, 0, KEY_FUNDRAISER_WHITE_LIST, [charityAccount], [1], 259201, 51,
            {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //deploy unbound campaign
        await iCampaignFactory.createCampaign(0, iTestCoin.address,
            charityAccount, compressed_meta, {from: charityAccount});

        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        countAfter = myCampaigns.length;
        assert.equal(countBefore+1, countAfter, "Should have one more registered campaigns.");

        var lastCampaign = myCampaigns[countAfter-1];
        lastCampaign = await HEOCampaign.at(lastCampaign);
        assert.isNotNull(lastCampaign, "Last campaign is null");
        var maxAmount = (await lastCampaign.maxAmount.call()).toNumber();
        assert.equal(maxAmount, 0, `Expected maxAmount to be 0, but got ${maxAmount}`);
        var heoPrice = (await lastCampaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice,0 , `Expected HEO price to be 0, but got ${heoPrice}`);
        let heoPriceDecimals = (await lastCampaign.heoPriceDecimals.call()).toNumber();
        assert.equal(heoPriceDecimals, 0, `Expecting heoPriceDecimals = 0, but got ${heoPriceDecimals}`);
        var heoLocked = (await lastCampaign.heoLocked.call()).toNumber();
        assert.equal(heoLocked, 0, `Expected heoLocked to be 0, but got ${heoLocked}`);
        var raisedAmount = (await lastCampaign.raisedAmount.call()).toNumber()
        assert.equal(raisedAmount, 0, `Expected raisedAmount to be 0, but got ${raisedAmount}`);
        var targetToken = await lastCampaign.currency.call();
        assert.equal(iTestCoin.address, targetToken,
            `Expected campaign currency address to be ${iTestCoin.address}, but got ${targetToken}`);

        //deploy native campaign
        countBefore = countAfter;
        await iCampaignFactory.createCampaign(web3.utils.toWei("10000"), "0x0000000000000000000000000000000000000000",
            charityAccount, compressed_meta, {from: charityAccount});
        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        countAfter = myCampaigns.length;
        assert.equal(countBefore+1, countAfter, "Should have one more registered campaigns.");
        var lastCampaign = myCampaigns[countAfter-1];
        lastCampaign = await HEOCampaign.at(lastCampaign);
        assert.isNotNull(lastCampaign, "Last campaign is null");
        var maxAmount = (await lastCampaign.maxAmount.call());
        assert.isTrue(maxAmount.eq(new BN(web3.utils.toWei("10000"))),
            `Expected maxAmount to be 10000ETH, but got ${maxAmount}`);
        var heoPrice = (await lastCampaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice,0 , `Expected HEO price to be 0, but got ${heoPrice}`);
        heoPriceDecimals = (await lastCampaign.heoPriceDecimals.call()).toNumber();
        assert.equal(heoPriceDecimals, 0, `Expecting heoPriceDecimals = 0, but got ${heoPriceDecimals}`);
        var heoLocked = (await lastCampaign.heoLocked.call()).toNumber();
        assert.equal(heoLocked, 0, `Expected heoLocked to be 0, but got ${heoLocked}`);
        var raisedAmount = (await lastCampaign.raisedAmount.call()).toNumber()
        assert.equal(raisedAmount, 0, `Expected raisedAmount to be 0, but got ${raisedAmount}`);
        var targetToken = await lastCampaign.currency.call();
        assert.equal("0x0000000000000000000000000000000000000000", targetToken,
            `Expected campaign currency address to be 0x0000000000000000000000000000000000000000, but got ${targetToken}`);
    });

    it("Should allow changing maxAmount for reward campaign", async () => {
        let myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let countBefore = myCampaigns.length;
        // set fee to 5%
        await iDAO.proposeVote(0, 0, KEY_FUNDRAISING_FEE, [], [500], 259201, 51, {from: founder1});
        let events = await iDAO.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //give some HEO to the charity account
        let balanceBefore = await iToken.balanceOf.call(charityAccount);
        await iCharityBudget.sendTo(charityAccount, platformTokenAddress, web3.utils.toWei("5"), {from: treasurer});
        let balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceAfter.eq(balanceBefore.add(new BN(web3.utils.toWei("5")))),
            `Expecting charity's HEO balance to go up by 5 HEO, but found ${balanceAfter}`);
        iPriceOracle.setPrice("0x0000000000000000000000000000000000000000", 1, 1);

        //deploy a campaign
        await iToken.approve(iCampaignFactory.address, web3.utils.toWei("5"), {from: charityAccount});
        await iCampaignFactory.createRewardCampaign(web3.utils.toWei("100"), "0x0000000000000000000000000000000000000000",
            charityAccount, compressed_meta, {from: charityAccount});

        myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        let countAfter = myCampaigns.length;
        assert.equal(countBefore+1, countAfter, "Should have one more campaign registered.");

        balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceAfter.eq(balanceBefore),
            `Expecting charity's HEO balance to go down by 5 HEO, but found ${balanceAfter}`);

        var lastCampaign = myCampaigns[countAfter-1];

        balanceAfter = await iToken.balanceOf.call(lastCampaign);
        assert.isTrue(balanceAfter.eq(new BN(web3.utils.toWei("5"))),
            `Expecting campaign to have 5 HEO, but found ${balanceAfter}`);

        lastCampaign = await HEOCampaign.at(lastCampaign);
        assert.isNotNull(lastCampaign, "Last campaign is null");
        var maxAmount = await lastCampaign.maxAmount.call();
        assert.isTrue(maxAmount.eq(new BN(web3.utils.toWei("100"))), `Expected maxAmount to be 100 ETH, but got ${maxAmount}`);
        var heoLocked = await lastCampaign.heoLocked.call();
        assert.isTrue(heoLocked.eq(new BN(web3.utils.toWei("5"))), `Expected heoLocked to be 5 HEO, but got ${heoLocked}`);
        var raisedAmount = (await lastCampaign.raisedAmount.call()).toNumber()
        assert.equal(raisedAmount, 0, `Expected raisedAmount to be 0, but got ${raisedAmount}`);
        let isActive = (await lastCampaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);

        //try changing maxAmount by non-owner
        balanceBefore = await iToken.balanceOf.call(charityAccount);
        try {
            await lastCampaign.changeMaxAmount(web3.utils.toWei("80"), {from: founder1});
            assert.fail("Non-owner should not be able to change maxAmount");
        } catch(err) {
            assert.equal(err.reason,
                "Ownable: caller is not the owner", `Wrong error message ${err}`);
        }
        isActive = (await lastCampaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);
        balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceAfter.eq(balanceBefore),
            `Expecting charity's HEO balance to remain unchanged, but found ${balanceAfter}`);

        //change maxAmount to 80 by owner
        await lastCampaign.changeMaxAmount(web3.utils.toWei("80"), {from: charityAccount});
        isActive = (await lastCampaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be still be active, but got ${isActive}`);
        maxAmount = await lastCampaign.maxAmount.call();
        assert.isTrue(maxAmount.eq(new BN(web3.utils.toWei("80"))), `Expected maxAmount to be 80 ETH, but got ${maxAmount}`);

        //verify that 1 HEO was refunded
        balanceAfter = await iToken.balanceOf.call(lastCampaign.address);
        assert.isTrue(balanceAfter.eq(new BN(web3.utils.toWei("4"))),
            `Expecting campaign to have 4 HEO after lowering maxAmount, but found ${balanceAfter}`);
        balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceAfter.eq(balanceBefore.add(new BN(web3.utils.toWei("1")))),
            `Expecting charity's HEO balance to go up by 1 HEO, but found ${balanceAfter}`);

        balanceBefore = await iToken.balanceOf.call(charityAccount);
        await lastCampaign.donateNative({from: donorAccount, value: web3.utils.toWei("20", "ether")});
        try {
            await lastCampaign.changeMaxAmount(web3.utils.toWei("9"), {from: charityAccount});
            assert.fail("Should not be able to change maxAmount below donated amount");
        } catch (err) {
            assert.equal(err.reason,
                "HEOCampaign: newMaxAmount cannot be lower than amount raised", `Wrong error message ${err}`);
        }
        balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceAfter.eq(balanceBefore),
            `Expecting charity's HEO balance to remain unchanged, but found ${balanceAfter}`);

        await lastCampaign.changeMaxAmount(web3.utils.toWei("20"), {from: charityAccount});
        isActive = (await lastCampaign.isActive.call());
        assert.isFalse(isActive, `Expecting campaign to be inactive, but got ${isActive}`);
        maxAmount = await lastCampaign.maxAmount.call();
        assert.isTrue(maxAmount.eq(new BN(web3.utils.toWei("20"))), `Expected maxAmount to be 20 ETH, but got ${maxAmount}`);

        //verify that 3 HEO was refunded
        balanceAfter = await iToken.balanceOf.call(lastCampaign.address);
        assert.isTrue(balanceAfter.eq(new BN(web3.utils.toWei("0"))),
            `Expecting campaign to have 0 HEO after lowering maxAmount, but found ${balanceAfter}`);
        balanceAfter = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(balanceAfter.eq(balanceBefore.add(new BN(web3.utils.toWei("3")))),
            `Expecting charity's HEO balance to go up by 3 HEO, but found ${balanceAfter}`);
    });
});
