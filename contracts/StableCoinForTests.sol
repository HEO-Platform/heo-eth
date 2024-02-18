// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StableCoinForTests is ERC20, Ownable {
    constructor(string memory symbol_) ERC20("Test coin", symbol_) Ownable(msg.sender) public {
        _mint(msg.sender, 100000000000000000000000000);
    }
}
