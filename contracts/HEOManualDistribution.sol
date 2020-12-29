/*
 * contracts/HEOManualDistribution.sol
 * Copyright (C) Greg Solovyev - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Greg Solovyev <fiddlestring@gmail.com>, 2020
 */
pragma solidity >=0.6.1 <0.7.0;

import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./HEOToken.sol";

contract HEOManualDistribution is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    HEOToken private _token;
    string _name;
    uint256 private _limit; //Amount of HEO tokens to be distributed
    uint256 private _distributed; //Amount of HEO tokens already distributed

    constructor (uint256 limit, uint256 distributed, string memory name, HEOToken token) public {
        _limit = limit;
        _distributed = distributed;
        require(address(token) != address(0), "HEOManualDistribution: token is the zero address.");
        _token = token;
        _name = name;
    }

    /**
    * Distribute token via a private sale
    */
    function distribute(address investorAddress, uint256 amount) public onlyOwner returns (bool) {
        uint256 sold = _distributed.add(amount);
        require(sold > _distributed, "HEOManualDistribution: cannot distribute 0 or less tokens.");
        require(sold <= _limit, "HEOManualDistribution: exceeded distribution limit.");
        _token.mint(investorAddress, amount);
        _distributed = sold;
        return true;
    }

    function limit() public view returns (uint256) {
        return _limit;
    }

    function distributed() public view returns (uint256) {
        return _distributed;
    }

    function name() public view returns (string memory) {
        return _name;
    }
    /**
    * Override default Ownable::renounceOwnership to make sure
    * this contract does not get orphaned.
    */
    function renounceOwnership() public override {
        revert("HEOPrivateSale: Cannot renounce ownership");
    }
}