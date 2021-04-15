const StableCoinForTests = artifacts.require("StableCoinForTests");
const HEOParameters = artifacts.require("HEOParameters");
const HEODAO = artifacts.require("HEODAO");
const HEOToken = artifacts.require("HEOToken");
const HEOStaking = artifacts.require("HEOStaking");
var BN = web3.utils.BN;

const ONE_COIN = web3.utils.toWei("1");
const KEY_ENABLE_FUNDRAISER_WHITELIST = 11;
const KEY_FUNDRAISER_WHITE_LIST = 5;
const KEY_ANON_CAMPAIGN_LIMIT = 12;
const KEY_PLATFORM_TOKEN_ADDRESS = 5;
module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        //add stable-coin to accepted currencies
        const iHEOParams = await HEOParameters.deployed();
        const iHEODao = await HEODAO.deployed();
        const platformTokenAddress = await iHEOParams.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        const iToken = await HEOToken.at(platformTokenAddress);
        const iStaking = await HEOStaking.deployed();
//        for(let i=0; i < 3; i++) {
//            await iToken.approve(iStaking.address, web3.utils.toWei("1"), {from: accounts[i]})
//            await iHEODao.registerToVote(web3.utils.toWei("1"), platformTokenAddress, {from: accounts[i]});
//        }
        await iHEODao.proposeVote(0, 0, KEY_ENABLE_FUNDRAISER_WHITELIST, [], [1], 259201, 51,
            {from: accounts[0]});
        let events = await iHEODao.getPastEvents('ProposalCreated');
        let proposalId = events[0].returnValues.proposalId;

        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[0]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[1]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[2]});
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});

        await iHEODao.proposeVote(0, 0, KEY_ANON_CAMPAIGN_LIMIT, [], [web3.utils.toWei("10000")], 259201, 51,
            {from: accounts[0]});

        events = await iHEODao.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[0]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[1]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[2]});
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});

        await iHEODao.proposeVote(1, 0, KEY_FUNDRAISER_WHITE_LIST, [accounts[0]], [1], 259201, 51,
            {from: accounts[0]});
        events = await iHEODao.getPastEvents('ProposalCreated');
        proposalId = events[0].returnValues.proposalId;

        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[0]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[1]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[2]});
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});
    }
}