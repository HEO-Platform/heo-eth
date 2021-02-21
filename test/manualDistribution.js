const HEOToken = artifacts.require("HEOToken");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
var BN = web3.utils.BN;
contract('HEOManualDistribution', (accounts) => {
    it('should initialize correctly', async () => {
        let privateSaleInstance = await HEOManualDistribution.deployed();
        let privateSaleLimit = await privateSaleInstance.limit.call();
        assert.equal(privateSaleLimit,  web3.utils.toWei("85000"), "Expecting private sale limit to be set to 85000");
        var distributed = await privateSaleInstance.distributed.call();
        assert.equal(distributed, 0, "Expecting number of tokens sold on private sale to be 0");
        var contractName = await privateSaleInstance.name.call();
        assert.equal("Private Sale", contractName, "Wrong contract name: " + contractName);

        let bountyInstance = await HEOManualDistribution.new(web3.utils.toWei("5000"), 0, "Bounty", HEOToken.address)
        let bountyLimit = await bountyInstance.limit.call();
        assert.equal(new BN(bountyLimit).toString(), web3.utils.toWei("5000").toString(), "Expecting bounty limit to be set to " + web3.utils.toWei("5000"));
        distributed = await bountyInstance.distributed.call();
        assert.equal(distributed, 0, "Expecting number of tokens distributed for bounty to be 0");
        contractName = await bountyInstance.name.call();
        assert.equal("Bounty", contractName, "Wrong contract name: " + contractName);
    });

    it('should enforce access control when minting', async () => {
        let ownerAccount = accounts[0];
        let investorAccount = accounts[1];
        let hackerAccount = accounts[2];
        let privateSaleInstance = await HEOManualDistribution.new(web3.utils.toWei("85000"), 0, "Test", HEOToken.address)
        let heoTokenInstance = await HEOToken.deployed();
        try {
            await privateSaleInstance.distribute(investorAccount, 10);
            assert.fail("Should throw an error when trying to mint tokens as non-minter")
        } catch (err) {
//            console.log(err);
            assert.equal("HEOToken: caller must be a minter contract.", err.reason, "Wrong error message");
        }
        await heoTokenInstance.addMinter(privateSaleInstance.address, {from: ownerAccount});
        try {
            await privateSaleInstance.distribute(investorAccount, 10, {from: investorAccount});
            assert.fail("Should throw an error when trying to mint tokens as investor")
        } catch (err) {
//            console.log(err);
            assert.equal("Ownable: caller is not the owner", err.reason, "Wrong error message");
        }
        try {
            await privateSaleInstance.distribute(investorAccount, 10, {from: hackerAccount});
            assert.fail("Should throw an error when trying to mint tokens as investor")
        } catch (err) {
//            console.log(err);
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
            //console.log(err);
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
        let ownerStartingBalance = await heoTokenInstance.balanceOf.call(ownerAccount);
        let investorStartingBalance = await heoTokenInstance.balanceOf.call(investorAccount);
        let totalSupplyBefore = await heoTokenInstance.totalSupply.call();
        let distributedBefore = await privateSaleInstance.distributed.call();

        assert.isTrue(new BN("0").eq(ownerStartingBalance), "Owner should have 0 HEO. Found: " + ownerStartingBalance);
        assert.isTrue(new BN("0").eq(investorStartingBalance), "Investor should have 0 HEO before investing");

        let amount = web3.utils.toWei("20");
        await heoTokenInstance.addMinter(privateSaleInstance.address, {from: ownerAccount});
        await privateSaleInstance.distribute(investorAccount, amount);

        // Get balances of first and second account after the transactions.
        let ownerEndingBalance = await heoTokenInstance.balanceOf.call(ownerAccount);
        let investorEndingBalance = await heoTokenInstance.balanceOf.call(investorAccount);
        let distributedAfter = await privateSaleInstance.distributed.call();
        let totalSupplyAfter = await heoTokenInstance.totalSupply.call();
        assert.isTrue(new BN("0").eq(ownerEndingBalance), "Owner should still have 0 HEO");
        assert.isTrue(new BN(investorEndingBalance).eq(new BN(amount)), "Investor should have 20 HEO after investing. Instead, found: " + investorEndingBalance.toString());
        assert.isTrue(new BN(distributedAfter).eq(new BN(amount).add(new BN(distributedBefore))), "Expecting number of tokens sold on private sale to be " + new BN(distributedBefore).add(new BN(amount)).toString());
        assert.isTrue(new BN(totalSupplyAfter).eq(new BN(totalSupplyBefore).add(new BN(amount))), "Expecting totalSupply to increase by " + new BN(totalSupplyBefore).add(new BN(amount)).toString());
    });

    it('should enforce token limits', async () => {
        let ownerAccount = accounts[0];
        let investorAccount = accounts[1];

        //save values before failure
        let privateSaleInstance = await HEOManualDistribution.deployed();
        let heoTokenInstance = await HEOToken.deployed();

        // Get initial balances of first and second account.
        let ownerStartingBalance = await heoTokenInstance.balanceOf.call(ownerAccount);
        let investorStartingBalance = await heoTokenInstance.balanceOf.call(investorAccount);
        let totalSupplyBefore = await heoTokenInstance.totalSupply.call();
        let distributedBefore = await privateSaleInstance.distributed.call();

        // Try minting too many private sale tokens
        var amount =  web3.utils.toWei("84999");
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

        let ownerBalanceAfter = await heoTokenInstance.balanceOf.call(ownerAccount);
        let investorBalanceAfter = await heoTokenInstance.balanceOf.call(investorAccount);
        let distributedAfter = await privateSaleInstance.distributed.call();
        let totalSupplyAfter = await heoTokenInstance.totalSupply.call();

        assert.isTrue(new BN(ownerBalanceAfter).eq(new BN(ownerStartingBalance)), "Owner's balance should not change after failure");
        assert.isTrue(new BN(investorBalanceAfter).eq(new BN(investorStartingBalance)), "Investor's balance should not change after failure");
        assert.isTrue(new BN(distributedBefore).eq(new BN(distributedAfter)), "Expecting number of tokens sold on private sale to not change after failure");
        assert.isTrue(new BN(totalSupplyAfter).eq(new BN(totalSupplyBefore)), "Expecting totalSupply to not change after failure");
    });
});