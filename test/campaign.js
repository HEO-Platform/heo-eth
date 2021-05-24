const HEOToken = artifacts.require("HEOToken");
const HEOCampaign = artifacts.require("HEOCampaign");
const HEODAO = artifacts.require("HEODAO");
const HEOStaking = artifacts.require("HEOStaking");
const HEOParameters = artifacts.require("HEOParameters");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
const HEORewardFarm = artifacts.require("HEORewardFarm");
const StableCoinForTests = artifacts.require("StableCoinForTests");
const timeMachine = require('ganache-time-traveler');

const REWARD_PERIOD = 10;
const KEY_ACCEPTED_COINS = 4;
const KEY_PLATFORM_TOKEN_ADDRESS = 5;
const KEY_REWARD_FARM = 2;
const KEY_CAMPAIGN_REGISTRY = 1;
const KEY_TREASURER = 6;
const KEY_CAMPAIGN_FACTORY = 0;
const KEY_ENABLE_FUNDRAISER_WHITELIST = 11;
const KEY_ANON_CAMPAIGN_LIMIT = 12;
const KEY_FUNDRAISER_WHITE_LIST = 5;
const ONE_COIN = web3.utils.toWei("1");

var BN = web3.utils.BN;
var founder1, founder2, founder3, charityAccount, charityWorker, donorAccount, treasurer;
var iTestCoin, iRewardFarm, iRegistry, iToken, iGlobalParams,  iCampaignFactory;
var paramsInstance, daoInstance, stakingInstance, platformTokenAddress;
contract("HEOCampaign", (accounts) => {
    before(async () => {
        founder1 = accounts[0];
        founder2 = accounts[1];
        founder3 = accounts[2];
        charityAccount = accounts[3];
        donorAccount = accounts[4];
        treasurer = accounts[5];
        charityWorker = accounts[6];
        paramsInstance = await HEOParameters.new();
        stakingInstance = await HEOStaking.new();
        daoInstance = await HEODAO.new();
        iCampaignFactory = await HEOCampaignFactory.new(daoInstance.address);
        iRegistry = await HEOCampaignRegistry.new(daoInstance.address);
        iRewardFarm = await HEORewardFarm.new(daoInstance.address);
        await paramsInstance.transferOwnership(daoInstance.address);
        await stakingInstance.transferOwnership(daoInstance.address);
        await daoInstance.setParams(paramsInstance.address);
        await daoInstance.setStaking(stakingInstance.address);
        await daoInstance.initVoters([founder1, founder2, founder3]);
        await daoInstance.deployPlatformToken(new BN("100000000000000000000000000"),
            "Help Each Other platform token", "HEO", {from: founder1});
        platformTokenAddress = await paramsInstance.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        let tokenInstance = await HEOToken.at(platformTokenAddress);
        for(let i=0; i < 3; i++) {
            await tokenInstance.approve(stakingInstance.address, ONE_COIN, {from: accounts[i]})
            await daoInstance.registerToVote(ONE_COIN, platformTokenAddress, {from: accounts[i]});
        }

        //initialize test stable-coin
        iTestCoin = await StableCoinForTests.new("TUSD");
        await iTestCoin.transfer(donorAccount, web3.utils.toWei("10000"));

        //add stable-coin to accepted currencies
        await daoInstance.proposeVote(1, 0, KEY_ACCEPTED_COINS, [iTestCoin.address], [1], 259201, 51,
            {from: founder1});
        let events = await daoInstance.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await daoInstance.executeProposal(proposalId, {from: founder2});

        //set campaign factory by vote
        await daoInstance.proposeVote(3, 0, KEY_CAMPAIGN_FACTORY, [iCampaignFactory.address], [1], 259201, 51,
            {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await daoInstance.executeProposal(proposalId, {from: founder2});

        //set reward farm by vote
        await daoInstance.proposeVote(3, 0, KEY_REWARD_FARM, [iRewardFarm.address], [1], 259201, 51,
            {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await daoInstance.executeProposal(proposalId, {from: founder2});

        //set campaign registry by vote
        await daoInstance.proposeVote(3, 0, KEY_CAMPAIGN_REGISTRY, [iRegistry.address], [1], 259201, 51,
            {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await daoInstance.executeProposal(proposalId, {from: founder2});

        //assign treasurer by vote
        await daoInstance.proposeVote(3, 0, KEY_TREASURER, [treasurer], [1], 259201, 51,
            {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;
        //cast votes for treasurer
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await daoInstance.executeProposal(proposalId, {from: founder1});
    });
    it("Should not allow donations from campaign owner or from beneficiary", async() => {
        //deploy campaign to collect unlimited native coin
        let campaign = await HEOCampaign.new(0, charityAccount, "0x0000000000000000000000000000000000000000",
            "https://someurl1", daoInstance.address, 0, 0, 0, 0, 0, "0x0000000000000000000000000000000000000000", {from: charityWorker});
        let heoPrice = (await campaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice, 0, `Expecting heoPrice = 0, but got ${heoPrice}`);
        let isActive = (await campaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);
        let addrCheck = await campaign.beneficiary.call();
        assert.equal(addrCheck, charityAccount, `Expecting beneficiary to be ${charityAccount} but found ${addrCheck}`);
        addrCheck = await campaign.owner.call();
        assert.equal(addrCheck, charityWorker, `Expecting owner to be ${charityWorker} but found ${addrCheck}`);

        let charityBefore = await web3.eth.getBalance(charityAccount);
        let daoBefore = await web3.eth.getBalance(daoInstance.address);

        //try to donate to your own campaign
        try {
            await campaign.donateNative({from: charityWorker, value: web3.utils.toWei("1", "ether")});
            assert.fail("Campaign owner should not be able to donate to the campaign");
        } catch (err) {
            assert.equal(err.reason, "HEOCampaign: cannot donate to your own camapaign",
                `Wrong error message: ${err.reason}`);
        }

        let charityAfter = await web3.eth.getBalance(charityAccount);
        let daoAfter = await web3.eth.getBalance(daoInstance.address);

        //check that balances did not change as a result of failed transaction
        assert.isTrue(new BN(charityAfter).eq(new BN(charityBefore)),
            `Charity's ETH balance should not change from ${charityBefore} to ${charityAfter}`);
        assert.isTrue(new BN(daoAfter).eq(new BN(daoBefore)),
            `DAO's ETH balance should not change from ${daoBefore} to ${daoAfter}`);


        //try to donate to yourself
        try {
            await campaign.donateNative({from: charityAccount, value: web3.utils.toWei("1", "ether")});
            assert.fail("Beneficiary should not be able to donate to the campaign");
        } catch (err) {
            assert.equal(err.reason, "HEOCampaign: cannot donate to yourself",
                `Wrong error message: ${err.reason}`);
        }
    });
    it("Should not allow raising with non-whitelisted ERC20 token", async() => {
        //initialize new stable-coin
        let newCoin = await StableCoinForTests.new("USDC");
        try {
            let campaign = await HEOCampaign.new(0, charityAccount, newCoin.address, "https://someurl1",
                daoInstance.address, 0, 0, 0, 0, 0, "0x0000000000000000000000000000000000000000", {from: charityAccount});
            assert.fail("Should not be able to create the campaign");
        } catch (err) {
            assert.equal(err.reason, "HEOCampaign: currency is not accepted as donation",
                `Wrong error message: ${err.reason}`);
        }

        //add new stable-coin to accepted currencies
        await timeMachine.advanceTimeAndBlock(600);
        await daoInstance.proposeVote(1, 0, KEY_ACCEPTED_COINS, [newCoin.address], [1], 259201, 51,
            {from: founder1});
        let events = await daoInstance.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        let activeProposals = await daoInstance.activeProposals.call();
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await daoInstance.executeProposal(proposalId, {from: founder2});

        //now should be able to create the campaign
        let campaign = await HEOCampaign.new(0, charityAccount, newCoin.address, "https://someurl1",
            daoInstance.address, 0, 0, 0, 0, 0, "0x0000000000000000000000000000000000000000", {from: charityAccount});
        await newCoin.transfer(donorAccount, web3.utils.toWei("10000"));
        await newCoin.approve(campaign.address, web3.utils.toWei("10"), {from: donorAccount});
        await campaign.donateERC20(web3.utils.toWei("10"), {from: donorAccount});
        await iTestCoin.approve(campaign.address, web3.utils.toWei("10"), {from: donorAccount});
        try {
            await campaign.donateERC20(web3.utils.toWei("10"), {from: donorAccount});
            assert.fail("Should fail to donate w/o approval")
        } catch (err) {
            assert.equal(err.reason, "ERC20: transfer amount exceeds allowance",
                `Wrong error message: ${err.reason}`);
        }
    });
    it("Native campaign should allow native donations and reject ERC20 donations", async() => {
        //deploy campaign to collect unlimited native coin
        let campaign = await HEOCampaign.new(0, charityAccount, "0x0000000000000000000000000000000000000000",
            "https://someurl1", daoInstance.address, 0, 0, 0, 0, 0, "0x0000000000000000000000000000000000000000", {from: charityWorker});
        let heoPrice = (await campaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice, 0, `Expecting heoPrice = 0, but got ${heoPrice}`);
        let isActive = (await campaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);
        let addrCheck = await campaign.beneficiary.call();
        assert.equal(addrCheck, charityAccount, `Expecting beneficiary to be ${charityAccount} but found ${addrCheck}`);
        addrCheck = await campaign.owner.call();
        assert.equal(addrCheck, charityWorker, `Expecting owner to be ${charityWorker} but found ${addrCheck}`);

        //donate eth
        let charityBefore = await web3.eth.getBalance(charityAccount);
        let workerBefore = await web3.eth.getBalance(charityWorker);
        let donorBefore = await web3.eth.getBalance(donorAccount);
        let daoBefore = await web3.eth.getBalance(daoInstance.address);

        await campaign.donateNative({from: donorAccount, value: web3.utils.toWei("1", "ether")});

        let charityAfter = await web3.eth.getBalance(charityAccount);
        let workerAfter = await web3.eth.getBalance(charityWorker);
        let donorAfter = await web3.eth.getBalance(donorAccount);
        let daoAfter = await web3.eth.getBalance(daoInstance.address);
        assert.isTrue(new BN(workerAfter).eq(new BN(workerBefore)), `Charity worker's ETH balance should not change `);
        assert.isTrue(new BN(donorAfter).lt(new BN(donorBefore)), `Donor's ETH balance should go down`);
        assert.isTrue(new BN(charityAfter).eq(new BN(charityBefore).add(new BN(web3.utils.toWei("0.975", "ether")))),
            `Charity's ETH balance should go up by 0.975 ether`);
        assert.isTrue(new BN(daoAfter).eq(new BN(daoBefore).add(new BN(web3.utils.toWei("0.025", "ether")))),
            `DAO's ETH balance should go up by 0.025 ether`);

        //attempt to donate ERC20
        await iTestCoin.approve(campaign.address, web3.utils.toWei("10"), {from: donorAccount});
        try {
            await campaign.donateERC20(web3.utils.toWei("10"), {from: donorAccount});
            assert.fail("Should not allow ERC20 donation")
        } catch (err) {
            assert.equal(err.reason, "HEOCampaign: this campaign does not accept ERC-20 donations",
                `Wrong error message: ${err.reason}`);
        }

    });
    it("ERC-20 based campaign should allow ERC-20 donations and reject native donations", async() => {
        //deploy campaign to collect unlimited stablecoins
        let campaignInstance = await HEOCampaign.new(0, charityAccount, iTestCoin.address, "https://someurl1",
            daoInstance.address, 0, 0, 0, 0, 0, "0x0000000000000000000000000000000000000000", {from: charityAccount});
        let myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        assert.equal(myCampaigns.length, 0, `Should not have any registered campaigns. Found ${myCampaigns}`);
        let heoLocked = (await campaignInstance.heoLocked.call()).toNumber();
        assert.equal(heoLocked, 0, `Expecting heoLocked = 0, but got ${heoLocked}`);
        let maxAmount = (await campaignInstance.maxAmount.call()).toNumber();
        assert.equal(maxAmount, 0, `Expecting maxAmount = 0, but got ${maxAmount}`);
        let heoPrice = (await campaignInstance.heoPrice.call()).toNumber();
        assert.equal(heoPrice, 0, `Expecting heoPrice = 0, but got ${heoPrice}`);
        let isActive = (await campaignInstance.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);
        let addrCheck = await campaignInstance.beneficiary.call();
        assert.equal(addrCheck, charityAccount, `Expecting beneficiary to be ${charityAccount} but found ${addrCheck}`);
        addrCheck = await campaignInstance.owner.call();
        assert.equal(addrCheck, charityAccount, `Expecting beneficiary to be ${charityAccount} but found ${addrCheck}`);

        //attempt to donate ETH
        try {
            await campaignInstance.donateNative({from: donorAccount, value: web3.utils.toWei("1", "ether")});
            assert.fail(`Should fail to donate ETH when campaign accepts ${iTestCoin.address}`);
        } catch (err) {
            assert.equal(err.reason, "HEOCampaign: this campaign does not accept ETH",
                `Wrong error message: ${err.reason}`);
        }
        //Make sure beneficiary's balance of stablecoin has not changed
        let charityCoinBalanceAfter = (await iTestCoin.balanceOf.call(charityAccount)).toNumber();
        assert.equal(charityCoinBalanceAfter, 0,
            `Expecting charity balance to be 0, but found ${charityCoinBalanceAfter}`);

        //donate TUSD
        await iTestCoin.approve(campaignInstance.address, web3.utils.toWei("10"), {from: donorAccount});
        await campaignInstance.donateERC20(web3.utils.toWei("10"), {from: donorAccount});
        //Make sure beneficiary received the entire donation
        charityCoinBalanceAfter = await iTestCoin.balanceOf.call(charityAccount);
        assert.isTrue(charityCoinBalanceAfter.eq(new BN(web3.utils.toWei("9.75"))),
            `Expecting charity to have 9.75 USDC, but found ${charityCoinBalanceAfter}`);
        let daoBalanceAfter = await iTestCoin.balanceOf.call(daoInstance.address);
        assert.isTrue(daoBalanceAfter.eq(new BN(web3.utils.toWei("0.25"))),
            `Expecting DAO to have 0.25 USDC, but found ${charityCoinBalanceAfter}`);
    });

    it("Should deploy a campaign with 0% reward when reward farm is empty", async() => {
        //deploy campaign for 100 USDT
        let campaign = await HEOCampaign.new(web3.utils.toWei("100"), charityAccount, iTestCoin.address, "https://someu",
            daoInstance.address, web3.utils.toWei("5"), 100, 10, 500, 10000, platformTokenAddress, {from: charityAccount});

        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        assert.equal(myCampaigns.length, 0, `Should not have any registered campaigns. Found ${myCampaigns}`);
        let heoLocked = await campaign.heoLocked.call();
        assert.isTrue(heoLocked.eq(new BN(web3.utils.toWei("5"))), `Expecting heoLocked = 5 HEO, but got ${heoLocked}`);
        let maxAmount = await campaign.maxAmount.call();
        assert.isTrue(maxAmount.eq(new BN(web3.utils.toWei("100"))), `Expecting maxAmount = 100  USDT, but got ${maxAmount}`);
        let heoPrice = (await campaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice, 100, `Expecting heoPrice = 0, but got ${heoPrice}`);
        let heoPriceDecimals = (await campaign.heoPriceDecimals.call()).toNumber();
        assert.equal(heoPriceDecimals, 10, `Expecting heoPriceDecimals = 10, but got ${heoPriceDecimals}`);
        let isActive = (await campaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);

    });

    it("Should deploy a campaign with 250% reward when reward farm has 25M HEO", async() => {
        //send 25M HEO to the reward farm
        await daoInstance.proposeVote(2, 3, 0, [iRewardFarm.address, platformTokenAddress],
            [web3.utils.toWei("25000000")], 259201, 51, {from: founder1});
        let events = await daoInstance.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        //cast votes
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder3});

        //execute the proposal
        await daoInstance.executeProposal(proposalId, {from: founder1});

        //deploy campaign for 100 USDT
        let campaign = await HEOCampaign.new(web3.utils.toWei("100"), charityAccount, iTestCoin.address, "https://someu",
            daoInstance.address, web3.utils.toWei("5"), 100, 10, 500, 10000, platformTokenAddress, {from: charityAccount});

        var myCampaigns = await iRegistry.myCampaigns.call({from: charityAccount});
        assert.equal(myCampaigns.length, 0, `Should not have any registered campaigns. Found ${myCampaigns}`);
        let heoLocked = await campaign.heoLocked.call();
        assert.isTrue(heoLocked.eq(new BN(web3.utils.toWei("5"))), `Expecting heoLocked = 5 HEO, but got ${heoLocked}`);
        let maxAmount = await campaign.maxAmount.call();
        assert.isTrue(maxAmount.eq(new BN(web3.utils.toWei("100"))), `Expecting maxAmount = 100  USDT, but got ${maxAmount}`);
        let heoPrice = (await campaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice, 100, `Expecting heoPrice = 0, but got ${heoPrice}`);
        let heoPriceDecimals = (await campaign.heoPriceDecimals.call()).toNumber();
        assert.equal(heoPriceDecimals, 10, `Expecting heoPriceDecimals = 10, but got ${heoPriceDecimals}`);
        let isActive = (await campaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);
    });

    it("Should enforce white list for creating campaigns", async() => {
        //enable fundraiser whitelist by vote
        await daoInstance.proposeVote(0, 0, KEY_ENABLE_FUNDRAISER_WHITELIST, [], [1], 259201, 51,
            {from: founder1});
        let events = await daoInstance.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await daoInstance.executeProposal(proposalId, {from: founder2});

        //set anonymous campaign limit by vote
        await daoInstance.proposeVote(0, 0, KEY_ANON_CAMPAIGN_LIMIT, [], [web3.utils.toWei("10000")], 259201, 51,
            {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await daoInstance.executeProposal(proposalId, {from: founder2});

        //try to deploy campaign
        try {
            await HEOCampaign.new(0, charityAccount, iTestCoin.address, "https://someurl1",
                daoInstance.address, 0, 0, 0, 0, 0, platformTokenAddress, {from: charityAccount});
            assert.fail(`Should fail to deploy unbound campaign from non-whitelisted account`);
        } catch(err) {
            assert.equal(err.reason, "HEOCampaign: account must be white listed", `Wrong error: ${err}`);
        }
        try {
            await HEOCampaign.new(web3.utils.toWei("100"), charityAccount,
                "0x0000000000000000000000000000000000000000", "https://someurl1",
                daoInstance.address, 0, 0, 0, 0, 0, platformTokenAddress, {from: charityAccount});
            assert.fail(`Should fail to deploy native campaign from non-whitelisted account`);
        } catch(err) {
            assert.equal(err.reason, "HEOCampaign: account must be white listed to raise ETH", `Wrong error: ${err}`);
        }
        try {
            await HEOCampaign.new(web3.utils.toWei("10001"), charityAccount,
                iTestCoin.address, "https://someurl1", daoInstance.address, 1, 0, 0, 0, 0, platformTokenAddress,
                {from: charityAccount});
            assert.fail(`Should fail to deploy campaign above anonymous limit`);
        } catch(err) {
            assert.equal(err.reason,
                "HEOCampaign: amount over allowed limit for non-white listed accounts", `Wrong error: ${err}`);
        }

        let campaign = await HEOCampaign.new(web3.utils.toWei("9999"), charityAccount, iTestCoin.address,
            "https://someurl1", daoInstance.address, 1, 0, 0, 0, 0, platformTokenAddress, {from: charityAccount});
        let currency = await campaign.currency.call();
        assert.equal(currency, iTestCoin.address, `Expecting currency to be ${iTestCoin.address}, but got ${currency}`);
        let heoPrice = (await campaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice, 0, `Expecting heoPrice = 0, but got ${heoPrice}`);
        let isActive = (await campaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);
        let addrCheck = await campaign.beneficiary.call();
        assert.equal(addrCheck, charityAccount, `Expecting beneficiary to be ${charityAccount} but found ${addrCheck}`);
        addrCheck = await campaign.owner.call();
        assert.equal(addrCheck, charityAccount, `Expecting owner to be ${charityAccount} but found ${addrCheck}`);
        let maxAmount = await campaign.maxAmount.call();
        assert.isTrue(maxAmount.eq(new BN(web3.utils.toWei("9999"))),
            `Expecting maxAmount = ${web3.utils.toWei("9999")}, but got ${maxAmount}`);

        //add charityAccount to white list
        await daoInstance.proposeVote(1, 0, KEY_FUNDRAISER_WHITE_LIST, [charityAccount], [1], 259201, 51,
            {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await daoInstance.executeProposal(proposalId, {from: founder2});

        //deploy unbound campaign
        campaign = await HEOCampaign.new(0, charityAccount, iTestCoin.address, "https://someurl1",
            daoInstance.address, 0, 0, 0, 0, 0, platformTokenAddress, {from: charityAccount});
        currency = await campaign.currency.call();
        assert.equal(currency, iTestCoin.address, `Expecting currency to be ${iTestCoin.address}, but got ${currency}`);
        heoPrice = (await campaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice, 0, `Expecting heoPrice = 0, but got ${heoPrice}`);
        isActive = (await campaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);
        addrCheck = await campaign.beneficiary.call();
        assert.equal(addrCheck, charityAccount, `Expecting beneficiary to be ${charityAccount} but found ${addrCheck}`);
        addrCheck = await campaign.owner.call();
        assert.equal(addrCheck, charityAccount, `Expecting owner to be ${charityAccount} but found ${addrCheck}`);
        maxAmount = (await campaign.maxAmount.call()).toNumber();
        assert.equal(maxAmount, 0, `Expecting maxAmount = 0, but got ${maxAmount}`);

        //deploy native campaign
        campaign = await HEOCampaign.new(web3.utils.toWei("100"), charityAccount,
            "0x0000000000000000000000000000000000000000", "https://someurl1",
            daoInstance.address, 0, 0, 0, 0, 0, platformTokenAddress, {from: charityAccount});
        currency = await campaign.currency.call();
        assert.equal(currency, "0x0000000000000000000000000000000000000000", `Expecting currency to be 0-address, but got ${currency}`);
        heoPrice = (await campaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice, 0, `Expecting heoPrice = 0, but got ${heoPrice}`);
        isActive = (await campaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);
        addrCheck = await campaign.beneficiary.call();
        assert.equal(addrCheck, charityAccount, `Expecting beneficiary to be ${charityAccount} but found ${addrCheck}`);
        addrCheck = await campaign.owner.call();
        assert.equal(addrCheck, charityAccount, `Expecting owner to be ${charityAccount} but found ${addrCheck}`);
        maxAmount = await campaign.maxAmount.call();
        assert.isTrue(maxAmount.eq(new BN(web3.utils.toWei("100"))),`Expecting maxAmount = 10 ETH, but got ${maxAmount}`);

        //deploy large limit campaign
        campaign = await HEOCampaign.new(web3.utils.toWei("20000"), charityAccount, iTestCoin.address,"https://someurl1",
            daoInstance.address, 0, 0, 0, 0, 0, platformTokenAddress, {from: charityWorker});
        currency = await campaign.currency.call();
        assert.equal(currency, iTestCoin.address, `Expecting currency to be 0-address, but got ${currency}`);
        heoPrice = (await campaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice, 0, `Expecting heoPrice = 0, but got ${heoPrice}`);
        isActive = (await campaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);
        addrCheck = await campaign.beneficiary.call();
        assert.equal(addrCheck, charityAccount, `Expecting beneficiary to be ${charityAccount} but found ${addrCheck}`);
        addrCheck = await campaign.owner.call();
        assert.equal(addrCheck, charityWorker, `Expecting owner to be ${charityWorker} but found ${addrCheck}`);
        maxAmount = await campaign.maxAmount.call();
        assert.isTrue(maxAmount.eq(new BN(web3.utils.toWei("20000"))),`Expecting maxAmount = 20000 USD, but got ${maxAmount}`);

        //try to deploy unbound campaign with burning tokens
        try {
            await HEOCampaign.new(0, charityAccount, iTestCoin.address, "https://someurl1",
                daoInstance.address, 1, 0, 0, 0, 0, platformTokenAddress, {from: charityAccount});
            assert.fail(`Should fail to deploy unbound campaign with heoSpent > 0`);
        } catch (err) {
            assert.equal(err.reason,
                "HEOCampaign: maxAmount has to be greater than zero", `Wrong error: ${err}`);
        }
    })

    it("Should close non-reward campaigns", async() => {
        //deploy campaign to collect unlimited native coin
        let campaign = await HEOCampaign.new(0, charityAccount, "0x0000000000000000000000000000000000000000",
            "https://someurl1", daoInstance.address, 0, 0, 0, 0, 0, "0x0000000000000000000000000000000000000000",
            {from: charityWorker});
        let heoPrice = (await campaign.heoPrice.call()).toNumber();
        assert.equal(heoPrice, 0, `Expecting heoPrice = 0, but got ${heoPrice}`);
        let isActive = (await campaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active, but got ${isActive}`);
        let addrCheck = await campaign.beneficiary.call();
        assert.equal(addrCheck, charityAccount, `Expecting beneficiary to be ${charityAccount} but found ${addrCheck}`);
        addrCheck = await campaign.owner.call();
        assert.equal(addrCheck, charityWorker, `Expecting owner to be ${charityWorker} but found ${addrCheck}`);
        try {
            await campaign.close({from: charityAccount});
            assert.fail("Non-owner should not be able to close the campaign");
        } catch(err) {
            assert.equal(err.reason,
                "Ownable: caller is not the owner", `Wrong error message ${err}`);
        }
        isActive = (await campaign.isActive.call());
        assert.isTrue(isActive, `Expecting campaign to be active after failed attempt to close, but got ${isActive}`);
        await campaign.close({from: charityWorker});
        isActive = (await campaign.isActive.call());
        assert.isFalse(isActive, `Expecting campaign to be closed after successful attempt to close, but got ${isActive}`);
    })
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