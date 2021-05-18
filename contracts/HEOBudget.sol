// SPDX-License-Identifier: MIT
pragma solidity >=0.6.1;

import "openzeppelin-solidity/contracts/GSN/Context.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./IHEOBudget.sol";

contract HEOBudget is IHEOBudget, Context {
    using SafeMath for uint256;
    using SafeMath for uint8;
    using SafeERC20 for ERC20;

    address public treasurer;
    address payable private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor (address _treasurer) public {
        address payable msgSender = _msgSender();
        require(_treasurer != address(0), "HEOBudget: _treasurer cannot be zero address");
        require(msgSender != address(0), "HEOBudget: owner cannot be zero address");
        emit OwnershipTransferred(address(0), msgSender);
        _owner = msgSender;
        treasurer = _treasurer;
    }

    function assignTreasurer(address _treasurer) external override onlyOwner {
        require(_treasurer != address(0), "HEOBudget: _treasurer cannot be zero address");
        treasurer = _treasurer;
    }

    modifier onlyTreasurer() {
        require(treasurer == _msgSender(), "HEOBudget: caller is not the treasurer");
        _;
    }
    /**
     * @dev Throws if called by any account other than the owner.
    */
    modifier onlyOwner() {
        require(_owner == _msgSender(), "HEOBudget: caller is not the owner");
        _;
    }

    /**
    @dev spend funds from the budget
    */
    function sendTo(address payable _recipient, address _token, uint256 _amount) external onlyTreasurer {
        if(_token == address(0)) {
            uint256 balance = address(this).balance;
            require(balance >= _amount, "HEOBudget: balance too low");
            _recipient.transfer(_amount);
        } else {
            ERC20 token = ERC20(_token);
            uint256 balance = token.balanceOf(address(this));
            require(balance >= _amount, "HEOBudget: balance too low");
            token.safeTransfer(_recipient, _amount);
        }

    }

    /**
    @dev withdraw funds
    */
    function withdraw(address _token) external override onlyOwner {
        if(_token == address(0)) {
            uint256 balance = address(this).balance;
            require(balance > 0, "HEOBudget: ether balance is zero");
            _owner.transfer(balance);
        } else {
            ERC20 token = ERC20(_token);
            uint256 balance = token.balanceOf(address(this));
            require(balance > 0, "HEOBudget: token balance is zero");
            if(balance > 0) {
                token.safeTransfer(_owner, balance);
            }
        }
    }

    function replenish(address _token, uint256 _amount) external override {
        ERC20(_token).safeTransferFrom(_msgSender(), address(this), _amount);
    }

    /**
    * @dev Transfers ownership of the contract to a new account (`newOwner`).
    * Can only be called by the current owner.
     */
    function transferOwnership(address payable newOwner) public override onlyOwner {
        require(newOwner != address(0), "owner cannot be a zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    receive() external payable {}
}
