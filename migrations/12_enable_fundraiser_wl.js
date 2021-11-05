const HEODAO = artifacts.require("HEODAO");

const ONE_COIN = web3.utils.toWei("1");
const KEY_ENABLE_FUNDRAISER_WHITELIST = 11;
const KEY_FUNDRAISER_WHITE_LIST = 5;
const KEY_ANON_CAMPAIGN_LIMIT = 12;

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        console.log(`Network is ${network}`);
        console.log(`Accounts are ${accounts[0]}, ${accounts[1]}, ${accounts[2]}`);
        //add stable-coin to accepted currencies
        const iHEODao = await HEODAO.deployed();
        /*var txReceipt = await iHEODao.proposeVote(0, 0, KEY_ENABLE_FUNDRAISER_WHITELIST, [], [1], 259201, 51,
            {from: accounts[0]});
        console.log("Proposed vote to enable WL");

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
        console.log(`Found proposal: ${proposalId}`);
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[0]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[1]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[2]});
        console.log(`Voted for proposal: ${proposalId}`);
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});
        console.log(`Executed proposal: ${proposalId}`);
        txReceipt = await iHEODao.proposeVote(0, 0, KEY_ANON_CAMPAIGN_LIMIT, [], [web3.utils.toWei("10000")], 259201, 51,
            {from: accounts[0]});
        console.log("Proposed vote to set anonymous campaign limit. Waiting for events");
        events = txReceipt.logs;
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
        console.log(`Executed proposal: ${proposalId}`);*/
        //add accounts[0] to while list
        txReceipt = await iHEODao.proposeVote(1, 0, KEY_FUNDRAISER_WHITE_LIST, [accounts[0]], [1], 259201, 51,
            {from: accounts[0]});
        console.log("Proposed vote to add accounts[0] to WL");
        events = txReceipt.logs;
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
    }
}