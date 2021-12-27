const HEOToken = artifacts.require("HEOToken");
const HEODAO = artifacts.require("HEODAO");
const HEOParameters = artifacts.require("HEOParameters");
const HEOStaking = artifacts.require("HEOStaking");
const HEOGrant = artifacts.require("HEOGrant");
const ONE_COIN = web3.utils.toWei("1");

var BN = web3.utils.BN;
const timeMachine = require('ganache-time-traveler');
const KEY_INVESTMENT_VESTING_SECONDS = 14;
const KEY_PLATFORM_TOKEN_ADDRESS = 5;
const KEY_PRICE_ORACLE = 4;
const KEY_TREASURER = 6;

var platformTokenAddress;
var founder1, founder2, founder3, employee1, employee2, treasurer;
var iToken, iGrant, iHEOParams, iDAO, iStaking;

contract("HEOGrant", (accounts) => {
    before(async () => {
        founder1 = accounts[0];
        founder2 = accounts[1];
        founder3 = accounts[2];
        employee1 = accounts[4];
        employee2 = accounts[5];
        treasurer = accounts[6];
    });
    beforeEach(async () => {
        iHEOParams = await HEOParameters.new();
        iDAO = await HEODAO.new();
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
        for (let i = 0; i < 3; i++) {
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

        //deploy a grant contract
        iGrant = await HEOGrant.new(iDAO.address);

        //transfer a budget of 2.5M HEO to the grant contract
        await iDAO.proposeVote(2, 3, 0, [iGrant.address, platformTokenAddress],
            [web3.utils.toWei("2500000")], 259201, 51, {from: founder1});
        events = await iDAO.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        //cast votes for budget
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder1});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder2});
        await iDAO.vote(proposalId, 1, ONE_COIN, {from: founder3});
        await iDAO.executeProposal(proposalId, {from: founder2});
    });

    it("Should allow treasurer to create grants", async() => {
        //check that founder1 has no grants
        let grantsBefore = await iGrant.grantsByGrantee.call(founder1);
        assert.equal(grantsBefore.length, 0, `Expecting 0 grants for founder1, but got ${grantsBefore.length}`);

        //Grant 500K HEO to founder1 with 3 year vesting a no commencement date (defaults to tge)
        await iGrant.createGrant(founder1, web3.utils.toWei("500000"), 0, new BN("94608000"),
            platformTokenAddress, {from: treasurer});
        //check that grant was created
        let grantsAfter = await iGrant.grantsByGrantee.call(founder1);
        assert.equal(grantsAfter.length, 1, `Expecting 1 grant for founder1, but got ${grantsAfter.length}`);
        let f1Grant1 = grantsAfter[0];
        //check grant properties
        let grantAmount = await iGrant.grantAmount.call(f1Grant1);
        assert.isTrue(new BN(web3.utils.toWei("500000")).eq(new BN(grantAmount)),
            `Expecting grant amount 500K, but found ${grantAmount}`);
        let grantVestingSeconds = await iGrant.grantVestingSeconds.call(f1Grant1);
        assert.isTrue(new BN("94608000").eq(new BN(grantVestingSeconds)),
            `Expecting 94608000 vesting seconds, but found ${grantVestingSeconds}`);
        let grantToken = await iGrant.grantToken.call(f1Grant1);
        assert.equal(grantToken, platformTokenAddress,
            `Expecting grant token address to be ${platformTokenAddress}, but found ${grantToken}`);
        let claimedFromGrant = (await iGrant.claimedFromGrant.call(f1Grant1)).toNumber();
        assert.equal(claimedFromGrant, 0, `Expecting 0 tokens claimed, but found ${claimedFromGrant}`);

        //check that founder2 has no grants
        grantsBefore = await iGrant.grantsByGrantee.call(founder2);
        assert.equal(grantsBefore.length, 0, `Expecting 0 grants for founder2, but got ${grantsBefore.length}`);
        //Grant 13400 HEO to founder2 with 2 year vesting and a commencement date
        var blockNumber = await web3.eth.getBlockNumber();
        var chainTime = (await web3.eth.getBlock(blockNumber)).timestamp;
        await iGrant.createGrant(founder2, web3.utils.toWei("13400"), chainTime, new BN("31536000"),
            platformTokenAddress, {from: treasurer});
        //check that grant was created
        grantsAfter = await iGrant.grantsByGrantee.call(founder1);
        assert.equal(grantsAfter.length, 1, `Expecting 1 grant for founder1 still, but got ${grantsAfter.length}`);
        grantsAfter = await iGrant.grantsByGrantee.call(founder2);
        assert.equal(grantsAfter.length, 1, `Expecting 1 grant for founder2, but got ${grantsAfter.length}`);
        let f2Grant1 = grantsAfter[0];
        assert.notEqual(f1Grant1, founder2, `Expecting founder1 grant to be different from founder2 grant`);
        //check grant properties
        grantAmount = await iGrant.grantAmount.call(f2Grant1);
        assert.isTrue(new BN(web3.utils.toWei("13400")).eq(new BN(grantAmount)),
            `Expecting grant amount 13,400, but found ${grantAmount}`);
        grantVestingSeconds = await iGrant.grantVestingSeconds.call(f2Grant1);
        assert.isTrue(new BN("31536000").eq(new BN(grantVestingSeconds)),
            `Expecting 94608000 vesting seconds, but found ${grantVestingSeconds}`);
        grantToken = await iGrant.grantToken.call(f2Grant1);
        assert.equal(grantToken, platformTokenAddress,
            `Expecting grant token address to be ${platformTokenAddress}, but found ${grantToken}`);
        claimedFromGrant = (await iGrant.claimedFromGrant.call(f2Grant1)).toNumber();
        assert.equal(claimedFromGrant, 0, `Expecting 0 tokens claimed, but found ${claimedFromGrant}`);
    });

    it("Should not allow non-treasurer to create a grant", async() => {
        //check that founder1 has no grants
        let grantsBefore = await iGrant.grantsByGrantee.call(founder1);
        assert.equal(grantsBefore.length, 0, `Expecting 0 grants for founder1, but got ${grantsBefore.length}`);

        //Tru to grant 500K HEO to founder1
        try {
            await iGrant.createGrant(founder1, web3.utils.toWei("500000"), 0, new BN("94608000"),
                platformTokenAddress, {from: founder1});
            assert.fail(`Expecting an exception`);
        } catch (err) {
            assert.equal(err.reason, "HEOGrant: caller is not the treasurer",
                `Unexpected exception: ${err}`)
        }

        let grantsAfter = await iGrant.grantsByGrantee.call(founder1);
        assert.equal(grantsAfter.length, 0, `Still expecting 0 grants for founder1, but got ${grantsAfter.length}`);
    });

    it("Should vest only after TGE when commencement date is 0", async() => {
        //Grant 500K HEO to founder1 with 3 year vesting and no commencement date (defaults to tge)
        await iGrant.createGrant(founder1, web3.utils.toWei("500000"), 0, new BN("94608000"),
            platformTokenAddress, {from: treasurer});
        let grantsAfter = await iGrant.grantsByGrantee.call(founder1);
        let f1Grant1 = grantsAfter[0];
        var blockNumber = await web3.eth.getBlockNumber();
        var chainTime = (await web3.eth.getBlock(blockNumber)).timestamp;
        //advance 3 years
        await timeMachine.advanceTimeAndBlock(94608000);
        //check that founder1 has 0 HEO
        var f1BalBefore = (await iToken.balanceOf(founder1)).toNumber();
        var f1VestedBefore = (await iGrant.vestedAmount.call(f1Grant1, 0)).toNumber();
        assert.equal(f1VestedBefore, 0, `Should have 0 vested before TGE is set`);
        //try claiming
        try {
            await iGrant.claim(founder1, f1Grant1, web3.utils.toWei("500000"));
            assert.fail(`Expecting an exception`);
        } catch (err) {
            assert.equal(err.reason, "HEOGrant: claim exceeds vested equity",
                `Unexpected exception: ${err}`)
        }
        try {
            await iGrant.claim(founder1, f1Grant1, web3.utils.toWei("100000"));
            assert.fail(`Expecting an exception`);
        } catch (err) {
            assert.equal(err.reason, "HEOGrant: claim exceeds vested equity",
                `Unexpected exception: ${err}`)
        }
        try {
            await iGrant.claim(founder1, f1Grant1, 0);
            assert.fail(`Expecting an exception`);
        } catch (err) {
            assert.equal(err.reason, "HEOGrant: no vested equity to claim",
                `Unexpected exception: ${err}`)
        }
        var f1BalAfter = (await iToken.balanceOf(founder1)).toNumber();
        assert.equal(f1BalAfter, f1BalBefore, `founder1 should have ${f1BalBefore} HEO. Found ${f1BalAfter}`);
        await iGrant.setTGE(chainTime, {from: treasurer});
        var f1VestedAfter = web3.utils.fromWei(await iGrant.vestedAmount.call(f1Grant1, 0));
        assert.equal(f1VestedAfter, 500000, `Should have 500K vested after TGE is set`);
        await iGrant.claim(founder1, f1Grant1, web3.utils.toWei("100000"));
        f1BalAfter = web3.utils.fromWei(await iToken.balanceOf(founder1));
        assert.equal(f1BalAfter, 100000, `founder1 should have claimed 100K HEO after TGE was set. Found ${f1BalAfter}`);
        await iGrant.claim(founder1, f1Grant1, web3.utils.toWei("300000"));
        f1BalAfter = web3.utils.fromWei(await iToken.balanceOf(founder1));
        assert.equal(f1BalAfter, 400000, `founder1 should have claimed 400K HEO after TGE was set. Found ${f1BalAfter}`);

        var f1Unclaimed = web3.utils.fromWei(await iGrant.remainsInGrant(f1Grant1));
        assert.equal(f1Unclaimed, 100000, `founder1 should have 100K HEO left to claim. Found ${f1Unclaimed}`);
        await iGrant.claim(founder1, f1Grant1, web3.utils.toWei("100000"));
        f1BalAfter = web3.utils.fromWei(await iToken.balanceOf(founder1));
        assert.equal(f1BalAfter, 500000, `founder1 should have claimed 500K HEO after TGE was set. Found ${f1BalAfter}`);

        await timeMachine.advanceTimeAndBlock(94608000);
        f1Unclaimed = web3.utils.fromWei(await iGrant.remainsInGrant(f1Grant1));
        assert.equal(f1Unclaimed, 0, `founder1 should have 0 HEO left to claim. Found ${f1Unclaimed}`);
        try {
            await iGrant.claim(founder1, f1Grant1, 0);
            assert.fail(`Expecting an exception`);
        } catch (err) {
            assert.equal(err.reason, "HEOGrant: no vested equity to claim",
                `Unexpected exception: ${err}`)
        }
        try {
            await iGrant.claim(founder1, f1Grant1, web3.utils.toWei("1"));
            assert.fail(`Expecting an exception`);
        } catch (err) {
            assert.equal(err.reason, "HEOGrant: claim exceeds vested equity",
                `Unexpected exception: ${err}`)
        }
        f1BalAfter = web3.utils.fromWei(await iToken.balanceOf(founder1));
        assert.equal(f1BalAfter, 500000, `founder1 should have claimed 500K HEO after TGE was set. Found ${f1BalAfter}`);

        //Grant 500K HEO to founder2 with 3 year vesting and a commencement date before TGE

    });

    it("Should start vesting after TGE when commencement date is before TGE", async() => {
        //Grant 15K HEO to founder3 with 3 year vesting and a commencement date of tomorrow
        var blockNumber = await web3.eth.getBlockNumber();
        var chainTime = (await web3.eth.getBlock(blockNumber)).timestamp;
        await iGrant.createGrant(founder3, web3.utils.toWei("15000"), chainTime+86400, new BN("94608000"),
            platformTokenAddress, {from: treasurer});
        let grantsAfter = await iGrant.grantsByGrantee.call(founder3);
        assert.equal(1, grantsAfter.length, `founder3 should have 1 grant. Found ${grantsAfter.length}`);
        let f3Grant1 = grantsAfter[0];

        //advance time 6 months
        await timeMachine.advanceTimeAndBlock(94608000);

        //should have 0 vested
        let f3Vested = (await iGrant.vestedAmount.call(f3Grant1, 0)).toNumber();
        assert.equal(f3Vested, 0, `founder3 should have 0 vested after 6 months and before TGE. Found ${f3Vested}`);

        //set TGE in 6 months
        var blockNumber = await web3.eth.getBlockNumber();
        chainTime = (await web3.eth.getBlock(blockNumber)).timestamp;
        await iGrant.setTGE(chainTime+15780000, {from: treasurer});

        //advance time 3 months
        await timeMachine.advanceTimeAndBlock(7890000);
        f3Vested = (await iGrant.vestedAmount.call(f3Grant1, 0)).toNumber();
        assert.equal(f3Vested, 0, `founder3 should have 0 vested after 9 months and before TGE. Found ${f3Vested}`);

        //advance time just under 3 more months
        await timeMachine.advanceTimeAndBlock(7803600);
        f3Vested = (await iGrant.vestedAmount.call(f3Grant1, 0)).toNumber();
        assert.equal(f3Vested, 0, `founder3 should have 0 vested after 12 months and before TGE. Found ${f3Vested}`);

        //advance time just over 1 year
        await timeMachine.advanceTimeAndBlock(31718800);
        f3Vested = web3.utils.fromWei(await iGrant.vestedAmount.call(f3Grant1, 0));
        assert.isTrue(f3Vested >= 5000, `founder3 should have vested at least 5K 12 months after TGE. Found ${f3Vested}`);
        assert.isTrue(f3Vested < 6000, `founder3 should have vested less than 6K 12 months after TGE. Found ${f3Vested}`);

        //try claiming all
        try {
            await iGrant.claim(founder3, f3Grant1, web3.utils.toWei("15000"), {from: founder3});
            assert.fail(`Expecting an exception`);
        } catch (err) {
            assert.equal(err.reason, "HEOGrant: claim exceeds vested equity",
                `Unexpected exception: ${err}`)
        }
        //try claiming half
        try {
            await iGrant.claim(founder3, f3Grant1, web3.utils.toWei("7500"), {from: founder3});
            assert.fail(`Expecting an exception`);
        } catch (err) {
            assert.equal(err.reason, "HEOGrant: claim exceeds vested equity",
                `Unexpected exception: ${err}`)
        }
        //try claiming whatever is claimable
        await iGrant.claim(founder3, f3Grant1, 0, {from: founder3});
        let f3Balance = web3.utils.fromWei(await iToken.balanceOf(founder3));
        assert.isTrue(f3Balance >= 5000, `founder3 should have claimed more than 5K HEO. Found ${f3Balance}`);
        //advance time 2 years
        await timeMachine.advanceTimeAndBlock(63072000);

        //try claiming all
        try {
            await iGrant.claim(founder3, f3Grant1, web3.utils.toWei("15000"), {from: founder3});
            assert.fail(`Expecting an exception`);
        } catch (err) {
            assert.equal(err.reason, "HEOGrant: claim exceeds vested equity",
                `Unexpected exception: ${err}`)
        }

        //try claiming whatever is claimable
        await iGrant.claim(founder3, f3Grant1, 0, {from: founder3});
        f3Balance = web3.utils.fromWei(await iToken.balanceOf(founder3));
        assert.equal(f3Balance, 15000, `founder3 should have claimed 15K HEO. Found ${f3Balance}`);

        //try claiming more
        try {
            await iGrant.claim(founder3, f3Grant1, web3.utils.toWei("1"), {from: founder3});
            assert.fail(`Expecting an exception`);
        } catch (err) {
            assert.equal(err.reason, "HEOGrant: claim exceeds vested equity",
                `Unexpected exception: ${err}`)
        }
        f3Balance = web3.utils.fromWei(await iToken.balanceOf(founder3));
        assert.equal(f3Balance, 15000, `founder3 should have claimed 15K HEO. Found ${f3Balance}`);
    });

    it("Should start vesting after commencement date when it is after TGE", async() => {
        //set TGE to tomorrow
        let blockNumber = await web3.eth.getBlockNumber();
        let chainTime = (await web3.eth.getBlock(blockNumber)).timestamp;
        await iGrant.setTGE(chainTime+86400, {from: treasurer});

        //grant 6300 HEO to founder2 with commencement date in 3 months and 2 year vesting
        await iGrant.createGrant(founder2, web3.utils.toWei("6300"), chainTime+7890000, new BN("63072000"),
            platformTokenAddress, {from: treasurer});
        let grantsAfter = await iGrant.grantsByGrantee.call(founder2);
        assert.equal(1, grantsAfter.length, `founder2 should have 1 grant. Found ${grantsAfter.length}`);
        let f2Grant1 = grantsAfter[0];
        let vestingStart = (await iGrant.grantVestingStart(f2Grant1)).toNumber();
        assert.equal(chainTime+7890000, vestingStart,
            `Expecting vestingStart to be ${chainTime+7890000}, but found ${vestingStart}`);

        //advance time one month
        await timeMachine.advanceTimeAndBlock(2630000);
        let f2Vested = (await iGrant.vestedAmount.call(f2Grant1, 0)).toNumber();
        assert.equal(f2Vested, 0, `founder2 should have 0 vested before vesting commencement. Found ${f2Vested}`);

        //try claiming some
        try {
            await iGrant.claim(founder2, f2Grant1, web3.utils.toWei("1"), {from: founder2});
            assert.fail(`Expecting an exception`);
        } catch (err) {
            assert.equal(err.reason, "HEOGrant: claim exceeds vested equity",
                `Unexpected exception: ${err}`)
        }

        //advance time just over two more months
        await timeMachine.advanceTimeAndBlock(5280000);
        f2Vested = web3.utils.fromWei(await iGrant.vestedAmount.call(f2Grant1, 0));
        assert.isTrue(f2Vested > 1, `founder2 should have vested some HEO after vesting 3 months. Found ${f2Vested}`);
        //try claiming whatever is claimable
        await iGrant.claim(founder2, f2Grant1, 0, {from: founder2});
        let f2Balance = web3.utils.fromWei(await iToken.balanceOf(founder2));
        assert.isTrue(f2Balance > 0, `founder2 should have claimed some HEO. Found ${f2Balance}`);
        assert.isTrue(f2Balance < 630, `founder2 should have claimed less than 10%. Found ${f2Balance}`);
    });

    it("Should stop vesting after termination date", async() => {
        //set TGE to now
        let blockNumber = await web3.eth.getBlockNumber();
        let chainTime = (await web3.eth.getBlock(blockNumber)).timestamp;
        await iGrant.setTGE(chainTime, {from: treasurer});

        //grant 6000 HEO to founder2 with commencement date of now and 2 year vesting
        await iGrant.createGrant(founder2, web3.utils.toWei("6300"), chainTime, new BN("63072000"),
            platformTokenAddress, {from: treasurer});
        let grantsAfter = await iGrant.grantsByGrantee.call(founder2);
        assert.equal(1, grantsAfter.length, `founder2 should have 1 grant. Found ${grantsAfter.length}`);
        let f2Grant1 = grantsAfter[0];
        let vestingStart = (await iGrant.grantVestingStart(f2Grant1)).toNumber();
        assert.equal(chainTime, vestingStart,
            `Expecting vestingStart to be ${chainTime}, but found ${vestingStart}`);
        // advance time by one year
        await timeMachine.advanceTimeAndBlock(31536000);

        //check that founder2 vested rouhgly half
        let f2VestedBefore = web3.utils.fromWei(await iGrant.vestedAmount.call(f2Grant1, 0));
        assert.isTrue(f2VestedBefore >= 3000 && f2VestedBefore <= 3200,
            `Expecting to vest half the grant after 1 year. Found ${f2VestedBefore}`);

        //terminate vesting immediately
        blockNumber = await web3.eth.getBlockNumber();
        await iGrant.terminateGrant(f2Grant1, chainTime+31536000, {from: treasurer});

        // advance time by one more year
        await timeMachine.advanceTimeAndBlock(31536000);
        //check that founder2 did not vest any more
        let f2VestedAfter = web3.utils.fromWei(await iGrant.vestedAmount.call(f2Grant1, 0));
        assert.equal(f2VestedAfter, f2VestedBefore,
            `Expecting to vest half the grant after 1 year. Found ${f2VestedBefore} != ${f2VestedAfter}`);

        //try claiming the entire grant
        try {
            await iGrant.claim(founder2, f2Grant1, web3.utils.toWei("6000"), {from: founder2});
            assert.fail(`Expecting an exception`);
        } catch (err) {
            assert.equal(err.reason, "HEOGrant: claim exceeds vested equity",
                `Unexpected exception: ${err}`)
        }

        //claim what has vested
        await iGrant.claim(founder2, f2Grant1, 0, {from: founder2});
        let f2Balance = web3.utils.fromWei(await iToken.balanceOf(founder2));
        assert.equal(f2Balance, f2VestedAfter, `founder2 should have claimed ${f2VestedAfter}. Found ${f2Balance}`);
    });
});