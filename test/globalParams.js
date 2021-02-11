const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const HEOToken = artifacts.require("HEOToken");
contract("", () => {
    it("should initialize correctly", async() => {

        const iGlobalParams = await HEOGlobalParameters.new(1, 5, 86400, 365, HEOToken.address);
        var x = await iGlobalParams.profitabilityCoefficient.call();
        assert.equal(x, 5);
        var fee = await iGlobalParams.serviceFee.call();
        assert.equal(fee, 1);
    });
});