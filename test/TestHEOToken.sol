pragma solidity >=0.6.0 <0.7.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/HEOTOken.sol";

contract TestHEOToken {

  function testInitialBalanceUsingDeployedContract() public {
    HEOToken heo = HEOToken(DeployedAddresses.HEOToken());

    uint expected = 0;

    Assert.equal(heo.balanceOf(tx.origin), expected, "Owner should have 0 HEO initially");
  }

  function testInitialBalanceWithNewHeoToken() public {
    HEOToken heo = new HEOToken();

    uint expected = 0;

    Assert.equal(heo.balanceOf(tx.origin), expected, "Owner should have 10000 HEO initially");
  }

  function testInitialValues() public {
    HEOToken heo = new HEOToken();
    uint expectedTotalSupply = 0;
    uint expectedMaxAllowed = 30000000000000000000000000;
    Assert.equal(heo.totalSupply(), expectedTotalSupply, "Should have 0 total supply initially");
    Assert.equal(heo.maxSupply(), expectedMaxAllowed, "Should have 30M max supply");
  }

}
