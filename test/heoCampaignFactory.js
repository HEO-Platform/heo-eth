const HEOToken = artifacts.require("HEOToken");
const HEOCampaign = artifacts.require("HEOCampaign");
const HEOManualDistribution = artifacts.require("HEOManualDistribution");
const HEOCampaignFactory = artifacts.require("HEOCampaignFactory");
const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const HEOCampaignRegistry = artifacts.require("HEOCampaignRegistry");
var BN = web3.utils.BN;
contract("HEOCampaignFactory", (accounts) => {
  it("should deploy a campaign for raising 100 ETH", async() => {
      let ownerAccount = accounts[0];
      let charityAccount = accounts[1];
      //deploy contracts and set initial values
      const iRegistry = await HEOCampaignRegistry.deployed();
      const iToken = await HEOToken.deployed();
      const iGlobalParams = await HEOGlobalParameters.new(0, 20);
      const iPriceOracle = await HEOPriceOracle.new();
      const iDistribution = await HEOManualDistribution.deployed();
      await iPriceOracle.setPrice("0x0000000000000000000000000000000000000000", web3.utils.toWei("1", "ether"));
      const iCampaignFactory = await HEOCampaignFactory.new(iRegistry.address, iToken.address,
          iGlobalParams.address, iPriceOracle.address);
      await iRegistry.setFactory(iCampaignFactory.address);
      await iToken.addMinter(iDistribution.address, {from: ownerAccount});
      await iToken.addBurner(iCampaignFactory.address, {from: ownerAccount});
      //give 1 HEO to charityAccount
      await iDistribution.distribute(charityAccount, web3.utils.toWei("1"), {from: ownerAccount});
      //charityAccount should be able to start a campaign
      var myCampaigns = await iRegistry.getMyCampaigns.call({from: charityAccount});
      var countBefore = myCampaigns.length;
      assert.equal(0, countBefore, "Expecting to have 0 campaigns registered");
      await iCampaignFactory.createCampaign(web3.utils.toWei("100"), web3.utils.toWei("1"),
          "0x0000000000000000000000000000000000000000", {from: charityAccount});
      myCampaigns = await iRegistry.getMyCampaigns.call({from: charityAccount});
      var countAfter = myCampaigns.length;
      assert.equal(1, countAfter, "Should have one campaign registered.");
      var lastCampaign = myCampaigns[0];
      assert.isNotNull(lastCampaign);
      lastCampaign = await HEOCampaign.at(lastCampaign);
      assert.isNotNull(lastCampaign);
      var maxAmount = await lastCampaign.maxAmount.call();
      assert.isTrue(new BN(maxAmount).eq(new BN(web3.utils.toWei("100"))));
      var heoPrice = await lastCampaign.heoPrice.call();
      assert.isTrue(new BN(heoPrice).eq(new BN(web3.utils.toWei("1"))));
      var burntHeo = await lastCampaign.burntHeo.call();
      assert.isTrue(new BN(burntHeo).eq(new BN(web3.utils.toWei("1"))));
      var x = await lastCampaign.profitabilityCoefficient.call();
      assert.isTrue(new BN(x).eq(new BN("20")), "Expecting X = 20, but found " + x);
      var z = await lastCampaign.getZ.call();
      var decimals = (await iToken.decimals.call()).toNumber();
      var expectedZ = maxAmount.div(burntHeo.div(new BN("10").pow(new BN(decimals)))).div(heoPrice); //_maxAmount.div(_burntHeo.mul(_heoPrice))
      console.log("Expected Z = " + expectedZ);
      console.log("HEO token has decimals set to " + decimals);
      assert.isTrue(z.eq(expectedZ), "Expecting Z to be " + expectedZ.toString() + ", but got " + z.toString());
  })
});
//100000000000000000000
//1000000000000000000
//1000000000000000000