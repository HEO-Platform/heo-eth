// SPDX-License-Identifier: MIT
pragma solidity >=0.6.2 <0.7.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/HEOTOken.sol";

contract TestHEOToken {

  function testInitialBalanceWithNewHeoToken() public {
    HEOToken token = new HEOToken(30000000000000000000000000, "Help Each Other", "HEO");

    uint expected = 30000000000000000000000000;

    Assert.equal(token.balanceOf(address(this)), expected, "Owner should have 30000000000000000000000000 HEO initially");
  }

  function testInitialValues() public {
    HEOToken token = new HEOToken(30000000000000000000000000, "Help Each Other", "HEO");
    uint expectedTotalSupply = 30000000000000000000000000;
    uint expectedMaxAllowed = 30000000000000000000000000;
    Assert.equal(token.totalSupply(), expectedTotalSupply, "Should have 30M total supply initially");
    Assert.equal(token.maxSupply(), expectedMaxAllowed, "Should have 30M max supply");
  }

}
