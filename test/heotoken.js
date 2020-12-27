const HEOToken = artifacts.require("HEOToken");

contract('HEOToken', (accounts) => {
  it('should put 0 HEO in the first account', async () => {
    const heoTokenInstance = await HEOToken.deployed();
    const balance = await heoTokenInstance.getBalance.call(accounts[0]);

    assert.equal(balance.valueOf(), 0, "Expecting 0 HEO in the first account");
  });
  it('should send coin correctly', async () => {
    const heoTokenInstance = await HEOToken.deployed();

    // Setup 2 accounts.
    const accountOne = accounts[0];
    const accountTwo = accounts[1];

    // Get initial balances of first and second account.
    const accountOneStartingBalance = (await heoTokenInstance.getBalance.call(accountOne)).toNumber();
    const accountTwoStartingBalance = (await heoTokenInstance.getBalance.call(accountTwo)).toNumber();

    // Make transaction from first account to second.
    const amount = 10;
    await heoTokenInstance.sendCoin(accountTwo, amount, { from: accountOne });

    // Get balances of first and second account after the transactions.
    const accountOneEndingBalance = (await heoTokenInstance.getBalance.call(accountOne)).toNumber();
    const accountTwoEndingBalance = (await heoTokenInstance.getBalance.call(accountTwo)).toNumber();


    assert.equal(accountOneEndingBalance, accountOneStartingBalance - amount, "Amount wasn't correctly taken from the sender");
    assert.equal(accountTwoEndingBalance, accountTwoStartingBalance + amount, "Amount wasn't correctly sent to the receiver");
  });
});
