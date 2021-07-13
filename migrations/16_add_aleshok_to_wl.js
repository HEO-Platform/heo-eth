const HEODAO = artifacts.require("HEODAO");

const ONE_COIN = web3.utils.toWei("1");
const KEY_FUNDRAISER_WHITE_LIST = 5;

module.exports = async function(deployer, network, accounts) {
    if(network == "bsctestnet") {
        console.log(`Network is ${network}`);
        console.log(`Accounts are ${accounts[0]}, ${accounts[1]}, ${accounts[2]}`);
        const iHEODao = await HEODAO.deployed();

        await iHEODao.proposeVote(1, 0, KEY_FUNDRAISER_WHITE_LIST, ["0x717E07F631B8875a33Ee9938e9c60a2B2E5DA21c"], [1], 259201, 51,
            {from: accounts[0]});
        console.log("Proposed vote to add Alesha to WL. Waiting for events");
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