const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
contract("", () => {
    it("should initialize correctly", async() => {
        const iGlobalParams = await HEOGlobalParameters.new(1, 5, 10, 86400, 365);
        var x = await iGlobalParams.profitabilityCoefficient.call();
        assert.equal(x, 5);
        var fee = await iGlobalParams.serviceFee.call();
        assert.equal(fee, 1);
        var yDecimals = await iGlobalParams.yDecimals.call();
        assert.equal(yDecimals, 10);
    });
});