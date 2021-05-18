// SPDX-License-Identifier: MIT
pragma solidity >=0.6.1;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract StableCoinForTests is ERC20, Ownable {
    constructor(string memory symbol_) ERC20("Test coin", symbol_) public {
        _mint(msg.sender, 100000000000000000000000000);
    }
}