/*
 * contracts/HEOToken.sol
 * Copyright (C) Greg Solovyev - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Greg Solovyev <fiddlestring@gmail.com>, 2020
 */
pragma solidity >=0.6.1 <0.7.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract HEOToken is ERC20, Ownable {
	/**
	* Contracts authorized to mint HEO tokens
	*/
	address private _tokenSeller; //Address of current token sale contract
	address private _rewardFarm; //Address of Reward Farm contract

	/**
	* Token distribution controls
	*/
	uint256 private _maxSupply; //Maximum allowed supply of HEO tokens
	uint32 private _privateSaleLimit; //Amount of HEO tokens to be sold on private sale
	uint32 private _publicSaleLimit; //Amount of HEO tokens to be sold on public sale
	uint32 private _charityLimit; //Amount of HEO tokens to be distributed to charities
	uint32 private _bountyLimit; //Amount of HEO tokens to be distributed as bounties

	/**
	* Token distribution tracking
	*/
	uint32 private _privateSaleSold; //Amount of HEO tokens sold via private sale
	uint32 private _publicSaleSold; //Amount of HEO tokens sold via public sale
	uint32 private _charityDistributed; //Amount of HEO tokens distributed to charity
	uint32 private _bountyDistributed; //Amount of HEO tokens distributed to bounties

	event SellerChanged(address indexed previousSeller, address indexed newSeller);
	event RewardFarmChanged(address indexed previousFarm, address indexed newFarm);

	constructor()  public ERC20("Help Each Other platform token", "HEO") {
		_maxSupply = 30000000;
		_publicSaleLimit = 900000;
		_privateSaleLimit = 85000;
		_charityLimit = 10000;
		_bountyLimit = 5000;
		_privateSaleSold = 0;
		_publicSaleSold = 0;
		_charityDistributed = 0;
		_bountyDistributed = 0;
	}

	/*
	* Perform the following checks:
	*  - {_totalSupply} of HEO tokens after the transaction does not exceed {_maxSupply}
	*  - {_totalSupply} of HEO tokens after the transaction is non-negative
	*/
	function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
		if(from == address(0)) {
			require(totalSupply() + amount < _maxSupply, "HEOToken: this transaction will violate maxSupply.");
		}
		if(to == address(0)) {
			require(totalSupply() - amount > 0, "HEOToken: this transaction will make _totalSupply negative.");
		}
	}


	/**
    * Returns maximum allowed supply.
    */
	function maxSupply() public view returns (uint256) {
		return _maxSupply;
	}

	function privateSaleLimit() public view returns (uint32) {
		return _privateSaleLimit;
	}

	function publicSaleLimit() public view returns (uint32) {
		return _publicSaleLimit;
	}

	function charityLimit() public view returns (uint32) {
		return _charityLimit;
	}

	function bountyLimit() public view returns (uint32) {
		return _bountyLimit;
	}

	function privateSaleSold() public view returns (uint32) {
		return _privateSaleSold;
	}

	function bountyDistributed() public view returns (uint32) {
		return _bountyDistributed;
	}

	function charityDistributed() public view returns (uint32) {
		return _charityDistributed;
	}
	/**
	* Override default Ownable::renounceOwnership to make sure
	* this contract does not get orphaned.
	*/
	function renounceOwnership() public override {
		revert("HEOToken: Cannot renounce ownership");
	}

	/**
 	* Checks that caller is the Reward Rarm contract
 	*/
	modifier onlyRewardFarm() {
		require(_rewardFarm == _msgSender(), "HEOToken: caller is not the Reward Farm");
		_;
	}

	/**
	* Checks that caller is the current token sales contract
 	*/
	modifier onlyTokenSeller() {
		require(_tokenSeller == _msgSender(), "HEOToken: caller is not the token sales contract");
		_;
	}

	/**
	* Sets the address of token sale contract
	*/
	function setTokenSeller(address newSeller) public onlyOwner {
		require(newSeller != address(0), "HEOToken: new seller is the zero address");
		emit SellerChanged(_tokenSeller, newSeller);
		_tokenSeller = newSeller;
	}

	/**
	* Sets the address of Reward Farm contract.
	* Reward Farm can mint rewards to donors.
	*/
	function setRewardFarm(address newFarm) public onlyOwner {
		require(newFarm != address(0), "HEOToken: Reward Farm is the zero address");
		emit RewardFarmChanged(_rewardFarm, newFarm);
		_rewardFarm = newFarm;
	}

	/**
	* Mint reward to donor. This method can be called only by
	* the reward farm contract.
	*/
	function mintReward(address donorAddress, uint256 amount) public onlyRewardFarm {
		require(donorAddress != address(0), "HEOToken: donorAddress is the zero address");
		_mint(donorAddress, amount);
	}

	/**
	* Distribute token via a private sale
	*/
	function mintPrivate(address investorAddress, uint32 amount) public onlyOwner {
		uint256 sold = _privateSaleSold + amount;
		require(sold > _privateSaleSold, "HEOToken: cannot sell 0 or less tokens");
		require(sold <= _privateSaleLimit, "HEOToken: exceeded private sale limit");
		_mint(investorAddress, amount);
		_privateSaleSold += amount;
	}

	/**
	* Distribute a bounty token
	*/
	function mintBounty(address receiverAddress, uint32 amount) public onlyOwner {
		uint256 distributed = _bountyDistributed + amount;
		require(distributed > _bountyDistributed, "HEOToken: cannot distribute 0 or less tokens");
		require(distributed <= _bountyLimit, "HEOToken: exceeded total bounty limit");
		_mint(receiverAddress, amount);
		_bountyDistributed += amount;
	}

	/**
	* Distribute a charuty token
	*/
	function mintCharity(address receiverAddress, uint32 amount) public onlyOwner {
		uint256 distributed = _charityDistributed + amount;
		require(distributed > _charityDistributed, "HEOToken: cannot distribute 0 or less tokens");
		require(distributed <= _charityLimit, "HEOToken: exceeded total charity limit");
		_mint(receiverAddress, amount);
		_charityDistributed += amount;
	}
}
