const HEOBudget = artifacts.require("HEOBudget");
const StableCoinForTests = artifacts.require("StableCoinForTests");
const timeMachine = require('ganache-time-traveler');
var budgetOwner, coinOwner, treasurer, user1, budgetInstance, altCoin;
const BN = web3.utils.BN;
contract("HEOBudget", (accounts) => {
    beforeEach(async () => {
        budgetOwner = accounts[0];
        coinOwner = accounts[1];
        treasurer = accounts[2];
        user1 = accounts[3];
        budgetInstance = await HEOBudget.new(treasurer, {from: budgetOwner});
        altCoin = await StableCoinForTests.new("USDC", {from: coinOwner});
        await altCoin.transfer(budgetInstance.address, web3.utils.toWei("100"), {from: coinOwner});
        await web3.eth.sendTransaction({from: budgetOwner, to: budgetInstance.address, value: web3.utils.toWei("5")});
    });

    it("Only owner should be able assign treasurer", async () => {
        let currentTreasurer = await budgetInstance.treasurer.call();
        assert.equal(currentTreasurer, treasurer, `Expecting treasurer to be ${treasurer} but found ${currentTreasurer}`);
        try {
            await budgetInstance.assignTreasurer(coinOwner, {from: treasurer});
            assert.fail("Should have thrown an exception when treasurer tries to assign a new treasurer")
        } catch (err) {
            assert.equal(err.reason,
                "HEOBudget: caller is not the owner", `Wrong error message ${err}`);
        }
        currentTreasurer = await budgetInstance.treasurer.call();
        assert.equal(currentTreasurer, treasurer, `Expecting treasurer to be ${treasurer} but found ${currentTreasurer}`);
        try {
            await budgetInstance.assignTreasurer(budgetOwner, {from: user1});
            assert.fail("Should have thrown an exception when user1 tries to assign a new treasurer")
        } catch (err) {
            assert.equal(err.reason,
                "HEOBudget: caller is not the owner", `Wrong error message ${err}`);
        }
        currentTreasurer = await budgetInstance.treasurer.call();
        assert.equal(currentTreasurer, treasurer, `Expecting treasurer to be ${treasurer} but found ${currentTreasurer}`);
        try {
            await budgetInstance.assignTreasurer(user1, {from: budgetOwner});
        } catch (err) {
            assert.fail(`budget owner should be able to assign treasurer. Error: ${err}`);
        }
        currentTreasurer = await budgetInstance.treasurer.call();
        assert.equal(currentTreasurer, user1, `Expecting treasurer to be ${user1} but found ${currentTreasurer}`);
    });

    it("Only owner should be able to withdraw all funds", async () => {
        let nativeBalance = new BN(await web3.eth.getBalance(budgetInstance.address));
        assert.isTrue(nativeBalance.eq(new BN(web3.utils.toWei("5"))),
            `Expecting budget contract to have ${web3.utils.toWei("5")} native coins, but found ${nativeBalance}`);
        let budgetBalance = await altCoin.balanceOf.call(budgetInstance.address);
        assert.isTrue(new BN(web3.utils.toWei("100")).eq(budgetBalance),
            `Expecting budget contract to have ${web3.utils.toWei("100")} USDC, but found ${budgetBalance}`);
        let before = (await altCoin.balanceOf.call(treasurer)).toNumber();
        try {
            await budgetInstance.withdraw(altCoin.address, {from: treasurer});
            assert.fail("Should have thrown an exception when treasurer tries to withdraw balance")
        } catch (err) {
            assert.equal(err.reason,
                "HEOBudget: caller is not the owner", `Wrong error message ${err}`);
        }
        let after = (await altCoin.balanceOf.call(treasurer)).toNumber();
        assert.equal(after, before, `Treasurer's balance should not have changed from ${before} to ${after}`);
        try {
            await budgetInstance.withdraw(altCoin.address, {from: budgetOwner});
        } catch (err) {
            assert.fail(`budget owner should have succeeded withdrawing tokens. Error: ${err}`);
        }

        before = new BN(await web3.eth.getBalance(treasurer));
        try {
            await budgetInstance.withdraw("0x0000000000000000000000000000000000000000", {from: treasurer});
            assert.fail("Should have thrown an exception when treasurer tries to withdraw balance")
        } catch (err) {
            assert.equal(err.reason,
                "HEOBudget: caller is not the owner", `Wrong error message ${err}`);
        }
        after = new BN(await web3.eth.getBalance(treasurer));
        //native balance should descrease by the amount of gas spent
        assert.isTrue(after < before, `Treasurer's balance should not have increased from ${before} to ${after}`);
        before = new BN(await web3.eth.getBalance(budgetOwner));
        try {
            await budgetInstance.withdraw("0x0000000000000000000000000000000000000000", {from: budgetOwner});
        } catch (err) {
            assert.fail(`budget owner should have succeeded withdrawing native coins. Error: ${err}`);
        }
        after = new BN(await web3.eth.getBalance(budgetOwner));
        assert.isTrue(after > before, `Owner's balance should have increased from ${before} to ${after}`);
    });

    it("Only treasurer should be able to spend funds", async () => {
        let budgetBalance = await altCoin.balanceOf.call(budgetInstance.address);
        assert.isTrue(new BN(web3.utils.toWei("100")).eq(budgetBalance),
            `Expecting budget contract to have ${web3.utils.toWei("100")} USDC, but found ${budgetBalance}`);
        let before = (await altCoin.balanceOf.call(user1)).toNumber()
        try {
            await budgetInstance.sendTo(user1, altCoin.address, web3.utils.toWei("10"), {from: coinOwner});
            assert.fail("Should have thrown an exception when coinOwner tries to spend tokens")
        } catch (err) {
            assert.equal(err.reason,
                "HEOBudget: caller is not the treasurer", `Wrong error message ${err}`);
        }
        let after = (await altCoin.balanceOf.call(user1)).toNumber()
        assert.equal(after, before, `User's balance should not have changed from ${before} to ${after}`);

        try {
            await budgetInstance.sendTo(user1, altCoin.address, web3.utils.toWei("10"), {from: budgetOwner});
            assert.fail("Should have thrown an exception when budgetOwner tries to spend tokens")
        } catch (err) {
            assert.equal(err.reason,
                "HEOBudget: caller is not the treasurer", `Wrong error message ${err}`);
        }
        after = await altCoin.balanceOf.call(user1);
        assert.equal(after, before, `User's balance should not have changed from ${before} to ${after}`);

        try {
            await budgetInstance.sendTo(user1, altCoin.address, web3.utils.toWei("10"), {from: treasurer});
        } catch (err) {
            assert.fail(`Treasurer should have succeeded sending tokens to a user. Error: ${err}`);
        }
        after = await altCoin.balanceOf.call(user1);
        assert.equal(after, web3.utils.toWei("10"), `User's balance should be 10 USDC, but found ${after}`);

        before = new BN(await web3.eth.getBalance(user1));
        try {
            await budgetInstance.sendTo(user1, "0x0000000000000000000000000000000000000000", web3.utils.toWei("3"),
                {from: treasurer});
        } catch (err) {
            assert.fail(`Treasurer should have succeeded sending native coins to a user. Error: ${err}`);
        }
        after = new BN(await web3.eth.getBalance(user1));
        assert.isTrue(before.add(new BN(web3.utils.toWei("3"))).eq(after),
            `User's balance should have increased by 3 coins from ${before}, but found ${after}`);

        before = new BN(await web3.eth.getBalance(user1));
        try {
            await budgetInstance.sendTo(user1, "0x0000000000000000000000000000000000000000", web3.utils.toWei("2.5"),
                {from: treasurer});
            assert.fail("Should have thrown an exception when trying to overspend available coins")
        } catch (err) {
            assert.equal(err.reason,
                "HEOBudget: balance too low", `Wrong error message ${err}`);
        }
        after = new BN(await web3.eth.getBalance(user1));
        assert.isTrue(after.eq(before), `User's balance should have stayed ${before}, but became ${after}`);
    });
});
