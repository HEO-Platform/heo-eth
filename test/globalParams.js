const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const BN = web3.utils.BN;
contract("HEOGlobalParameters", (accounts) => {
    it("should initialize correctly", async() => {
        const iGlobalParams = await HEOGlobalParameters.new(0, 20);
        var x = await iGlobalParams.profitabilityCoefficient.call();
        assert.equal(x, 20);
        var fee = await iGlobalParams.serviceFee.call();
        assert.equal(fee, 0);
    });
});