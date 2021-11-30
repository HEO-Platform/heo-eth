const HEOToken = artifacts.require("HEOToken");
const HEODAO = artifacts.require("HEODAO");
const HEOParameters = artifacts.require("HEOParameters");
const HEOStaking = artifacts.require("HEOStaking");
const HEOPrivateSale = artifacts.require("HEOPrivateSale");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const StableCoinForTests = artifacts.require("StableCoinForTests");
const ONE_COIN = web3.utils.toWei("1");

var BN = web3.utils.BN;
const timeMachine = require('ganache-time-traveler');
const KEY_INVESTMENT_VESTING_SECONDS = 14;
const KEY_PLATFORM_TOKEN_ADDRESS = 5;
const KEY_ACCEPTED_COINS = 4;
const KEY_PRICE_ORACLE = 4;
const KEY_TREASURER = 6;

var founder1, founder2, founder3, investor1, investor2, treasurer;
var iTestCoin, iToken, iPriceOracle, iSale, iHEOParams, iDAO, iStaking;
contract("HEOPrivateSale", (accounts) => {
    before(async () => {
        founder1 = accounts[0];
        founder2 = accounts[1];
        founder3 = accounts[2];
        investor1 = accounts[4];
        investor2 = accounts[5];
        treasurer = accounts[6];
    });
    beforeEach(async () => {
        iHEOParams = await HEOParameters.new();
        iDAO = await HEODAO.new();
        iPriceOracle = await HEOPriceOracle.new();
        iStaking = await HEOStaking.new();

        await iHEOParams.transferOwnership(iDAO.address);
        await iStaking.transferOwnership(iDAO.address);

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
        await iTestCoin.transfer(investor1, web3.utils.toWei("1000000"));
        await iTestCoin.transfer(investor2, web3.utils.toWei("1000000"));

        //add stable-coin to accepted currencies
        await iDAO.proposeVote(1, 0, KEY_ACCEPTED_COINS, [iTestCoin.address], [1], 259201, 51,
            {from: founder1});
        let events = await iDAO.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

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

        //set price oracle by vote
        await iDAO.proposeVote(3, 0, KEY_PRICE_ORACLE, [iPriceOracle.address], [1], 259201, 51,
            {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //set vesting period to 3 years
        await iDAO.proposeVote(0, 0, KEY_INVESTMENT_VESTING_SECONDS, [], [94608000], 259201, 51, {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});

        //create an sale contract
        iSale = await HEOPrivateSale.new(iDAO.address);

        //transfer a budget of 8M HEO to the sale contract
        await iDAO.proposeVote(2, 3, 0, [iSale.address, platformTokenAddress],
            [web3.utils.toWei("8000000")], 259201, 51, {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        //cast votes for budget
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});
    });
    it("Should vest 8M HEO after 3 years for a 400K investment", async() => {
        //set HEO price to $0.05
        await iPriceOracle.setPrice(iTestCoin.address, 5, 100);

        var equity = await iSale.calculateEquity(web3.utils.toWei("400000"), iTestCoin.address);
        assert.isTrue(new BN(web3.utils.toWei("8000000")).eq(new BN(equity)),
            `Expected equity should be ${web3.utils.toWei("8000000")}, but found ${equity}`);
        //invest $400K
        await iTestCoin.approve(iSale.address, web3.utils.toWei("400000"), {from: investor1});
        await iSale.sell(web3.utils.toWei("400000"), iTestCoin.address, {from: investor1});

        //check that money moved from investor to DAO
        var investor1BalanceAfter = await iTestCoin.balanceOf.call(investor1);
        assert.isTrue(new BN(investor1BalanceAfter).eq(new BN(web3.utils.toWei("600000"))),
            `Expecting investor1 to have ${web3.utils.toWei("600000")} after sale. Found : ${investor1BalanceAfter}`);
        let daoBalanceAfter = await iTestCoin.balanceOf.call(iDAO.address);
        assert.isTrue(new BN(daoBalanceAfter).eq(new BN(web3.utils.toWei("400000"))),
            `Expecting DAO to have 400K after sale. Found : ${daoBalanceAfter}`);

        //check that unsold balance is 0
        let unsold = await iSale.unsoldBalance.call();
        assert.isTrue(new BN("0").eq(new BN(unsold)), `Expecting unsold balance to be 0, but found ${unsold}`);

        await iTestCoin.approve(iSale.address, web3.utils.toWei("400000"), {from: investor2});
        try {
            await iSale.sell(web3.utils.toWei("1"), iTestCoin.address, {from: investor2});
            assert.fail("Should not be able to sell more HEO");
        } catch (err) {
            assert.equal(err.reason, "HEOPrivateSale: not enough HEO to sell",
                `Unexpected exception: ${err}`);
        }
        //verify investment amount
        var sales = await iSale.investorsSales.call(investor1);
        assert.equal(sales.length, 1, `Expecting 1 sale, but got ${sales}`);
        equity = await iSale.saleEquity(sales[0]);
        assert.isTrue(new BN(web3.utils.toWei("8000000")).eq(new BN(equity)),
            `Sold equity should be ${web3.utils.toWei("8000000")}, but found ${equity}`);

        equity = await iSale.vestedEquity(sales[0]);
        assert.isTrue(new BN(web3.utils.toWei("8000000")).gt(new BN(equity)),
            `Vested equity should be less than ${web3.utils.toWei("8000000")}, but found ${equity}`);

        //advance time one year
        await timeMachine.advanceTimeAndBlock(31536000);
        equity = await iSale.vestedEquity(sales[0]);
        assert.isTrue(new BN(web3.utils.toWei("3000000")).gt(new BN(equity)),
            `After one year vested equity should be less than ${web3.utils.toWei("3000000")}, but found ${equity}`);
        assert.isTrue(new BN(web3.utils.toWei("2600000")).lt(new BN(equity)),
            `After one year vested equity should be more than ${web3.utils.toWei("2600000")}, but found ${equity}`);
        //try claiming more than vested
        try {
            await iSale.claimEquity(investor1, sales[0], web3.utils.toWei("3000000"), {from: investor1});
        } catch (err) {
            assert.equal(err.reason, "HEOPrivateSale: claim exceeds vested equity",
                `Unexpected exception: ${err}`);
        }
        //try claiming by rogue investor
        try {
            await iSale.claimEquity(investor2, sales[0], web3.utils.toWei("1000000"), {from: investor2});
        } catch (err) {
            assert.equal(err.reason, "HEOPrivateSale: caller is not the investor",
                `Unexpected exception: ${err}`);
        }
        //Investor1 claims some amount and deposits it into investor2's account
        var investor1BalanceBefore = await iToken.balanceOf(investor1);
        var investor2BalanceBefore = await iToken.balanceOf(investor2);
        assert.isTrue(new BN("0").eq(new BN(investor1BalanceBefore)), `Expecting investor1 to not have any HEO before claiming, but found ${investor1BalanceBefore}`);
        assert.isTrue(new BN("0").eq(new BN(investor2BalanceBefore)), `Expecting investor2 to not have any HEO before claiming, but found ${investor2BalanceBefore}`);
        await iSale.claimEquity(investor2, sales[0], web3.utils.toWei("2600000"), {from: investor1});
        investor1BalanceAfter = await iToken.balanceOf.call(investor1);
        var investor2BalanceAfter = await iToken.balanceOf(investor2);
        assert.isTrue(new BN("0").eq(new BN(investor1BalanceAfter)), `Expecting investor1 to not have any HEO after claiming, but found ${investor1BalanceAfter}`);
        assert.isTrue(new BN(web3.utils.toWei("2600000")).eq(new BN(investor2BalanceAfter)), `Expecting investor2 have ${web3.utils.toWei("2600000")} HEO after claiming, but found ${investor2BalanceAfter}`);

        //advance time one more year
        await timeMachine.advanceTimeAndBlock(31536000);
        equity = await iSale.vestedEquity(sales[0]);
        assert.isTrue(new BN(web3.utils.toWei("6000000")).gt(new BN(equity)),
            `After two years vested equity should be less than ${web3.utils.toWei("6000000")}, but found ${equity}`);
        assert.isTrue(new BN(web3.utils.toWei("5200000")).lt(new BN(equity)),
            `After two years vested equity should be more than ${web3.utils.toWei("5200000")}, but found ${equity}`);

        //advance time one more year
        await timeMachine.advanceTimeAndBlock(31536000);
        equity = await iSale.vestedEquity(sales[0]);
        assert.isTrue(new BN(web3.utils.toWei("8000000")).eq(new BN(equity)),
            `After three years vested equity should be ${web3.utils.toWei("8000000")}, but found ${equity}`);

    });
});
