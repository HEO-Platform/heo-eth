const HEOParameters = artifacts.require("HEOParameters");
const HEOToken = artifacts.require("HEOToken");
const HEODAO = artifacts.require("HEODAO");
const HEOStaking = artifacts.require("HEOStaking");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEORewardFarm = artifacts.require("HEORewardFarm");

const ONE_COIN = web3.utils.toWei("1");

module.exports = async function(deployer, network, accounts) {
    if(network != "test") {
        console.log(`Network is ${network}`);

        console.log(`Accounts are ${accounts[0]}, ${accounts[1]}, ${accounts[2]}`);
        const KEY_PLATFORM_TOKEN_ADDRESS = 5;
        const KEY_CAMPAIGN_FACTORY = 0;
        const KEY_CAMPAIGN_REGISTRY = 1;
        const KEY_PRICE_ORACLE = 4;
        const KEY_REWARD_FARM = 2;

        //deploy the DAO
        const iHEODao = await HEODAO.deployed();

        //instantiate main contracts
        const iRewardFarm = await HEORewardFarm.deployed();
        const iRegistry = await HEOCampaignRegistry.deployed();
        const iCampaignFactory = await HEOCampaignFactory.deployed();
        const iStaking = await HEOStaking.deployed();
        const iHEOParams = await HEOParameters.deployed();
        const iPriceOracle = await HEOPriceOracle.deployed();
        var proposalId;
        var events;
        //register initial 3 voters
        const platformTokenAddress = await iHEOParams.contractAddress.call(KEY_PLATFORM_TOKEN_ADDRESS);
        console.log(`HEO coin address: ${platformTokenAddress}`);
        const iToken = await HEOToken.at(platformTokenAddress);
        /*
        for (let i = 0; i < 3; i++) {
            console.log(`Registering account ${i} for voting`);
            await iToken.approve(iStaking.address, web3.utils.toWei("1"), {from: accounts[i]})
            await iHEODao.registerToVote(web3.utils.toWei("1"), platformTokenAddress, {from: accounts[i]});
        }

        //set campaign factory address by vote
        await iHEODao.proposeVote(3, 0, KEY_CAMPAIGN_FACTORY, [iCampaignFactory.address], [1], 259201, 51,
            {from: accounts[0]});
        console.log("Proposed vote. Waiting for events");
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
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});

        //set price oracle by vote
        await iHEODao.proposeVote(3, 0, KEY_PRICE_ORACLE, [iPriceOracle.address], [1], 259201, 51,
            {from: accounts[0]});
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

        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[0]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[1]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[2]});
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});
*/
        //set reward farm by vote
        await iHEODao.proposeVote(3, 0, KEY_REWARD_FARM, [iRewardFarm.address], [1], 259201, 51,
            {from: accounts[0]});
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

        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[0]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[1]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[2]});
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});

        //set campaign registry address by vote
        await iHEODao.proposeVote(3, 0, KEY_CAMPAIGN_REGISTRY, [iRegistry.address], [1], 259201, 51,
            {from: accounts[0]});
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

        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[0]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[1]});
        await iHEODao.vote(proposalId, 1, ONE_COIN, {from: accounts[2]});
        await iHEODao.executeProposal(proposalId, {from: accounts[1]});
    }
}
