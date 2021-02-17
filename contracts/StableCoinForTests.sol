/*
 * contracts/HEOToken.sol
 * Copyright (C) Greg Solovyev - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Greg Solovyev <fiddlestring@gmail.com>, 2020
 */
pragma solidity >=0.6.1;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

contract StableCoinForTests is ERC20, Ownable {
    constructor(string memory symbol_) ERC20("Test coin", symbol_) public {
        _mint(msg.sender, 100000000000000000000000);
    }
}