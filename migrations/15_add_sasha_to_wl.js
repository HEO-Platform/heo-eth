const HEODAO = artifacts.require("HEODAO");

const ONE_COIN = web3.utils.toWei("1");
const KEY_FUNDRAISER_WHITE_LIST = 5;

module.exports = async function(deployer, network, accounts) {
    if(network == "bsctestnet") {
        console.log(`Network is ${network}`);
        console.log(`Accounts are ${accounts[0]}, ${accounts[1]}, ${accounts[2]}`);
        const iHEODao = await HEODAO.at("0x5B578e08e6C96844C70E42A205B7DA8C4a918c0C");

        await iHEODao.proposeVote(1, 0, KEY_FUNDRAISER_WHITE_LIST, ["0x15cA1562912fA669efdfF1c0D6Dc612fb3D5CfEB"], [1], 259201, 51,
            {from: accounts[0]});

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

        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[0]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[1]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[2]});
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});
    }
}