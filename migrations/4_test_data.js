const StableCoinForTests = artifacts.require("StableCoinForTests");
var BN = web3.utils.BN;
const HEODAO = artifacts.require("HEODAO");
const ONE_COIN = web3.utils.toWei("1");
const KEY_ACCEPTED_COINS = 4;
module.exports = async function(deployer, network, accounts) {
    if(network == "ganache") {
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
    }
}