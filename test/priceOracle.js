const HEOPriceOracle = artifacts.require("HEOPriceOracle");
const HEOToken = artifacts.require("HEOToken");
const HEOGlobalParameters = artifacts.require("HEOGlobalParameters");
const BN = web3.utils.BN;
const timeMachine = require('ganache-time-traveler');
contract("HEOPriceOracle", (accounts) => {
    it("should save price for 0-address", async() => {
        assert.isTrue(web3.utils.isAddress('0x0000000000000000000000000000000000000000'));
        var iPriceOracle = await HEOPriceOracle.deployed();
        var iToken = await HEOToken.deployed();
        await iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei("1"));
        var price = await iPriceOracle.getPrice.call('0x0000000000000000000000000000000000000000');
        assert.equal(web3.utils.toWei("1"), price, "wrong price");
        assert.equal(1, web3.utils.fromWei(price), "bad price conversion");
    });

    it("should save price for non zero-address", async() => {
        assert.isTrue(web3.utils.isAddress('0xad6d458402f60fd3bd25163575031acdce07538d'));
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iPriceOracle.setPrice('0xad6d458402f60fd3bd25163575031acdce07538d', web3.utils.toWei("100"));
        var price = await iPriceOracle.getPrice.call('0xad6d458402f60fd3bd25163575031acdce07538d');
        assert.equal(web3.utils.toWei("100"), price, "wrong price");
        assert.equal(100, web3.utils.fromWei(price), "bad price conversion");
    });

    it("Should save historical prices for 2-second long periods", async() => {
        var iGlobalParams = await HEOGlobalParameters.deployed();
        var iPriceOracle = await HEOPriceOracle.deployed();
        await iGlobalParams.setRewardPeriod(2);//set reward period to 1 second for testing
        var blockNumber = await web3.eth.getBlockNumber();
        var chainTime = (await web3.eth.getBlock(blockNumber)).timestamp;
        await iGlobalParams.setGlobalRewardStart(chainTime);
        console.log("Last block " + blockNumber);
        console.log("Last block time " + chainTime);
        console.log("Current period " + await iPriceOracle.getCurrentPeriod.call());
        //set historical prices
        for(var i=0;i<10;i++) {
            iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+i));
            await timeMachine.advanceTimeAndBlock(1);
            iPriceOracle.setPrice('0x0000000000000000000000000000000000000000', web3.utils.toWei(""+i));
            await timeMachine.advanceTimeAndBlock(1);
        }
        for(var i=0; i<10;i++) {
            var price = await iPriceOracle.getPriceAtPeriod.call('0x0000000000000000000000000000000000000000', i);
            console.log("Price at " + i + " is " + price.toString());
            assert.isTrue(new BN(web3.utils.toWei(""+i)).eq(price),
                "Expected price of " + web3.utils.toWei(""+i) + ", but got " + price);
        }
        blockNumber = await web3.eth.getBlockNumber();
        chainTime = (await web3.eth.getBlock(blockNumber)).timestamp;
        console.log("Last block " + blockNumber);
        console.log("Last block time " + chainTime);
        console.log("Current period " + await iPriceOracle.getCurrentPeriod.call());
    });


});