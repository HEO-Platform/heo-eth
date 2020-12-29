const HEOToken = artifacts.require("HEOToken");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");

contract('HEOManualDistribution', (accounts) => {
    it('should initialize correctly', async () => {
        let privateSaleInstance = await HEOManualDistribution.deployed();
        let privateSaleLimit = await privateSaleInstance.limit.call();
        assert.equal(privateSaleLimit, 85000, "Expecting private sale limit to be set to 85000");
        var distributed = await privateSaleInstance.distributed.call();
        assert.equal(distributed, 0, "Expecting number of tokens sold on private sale to be 0");
        var contractName = await privateSaleInstance.name.call();
        assert.equal("Private Sale", contractName, "Wrong contract name: " + contractName);

        let bountyInstance = await HEOManualDistribution.new(5000, 0, "Bounty", HEOToken.address)
        let bountyLimit = await bountyInstance.limit.call();
        assert.equal(bountyLimit, 5000, "Expecting bounty limit to be set to 5000");
        distributed = await bountyInstance.distributed.call();
        assert.equal(distributed, 0, "Expecting number of tokens distributed for bounty to be 0");
        contractName = await bountyInstance.name.call();
        assert.equal("Bounty", contractName, "Wrong contract name: " + contractName);
    });

    it('should enforce access control when minting', async () => {
        let ownerAccount = accounts[0];
        let investorAccount = accounts[1];
        let hackerAccount = accounts[2];
        let privateSaleInstance = await HEOManualDistribution.deployed();
        let heoTokenInstance = await HEOToken.deployed();
        try {
            await privateSaleInstance.distribute(investorAccount, 10);
            assert.fail("Should throw an error when trying to mint tokens as non-minter")
        } catch (err) {
            assert.equal("HEOToken: caller must be a minter contract.", err.reason, "Wrong error message");
        }
        await heoTokenInstance.addMinter(privateSaleInstance.address, {from: ownerAccount});
        try {
            await privateSaleInstance.distribute(investorAccount, 10, {from: investorAccount});
            assert.fail("Should throw an error when trying to mint tokens as investor")
        } catch (err) {
            assert.equal("Ownable: caller is not the owner", err.reason, "Wrong error message");
        }
        try {
            await privateSaleInstance.distribute(investorAccount, 10, {from: hackerAccount});
            assert.fail("Should throw an error when trying to mint tokens as investor")
        } catch (err) {
            assert.equal("Ownable: caller is not the owner", err.reason, "Wrong error message");
        }

        //should be able to distribute valid amount when called by owner
        var investorBalance = (await heoTokenInstance.balanceOf.call(investorAccount)).toNumber();
        await privateSaleInstance.distribute(investorAccount, 1, {from: ownerAccount});
        assert.equal(investorBalance, 0, "Investor should have 0 HEO tokens before distribution.");
        investorBalance = (await heoTokenInstance.balanceOf.call(investorAccount)).toNumber();
        assert.equal(investorBalance, 1, "Investor should have 1 HEO token after the first distribution.");

        //Burner cannot mint unless also minter
        let rogueInstance = await HEOManualDistribution.new(10000, 0, "Rogue", HEOToken.address);
        await heoTokenInstance.addBurner(rogueInstance.address, {from: ownerAccount});
        try {
            await rogueInstance.distribute(investorAccount, 10);
            assert.fail("Should throw an error when trying to mint tokens as non-minter")
        } catch (err) {
            assert.equal("HEOToken: caller must be a minter contract.", err.reason, "Wrong error message");
        }

        //Burner can distribute if also a minter
        await heoTokenInstance.addMinter(rogueInstance.address, {from: ownerAccount});
        await rogueInstance.distribute(investorAccount, 1);
        investorBalance = (await heoTokenInstance.balanceOf.call(investorAccount)).toNumber();
        assert.equal(investorBalance, 2, "Investor should have 2 HEO tokens after the second distribution.");
    });

    it('should be able to mint HEOToken', async () => {
        let ownerAccount = accounts[0];
        let investorAccount = accounts[4];

        let privateSaleInstance = await HEOManualDistribution.deployed();
        let heoTokenInstance = await HEOToken.deployed();

        // Get initial balances of first and second account.
        let ownerStartingBalance = (await heoTokenInstance.balanceOf.call(ownerAccount)).toNumber();
        let investorStartingBalance = (await heoTokenInstance.balanceOf.call(investorAccount)).toNumber();
        let totalSupplyBefore = (await heoTokenInstance.totalSupply.call()).toNumber();
        let distributedBefore = (await privateSaleInstance.distributed.call()).toNumber();

        assert.equal(ownerStartingBalance, 0, "Owner should have 0 HEO");
        assert.equal(investorStartingBalance, 0, "Investor should have 0 HEO before investing");

        let amount = 20;
        await heoTokenInstance.addMinter(privateSaleInstance.address, {from: ownerAccount});
        await privateSaleInstance.distribute(investorAccount, amount);

        // Get balances of first and second account after the transactions.
        let ownerEndingBalance = (await heoTokenInstance.balanceOf.call(ownerAccount)).toNumber();
        let investorEndingBalance = (await heoTokenInstance.balanceOf.call(investorAccount)).toNumber();
        let distributedAfter = (await privateSaleInstance.distributed.call()).toNumber();
        let totalSupplyAfter = (await heoTokenInstance.totalSupply.call()).toNumber();
        assert.equal(ownerEndingBalance, 0, "Owner should still have 0 HEO");
        assert.equal(investorEndingBalance, amount, "Investor should have 20 HEO after investing");
        assert.equal(distributedAfter, amount + distributedBefore, "Expecting number of tokens sold on private sale to be " + (distributedBefore + amount));
        assert.equal(totalSupplyAfter, totalSupplyBefore + amount, "Expecting totalSupply to increase by " + (totalSupplyBefore + amount));
    });

    it('should enforce token limits', async () => {
        let ownerAccount = accounts[0];
        let investorAccount = accounts[1];

        //save values before failure
        let privateSaleInstance = await HEOManualDistribution.deployed();
        let heoTokenInstance = await HEOToken.deployed();

        // Get initial balances of first and second account.
        let ownerStartingBalance = (await heoTokenInstance.balanceOf.call(ownerAccount)).toNumber();
        let investorStartingBalance = (await heoTokenInstance.balanceOf.call(investorAccount)).toNumber();
        let totalSupplyBefore = (await heoTokenInstance.totalSupply.call()).toNumber();
        let distributedBefore = (await privateSaleInstance.distributed.call()).toNumber();

        // Try minting too many private sale tokens
        var amount = 84999;
        try {
            await privateSaleInstance.distribute(investorAccount, amount, {from: ownerAccount});
            assert.fail("should fail to mint more tokens than allowed to private sale")
        } catch (err) {
            assert.equal("HEOManualDistribution: exceeded distribution limit.", err.reason, err.reason);
        }

        // Try minting zero private sale tokens
        amount = 0;
        try {
            await privateSaleInstance.distribute(investorAccount, amount, {from: ownerAccount});
            assert.fail("should fail to mint more tokens than allowed to private sale")
        } catch (err) {
            assert.equal("HEOManualDistribution: cannot distribute 0 or less tokens.", err.reason, err.reason);
        }

        // Try minting negative private sale tokens
        amount = -1;
        try {
            await privateSaleInstance.distribute(investorAccount, amount, {from: ownerAccount});
            assert.fail("should fail to mint more tokens than allowed to private sale")
        } catch (err) {
            assert.equal("value out-of-bounds", err.reason, err.reason);
        }

        let ownerBalanceAfter = (await heoTokenInstance.balanceOf.call(ownerAccount)).toNumber();
        let investorBalanceAfter = (await heoTokenInstance.balanceOf.call(investorAccount)).toNumber();
        let distributedAfter = (await privateSaleInstance.distributed.call()).toNumber();
        let totalSupplyAfter = (await heoTokenInstance.totalSupply.call()).toNumber();

        assert.equal(ownerBalanceAfter, ownerStartingBalance, "Owner's balance should not change after failure");
        assert.equal(investorBalanceAfter, investorStartingBalance, "Investor's balance should not change after failure");
        assert.equal(distributedBefore, distributedAfter, "Expecting number of tokens sold on private sale to not change after failure");
        assert.equal(totalSupplyAfter, totalSupplyBefore, "Expecting totalSupply to not change after failure");
    });
});