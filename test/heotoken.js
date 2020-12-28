const HEOToken = artifacts.require("HEOToken");

contract('HEOToken', (accounts) => {
  it('should initialize correctly', async () => {
    const heoTokenInstance = await HEOToken.deployed();
    const balance = await heoTokenInstance.balanceOf.call(accounts[0]);

    assert.equal(balance.valueOf(), 0, "Expecting 0 HEO in the first account");

    const maxSupply = await heoTokenInstance.maxSupply.call();
    assert.equal(maxSupply, 30000000, "Expecting maxSupply to be 30M");

    const totalSupply = await heoTokenInstance.totalSupply.call();
    assert.equal(totalSupply, 0, "Expecting totalSupply to be 0");

    const owner = await heoTokenInstance.owner.call();
    assert.equal(owner, accounts[0], "accounts[0] should be the owner");

    const privateSaleLimit = await heoTokenInstance.privateSaleLimit.call();
    assert.equal(privateSaleLimit, 85000, "Expecting private sale limit to be set to 85000");

    const publicSaleLimit = await heoTokenInstance.publicSaleLimit.call();
    assert.equal(publicSaleLimit, 900000, "Expecting public sale limit to be set to 900000");

    const charityLimit = await heoTokenInstance.charityLimit.call();
    assert.equal(charityLimit, 10000, "Expecting charity limit to be set to 10000");

    const bountyLimit = await heoTokenInstance.bountyLimit.call();
    assert.equal(bountyLimit, 5000, "Expecting bounty limit to be set to 5000");

    const privateSaleSold = await heoTokenInstance.privateSaleSold.call();
    assert.equal(privateSaleSold, 0, "Expecting number of tokens sold on private sale to be 0");
  });

  it('should mint HEO tokens via private sale', async () => {
    const heoTokenInstance = await HEOToken.deployed();

    // Setup 2 accounts.
    const accountOne = accounts[0];
    const accountTwo = accounts[1];

    // Get initial balances of first and second account.
    const accountOneStartingBalance = (await heoTokenInstance.balanceOf.call(accountOne)).toNumber();
    const accountTwoStartingBalance = (await heoTokenInstance.balanceOf.call(accountTwo)).toNumber();
    const totalSupplyBefore = (await heoTokenInstance.totalSupply.call()).toNumber();

    assert.equal(accountOneStartingBalance, 0, "Owner should have 0 HEO");
    assert.equal(accountTwoStartingBalance, 0, "Investor should have 0 HEO before investing");

    // Make transaction from first account to second.
    const amount = 10;
    await heoTokenInstance.mintPrivate(accountTwo, amount, { from: accountOne });

    // Get balances of first and second account after the transactions.
    const accountOneEndingBalance = (await heoTokenInstance.balanceOf.call(accountOne)).toNumber();
    const accountTwoEndingBalance = (await heoTokenInstance.balanceOf.call(accountTwo)).toNumber();

    assert.equal(accountOneEndingBalance, 0, "Owner should have 0 HEO");
    assert.equal(accountTwoEndingBalance, amount, "Investor should have 10 HEO after investing");

    const privateSaleSold = (await heoTokenInstance.privateSaleSold.call()).toNumber();
    assert.equal(privateSaleSold, amount, "Expecting number of tokens sold on private sale to be 10");

    var totalSupplyAfter = (await heoTokenInstance.totalSupply.call()).toNumber();
    assert.equal(totalSupplyAfter, totalSupplyBefore+amount, "Expecting totalSupply to increase by 10");
  });

  it('should mint HEO tokens via bounty', async () => {
    const heoTokenInstance = await HEOToken.deployed();

    // Setup 2 accounts.
    const accountOne = accounts[0];
    const accountThree = accounts[2];

    // Get initial balances of first and second account.
    const accountOneStartingBalance = (await heoTokenInstance.balanceOf.call(accountOne)).toNumber();
    const accountThreeStartingBalance = (await heoTokenInstance.balanceOf.call(accountThree)).toNumber();
    const totalSupplyBefore = (await heoTokenInstance.totalSupply.call()).toNumber();
    const privateSaleSoldBefore = (await heoTokenInstance.privateSaleSold.call()).toNumber();

    assert.equal(accountOneStartingBalance, 0, "Owner should have 0 HEO");
    assert.equal(accountThreeStartingBalance, 0, "Hacker should have 0 HEO before getting the bounty");

    // Make transaction from first account to third.
    const amount = 5;
    await heoTokenInstance.mintBounty(accountThree, amount, { from: accountOne });

    // Get balances of first and second account after the transactions.
    const accountOneEndingBalance = (await heoTokenInstance.balanceOf.call(accountOne)).toNumber();
    const accountThreeEndingBalance = (await heoTokenInstance.balanceOf.call(accountThree)).toNumber();

    assert.equal(accountOneEndingBalance, 0, "Owner should have 0 HEO");
    assert.equal(accountThreeEndingBalance, amount, "Hacker should have 5 HEO after getting the bounty");

    const bountyDistributed = (await heoTokenInstance.bountyDistributed.call()).toNumber();
    assert.equal(bountyDistributed, amount, "Expecting number of tokens distributed via bounty to be 5");

    const privateSaleSoldAfter = (await heoTokenInstance.privateSaleSold.call()).toNumber();
    assert.equal(privateSaleSoldAfter, privateSaleSoldBefore, "Expecting privateSaleSold to not change");

    var totalSupplyAfter = (await heoTokenInstance.totalSupply.call()).toNumber();
    assert.equal(totalSupplyAfter, totalSupplyBefore+amount, "Expecting totalSupply to increase by 5");
  });

  it("Should enforce token limits", async () => {
    const heoTokenInstance = await HEOToken.deployed();
    // Setup 2 accounts.
    const accountOne = accounts[0];
    const accountTwo = accounts[1];
    const accountThree = accounts[2];
    const accountFour = accounts[3];

    //save values before failure
    const accountOneBalanceBefore = (await heoTokenInstance.balanceOf.call(accountOne)).toNumber();
    const accountTwoBalanceBefore = (await heoTokenInstance.balanceOf.call(accountTwo)).toNumber();
    const accountThreeBalanceBefore = (await heoTokenInstance.balanceOf.call(accountThree)).toNumber();
    const accountFourBalanceBefore = (await heoTokenInstance.balanceOf.call(accountFour)).toNumber();
    const privateSaleSoldBefore = (await heoTokenInstance.privateSaleSold.call()).toNumber();
    const bountyDistributedBefore = (await heoTokenInstance.bountyDistributed.call()).toNumber();
    const charityDistributedBefore = (await heoTokenInstance.charityDistributed.call()).toNumber();
    const totalSupplyBefore = (await heoTokenInstance.totalSupply.call()).toNumber();

    // Try minting too many private sale tokens
    var amount = 84999;
    try {
      await heoTokenInstance.mintPrivate(accountTwo, amount, { from: accountOne });
      assert.fail("should fail to mint more tokens than allowed to private sale")
    } catch (err) {
      assert.equal("HEOToken: exceeded private sale limit", err.reason, err.reason);
    }

    // Try minting zero private sale tokens
    amount = 0;
    try {
      await heoTokenInstance.mintPrivate(accountTwo, amount, { from: accountOne });
      assert.fail("should fail to mint more tokens than allowed to private sale")
    } catch (err) {
      assert.equal("HEOToken: cannot sell 0 or less tokens", err.reason, err.reason);
    }

    // Try minting negative private sale tokens
    amount = -1;
    try {
      await heoTokenInstance.mintPrivate(accountTwo, amount, { from: accountOne });
      assert.fail("should fail to mint more tokens than allowed to private sale")
    } catch (err) {
      assert.equal("value out-of-bounds", err.reason, err.reason);
    }

    const accountOneBalanceAfter = (await heoTokenInstance.balanceOf.call(accountOne)).toNumber();
    const accountTwoBalanceAfter = (await heoTokenInstance.balanceOf.call(accountTwo)).toNumber();
    assert.equal(accountOneBalanceAfter, accountOneBalanceBefore, "Owner's balance should not change after failure");
    assert.equal(accountTwoBalanceAfter, accountTwoBalanceBefore, "Investor's balance should not change after failure");
    const privateSaleSoldAfter = (await heoTokenInstance.privateSaleSold.call()).toNumber();
    assert.equal(privateSaleSoldBefore, privateSaleSoldAfter, "Expecting number of tokens sold on private sale to not change after failure");
    var totalSupplyAfter = (await heoTokenInstance.totalSupply.call()).toNumber();
    assert.equal(totalSupplyAfter, totalSupplyBefore, "Expecting totalSupply to not change after failure");

    // Try minting too many bounty tokens
    amount = 5998;
    try {
      await heoTokenInstance.mintBounty(accountThree, amount, { from: accountOne });
      assert.fail("should fail to mint more tokens than allowed for bounty")
    } catch (err) {
      assert.equal("HEOToken: exceeded total bounty limit", err.reason, err.reason);
    }

    // Try minting zero bounty tokens
    amount = 0;
    try {
      await heoTokenInstance.mintBounty(accountThree, amount, { from: accountOne });
      assert.fail("should fail to mint zero tokens for bounty")
    } catch (err) {
      assert.equal("HEOToken: cannot distribute 0 or less tokens", err.reason, err.reason);
    }

    // Try minting negative bounty tokens
    amount = -1;
    try {
      await heoTokenInstance.mintBounty(accountThree, amount, { from: accountOne });
      assert.fail("should fail to mint negative tokens for bounty")
    } catch (err) {
      assert.equal("value out-of-bounds", err.reason, err.reason);
    }

    const bountyDistributedAfter = (await heoTokenInstance.bountyDistributed.call()).toNumber();
    assert.equal(bountyDistributedBefore, bountyDistributedAfter, "Expecting number of tokens distributed as bounties to not change after failure");
    const accountThreeBalanceAfter = (await heoTokenInstance.balanceOf.call(accountThree)).toNumber();
    assert.equal(accountThreeBalanceAfter, accountThreeBalanceBefore, "Hacker's balance should not change after failure");
    totalSupplyAfter = (await heoTokenInstance.totalSupply.call()).toNumber();
    assert.equal(totalSupplyAfter, totalSupplyBefore, "Expecting totalSupply to not change after failure");

    // Try minting too many charity tokens
    amount = 10101;
    try {
      await heoTokenInstance.mintCharity(accountFour, amount, { from: accountOne });
      assert.fail("should fail to mint more tokens than allowed for charity")
    } catch (err) {
      assert.equal("HEOToken: exceeded total charity limit", err.reason, err.reason);
    }

    // Try minting zero charity tokens
    amount = 0;
    try {
      await heoTokenInstance.mintCharity(accountFour, amount, { from: accountOne });
      assert.fail("should fail to mint zero tokens for charity")
    } catch (err) {
      assert.equal("HEOToken: cannot distribute 0 or less tokens", err.reason, err.reason);
    }

    // Try minting negative charity tokens
    amount = -1;
    try {
      await heoTokenInstance.mintCharity(accountFour, amount, { from: accountOne });
      assert.fail("should fail to mint negative tokens for charity")
    } catch (err) {
      assert.equal("value out-of-bounds", err.reason, err.reason);
    }

    const charityDistributedAfter = (await heoTokenInstance.charityDistributed.call()).toNumber();
    assert.equal(charityDistributedBefore, charityDistributedAfter, "Expecting number of tokens distributed to charity to not change after failure");
    const accountFourBalanceAfter = (await heoTokenInstance.balanceOf.call(accountFour)).toNumber();
    assert.equal(accountFourBalanceAfter, accountFourBalanceBefore, "Charity's balance should not change after failure");
    totalSupplyAfter = (await heoTokenInstance.totalSupply.call()).toNumber();
    assert.equal(totalSupplyAfter, totalSupplyBefore, "Expecting totalSupply to not change after failure");
  });

  it('should mint HEO tokens to charity', async () => {
    const heoTokenInstance = await HEOToken.deployed();

    // Setup 2 accounts.
    const accountOne = accounts[0];
    const accountFour = accounts[3];

    // Get initial balances of first and second account.
    const accountOneStartingBalance = (await heoTokenInstance.balanceOf.call(accountOne)).toNumber();
    const accountFourStartingBalance = (await heoTokenInstance.balanceOf.call(accountFour)).toNumber();
    const totalSupplyBefore = (await heoTokenInstance.totalSupply.call()).toNumber();

    assert.equal(accountOneStartingBalance, 0, "Owner should have 0 HEO");
    assert.equal(accountFourStartingBalance, 0, "Charity should have 0 HEO before getting the distribution");

    // Make transaction from first account to third.
    const amount = 20;
    await heoTokenInstance.mintCharity(accountFour, amount, { from: accountOne });

    // Get balances of first and second account after the transactions.
    const accountOneEndingBalance = (await heoTokenInstance.balanceOf.call(accountOne)).toNumber();
    const accountFourEndingBalance = (await heoTokenInstance.balanceOf.call(accountFour)).toNumber();

    assert.equal(accountOneEndingBalance, 0, "Owner should have 0 HEO");
    assert.equal(accountFourEndingBalance, amount, "Charity should have 20 HEO after getting the distribution");

    const charityDistributed = (await heoTokenInstance.charityDistributed.call()).toNumber();
    assert.equal(charityDistributed, amount, "Expecting number of tokens distributed to charity to be 20");

    var totalSupplyAfter = (await heoTokenInstance.totalSupply.call()).toNumber();
    assert.equal(totalSupplyAfter, totalSupplyBefore+amount, "Expecting totalSupply to increase by 20");
  });
});
