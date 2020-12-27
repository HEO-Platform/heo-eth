// contracts/HEOToken.sol
// SPDX-License-Identifier: MIT
pragma solidity >=0.6.1 <0.7.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract HEOToken is ERC20Upgradeable, OwnableUpgradeable {
	address private _tokenSeller;
	event SellerChanged(address indexed previousSeller, address indexed newSeller);

	function initialize() initializer public {
		__ERC20_init("Help Each Other token", "HEO");
		__Ownable_init();
	}

	function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {

	}

	function setTokenSeller(address newSeller) public onlyOwner {
		require(newSeller != address(0), "HEOToken: new seller is the zero address");
		emit SellerChanged(_tokenSeller, newSeller);
		_tokenSeller = newSeller;
	}
}
