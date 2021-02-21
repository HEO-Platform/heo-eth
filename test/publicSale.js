const HEOToken = artifacts.require("HEOToken");
const HEOPublicSale = artifacts.require("HEOPublicSale");
const StableCoinForTests = artifacts.require("StableCoinForTests");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
var BN = web3.utils.BN;
var iTestCoin, ownerAccount, charityAccount, investorAccount, iToken, iPublicSale, iPriceOracle;
contract("HEOPublicSale", (accounts) => {
    before(async () => {
        ownerAccount = accounts[0];
        charityAccount = accounts[1];
        investorAccount = accounts[3];
        iToken = await HEOToken.deployed();
        iTestCoin = await StableCoinForTests.new("TUSD");
        await iTestCoin.transfer(charityAccount, web3.utils.toWei("10000"));
        iPriceOracle = await HEOPriceOracle.deployed();
        var iGlobalParams = await HEOGlobalParameters.deployed();
        iPublicSale = await HEOPublicSale.new(iTestCoin.address, iPriceOracle.address, iGlobalParams.address);
    });

    it("Should fail to sell 0 tokens.", async() => {
        var cCBB = await iTestCoin.balanceOf.call(charityAccount);
        var cHBB = await iToken.balanceOf.call(charityAccount);
        try {
            await iPublicSale.sellTokens(0, {from: charityAccount});
            assert.fail(`Should fail to buy 0 HEO`);
        } catch (err) {
            assert.equal(err.reason, "HEOPublicSale: cannot sell less than a full token.",
                `Wrong error message: ${err.reason}`);
        }
        var cCBA = await iTestCoin.balanceOf.call(charityAccount);
        var chBA = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(cCBB.eq(cCBA), `Charity stablecoin balance changed from ${cCBB} to ${cCBA}`);
        assert.isTrue(cHBB.eq(chBA), `Charity HEO balance changed from ${cHBB} to ${chBA}`);
    });

    it("Should fail to sell tokens if the price is not set.", async() => {
        var cCBB = await iTestCoin.balanceOf.call(charityAccount);
        var cHBB = await iToken.balanceOf.call(charityAccount);
        try {
            await iPublicSale.sellTokens(1, {from: charityAccount});
            assert.fail(`Should fail to buy HEO when price is not set`);
        } catch (err) {
            assert.equal(err.reason, "HEOPublicSale: HEO price cannot be 0.",
                `Wrong error message: ${err.reason}`);
        }
        var cCBA = await iTestCoin.balanceOf.call(charityAccount);
        var chBA = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(cCBB.eq(cCBA), `Charity stablecoin balance changed from ${cCBB} to ${cCBA}`);
        assert.isTrue(cHBB.eq(chBA), `Charity HEO balance changed from ${cHBB} to ${chBA}`);
    });

    it("Should fail to sell tokens if there are none left.", async() => {
        var cCBB = await iTestCoin.balanceOf.call(charityAccount);
        var cHBB = await iToken.balanceOf.call(charityAccount);
        iPriceOracle.setPrice(iToken.address, web3.utils.toWei("10"))
        try {
            await iPublicSale.sellTokens(1, {from: charityAccount});
            assert.fail(`Should fail to buy HEO if Public Sale contract has none`);
        } catch (err) {

        }
        var cCBA = await iTestCoin.balanceOf.call(charityAccount);
        var chBA = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(cCBB.eq(cCBA), `Charity stablecoin balance changed from ${cCBB} to ${cCBA}`);
        assert.isTrue(cHBB.eq(chBA), `Charity HEO balance changed from ${cHBB} to ${chBA}`);
    });

    it("Should fail to sell tokens if buyer did not set allowance.", async() => {
        var cCBB = await iTestCoin.balanceOf.call(charityAccount);
        var cHBB = await iToken.balanceOf.call(charityAccount);
        iPriceOracle.setPrice(iToken.address, web3.utils.toWei("10"));
        iToken.addMinter(ownerAccount);
        iToken.mint(iPublicSale.address, web3.utils.toWei("900000"));
        try {
            await iPublicSale.sellTokens(1, {from: charityAccount});
            assert.fail(`Should fail to buy HEO without setting spending allowance.`);
        } catch (err) {

        }
        var cCBA = await iTestCoin.balanceOf.call(charityAccount);
        var chBA = await iToken.balanceOf.call(charityAccount);
        assert.isTrue(cCBB.eq(cCBA), `Charity stablecoin balance changed from ${cCBB} to ${cCBA}`);
        assert.isTrue(cHBB.eq(chBA), `Charity HEO balance changed from ${cHBB} to ${chBA}`);
    });

    it("Should sell tokens.", async() => {
        var cCBB = parseInt(web3.utils.fromWei(await iTestCoin.balanceOf.call(charityAccount)));
        var cHBB = parseInt(web3.utils.fromWei(await iToken.balanceOf.call(charityAccount)));
        await iPriceOracle.setPrice(iTestCoin.address, web3.utils.toWei("10"));
        await iToken.addMinter(ownerAccount);
        await iToken.mint(iPublicSale.address, web3.utils.toWei("900000"));
        await iTestCoin.approve(iPublicSale.address, web3.utils.toWei("10"), {from: charityAccount});
        try {
            await iPublicSale.sellTokens(1, {from: charityAccount});
        } catch (err) {
            console.log(err);
            assert.fail(`Should not fail to sell tokens.`);
        }
        var cCBA = parseInt(web3.utils.fromWei(await iTestCoin.balanceOf.call(charityAccount)));
        var chBA = parseInt(web3.utils.fromWei(await iToken.balanceOf.call(charityAccount)));
        assert.equal(cCBB-10, cCBA, `Charity stablecoin balance changed from ${cCBB} to ${cCBA}`);
        assert.equal(cHBB+1, chBA, `Charity coin balance changed from ${cHBB} to ${chBA}`);
        const saleToken = await iPublicSale.currency();
        assert.equal(iTestCoin.address, saleToken, `Expecting currency of public sale to be ${iTestCoin.address}, but found ${saleToken}`);
    });
});