const StableCoinForTests = artifacts.require("StableCoinForTests");
var BN = web3.utils.BN;
const HEODAO = artifacts.require("HEODAO");
const ONE_COIN = web3.utils.toWei("1");
const KEY_ACCEPTED_COINS = 4;
module.exports = async function(deployer, network, accounts) {
    console.log(`Accounts are ${accounts[0]}, ${accounts[1]}, ${accounts[2]}`);
    if (network == "ganache") {
        await deployer.deploy(StableCoinForTests, "TUSD");
        const iTestCoin = await StableCoinForTests.deployed();

        await iTestCoin.transfer(accounts[0], web3.utils.toWei("1000000"));
        await iTestCoin.transfer(accounts[1], web3.utils.toWei("1000000"));
        await iTestCoin.transfer(accounts[2], web3.utils.toWei("1000000"));
        await iTestCoin.transfer(accounts[3], web3.utils.toWei("1000000"));
        await iTestCoin.transfer(accounts[4], web3.utils.toWei("1000000"));
        await iTestCoin.transfer(accounts[5], web3.utils.toWei("1000000"));

        //add stable-coin to accepted currencies
        const iHEODao = await HEODAO.deployed();
        await iHEODao.proposeVote(1, 0, KEY_ACCEPTED_COINS, [iTestCoin.address], [1], 259201, 51,
            {from: accounts[0]});
        let events = await iHEODao.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[0]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[1]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[2]});
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});

        console.log(`Stable coin address: ${iTestCoin.address}`);
    } else if (network == "bsctestnet" || network == "bscdev") {
        //add stable-coin to accepted currencies
        const iHEODao = await HEODAO.deployed();
        await iHEODao.proposeVote(1, 0, KEY_ACCEPTED_COINS, ["0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee"], [1], 259201, 51,
            {from: accounts[0]});
        console.log("Proposed vote to add test coin to accepted coins. Waiting for events");
        let events = await iHEODao.getPastEvents('ProposalCreated');
        var proposalId;
        if (events[0] && events[0].returnValues) {
            proposalId = events[0].returnValues.proposalId;
        } else {
            while (!events[0]) {
                events = await iHEODao.getPastEvents('ProposalCreated');
                if (events[0] && events[0].returnValues) {
                    proposalId = events[0].returnValues.proposalId;
                }
            }
        }
        console.log(`Found proposal: ${proposalId}`);
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[0]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[1]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[2]});
        console.log(`Voted for proposal: ${proposalId}`);
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});
        console.log(`Executed proposal: ${proposalId}`);
    } else if (network == "rinkeby") {
        //add USDC to accepted currencies
        const iHEODao = await HEODAO.deployed();
        var txReceipt = await iHEODao.proposeVote(1, 0, KEY_ACCEPTED_COINS, ["0xeb8f08a975ab53e34d8a0330e0d34de942c95926"], [1], 259201, 51,
            {from: accounts[0]});
        console.log("Proposed vote to add test coin to accepted coins. Waiting for events");
        var proposalId;
        var events = txReceipt.logs;
        if(events && events.length > 0) {
            console.log("got events");
            console.log(events[0]);
            proposalId = events[0].args.proposalId;
            console.log(`Found proposal ${proposalId}`);
        } else {
            console.log("Did not find any events");
            return;
        }
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[0]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[1]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[2]});
        console.log(`Voted for proposal: ${proposalId}`);
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});
        console.log(`Executed proposal: ${proposalId}`);
    } else if (network == "bsc") {
        //add stable-coin to accepted currencies
        const iHEODao = await HEODAO.deployed();
        await iHEODao.proposeVote(1, 0, KEY_ACCEPTED_COINS, ["0xe9e7cea3dedca5984780bafc599bd69add087d56"], [1], 259201, 51,
            {from: accounts[0]});
        console.log("Proposed vote to add test coin to accepted coins. Waiting for events");
        let events = await iHEODao.getPastEvents('ProposalCreated');
        var proposalId;
        if (events[0] && events[0].returnValues) {
            proposalId = events[0].returnValues.proposalId;
        } else {
            while (!events[0]) {
                events = await iHEODao.getPastEvents('ProposalCreated');
                if (events[0] && events[0].returnValues) {
                    proposalId = events[0].returnValues.proposalId;
                }
            }
        }
        console.log(`Found proposal: ${proposalId}`);
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[0]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[1]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[2]});
        console.log(`Voted for proposal: ${proposalId}`);
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});
        console.log(`Executed proposal: ${proposalId}`);
    } else if (network == "auroratest") {
        await deployer.deploy(StableCoinForTests, "TUSD");
        const iTestCoin = await StableCoinForTests.deployed();

        await iTestCoin.transfer(accounts[0], web3.utils.toWei("1000000"));
        await iTestCoin.transfer(accounts[1], web3.utils.toWei("1000000"));
        await iTestCoin.transfer(accounts[2], web3.utils.toWei("1000000"));

        //add stable-coin to accepted currencies
        const iHEODao = await HEODAO.deployed();
        await iHEODao.proposeVote(1, 0, KEY_ACCEPTED_COINS, [iTestCoin.address], [1], 259201, 51,
            {from: accounts[0]});
        let events = await iHEODao.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[0]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[1]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[2]});
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});

        console.log(`Stable coin address: ${iTestCoin.address}`);
    }
}