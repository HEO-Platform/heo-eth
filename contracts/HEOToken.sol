// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract HEOToken is ERC20, Ownable {
	/*
	* Token distribution controls
	*/
	uint256 private _maxSupply; //Maximum allowed supply of HEO tokens

	constructor(uint256 supply, string memory name_, string memory symbol_) ERC20(name_, symbol_) Ownable(msg.sender) public {
		_maxSupply = supply;
		_mint(msg.sender, _maxSupply);
	}

	/*
    * Returns maximum allowed supply.
    */
	function maxSupply() public view returns (uint256) {
		return _maxSupply;
	}

	/*
	* Override default Ownable::renounceOwnership to make sure
	* this contract does not get orphaned.
	*/
	function renounceOwnership() public override {
		revert("HEOToken: Cannot renounce ownership");
	}
}
