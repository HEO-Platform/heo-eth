
const ganache = require('ganache');
const Web3 = require('web3');
const [web3, provider] = require('tronbox-web3')(new Web3(Web3.givenProvider), ganache.provider());
const HEODAO = artifacts.require("HEODAO");
const HEOParameters = artifacts.require("HEOParameters");
const HEOStaking = artifacts.require("HEOStaking");
const HEOToken = artifacts.require("HEOToken");
const HEOBudget = artifacts.require("HEOBudget");
const StableCoinForTests = artifacts.require("StableCoinForTests");
const timeMachine = require('ganache-time-traveler');

var founder1, founder2, founder3, user1, user2, treasurer;
const BN = web3.utils.BN;

// Indexes of reserved integer parameters
const KEY_ENABLE_PARAM_VOTER_WHITELIST = 0;
const KEY_CONTRACT_PARAM_VOTER_WHITELIST = 1;
const KEY_BUDGET_PARAM_VOTER_WHITELIST = 2;
const KEY_MIN_VOTE_DURATION = 3; //259200
const KEY_MAX_VOTE_DURATION = 4; //7889231
const KEY_MIN_PASSING_VOTE = 5; //51
const KEY_DONATION_YIELD = 6; //10
const KEY_DONATION_YIELD_DECIMALS = 7; //10
const KEY_FUNDRAISING_FEE = 8; //default value is 250, which corresponds to 2.5% (0.025)
const KEY_FUNDRAISING_FEE_DECIMALS = 9;
const KEY_DONATION_VESTING_SECONDS = 10;
// Indexes of reserved addr parameters
const KEY_PARAM_WHITE_LIST = 0;
const KEY_PLATFORM_TOKEN_ADDRESS = 5;
const KEY_VOTING_TOKEN_ADDRESS = 3;
const KEY_TREASURER = 6;

const MIN_VOTE_DURATION = 259200;
const MAX_VOTE_DURATION = 7889231;
const MIN_PASSING_VOTE = 51;
const DONATION_YIELD = 1000000;
const DONATION_YIELD_DECIMALS = "10000000000000000000";
const FUNDRAISING_FEE = 250;
const FUNDRAISING_FEE_DECIMALS = 10000;
const DONATION_VESTING_SECONDS = 31536000;

const ONE_HEO = new BN(web3.utils.toWei("1"));
const INITIAL_INT_PARAMS = [
    {key:KEY_ENABLE_PARAM_VOTER_WHITELIST, val:1, name:"ENABLE_PARAM_VOTER_WHITELIST"},
    {key:KEY_CONTRACT_PARAM_VOTER_WHITELIST, val:1, name:"ENABLE_CONTRACT_VOTER_WHITELIST"},
    {key:KEY_BUDGET_PARAM_VOTER_WHITELIST, val:1, name:"ENABLE_TREASURY_VOTER_WHITELIST"},
    {key:KEY_MIN_VOTE_DURATION, val:MIN_VOTE_DURATION, name:"MIN_VOTE_DURATION"},
    {key:KEY_MAX_VOTE_DURATION, val:MAX_VOTE_DURATION, name:"MAX_VOTE_DURATION"},
    {key:KEY_MIN_PASSING_VOTE, val:MIN_PASSING_VOTE, name:"MIN_PASSING_VOTE"},
    {key:KEY_DONATION_YIELD, val:DONATION_YIELD, name:"DONATION_YIELD"},
    {key:KEY_DONATION_YIELD_DECIMALS, val:DONATION_YIELD_DECIMALS, name:"DONATION_YIELD_DECIMALS"},
    {key:KEY_FUNDRAISING_FEE, val:FUNDRAISING_FEE, name:"FUNDRAISING_FEE"},
    {key:KEY_FUNDRAISING_FEE_DECIMALS, val:FUNDRAISING_FEE_DECIMALS, name:"FUNDRAISING_FEE_DECIMALS"},
    {key:KEY_DONATION_VESTING_SECONDS, val:DONATION_VESTING_SECONDS, name:"DONATION_VESTING_SECONDS"}
];
var paramsInstance, daoInstance, stakingInstance;
contract("HEODAO", (accounts) => {
    beforeEach(async () => {
        founder1 = accounts[0];
        founder2 = accounts[1];
        founder3 = accounts[2];
        user1 = accounts[3];
        user2 = accounts[4];
        treasurer = accounts[5];
        paramsInstance = await HEOParameters.new();
        stakingInstance = await HEOStaking.new();
        daoInstance = await HEODAO.new();
        await paramsInstance.transferOwnership(daoInstance.address);
        await stakingInstance.transferOwnership(daoInstance.address);
        await daoInstance.setParams(paramsInstance.address);
        await daoInstance.setStaking(stakingInstance.address);
        await daoInstance.initVoters([founder1, founder2, founder3]);
    });
    it("DAO deployment", async () => {
        //check each parameter
        var whiteListEnabled = (await paramsInstance.paramVoterWhiteListEnabled.call()).toNumber();
        assert.equal(whiteListEnabled, 1, `Voter white list should be enabled, but found value ${whiteListEnabled}`);
        whiteListEnabled = (await paramsInstance.contractVoterWhiteListEnabled.call()).toNumber();
        assert.equal(whiteListEnabled, 1, `Contract white list should be enabled, but found value ${whiteListEnabled}`);
        whiteListEnabled = (await paramsInstance.budgetVoterWhiteListEnabled.call()).toNumber();
        assert.equal(whiteListEnabled, 1, `Contract white list should be enabled, but found value ${whiteListEnabled}`);
        for(var i = 0; i < 3; i++) {
            var isInWL = (await paramsInstance.addrParameterValue.call(i, founder1)).toNumber();
            assert.equal(isInWL, 1, `founder1 should be in white list ${i}, but found value ${isInWL}`);
            var isInWL = (await paramsInstance.addrParameterValue.call(i, founder2)).toNumber();
            assert.equal(isInWL, 1, `founder2 should be in white list ${i}, but found value ${isInWL}`);
            var isInWL = (await paramsInstance.addrParameterValue.call(i, founder3)).toNumber();
            assert.equal(isInWL, 1, `founder3 should be in white list ${i}, but found value ${isInWL}`);
            var isInWL = (await paramsInstance.addrParameterValue.call(i, "0x0000000000000000000000000000000000000000")).toNumber();
            assert.equal(isInWL, 0, `Zero address should not be in white list ${i}, but found value ${isInWL}`);
        }
        for(var i=0; i < INITIAL_INT_PARAMS.length; i++) {
            let value = (await paramsInstance.intParameterValue.call(INITIAL_INT_PARAMS[i].key));
            let expected = INITIAL_INT_PARAMS[i].val;
            assert.isTrue(value.eq(new BN(expected)), `${INITIAL_INT_PARAMS[i].name} should be ${expected}, but found ${value}`);
        }
    });
    it("Platform token deployment", async () => {
        await daoInstance.deployPlatformToken(new BN("100000000000000000000000000"),
            "Help Each Other platform token", "HEO", {from: founder1});
        try {
            await daoInstance.deployPlatformToken(new BN("100000000000000000000000000"),
                "Help Each Other platform token", "HEO", {from: founder1});
            assert.fail("Should throw an error trying to deploy platform token second time");
        } catch(err) {
            assert.equal(err.reason, "Platform token is already deployed", `Wrong error message ${err.reason}`);
        }
        let platformTokenAddress = await paramsInstance.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        assert.isNotNull(platformTokenAddress, "Platform token address should not be null");
        assert.notEqual(platformTokenAddress, "0x0000000000000000000000000000000000000000",
            "Platform token address should not be a zero-address");
        let addrParamValue = (await paramsInstance.addrParameterValue.call(KEY_VOTING_TOKEN_ADDRESS, platformTokenAddress)).toNumber();
        assert.equal(addrParamValue, 1, `Wrong value for voting token address. Got ${addrParamValue}`);
        let tokenInstance = await HEOToken.at(platformTokenAddress);
        let tokenSymbol = await tokenInstance.symbol.call();
        assert.equal(tokenSymbol, "HEO", `Expecting token symbol to be HEO, but found ${tokenSymbol}`);
        let tokenBalance = await tokenInstance.balanceOf.call(founder1);
        assert.isTrue(tokenBalance.eq(ONE_HEO),
            `Expecting founder1 to have to be ${ONE_HEO} HEO, but found ${tokenBalance}`);
        tokenBalance = await tokenInstance.balanceOf.call(founder2);
        assert.isTrue(tokenBalance.eq(ONE_HEO),
            `Expecting founder2 to have to be ${ONE_HEO} HEO, but found ${tokenBalance}`);
        tokenBalance = await tokenInstance.balanceOf.call(founder3);
        assert.isTrue(tokenBalance.eq(ONE_HEO),
            `Expecting founder3 to have to be ${ONE_HEO} HEO, but found ${tokenBalance}`);
        tokenBalance = await tokenInstance.balanceOf.call(daoInstance.address);
        assert.isTrue(tokenBalance.eq(new BN(web3.utils.toWei("99999997"))),
            `Expecting daoInstance to have to be 99999997 HEO, but found ${tokenBalance}`);
    });
    it("Voting registration", async() => {
        try {
            await daoInstance.registerToVote(1, "0x0000000000000000000000000000000000000000", {from: founder1});
            assert.fail("Should throw an error trying to register to vote with non-allowed token");
        } catch (err) {
            assert.equal(err.reason, "token not allowed for staking", `Wrong error message ${err.reason}`);
        }
        await daoInstance.deployPlatformToken(new BN("100000000000000000000000000"),
            "Help Each Other platform token", "HEO", {from: founder1});
        let platformTokenAddress = await paramsInstance.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        try {
            await daoInstance.registerToVote(1, "0x0000000000000000000000000000000000000000", {from: founder2});
            assert.fail("Should throw an error trying to register to vote with non-allowed token");
        } catch (err) {
            assert.equal(err.reason, "token not allowed for staking", `Wrong error message ${err.reason}`);
        }
        try {
            await daoInstance.registerToVote(web3.utils.toWei("2"), platformTokenAddress, {from: founder2});
            assert.fail("Should throw an error trying to register to vote with more tokens than available");
        } catch (err) {
            assert.equal(err.reason, "ERC20: transfer amount exceeds balance", `Wrong error message ${err.reason}`);
        }
        try {
            await daoInstance.registerToVote(web3.utils.toWei("1"), platformTokenAddress, {from: founder3});
            assert.fail("Should throw an error trying to register to vote without setting an allowance");
        } catch (err) {
            assert.equal(err.reason, "ERC20: transfer amount exceeds allowance", `Wrong error message ${err.reason}`);
        }
        for(let i=0; i < 4; i++) {
            let canVote = (await stakingInstance.canVoteForParams.call(accounts[i])).toNumber();
            assert.equal(canVote, 0, `${accounts[i]} should not be able to vote for parameters. Result: ${canVote}`);
            canVote = (await stakingInstance.canVoteForContracts.call(accounts[i])).toNumber();
            assert.equal(canVote, 0, `${accounts[i]} should not be able to vote for contracts. Result: ${canVote}`);
            canVote = (await stakingInstance.canVoteForBudget.call(accounts[i])).toNumber();
            assert.equal(canVote, 0, `${accounts[i]} should not be able to vote for budget. Result: ${canVote}`);
        }

        let tokenInstance = await HEOToken.at(platformTokenAddress);
        for(let i=0; i < 3; i++) {
            try {
                await tokenInstance.approve(stakingInstance.address, web3.utils.toWei("1"), {from: accounts[i]})
                await daoInstance.registerToVote(web3.utils.toWei("1"), platformTokenAddress, {from: accounts[i]});
            } catch (err) {
                assert.fail(`${accounts[i]} should be able to register to vote. Error: ${err}`);
            }
            let tokenBalance = await tokenInstance.balanceOf.call( accounts[i]);
            assert.isTrue(tokenBalance.eq(new BN("0")),
                `Expecting account ${i} to have to be 0 HEO after registering to vote, but found ${tokenBalance}`);
        }

        let totalAmountStaked = await stakingInstance.totalAmountStaked();
        assert.isTrue(totalAmountStaked.eq(new BN(web3.utils.toWei("3"))),
            `Expecting to have 3 HEO staked, but found ${totalAmountStaked}`);

        let numVoters = await stakingInstance.numVoters();
        assert.equal(numVoters.toNumber(), 3, `Expecting to have 3 registered voters, but found ${numVoters}`);

        for(let i=0; i < 3; i++) {
            let canVote = (await stakingInstance.canVoteForParams.call(accounts[i]));
            assert.isTrue(canVote.eq(ONE_HEO), `${accounts[i]} should be able to vote for parameters. Result: ${canVote}`);
            canVote = (await stakingInstance.canVoteForContracts.call(accounts[i]));
            assert.isTrue(canVote.eq(ONE_HEO), `${accounts[i]} should be able to vote for contracts. Result: ${canVote}`);
            canVote = (await stakingInstance.canVoteForBudget.call(accounts[i]));
            assert.isTrue(canVote.eq(ONE_HEO), `${accounts[i]} should be able to vote for budget. Result: ${canVote}`);
        }
        let canVote = (await stakingInstance.canVoteForParams.call(accounts[3])).toNumber();
        assert.equal(canVote, 0, `${accounts[3]} should still not be able to vote for parameters. Result: ${canVote}`);
        canVote = (await stakingInstance.canVoteForContracts.call(accounts[3])).toNumber();
        assert.equal(canVote, 0, `${accounts[3]} should still not be able to vote for contracts. Result: ${canVote}`);
        canVote = (await stakingInstance.canVoteForBudget.call(accounts[3])).toNumber();
        assert.equal(canVote, 0, `${accounts[3]} should still not be able to vote for budget. Result: ${canVote}`);

        // test up-staking and de-registering
        try {
            await daoInstance.registerToVote(web3.utils.toWei("0.5"), platformTokenAddress, {from: founder1});
            assert.fail("Should throw an error trying to up-stake with insufficient balance");
        } catch (err) {
            assert.equal(err.reason, "ERC20: transfer amount exceeds balance", `Wrong error message ${err.reason}`);
        }

        try {
            await daoInstance.deregisterVoter(web3.utils.toWei("1.5"), platformTokenAddress, {from: founder1});
            assert.fail("Should throw an error trying to withdraw more than staked");
        } catch (err) {
            assert.equal(err.reason, "SafeMath: subtraction overflow", `Wrong error message ${err.reason}`);
        }

        try {
            await daoInstance.deregisterVoter(web3.utils.toWei("1"), "0x1234500000000000000000000000000000000abc", {from: founder1});
            assert.fail("Should throw an error trying to withdraw more than staked");
        } catch (err) {
            assert.equal(err.reason, "token not allowed for staking", `Wrong error message ${err.reason}`);
        }

        try {
            await daoInstance.deregisterVoter(web3.utils.toWei("0.5"), platformTokenAddress, {from: founder1});
        } catch (err) {
            assert.fail(`Should be able to unstake 0.5HEO. Error: ${err}`);
        }
        numVoters = await stakingInstance.numVoters();
        assert.equal(numVoters.toNumber(), 3,
            `Expecting to still have 3 registered voters after founder1 withdraws 0.5 HEO, but found ${numVoters}`);
        totalAmountStaked = await stakingInstance.totalAmountStaked();
        assert.isTrue(totalAmountStaked.eq(new BN(web3.utils.toWei("2.5"))),
            `Expecting to have 2.5 HEO staked after unstaking, but found ${totalAmountStaked}`);
        let tokenBalance = await tokenInstance.balanceOf.call(founder1);
        assert.isTrue(tokenBalance.eq(new BN(web3.utils.toWei("0.5"))),
            `Expecting founder1 to have to 0.5 HEO after unstaking 0.5 HEO , but found ${tokenBalance}`);

        try {
            await daoInstance.deregisterVoter(web3.utils.toWei("0.5"), platformTokenAddress, {from: founder1});
        } catch (err) {
            assert.fail(`Should be able to unstake 0.5HEO the second time. Error: ${err}`);
        }
        tokenBalance = await tokenInstance.balanceOf.call(founder1);
        assert.isTrue(tokenBalance.eq(ONE_HEO),
            `Expecting founder1 to have to 1 HEO after unstaking 0.5 HEO again, but found ${tokenBalance}`);
        numVoters = await stakingInstance.numVoters();
        assert.equal(numVoters.toNumber(), 2,
            `Expecting to have 2 registered voters after founder1 de-registers, but found ${numVoters}`);
        totalAmountStaked = await stakingInstance.totalAmountStaked();
        assert.isTrue(totalAmountStaked.eq(new BN(web3.utils.toWei("2"))),
            `Expecting to have 2 HEO staked after founder1 de-registers, but found ${totalAmountStaked}`);
        canVote = (await stakingInstance.canVoteForParams.call(founder1));
        assert.isTrue(canVote.eq(new BN("0")),
            `{founder1} should not be able to vote for parameters after de-registering. Result: ${canVote}`);
        canVote = (await stakingInstance.canVoteForContracts.call(founder1));
        assert.isTrue(canVote.eq(new BN("0")),
            `{founder1} should not be able to vote for contracts after de-registering. Result: ${canVote}`);
        canVote = (await stakingInstance.canVoteForBudget.call(founder1));
        assert.isTrue(canVote.eq(new BN("0")),
            `{founder1} should not be able to vote for budget after de-registering. Result: ${canVote}`);

        try {
            await tokenInstance.approve(stakingInstance.address, web3.utils.toWei("0.5"), {from: founder1})
            await daoInstance.registerToVote(web3.utils.toWei("0.5"), platformTokenAddress, {from: founder1});
        } catch (err) {
            assert.fail(`founder1 should be able to increase their stake by 0.5HEO. Error: ${err}`);
        }

        // propose to disable param voter whitelist
        await daoInstance.proposeVote(0, 0, KEY_ENABLE_PARAM_VOTER_WHITELIST, [], [0], 259201, 51, {from: founder1});
        let events = await daoInstance.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;
        let prop  = await daoInstance.getProposal.call(proposalId);
        prop.propTime = await daoInstance.proposalTime.call(proposalId);
        prop.propDuration = await daoInstance.proposalDuration.call(proposalId);
        prop.propType = await daoInstance.proposalType.call(proposalId);
        prop.proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(prop.proposalStatus.toNumber(), 0, `Expecting proposal status to be 0, but got ${prop.proposalStatus}`);
        assert.equal(prop.propDuration.toNumber(), 259201,
            `Expecting proposal duration to be 259201, but got ${prop.propDuration}. proposalId: ${proposalId}`);
        assert.isTrue(prop.propTime.toNumber() > 0,
            `Expecting proposal time to be greater than zero, but got ${prop.propTime.toString()}`);
        assert.equal(prop.proposer, founder1, `Expecting founder1 to be the proposer, but found address ${prop.proposer}`);
        assert.equal(prop.opType.toNumber(), 0, `Expecting opType to be the 1, but found ${prop.opType}`);
        assert.equal(prop.propType.toNumber(), 0, `Expecting propType to be the 0, but found ${prop.propType}`);
        assert.equal(prop.key.toNumber(), KEY_ENABLE_PARAM_VOTER_WHITELIST,
            `Expecting key to be the ${KEY_ENABLE_PARAM_VOTER_WHITELIST}, but found ${prop.key}`);
        assert.equal(prop.values[0].toNumber(), 0, `Expecting values to be the 0, but found ${prop.values}`);
        assert.equal(prop.percentToPass.toNumber(), 51, `Expecting percentToPass to be the 51, but found ${prop.percentToPass}`);
        assert.equal(prop.totalVoters.toNumber(), 0, `Expecting totalVotes to be the 0, but found ${prop.totalVoters}`);
        assert.equal(prop.totalWeight.toNumber(), 0, `Expecting totalWeight to be the 0, but found ${prop.totalWeight}`);

        //cast votes
        try {
            await daoInstance.vote(proposalId, 2, web3.utils.toWei("0.5"), {from: founder1});
            assert.fail(`Should fail to vote for option 2, because there is only one option in the vote.`);
        } catch (err) {
            assert.equal(err.reason, "vote out of range", `Wrong error message ${err.reason}`);
        }

        try {
            await daoInstance.vote(proposalId, 1, web3.utils.toWei("2"), {from: founder2});
            assert.fail(`Should fail to vote with 2 HEO, after staking only one HEO.`);
        } catch (err) {
            assert.equal(err.reason, "_weight exceeds staked amount", `Wrong error message ${err.reason}`);
        }

        try {
            await daoInstance.vote(proposalId, 0, web3.utils.toWei("1"), {from: user1});
            assert.fail(`Should fail to vote if account is not a voter.`);
        } catch (err) {
            assert.equal(err.reason, "Caller is not a voter", `Wrong error message ${err.reason}`);
        }

        // vote 2 to reject, 1 to accept
        await daoInstance.vote(proposalId, 0, web3.utils.toWei("0.5"), {from: founder1});
        await daoInstance.vote(proposalId, 0, ONE_HEO, {from: founder2});

        try {
            await daoInstance.executeProposal(proposalId, {from: founder1});
            assert.fail(`Should fail to execute before proposal is executable.`);
        } catch (err) {
            assert.equal(err.reason, "proposal has more time", `Wrong error message ${err.reason}`);
        }

        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});
        prop = await daoInstance.getProposal.call(proposalId);
            assert.equal(prop.totalVoters.toNumber(), 3, `Expecting totalVotes to be the 3, but found ${prop.totalVoters}`);
            assert.isTrue(prop.totalWeight.eq(new BN(web3.utils.toWei("2.5"))),
                `Expecting totalWeight to be the 2.5 HEO, but found ${prop.totalWeight}`);

        try {
            await daoInstance.executeProposal(proposalId, {from: user1});
            assert.fail(`Should fail to execute if account is not a voter.`);
        } catch (err) {
            assert.equal(err.reason, "Caller is not a voter", `Wrong error message ${err.reason}`);
        }
        prop.proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(prop.proposalStatus.toNumber(), 0,
            `Expecting proposal status to still be 0 (Open), but got ${prop.proposalStatus}`);

        // re-vote
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});
        // re-vote should not change the number of votes, status, or weight
        prop.proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(prop.proposalStatus.toNumber(), 0,
            `Expecting proposal status to still be 0 (Open), but got ${prop.proposalStatus}`);
        prop = await daoInstance.getProposal.call(proposalId);
        assert.equal(prop.totalVoters.toNumber(), 3, `Expecting totalVoters to remain 3, but found ${prop.totalVoters}`);
        assert.isTrue(prop.totalWeight.eq(new BN(web3.utils.toWei("2.5"))),
            `Expecting totalWeight to remain 2.5 HEO, but found ${prop.totalWeight}`);

        // re-vote with different weight
        await daoInstance.vote(proposalId, 1, web3.utils.toWei("0.7"), {from: founder2});
        // re-vote should not change the number of votes or status, but weight should change
        prop.proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(prop.proposalStatus.toNumber(), 0,
            `Expecting proposal status to still be 0 (Open), but got ${prop.proposalStatus}`);
        prop = await daoInstance.getProposal.call(proposalId);
        assert.equal(prop.totalVoters.toNumber(), 3, `Expecting totalVoters to remain 3, but found ${prop.totalVoters}`);
        assert.isTrue(prop.totalWeight.eq(new BN(web3.utils.toWei("2.2"))),
            `Expecting totalWeight to change to 2.2 HEO, but found ${prop.totalWeight}`);

        let founder2Staked = await daoInstance.stakedForProposal(proposalId, founder2);
        assert.isTrue(founder2Staked.eq(new BN(web3.utils.toWei("0.7"))),
            `Expecting founder2 to have 0.7 HEO staked for the proposal, but found ${founder2Staked}`);

        //try to deregister while the vote is in progress
        try {
            await daoInstance.deregisterVoter(web3.utils.toWei("0.3"), platformTokenAddress, {from: founder2});
        } catch (err) {
            assert.fail(`Should be able to withdraw 0.3 HEO out of 1 HEO after voting with 0.7 HEO. Error ${err}`);
        }
        try {
            await daoInstance.deregisterVoter(web3.utils.toWei("0.1"), platformTokenAddress, {from: founder2});
            assert.fail("Should throw an error trying to withdraw during active vote");
        } catch (err) {
            assert.equal(err.reason, "cannot reduce stake below amount locked in an active vote",
                `Wrong error message ${err}`);
        }

        tokenBalance = await tokenInstance.balanceOf.call(founder2);
        assert.isTrue(tokenBalance.eq(new BN(web3.utils.toWei("0.3"))),
            `Expecting founder2 to have to 0.3 HEO, but found ${tokenBalance}`);
        await daoInstance.executeProposal(proposalId, {from: founder2});
        prop.proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(prop.proposalStatus.toNumber(), 2,
            `Expecting proposal status to still be 1 (rejected), but got ${prop.proposalStatus}`);

        try {
            await daoInstance.vote(proposalId, 0, ONE_HEO, {from: founder2});
            assert.fail(`Should fail to vote after proposal was rejected.`);
        } catch (err) {
            assert.equal(err.reason, "proposal is not open", `Wrong error message ${err}`);
        }

        //try to deregister while the vote is in progress
        try {
            await daoInstance.deregisterVoter(web3.utils.toWei("0.7"), platformTokenAddress, {from: founder2});
        } catch (err) {
            assert.fail(`Should be able to withdraw 0.7 HEO. Error ${err}`);
        }
        tokenBalance = await tokenInstance.balanceOf.call(founder2);
        assert.isTrue(tokenBalance.eq(ONE_HEO), `Expecting founder2 to have to 1 HEO, but found ${tokenBalance}`);
        // none of the parameter values should have changed
        for(var i=0; i < INITIAL_INT_PARAMS.length; i++) {
            let value = (await paramsInstance.intParameterValue.call(INITIAL_INT_PARAMS[i].key));
            let expected = INITIAL_INT_PARAMS[i].val;
            assert.isTrue(value.eq(new BN(expected)), `${INITIAL_INT_PARAMS[i].name} should be ${expected}, but found ${value}`);
        }
    });

    it("Voting for integer parameters", async() => {
        await daoInstance.deployPlatformToken(new BN("100000000000000000000000000"),
            "Help Each Other platform token", "HEO", {from: founder1});
        let platformTokenAddress = await paramsInstance.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        let tokenInstance = await HEOToken.at(platformTokenAddress);
        for(let i=0; i < 3; i++) {
            try {
                await tokenInstance.approve(stakingInstance.address, web3.utils.toWei("1"), {from: accounts[i]})
                await daoInstance.registerToVote(web3.utils.toWei("1"), platformTokenAddress, {from: accounts[i]});
            } catch (err) {
                assert.fail(`${accounts[i]} should be able to register to vote. Error: ${err}`);
            }
        }
        // disable parameter voter white list by voting
        await daoInstance.proposeVote(0, 0, KEY_ENABLE_PARAM_VOTER_WHITELIST, [], [0], 259201, 51, {from: founder1});
        let events = await daoInstance.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;
        let activeProposals = await daoInstance.activeProposals.call();
        assert.equal(activeProposals[0], proposalId, "Unexpected ID in activeProposals");

        // vote 1.5 to accept, 1 to reject
        await daoInstance.vote(proposalId, 0, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, web3.utils.toWei("0.5"), {from: founder3});
        await daoInstance.executeProposal(proposalId, {from: founder2});
        let proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);
        activeProposals = await daoInstance.activeProposals.call();
        assert.equal(activeProposals.length, 0,
            `Expecting an array of 0. Found ${activeProposals.length}`);
        let value = (await paramsInstance.intParameterValue.call(KEY_ENABLE_PARAM_VOTER_WHITELIST)).toNumber();
        assert.equal(value, 0, `ENABLE_PARAM_VOTER_WHITELIST should be 0, but found ${value}`);

        // attempt to change donation yield by voting
        await daoInstance.proposeVote(0, 0, KEY_DONATION_YIELD, [], [10,11,12], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;
        activeProposals = await daoInstance.activeProposals.call();
        assert.equal(activeProposals[0], proposalId, "Unexpected ID in activeProposals");
        // vote for different values each
        await daoInstance.vote(proposalId, 0, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 2, ONE_HEO, {from: founder3});
        await daoInstance.executeProposal(proposalId, {from: founder2});
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 2,
            `Expecting proposal status to be 2 (rejected), but got ${proposalStatus}`);
        activeProposals = await daoInstance.activeProposals.call();
        assert.equal(activeProposals.length, 0,
            `Expecting an array of 0. Found ${activeProposals.length}`);
        let minWeight = await daoInstance.minWeightToPass(proposalId);
        assert.isTrue(new BN("1530000000000000000").eq(minWeight),
            `Expecting minimum passing weight to be 1.53HEO, but found ${minWeight}`);
        let rejectVoteWeight = await daoInstance.voteWeight(proposalId, 0);
        assert.isTrue(ONE_HEO.eq(rejectVoteWeight),
            `Expecting reject vote weight to be 1HEO, but found ${rejectVoteWeight}`);

        let optionOneWeight = await daoInstance.voteWeight(proposalId, 1);
        assert.isTrue(ONE_HEO.eq(optionOneWeight),
            `Expecting option 1 vote weight to be 1HEO, but found ${optionOneWeight}`);

        let optionTwoWeight = await daoInstance.voteWeight(proposalId, 2);
        assert.isTrue(ONE_HEO.eq(optionTwoWeight),
            `Expecting option 2 vote weight to be 1HEO, but found ${optionTwoWeight}`);

        value = (await paramsInstance.intParameterValue.call(KEY_DONATION_YIELD)).toNumber();
        assert.equal(value, 1000000, `DONATION_YIELD should remain 1000000, but found ${value}`);

        // change donation yield by voting
        await timeMachine.advanceTimeAndBlock(600);
        await daoInstance.proposeVote(0, 0, KEY_DONATION_YIELD, [], [10,11,12], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;
        activeProposals = await daoInstance.activeProposals.call();
        assert.equal(activeProposals[0], proposalId, "Unexpected ID in activeProposals");
        // vote for different values each
        await daoInstance.vote(proposalId, 2, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 2, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 2, ONE_HEO, {from: founder3});
        await daoInstance.executeProposal(proposalId, {from: founder2});
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);
        value = (await paramsInstance.intParameterValue.call(KEY_DONATION_YIELD)).toNumber();
        assert.equal(value, 11, `DONATION_YIELD should change to 11, but found ${value}`);
    });

    it("Voting for addr parameters", async() => {
        let altCoin = await StableCoinForTests.new("ALT_HEO", {from: user1});
        await altCoin.transfer(founder1, web3.utils.toWei("10"), {from: user1});
        await altCoin.transfer(founder2, web3.utils.toWei("10"), {from: user1});
        await altCoin.transfer(user2, web3.utils.toWei("10"), {from: user1});

        await daoInstance.deployPlatformToken(new BN("100000000000000000000000000"),
            "Help Each Other platform token", "HEO", {from: founder1});
        let platformTokenAddress = await paramsInstance.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        let tokenInstance = await HEOToken.at(platformTokenAddress);
        for(let i=0; i < 3; i++) {
            try {
                await tokenInstance.approve(stakingInstance.address, web3.utils.toWei("1"), {from: accounts[i]})
                await daoInstance.registerToVote(web3.utils.toWei("1"), platformTokenAddress, {from: accounts[i]});
            } catch (err) {
                assert.fail(`${accounts[i]} should be able to register to vote. Error: ${err}`);
            }
            let tokenBalance = (await tokenInstance.balanceOf.call(accounts[i])).toNumber();
            assert.equal(tokenBalance, 0, `Expecting ${accounts[i]} to have 0 balance after staking`);
        }
        let addrParamValue = (await paramsInstance.addrParameterValue.call(KEY_VOTING_TOKEN_ADDRESS, altCoin.address)).toNumber();
        assert.equal(addrParamValue, 0, `Expecting ALT_HEO to be ineligible for voting. Got ${addrParamValue}`);

        // add ALT_HEO to list of voting tokens by voting
        await daoInstance.proposeVote(1, 0, KEY_VOTING_TOKEN_ADDRESS, [altCoin.address], [1], 259201, 51,
            {from: founder1});
        let events = await daoInstance.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        let activeProposals = await daoInstance.activeProposals.call();
        assert.equal(activeProposals[0], proposalId, "Unexpected ID in activeProposals");
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});
        await daoInstance.executeProposal(proposalId, {from: founder2});
        let proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);
        activeProposals = await daoInstance.activeProposals.call();
        assert.equal(activeProposals.length, 0,
            `Expecting an array of 0. Found ${activeProposals.length}`);

        addrParamValue = (await paramsInstance.addrParameterValue.call(KEY_VOTING_TOKEN_ADDRESS, platformTokenAddress)).toNumber();
        assert.equal(addrParamValue, 1, `Expecting HEO to still be eligible for voting. Got ${addrParamValue}`);
        addrParamValue = (await paramsInstance.addrParameterValue.call(KEY_VOTING_TOKEN_ADDRESS, altCoin.address)).toNumber();
        assert.equal(addrParamValue, 1, `Expecting ALT_HEO to be eligible for voting. Got ${addrParamValue}`);

        // propose remove HEO from the list of voting tokens by voting
        await timeMachine.advanceTimeAndBlock(600);
        await daoInstance.proposeVote(1, 0, KEY_VOTING_TOKEN_ADDRESS,
            [platformTokenAddress, platformTokenAddress], [0, 1], 259201, 51,
            {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        activeProposals = await daoInstance.activeProposals.call();
        assert.equal(activeProposals[0], proposalId, "Unexpected ID in activeProposals");
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});
        try {
            await daoInstance.executeProposal(proposalId, {from: founder2});
            assert.fail(`Should fail to execute the proposal while HEO is locked.`);
        } catch (err) {
            assert.equal(err.reason,
                "cannot reduce stake below amount locked in an active vote", `Wrong error message ${err}`);
        }

        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 0,
            `Expecting proposal status to be 0 (open), but got ${proposalStatus}`);
        activeProposals = await daoInstance.activeProposals.call();
        assert.equal(activeProposals.length, 1,
            `Expecting an array of 1. Found ${activeProposals.length}`);

        addrParamValue = (await paramsInstance.addrParameterValue.call(KEY_VOTING_TOKEN_ADDRESS, platformTokenAddress)).toNumber();
        assert.equal(addrParamValue, 1, `Expecting HEO to still be eligible for voting. Got ${addrParamValue}`);

        //remove votes
        await daoInstance.vote(proposalId, 1, 0, {from: founder1});
        await daoInstance.vote(proposalId, 1, 0, {from: founder2});
        await daoInstance.vote(proposalId, 1, 0, {from: founder3});

        try {
            await daoInstance.deregisterVoter(ONE_HEO, platformTokenAddress, {from: founder1});
            await daoInstance.deregisterVoter(ONE_HEO, platformTokenAddress, {from: founder2});
        } catch (err) {
            assert.fail(`founder1 and founder2 should be able to deregister. Error: ${err}`);
        }
        await altCoin.approve(stakingInstance.address, web3.utils.toWei("1"), {from: founder1})
        await daoInstance.registerToVote(web3.utils.toWei("1"), altCoin.address, {from: founder1});
        await altCoin.approve(stakingInstance.address, web3.utils.toWei("1"), {from: founder2})
        await daoInstance.registerToVote(web3.utils.toWei("1"), altCoin.address, {from: founder2});
        await altCoin.approve(stakingInstance.address, web3.utils.toWei("1"), {from: user1})
        try {
            await daoInstance.registerToVote(web3.utils.toWei("1"), altCoin.address, {from: user1});
        } catch (err) {
            assert.fail(`user1 should be able to register to vote. Error: ${err}`);
        }

        let numVoters = await stakingInstance.numVoters();
        assert.equal(numVoters.toNumber(), 4,
            `Expecting to have 4 registered voters after user1 registers, but found ${numVoters}`);

        //re-vote for removal of HEO with the new token
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});

        try {
            await daoInstance.vote(proposalId, 1, ONE_HEO, {from: user1});
            assert.fail(`user1 should fail to vote while not on white list.`);
        } catch (err) {
            assert.equal(err.reason,
                "caller is not in the voter whitelist", `Wrong error message ${err}`);
        }
        await daoInstance.executeProposal(proposalId, {from: founder2});
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);
        activeProposals = await daoInstance.activeProposals.call();
        assert.equal(activeProposals.length, 0,
            `Expecting an array of 0. Found ${activeProposals.length}`);

        addrParamValue = (await paramsInstance.addrParameterValue.call(KEY_VOTING_TOKEN_ADDRESS, platformTokenAddress)).toNumber();
        assert.equal(addrParamValue, 0, `Expecting HEO to not be eligible for voting anymore. Got ${addrParamValue}`);
        addrParamValue = (await paramsInstance.addrParameterValue.call(KEY_VOTING_TOKEN_ADDRESS, altCoin.address)).toNumber();
        assert.equal(addrParamValue, 1, `Expecting ALT_HEO to become eligible for voting. Got ${addrParamValue}`);

        // check that HEO was correctly unstaked and refunded
        let tokenBalance = await tokenInstance.balanceOf.call(founder1);
        assert.isTrue(tokenBalance.eq(ONE_HEO),
            `Expecting founder1 to have 1 HEO after unstaking it, but found ${tokenBalance}`);
        tokenBalance = await tokenInstance.balanceOf.call(founder2);
        assert.isTrue(tokenBalance.eq(ONE_HEO),
            `Expecting founder2 to have 1 HEO after unstaking it, but found ${tokenBalance}`);
        tokenBalance = await tokenInstance.balanceOf.call(founder3);
        assert.isTrue(tokenBalance.eq(ONE_HEO),
            `Expecting founder3 to have to 1 HEO after HEO was removed as voting token, but found ${tokenBalance}`);
        let totalAmountStaked = await stakingInstance.totalAmountStaked();
        assert.isTrue(totalAmountStaked.eq(new BN(web3.utils.toWei("3"))),
            `Expecting to have 3 ALT_HEO staked, but found ${totalAmountStaked}`);
        let founder3Stake = await stakingInstance.voterStake.call(founder3);
        assert.isTrue(founder3Stake.eq(new BN("0")), `Expecting founder3 stake to be 0, but found ${founder3Stake}`);
        numVoters = await stakingInstance.numVoters();
        assert.equal(numVoters.toNumber(), 3,
            `Expecting to have 3 registered voters after HEO was removed as voting token, but found ${numVoters}`);

        //add user1 to parameter voter white list via voting
        await daoInstance.proposeVote(1, 0, KEY_PARAM_WHITE_LIST,
            [user1], [1], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;
        activeProposals = await daoInstance.activeProposals.call();
        assert.equal(activeProposals[0], proposalId, "Unexpected ID in activeProposals");
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        try {
            await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});
            assert.fail("founder3 should fail to vote, because it has not staked any ALT_HEO");
        } catch (err) {
            assert.equal(err.reason,
                "Caller is not a voter", `Wrong error message ${err}`);
        }
        try {
            await daoInstance.executeProposal(proposalId, {from: founder1});
            assert.fail("cannot execute proposal until the time is up, because two out of 3 registered voters voted");
        } catch (err) {
            assert.equal(err.reason,
                "proposal has more time", `Wrong error message ${err}`);
        }
        await timeMachine.advanceTimeAndBlock(259202);
        await daoInstance.executeProposal(proposalId, {from: founder1});
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);

        // user1 should not be able to propose changes to white lists
        try {
            await daoInstance.proposeVote(1, 0, KEY_PARAM_WHITE_LIST,
                [founder3], [0], 259201, 51, {from: user1});
            assert.fail("user1 should not be able to modify white lists");
        } catch(err) {
            assert.equal(err.reason,
                "only owner can modify white lists", `Wrong error message ${err}`);
        }
        // propose to remove founder3 from param white list
        try {
            await daoInstance.proposeVote(1, 0, KEY_PARAM_WHITE_LIST,
                [founder3], [0], 259201, 51, {from: founder1});
        } catch(err) {
            assert.fail(err.reason);
        }
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;
        activeProposals = await daoInstance.activeProposals.call();
        assert.equal(activeProposals[0], proposalId, "Unexpected ID in activeProposals");
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: user1});
        await daoInstance.executeProposal(proposalId, {from: user1});
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);

        // now founder3 should not be able to propose/vote on parameters even after staking
        await altCoin.transfer(founder3, web3.utils.toWei("10"), {from: user1});
        try {
            await daoInstance.proposeVote(0, 0, MAX_VOTE_DURATION,
                [], [345201], 259201, 51, {from: founder3});
            assert.fail("founder3 should not be able to propose votes after being removed from the white list");
        } catch(err) {
            assert.equal(err.reason,
                "Caller is not a voter", `Wrong error message ${err}`);
        }
    });

    it("Voting for budgets", async() => {
        await daoInstance.deployPlatformToken(new BN("100000000000000000000000000"),
            "Help Each Other platform token", "HEO", {from: founder1});
        let platformTokenAddress = await paramsInstance.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        let tokenInstance = await HEOToken.at(platformTokenAddress);
        for(let i=0; i < 3; i++) {
            try {
                await tokenInstance.approve(stakingInstance.address, web3.utils.toWei("1"), {from: accounts[i]})
                await daoInstance.registerToVote(web3.utils.toWei("1"), platformTokenAddress, {from: accounts[i]});
            } catch (err) {
                assert.fail(`${accounts[i]} should be able to register to vote. Error: ${err}`);
            }
        }

        //create a stablecoin and send 100 to the DAO
        let stableCoin = await StableCoinForTests.new("USDC", {from: user1});
        await stableCoin.transfer(daoInstance.address, web3.utils.toWei("100"), {from: user1});

        //propose to send 10 and 20 stablecoin to a fake budget
        await daoInstance.proposeVote(2, 3, 0, [user2, stableCoin.address], [web3.utils.toWei("10"), web3.utils.toWei("20")], 259201, 51, {from: founder1});
        let events = await daoInstance.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;
        let prop  = await daoInstance.getProposal.call(proposalId);
        prop.propTime = await daoInstance.proposalTime.call(proposalId);
        prop.propDuration = await daoInstance.proposalDuration.call(proposalId);
        prop.propType = await daoInstance.proposalType.call(proposalId);
        prop.proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(prop.proposalStatus.toNumber(), 0, `Expecting proposal status to be 0, but got ${prop.proposalStatus}`);
        assert.equal(prop.propDuration.toNumber(), 259201,
            `Expecting proposal duration to be 259201, but got ${prop.propDuration}. proposalId: ${proposalId}`);
        assert.isTrue(prop.propTime.toNumber() > 0,
            `Expecting proposal time to be greater than zero, but got ${prop.propTime.toString()}`);
        assert.equal(prop.proposer, founder1, `Expecting founder1 to be the proposer, but found address ${prop.proposer}`);
        assert.equal(prop.opType.toNumber(), 3, `Expecting opType to be the 3, but found ${prop.opType}`);
        assert.equal(prop.propType.toNumber(), 2, `Expecting propType to be the 2, but found ${prop.propType}`);
        assert.equal(prop.key.toNumber(), 0, `Expecting key to be 0, but found ${prop.key}`);
        assert.isTrue(new BN(prop.values[0]).eq(new BN(web3.utils.toWei("10"))), `Expecting values to be the 10 and 20, but found ${prop.values}`);
        assert.isTrue(new BN(prop.values[1]).eq(new BN(web3.utils.toWei("20"))), `Expecting values to be the 10 and 20, but found ${prop.values}`);
        assert.equal(prop.percentToPass.toNumber(), 51, `Expecting percentToPass to be the 51, but found ${prop.percentToPass}`);
        assert.equal(prop.totalVoters.toNumber(), 0, `Expecting totalVotes to be the 0, but found ${prop.totalVoters}`);
        assert.equal(prop.totalWeight.toNumber(), 0, `Expecting totalWeight to be the 0, but found ${prop.totalWeight}`);

        let before = (await stableCoin.balanceOf.call(user2)).toNumber();
        //cast votes for sending 10 sablecoins to fake budget
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});

        //try to execute the proposal
        try {
            await daoInstance.executeProposal(proposalId, {from: founder1});
            assert.fail(`Should fail to execute budget proposal when treasurer is not assigned.`);
        } catch (err) {
            //console.log(err);
        }
        let after = (await stableCoin.balanceOf.call(user2)).toNumber();
        assert.equal(before, after, `user2 balance of stabelcoin changed from ${before} to ${after}`);
        //assign treasurer by vote
        await daoInstance.proposeVote(3, 0, KEY_TREASURER, [treasurer], [1], 259201, 51,
            {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        let proposalId2 = events[0].returnValues.proposalId;

        //cast votes for treasurer
        await daoInstance.vote(proposalId2, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId2, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId2, 1, ONE_HEO, {from: founder3});
        await daoInstance.executeProposal(proposalId2, {from: founder1});
        let proposalStatus = await daoInstance.proposalStatus.call(proposalId2);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);
        after = (await stableCoin.balanceOf.call(user2)).toNumber();
        assert.equal(before, after, `user2 balance of stabelcoin changed from ${before} to ${after}`);

        //try to execute the budget proposal again
        try {
            await daoInstance.executeProposal(proposalId, {from: founder1});
            assert.fail(`Should fail to execute budget proposal for destination that is not an IHEOBudget.`);
        } catch (err) {
            //console.log(err);
        }
        after = (await stableCoin.balanceOf.call(user2)).toNumber();
        assert.equal(before, after, `user2 balance of stabelcoin changed from ${before} to ${after}`);

        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 0,
            `Expecting proposal status to be 0 (open), but got ${proposalStatus}`);
        after = (await stableCoin.balanceOf.call(user2)).toNumber();
        assert.equal(before, after, `user2 balance of stabelcoin changed from ${before} to ${after}`);

        //propose to send coins to a budget that wont' let DAO assign treasurer
        //create a budget
        let budgetInstance = await HEOBudget.new(treasurer, {from: founder1});
        before = (await stableCoin.balanceOf.call(budgetInstance.address)).toNumber();
        let daoBalance = await stableCoin.balanceOf.call(daoInstance.address);
        assert.isTrue(daoBalance.eq(new BN(web3.utils.toWei("100"))), `expecting DAO to have 100 coins, but found ${daoBalance}`);
        await daoInstance.proposeVote(2, 3, 0, [budgetInstance.address, stableCoin.address],
            [web3.utils.toWei("10")], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        //cast votes for sending 10 sablecoins to bad budget
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});

        //try to execute the proposal
        try {
            await daoInstance.executeProposal(proposalId, {from: founder1});
            assert.fail(`Should fail to execute budget proposal for destination that won't let DAO assign treasurer.`);
        } catch (err) {
            assert.equal(err.reason,
                "HEOBudget: caller is not the owner", `Wrong error message ${err}`);
        }
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 0,
            `Expecting proposal status to be 0 (open), but got ${proposalStatus}`);
        after = (await stableCoin.balanceOf.call(budgetInstance.address)).toNumber();
        assert.equal(before, after, `budgetInstance balance of stabelcoin changed from ${before} to ${after}`);

        //transfer ownership of budget to the DAO
        await budgetInstance.transferOwnership(daoInstance.address);
        //try to execute the proposal again
        await daoInstance.executeProposal(proposalId, {from: founder1});
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);
        after = (await stableCoin.balanceOf.call(budgetInstance.address));
        assert.isTrue(after.eq(new BN(web3.utils.toWei("10"))), `budgetInstance balance of stabelcoin changed from ${before} to ${after}`);
        after = (await stableCoin.balanceOf.call(daoInstance.address));
        assert.isTrue(after.eq(new BN(web3.utils.toWei("90"))), `daoInstance balance of stabelcoin should be 90, but found ${after}`);

        //propose to send all HEO to a budget
        let heoBalance = (await tokenInstance.balanceOf.call(budgetInstance.address)).toNumber();
        assert.equal(heoBalance, 0, `Budget contract should have 0 HEO, but found ${heoBalance}`)
        heoBalance = (await tokenInstance.balanceOf.call(daoInstance.address));
        assert.isTrue(heoBalance.eq(new BN(web3.utils.toWei("99999997"))), `DAO should have 99999997 HEO, but found ${heoBalance}`)
        heoBalance = (await tokenInstance.balanceOf.call(stakingInstance.address));
        assert.isTrue(heoBalance.eq(new BN(web3.utils.toWei("3"))), `stakingInstance should have 3 HEO, but found ${heoBalance}`)

        //try to send 99999998 HEO to a budget - this should fail, because DAO has only 99999997 HEO
        await daoInstance.proposeVote(2, 3, 0, [budgetInstance.address, tokenInstance.address],
            [web3.utils.toWei("99999998")], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        //cast votes for sending 10 sablecoins to bad budget
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});

        //try to execute the proposal
        try {
            await daoInstance.executeProposal(proposalId, {from: founder1});
            assert.fail(`Should fail to execute budget proposal, because 3 HEO should remain locked.`);
        } catch (err) {
            assert.equal(err.reason,
                "ERC20: transfer amount exceeds balance", `Wrong error message ${err}`);
        }
        heoBalance = (await tokenInstance.balanceOf.call(daoInstance.address));
        assert.isTrue(heoBalance.eq(new BN(web3.utils.toWei("99999997"))), `DAO should have 100000000 HEO, but found ${heoBalance}`);
        heoBalance = (await tokenInstance.balanceOf.call(stakingInstance.address));
        assert.isTrue(heoBalance.eq(new BN(web3.utils.toWei("3"))), `stakingInstance should have 3 HEO, but found ${heoBalance}`)
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 0,
            `Expecting proposal status to be 0 (open), but got ${proposalStatus}`);

        await daoInstance.proposeVote(2, 3, 0, [budgetInstance.address, tokenInstance.address], [web3.utils.toWei("99999997")], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        //cast votes for sending 99999997 HEO to budget
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});

        await daoInstance.executeProposal(proposalId, {from: founder1});
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);
        heoBalance = (await tokenInstance.balanceOf.call(stakingInstance.address));
        assert.isTrue(heoBalance.eq(new BN(web3.utils.toWei("3"))),
            `stakingInstance should have 3 HEO after executing the proposal, but found ${heoBalance}`);
        heoBalance = (await tokenInstance.balanceOf.call(budgetInstance.address));
        assert.isTrue(heoBalance.eq(new BN(web3.utils.toWei("99999997"))),
            `Budget should have 99999997 HEO after executing the proposal, but found ${heoBalance}`);

        //vote to withdraw HEO from budget
        await daoInstance.proposeVote(2, 5, 0, [budgetInstance.address, tokenInstance.address], [0], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;
        //cast votes for withdrawing 99999997 HEO from budget
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});

        //execute the proposal
        await daoInstance.executeProposal(proposalId, {from: founder1});
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);
        heoBalance = (await tokenInstance.balanceOf.call(budgetInstance.address)).toNumber();
        assert.equal(heoBalance, 0, `Budget should have 0 HEO after executing the proposal, but found ${heoBalance}`);
        heoBalance = (await tokenInstance.balanceOf.call(daoInstance.address));
        assert.isTrue(heoBalance.eq(new BN(web3.utils.toWei("99999997"))),
            `DAO should have 99,999,997 HEO after executing the proposal, but found ${heoBalance}`);
        heoBalance = (await tokenInstance.balanceOf.call(stakingInstance.address));
        assert.isTrue(heoBalance.eq(new BN(web3.utils.toWei("3"))),
            `stakingInstance should have 3 HEO after executing the proposal, but found ${heoBalance}`);

        //vote to withdraw stablecoin from budget
        before = await stableCoin.balanceOf.call(budgetInstance.address);
        assert.isTrue(before.eq(new BN(web3.utils.toWei("10"))), `budgetInstance balance of stabelcoin should be 10, but founr ${before}`);
        await daoInstance.proposeVote(2, 5, 0, [budgetInstance.address, stableCoin.address], [web3.utils.toWei("15")], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;
        //cast votes for withdrawing 15 stablecoins from budget
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});

        //execute the proposal
        await daoInstance.executeProposal(proposalId, {from: founder1});
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);
        after = (await stableCoin.balanceOf.call(budgetInstance.address));
        assert.isTrue(after.eq(new BN(web3.utils.toWei("0"))), `Budget should have 0 stablecoins after withdrawal, but found ${after}`);
        after = (await stableCoin.balanceOf.call(daoInstance.address));
        assert.isTrue(after.eq(new BN(web3.utils.toWei("100"))), `daoInstance should have 100 stablecoins after withdrawal, but found ${after}`);

        //vote to withdraw again from budget
        await daoInstance.proposeVote(2, 5, 0, [budgetInstance.address, stableCoin.address], [0], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        //cast votes for withdrawing
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});

        //try to execute the proposal
        try {
            await daoInstance.executeProposal(proposalId, {from: founder1});
            assert.fail(`Should fail to execute budget proposal, because 3 HEO should remain locked.`);
        } catch (err) {
            assert.equal(err.reason,
                "HEOBudget: token balance is zero", `Wrong error message ${err}`);
        }
        after = (await stableCoin.balanceOf.call(daoInstance.address));
        assert.isTrue(after.eq(new BN(web3.utils.toWei("100"))), `daoInstance should still have 100 stablecoins , but found ${after}`);
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 0,
            `Expecting proposal status to be 0 (open), but got ${proposalStatus}`);

        //vote to withdraw random token from budget
        assert.isTrue(before.eq(new BN(web3.utils.toWei("10"))), `budgetInstance balance of stabelcoin should be 10, but founr ${before}`);
        await daoInstance.proposeVote(2, 5, 0, [budgetInstance.address, "0xad6d428402f60fd3bd25163575031acdce07538d"], [1], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        //cast votes for withdrawing
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});

        //try to execute the proposal
        try {
            await daoInstance.executeProposal(proposalId, {from: founder1});
        } catch (err) {
            assert.isNotNull(err, "Should fail to execute the proposal");
        }
        after = (await stableCoin.balanceOf.call(daoInstance.address));
        assert.isTrue(after.eq(new BN(web3.utils.toWei("100"))), `daoInstance should still have 100 stablecoins , but found ${after}`);
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 0,
            `Expecting proposal status to be 0 (open), but got ${proposalStatus}`);

        //vote to send more Ether to a budget than available
        //check initial Ether balance of the budget
        let nativeBalance = new BN(await web3.eth.getBalance(budgetInstance.address));
        assert.isTrue(nativeBalance.eq(new BN(web3.utils.toWei("0"))),
            `Expecting budget contract to have 0 native coins, but found ${nativeBalance}`);

        //check initial Ether balance of the DAO
        nativeBalance = new BN(await web3.eth.getBalance(daoInstance.address));
        assert.isTrue(nativeBalance.eq(new BN(web3.utils.toWei("0"))),
            `Expecting DAO to have 0 native coins, but found ${nativeBalance}`);

        //give some Ether to the DAO
        await web3.eth.sendTransaction({from: founder1, to: daoInstance.address, value: web3.utils.toWei("10")});
        nativeBalance = new BN(await web3.eth.getBalance(daoInstance.address));
        assert.isTrue(nativeBalance.eq(new BN(web3.utils.toWei("10"))),
            `Expecting DAO to have 10 native coins, but found ${nativeBalance}`);

        //vote to send some of available Ether to a budget
        await daoInstance.proposeVote(2, 2, 0, [budgetInstance.address, "0x0000000000000000000000000000000000000000"],
            [web3.utils.toWei("4")], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;
        //cast votes for sending 4 ether to the budget
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});

        //execute the proposal
        await daoInstance.executeProposal(proposalId, {from: founder1});
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);
        nativeBalance = new BN(await web3.eth.getBalance(daoInstance.address));
        assert.isTrue(nativeBalance.eq(new BN(web3.utils.toWei("6"))),
            `Expecting DAO to have 6 native coins, but found ${nativeBalance}`);
        nativeBalance = new BN(await web3.eth.getBalance(budgetInstance.address));
        assert.isTrue(nativeBalance.eq(new BN(web3.utils.toWei("4"))),
            `Expecting Budget to have 4 native coins, but found ${nativeBalance}`);

        //vote to send more Ether than available to a budget
        await daoInstance.proposeVote(2, 2, 0, [budgetInstance.address, "0x0000000000000000000000000000000000000000"],
            [web3.utils.toWei("7")], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;
        //cast votes for sending 4 ether to the budget
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});

        //execute the proposal
        try {
            await daoInstance.executeProposal(proposalId, {from: founder1});
        } catch (err) {
            assert.isNotNull(err, "Should fail to execute the proposal");
        }

        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 0,
            `Expecting proposal status to be 0 (open), but got ${proposalStatus}`);
        nativeBalance = new BN(await web3.eth.getBalance(daoInstance.address));
        assert.isTrue(nativeBalance.eq(new BN(web3.utils.toWei("6"))),
            `Expecting DAO to still have 6 native coins, but found ${nativeBalance}`);
        nativeBalance = new BN(await web3.eth.getBalance(budgetInstance.address));
        assert.isTrue(nativeBalance.eq(new BN(web3.utils.toWei("4"))),
            `Expecting Budget to still have 4 native coins, but found ${nativeBalance}`);

        //vote to send all available Ether to a budget
        await daoInstance.proposeVote(2, 2, 0, [budgetInstance.address, "0x0000000000000000000000000000000000000000"],
            [web3.utils.toWei("6")], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;
        //cast votes for sending 4 ether to the budget
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});

        //execute the proposal
        await daoInstance.executeProposal(proposalId, {from: founder1});
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);
        nativeBalance = new BN(await web3.eth.getBalance(daoInstance.address));
        assert.isTrue(nativeBalance.eq(new BN(web3.utils.toWei("0"))),
            `Expecting DAO to have 0 native coins, but found ${nativeBalance}`);
        nativeBalance = new BN(await web3.eth.getBalance(budgetInstance.address));
        assert.isTrue(nativeBalance.eq(new BN(web3.utils.toWei("10"))),
            `Expecting Budget to have 10 native coins, but found ${nativeBalance}`);

        //vote to withdraw Ether
        await daoInstance.proposeVote(2, 4, 0, [budgetInstance.address, "0x0000000000000000000000000000000000000000"],
            [1], 259201, 51, {from: founder1});
        events = await daoInstance.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        //cast votes for withdrawing
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder1});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder2});
        await daoInstance.vote(proposalId, 1, ONE_HEO, {from: founder3});

        //try to execute the proposal
        await daoInstance.executeProposal(proposalId, {from: founder1});
        proposalStatus = await daoInstance.proposalStatus.call(proposalId);
        assert.equal(proposalStatus.toNumber(), 1,
            `Expecting proposal status to be 1 (executed), but got ${proposalStatus}`);
        nativeBalance = new BN(await web3.eth.getBalance(daoInstance.address));
        assert.isTrue(nativeBalance.eq(new BN(web3.utils.toWei("10"))),
            `Expecting DAO to have 10 native coins, but found ${nativeBalance}`);
        nativeBalance = new BN(await web3.eth.getBalance(budgetInstance.address));
        assert.isTrue(nativeBalance.eq(new BN(web3.utils.toWei("0"))),
            `Expecting Budget to have 0 native coins, but found ${nativeBalance}`);
    });
    it("Replacing staking contract", async() => {
        //register founders to vote
        await daoInstance.deployPlatformToken(new BN("100000000000000000000000000"),
            "Help Each Other platform token", "HEO", {from: founder1});
        let platformTokenAddress = await paramsInstance.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        let tokenInstance = await HEOToken.at(platformTokenAddress);
        for(let i=0; i < 3; i++) {
            try {
                await tokenInstance.approve(stakingInstance.address, web3.utils.toWei("1"), {from: accounts[i]})
                await daoInstance.registerToVote(web3.utils.toWei("1"), platformTokenAddress, {from: accounts[i]});
            } catch (err) {
                assert.fail(`${accounts[i]} should be able to register to vote. Error: ${err}`);
            }
            let tokenBalance = await tokenInstance.balanceOf.call( accounts[i]);
            assert.isTrue(tokenBalance.eq(new BN("0")),
                `Expecting account ${i} to have to be 0 HEO after registering to vote, but found ${tokenBalance}`);
        }

        let totalAmountStaked = await stakingInstance.totalAmountStaked();
        assert.isTrue(totalAmountStaked.eq(new BN(web3.utils.toWei("3"))),
            `Expecting to have 3 HEO staked, but found ${totalAmountStaked}`);

        let numVoters = await stakingInstance.numVoters();
        assert.equal(numVoters.toNumber(), 3, `Expecting to have 3 registered voters, but found ${numVoters}`);

        for(let i=0; i < 3; i++) {
            let canVote = (await stakingInstance.canVoteForParams.call(accounts[i]));
            assert.isTrue(canVote.eq(ONE_HEO), `${accounts[i]} should be able to vote for parameters. Result: ${canVote}`);
            canVote = (await stakingInstance.canVoteForContracts.call(accounts[i]));
            assert.isTrue(canVote.eq(ONE_HEO), `${accounts[i]} should be able to vote for contracts. Result: ${canVote}`);
            canVote = (await stakingInstance.canVoteForBudget.call(accounts[i]));
            assert.isTrue(canVote.eq(ONE_HEO), `${accounts[i]} should be able to vote for budget. Result: ${canVote}`);
        }
        //replace staking contract
        let newStakingInstance = await HEOStaking.new();
        await newStakingInstance.transferOwnership(daoInstance.address);
        await daoInstance.setStaking(newStakingInstance.address);

        //verify that everyone was unstaked
        totalAmountStaked = await stakingInstance.totalAmountStaked();
        assert.isTrue(totalAmountStaked.eq(new BN(web3.utils.toWei("0"))),
            `Expecting to have 0 HEO staked, but found ${totalAmountStaked}`);
        numVoters = await stakingInstance.numVoters();
        assert.equal(numVoters.toNumber(), 0, `Expecting to have 0 registered voters, but found ${numVoters}`);
        for(let i=0; i < 3; i++) {
            let canVote = (await stakingInstance.canVoteForParams.call(accounts[i])).toNumber();
            assert.equal(canVote, 0, `${accounts[i]} should not be able to vote for parameters. Result: ${canVote}`);
            canVote = (await stakingInstance.canVoteForContracts.call(accounts[i])).toNumber();
            assert.equal(canVote, 0, `${accounts[i]} should be able to vote for contracts. Result: ${canVote}`);
            canVote = (await stakingInstance.canVoteForBudget.call(accounts[i])).toNumber();
            assert.equal(canVote, 0, `${accounts[i]} should be able to vote for budget. Result: ${canVote}`);
            let tokenBalance = await tokenInstance.balanceOf.call( accounts[i]);
            assert.isTrue(tokenBalance.eq(ONE_HEO),
                `Expecting account ${i} to have 1 HEO after everyone was unstaked, but found ${tokenBalance}`);
        }
    });
});
        