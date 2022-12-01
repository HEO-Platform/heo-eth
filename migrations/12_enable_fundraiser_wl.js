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
        await iHEODao.proposeVote(0, 0, KEY_ENABLE_FUNDRAISER_WHITELIST, [], [1], 259201, 51,
            {from: accounts[0]});
        console.log("Proposed vote to enable WL. Waiting for events");
        let events = await iHEODao.getPastEvents('ProposalCreated');
        var proposalId;
        if(events[0] && events[0].returnValues) {
            proposalId = events[0].returnValues.proposalId;
        } else {
            while(!events[0]) {
                events = await iHEODao.getPastEvents('ProposalCreated');
                if(events[0] && events[0].returnValues) {
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
        await iHEODao.proposeVote(0, 0, KEY_ANON_CAMPAIGN_LIMIT, [], [web3.utils.toWei("10000")], 259201, 51,
            {from: accounts[0]});
        console.log("Proposed vote to set anonymous campaign limit. Waiting for events");
        events = await iHEODao.getPastEvents('ProposalCreated');
        if(events[0] && events[0].returnValues) {
            proposalId = events[0].returnValues.proposalId;
        } else {
            while(!events[0]) {
                events = await iHEODao.getPastEvents('ProposalCreated');
                if(events[0] && events[0].returnValues) {
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
        //add accounts[0] to while list
        await iHEODao.proposeVote(1, 0, KEY_FUNDRAISER_WHITE_LIST, [accounts[0]], [1], 259201, 51,
            {from: accounts[0]});
        console.log("Proposed vote to add accounts[0] to WL. Waiting for events");
        events = await iHEODao.getPastEvents('ProposalCreated');
        if(events[0] && events[0].returnValues) {
            proposalId = events[0].returnValues.proposalId;
        } else {
            while(!events[0]) {
                events = await iHEODao.getPastEvents('ProposalCreated');
                if(events[0] && events[0].returnValues) {
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
    }
}
