
const ganache = require('ganache');
const Web3 = require('web3');
const [web3, provider] = require('tronbox-web3')(new Web3(Web3.givenProvider), ganache.provider());
const HEOToken = artifacts.require("HEOToken");
const BN = web3.utils.BN;
contract("HEOToken", (accounts) => {
  it('Token initialization', async () => {
    const heoTokenInstance = await HEOToken.new(new BN("100000000000000000000000000"),
        "Help Each Other platform token", "HEO", {from: accounts[0]});
    const balance = await heoTokenInstance.balanceOf.call(accounts[0]);
    assert.isTrue(balance.eq(new BN(web3.utils.toWei("100000000"))), 0, "Expecting 100M HEO in the first account");

    const maxSupply = await heoTokenInstance.maxSupply.call();
    assert.equal(web3.utils.fromWei(maxSupply.toString()),  100000000, "Expecting maxSupply to be 100M");

    const totalSupply = await heoTokenInstance.totalSupply.call();
    assert.equal(web3.utils.fromWei(totalSupply), 100000000, "Expecting totalSupply to be 100M");

    const owner = await heoTokenInstance.owner.call();
    assert.equal(owner, accounts[0], "accounts[0] should be the owner");
  });
});

        