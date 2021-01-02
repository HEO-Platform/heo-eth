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

contract HEOToken is ERC20, Ownable {
	/**
	* Contracts authorized to mint and burn HEO tokens
	*/
	mapping (address => bool) private _minters;
	mapping (address => bool) private _burners;

	/**
	* Token distribution controls
	*/
	uint256 private _maxSupply; //Maximum allowed supply of HEO tokens

	event MinterAdded(address indexed newMinter);
	event MinterRemoved(address indexed oldMinter);
	event BurnerAdded(address indexed newBurner);
	event BurnerRemoved(address indexed oldBurner);

	constructor() public ERC20("Help Each Other platform token", "HEO") {
		_maxSupply = 30000000;
	}

	/*
	* Perform the following checks:
	*  - {_totalSupply} of HEO tokens after the transaction does not exceed {_maxSupply}
	*  - {_totalSupply} of HEO tokens after the transaction is non-negative
	* If tokens are being minted, the caller must be in {_minters} map
	* If tokens are being burnt, the caller must be in {_burners} map
	*/
	function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
		if(from == address(0)) {
			require(totalSupply() + amount < _maxSupply, "HEOToken: this transaction will violate maxSupply.");
			require(_minters[_msgSender()], "HEOToken: caller must be a minter contract.");
		}
		if(to == address(0)) {
			require(totalSupply() - amount > 0, "HEOToken: this transaction will make _totalSupply negative.");
			require(_burners[_msgSender()], "HEOToken: caller must be a burner contract.");
		}
	}

	/**
	* Make {mint} and {burn} public, so that authorized minter and burner contracts
	* can call these methods.
	* {_beforeTokenTransfer} is called by {_mint) and {_burn} and performs validation
	* as well as access control.
	*/
	function mint(address account, uint256 amount) public {
		_mint(account, amount);
	}

	function burn(address account, uint256 amount) public {
		_burn(account, amount);
	}

	function addMinter(address minter) public onlyOwner {
		require(minter != address(0), "HEOToken: zero-address cannot be a minter.");
		_minters[minter] = true;
		emit MinterAdded(minter);
	}

	function addBurner(address burner) public onlyOwner {
		require(burner != address(0), "HEOToken: zero-address cannot be a burner.");
		_burners[burner] = true;
		emit BurnerAdded(burner);
	}

	function removeMinter(address minter) public onlyOwner {
		require(minter != address(0), "HEOToken: zero-address cannot be a minter.");
		_minters[minter] = false;
		emit MinterRemoved(minter);
	}

	function removeBurner(address burner) public onlyOwner {
		require(burner != address(0), "HEOToken: zero-address cannot be a burner.");
		_burners[burner] = false;
		emit BurnerRemoved(burner);
	}

	function isMinter(address addr) public view returns (bool) {
		return _minters[addr];
	}

	function isBurner(address addr) public view returns (bool) {
		return _burners[addr];
	}

	/**
    * Returns maximum allowed supply.
    */
	function maxSupply() public view returns (uint256) {
		return _maxSupply;
	}

	/**
	* Override default Ownable::renounceOwnership to make sure
	* this contract does not get orphaned.
	*/
	function renounceOwnership() public override {
		revert("HEOToken: Cannot renounce ownership");
	}
}
