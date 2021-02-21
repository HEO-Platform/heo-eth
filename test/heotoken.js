const HEOToken = artifacts.require("HEOToken");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
contract('HEOToken', (accounts) => {
  it('should initialize correctly', async () => {
    const heoTokenInstance = await HEOToken.deployed();
    const balance = await heoTokenInstance.balanceOf.call(accounts[0]);

    assert.equal(balance.valueOf(), 0, "Expecting 0 HEO in the first account");

    const maxSupply = await heoTokenInstance.maxSupply.call();
    assert.equal(web3.utils.fromWei(maxSupply),  30000000, "Expecting maxSupply to be 30M");

    const totalSupply = await heoTokenInstance.totalSupply.call();
    assert.equal(totalSupply, 0, "Expecting totalSupply to be 0");

    const owner = await heoTokenInstance.owner.call();
    assert.equal(owner, accounts[0], "accounts[0] should be the owner");
  });

  it('should add/remove minters and burners correctly', async() => {
    const heoTokenInstance = await HEOToken.deployed();
    const ownerAccount = accounts[0];
    const rogueAccount = accounts[2];
    try {
      await heoTokenInstance.addMinter("0x0000000000000000000000000000000000000000", {from: ownerAccount});
      assert.fail("Should not be able to add zero address as minter.");
    } catch (err) {
      assert.equal("HEOToken: zero-address cannot be a minter.", err.reason);
    }
    try {
      await heoTokenInstance.addBurner("0x0000000000000000000000000000000000000000", {from: ownerAccount});
      assert.fail("Should not be able to add zero address as burner.");
    } catch (err) {
      assert.equal("HEOToken: zero-address cannot be a burner.", err.reason);
    }
    try {
      await heoTokenInstance.removeMinter("0x0000000000000000000000000000000000000000", {from: ownerAccount});
      assert.fail("Should not be able to remove zero address as minter.");
    } catch (err) {
      assert.equal("HEOToken: zero-address cannot be a minter.", err.reason);
    }
    try {
      await heoTokenInstance.removeBurner("0x0000000000000000000000000000000000000000", {from: ownerAccount});
      assert.fail("Should not be able to remove zero address as burner.");
    } catch (err) {
      assert.equal("HEOToken: zero-address cannot be a burner.", err.reason);
    }
    let isZeroMinter = await heoTokenInstance.isMinter.call("0x0000000000000000000000000000000000000000");
    assert.isNotTrue(isZeroMinter, "Zero address should not be a minter");
    let isZeroBurner = await heoTokenInstance.isBurner.call("0x0000000000000000000000000000000000000000");
    assert.isNotTrue(isZeroBurner, "Zero address should not be a burner");

    try {
      await heoTokenInstance.addMinter("0x87567B3c1a5B66f4F0432FfB428a93f238a9180d", {from: rogueAccount});
      assert.fail("Non-owner should not be able to add minter.");
    } catch (err) {
      assert.equal("Ownable: caller is not the owner", err.reason, "Wrong error message: " + err.reason);
    }

    try {
      await heoTokenInstance.removeMinter("0x87567B3c1a5B66f4F0432FfB428a93f238a9180d", {from: rogueAccount});
      assert.fail("Non-owner should not be able to remove minter.");
    } catch (err) {
      assert.equal("Ownable: caller is not the owner", err.reason, "Wrong error message: " + err.reason);
    }
    try {
      await heoTokenInstance.addBurner("0x87567B3c1a5B66f4F0432FfB428a93f238a9180d", {from: rogueAccount});
      assert.fail("Non-owner should not be able to add burner.");
    } catch (err) {
      assert.equal("Ownable: caller is not the owner", err.reason, "Wrong error message: " + err.reason);
    }
    try {
      await heoTokenInstance.removeBurner("0x87567B3c1a5B66f4F0432FfB428a93f238a9180d", {from: rogueAccount});
      assert.fail("Non-owner should not be able to remove burner.");
    } catch (err) {
      assert.equal("Ownable: caller is not the owner", err.reason, "Wrong error message: " + err.reason);
    }

    await heoTokenInstance.addMinter("0x87567B3c1a5B66f4F0432FfB428a93f238a9180d", {from: ownerAccount});
    var isMinter = await heoTokenInstance.isMinter.call("0x87567B3c1a5B66f4F0432FfB428a93f238a9180d");
    assert.isTrue(isMinter, "Should have added a minter");

    await heoTokenInstance.addBurner("0x87567B3c1a5B66f4F0432FfB428a93f238a9180d", {from: ownerAccount});
    var isBurner = await heoTokenInstance.isBurner.call("0x87567B3c1a5B66f4F0432FfB428a93f238a9180d");
    assert.isTrue(isBurner, "Should have added a burner");

    await heoTokenInstance.removeMinter("0x87567B3c1a5B66f4F0432FfB428a93f238a9180d", {from: ownerAccount});
    isMinter = await heoTokenInstance.isMinter.call("0x87567B3c1a5B66f4F0432FfB428a93f238a9180d");
    assert.isNotTrue(isMinter, "Should have removed minter");

    await heoTokenInstance.removeBurner("0x87567B3c1a5B66f4F0432FfB428a93f238a9180d", {from: ownerAccount});
    isBurner = await heoTokenInstance.isBurner.call("0x87567B3c1a5B66f4F0432FfB428a93f238a9180d");
    assert.isNotTrue(isBurner, "Should have removed burner");
  })

  it("should mint from multiple instances of HEOManualDistribution", async () => {
    const heoTokenInstance = await HEOToken.deployed();
    const privateSaleInstance = await HEOManualDistribution.new(85000, 0, "Private Sale", HEOToken.address);
    const bountyInstance = await HEOManualDistribution.new(5000, 0, "Bounty", HEOToken.address);
    const charityInstance = await HEOManualDistribution.new(10000, 0, "Charity", HEOToken.address);

    const ownerAccount = accounts[0];
    const investorAccount = accounts[1];
    const hackerAccount = accounts[2];
    const charityAccount = accounts[3];

    await heoTokenInstance.addMinter(privateSaleInstance.address, {from: ownerAccount});
    await heoTokenInstance.addMinter(bountyInstance.address, {from: ownerAccount});
    await heoTokenInstance.addMinter(charityInstance.address, {from: ownerAccount});

    //save balances before distribution
    const investorBalanceBefore = (await heoTokenInstance.balanceOf.call(investorAccount)).toNumber();
    const hackerBalanceBefore = (await heoTokenInstance.balanceOf.call(hackerAccount)).toNumber();
    const charityBalanceBefore = (await heoTokenInstance.balanceOf.call(charityAccount)).toNumber();

    //save distribution counters before distribution
    const bountyDistributedBefore = (await bountyInstance.distributed.call()).toNumber();
    const charityDistributedBefore = (await charityInstance.distributed.call()).toNumber();
    const privateSaleSoldBefore = (await privateSaleInstance.distributed.call()).toNumber();

    const totalSupplyBefore = (await heoTokenInstance.totalSupply.call()).toNumber();

    //make sure nothing has been minted yet
    assert.equal(privateSaleSoldBefore, 0);
    assert.equal(charityDistributedBefore, 0);
    assert.equal(bountyDistributedBefore, 0);

    assert.equal(investorBalanceBefore, 0);
    assert.equal(hackerBalanceBefore, 0);
    assert.equal(charityBalanceBefore, 0);

    assert.equal(totalSupplyBefore, 0);

    //mint and distributie Private Sale, Charity, and Bounty tokens
    const investorAmount = 100;
    const charityAmount = 13;
    const bountyAmount = 12;
    const totalDistributed = investorAmount + charityAmount + bountyAmount;
    await privateSaleInstance.distribute(investorAccount, investorAmount, { from: ownerAccount });
    await charityInstance.distribute(charityAccount, charityAmount, { from: ownerAccount });
    await bountyInstance.distribute(hackerAccount, bountyAmount, { from: ownerAccount });

    //check balances after distributing
    const investorBalanceAfter = (await heoTokenInstance.balanceOf.call(investorAccount)).toNumber();
    const hackerBalanceAfter = (await heoTokenInstance.balanceOf.call(hackerAccount)).toNumber();
    const charityBalanceAfter = (await heoTokenInstance.balanceOf.call(charityAccount)).toNumber();

    //check distribution counters after distributing
    const bountyDistributedAfter = (await bountyInstance.distributed.call()).toNumber();
    const charityDistributedAfter = (await charityInstance.distributed.call()).toNumber();
    const privateSaleSoldAfter = (await privateSaleInstance.distributed.call()).toNumber();

    const totalSupplyAfter = (await heoTokenInstance.totalSupply.call()).toNumber();

    //make sure numbers add up
    assert.equal(bountyDistributedAfter, bountyAmount, "Wrong number of distributed bounty tokens.");
    assert.equal(charityDistributedAfter, charityAmount, "Wrong number of distributed charity tokens.");
    assert.equal(privateSaleSoldAfter, investorAmount, "Wrong number of distributed investor tokens.");

    assert.equal(hackerBalanceAfter, bountyAmount, "Wrong balance of bounty tokens after distribution.");
    assert.equal(charityBalanceAfter, charityAmount, "Wrong balance of charity tokens after distribution.");
    assert.equal(investorBalanceAfter, investorAmount, "Wrong balance of investor tokens after distribution.");

    assert.equal(totalSupplyAfter, totalDistributed, "Wrong total supply after distribution.");
  });
});
