const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEOToken = artifacts.require("HEOToken");
const BN = web3.utils.BN;
contract("HEOPriceOracle", (accounts) => {
    it("should save price for 0-address", async() => {
        assert.isTrue(web3.utils.isAddress('0x0000000000000000000000000000000000000000'));
        const iPriceOracle = await HEOPriceOracle.deployed();
        const iToken = await HEOToken.deployed();
        await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei("1"));
        var price = await iPriceOracle.getPrice.call('0x0000000000000000000000000000000000000000');
        assert.equal(web3.utils.toWei("1"), price, "wrong price");
        assert.equal(1, web3.utils.fromWei(price), "bad price conversion");
    });

    it("should save price for non zero-address", async() => {
        assert.isTrue(web3.utils.isAddress('0xad6d458402f60fd3bd25163575031acdce07538d'));
        const iPriceOracle = await HEOPriceOracle.deployed();
        const iToken = await HEOToken.deployed();
        await iPriceOracle.setPrice('0xad6d458402f60fd3bd25163575031acdce07538d', web3.utils.toWei("100"));
        var price = await iPriceOracle.getPrice.call('0xad6d458402f60fd3bd25163575031acdce07538d');
        assert.equal(web3.utils.toWei("100"), price, "wrong price");
        assert.equal(100, web3.utils.fromWei(price), "bad price conversion");
    });
});