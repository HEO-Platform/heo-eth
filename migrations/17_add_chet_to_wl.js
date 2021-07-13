const HEODAO = artifacts.require("HEODAO");

const ONE_COIN = web3.utils.toWei("1");
const KEY_FUNDRAISER_WHITE_LIST = 5;

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        console.log(`Network is ${network}`);
        console.log(`Accounts are ${accounts[0]}, ${accounts[1]}, ${accounts[2]}`);
        const iHEODao = await HEODAO.at("0x125a5d1ad1bEE45D9A701D751495D90D8a22d1f1");

        await iHEODao.proposeVote(1, 0, KEY_FUNDRAISER_WHITE_LIST, ["0xF75ff314DF0F5fa51E43168b4f6C9e4e613ec19a"], [1], 259201, 51,
            {from: accounts[0]});
        console.log("Proposed vote to add 0xF75ff314DF0F5fa51E43168b4f6C9e4e613ec19a to WL. Waiting for events");
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
    }
}