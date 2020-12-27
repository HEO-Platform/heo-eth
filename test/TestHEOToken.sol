pragma solidity >=0.6.0 <0.7.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/HEOTOken.sol";

contract TestMetaCoin {

  function testInitialBalanceUsingDeployedContract() public {
    HEOToken meta = HEOToken(DeployedAddresses.HEOToken());

    uint expected = 0;

    Assert.equal(meta.getBalance(tx.origin), expected, "Owner should have 0 HEO initially");
  }

  function testInitialBalanceWithNewHeoToken() public {
    HEOToken meta = new HEOToken();

    uint expected = 0;

    Assert.equal(meta.getBalance(tx.origin), expected, "Owner should have 10000 HEO initially");
  }

}
