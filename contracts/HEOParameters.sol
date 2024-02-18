// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./HEOLib.sol";

/**
@dev Parameter management module
*/
contract HEOParameters is Ownable {

    /**
    @dev an integer parameter is a single-value parameter.
    Reserved int parameter set:
    0 - enable parameter voter white list
    1 - enable contract voter white list
    2 - enable budget voter white list
    3 - minimum vote duration
    4 - maximum vote duration
    5 - minimum passing vote
    6 - donation yield coefficient
    7 - fundraising fee
    */
    struct IntParameter {
        uint256 key;
        uint256 value;
    }

    //this map contains integer type parameters
    mapping (uint256 => IntParameter) _intParameters;

    /**
    @dev an address parameter can have multiple values
    Reserved addr parameter set:
    0 - parameter voter whitelist
    1 - contract voter whitelist
    2 - treasure voter whitelist
    3 - platform token address
    4 - voting token address
    5 - coins accepted for donations
    */
    struct AddrParameter {
        uint256 key;
        mapping (address => uint256) addrMap;
        address[] addresses;
    }

    // This map contains address type parameters
    mapping (uint256 => AddrParameter) public _addrParameters;

    // This map contains addresses of contracts
    mapping(uint256 => address) _contracts;

    constructor() Ownable(msg.sender) public {
    }

    /**
    Methods that manage contract addresses
    */
    function setContractAddress(uint256 key, address addr) public onlyOwner {
        _contracts[key] = addr;
    }
    /**
    Methods that manage integer parameter values
    */
    function setIntParameterValue(uint256 _key, uint256 _val) public onlyOwner {
        _intParameters[_key].value = _val;
    }

    function deleteIntParameter(uint256 _key) public onlyOwner {
        delete _intParameters[_key];
    }

    /**
    Methods that manage address parameter values
    */
    function setAddrParameterValue(uint256 _key, address _addr, uint256 _val) public onlyOwner {
        // _val = 0 is equivalent to deleting the address from the map
        if(_val == 0 && _addrParameters[_key].addrMap[_addr] != 0) {
            uint256 deleteIndex = 0;
            //delete value from array
            for(uint256 i = 0; i < _addrParameters[_key].addresses.length; i++) {
                if(_addrParameters[_key].addresses[i] == _addr) {
                    delete _addrParameters[_key].addresses[i];
                    deleteIndex = i;
                }
            }
            //shift values left
            for(uint256 i = deleteIndex; i < _addrParameters[_key].addresses.length - 1; i++) {
                _addrParameters[_key].addresses[i] = _addrParameters[_key].addresses[i+1];
            }
        }
        if(_val != 0 && _addrParameters[_key].addrMap[_addr] == 0) {
            _addrParameters[_key].addresses.push(_addr);
        }
        _addrParameters[_key].addrMap[_addr] = _val;
    }

    function deleteAddParameter(uint256 _key) public onlyOwner {
        delete _addrParameters[_key];
    }

    /**
    Public view methods
    */
    function calculateFee(uint256 amount) public view  returns(uint256) {
        return amount*(_intParameters[HEOLib.FUNDRAISING_FEE].value)/(_intParameters[HEOLib.FUNDRAISING_FEE_DECIMALS].value);
    }

    function addrParameterValue(uint256 _key, address _addr) public view returns(uint256) {
        return _addrParameters[_key].addrMap[_addr];
    }
    function intParameterValue(uint256 _key) public view returns(uint256) {
        return _intParameters[_key].value;
    }
    function addrParameterAddressAt(uint256 _key, uint256 _index) public view returns (address) {
        return _addrParameters[_key].addresses[_index];
    }
    function addrParameterLength(uint256 _key) public view returns (uint256) {
        return _addrParameters[_key].addresses.length;
    }

    function paramVoterWhiteListEnabled() public view returns(uint256) {
        return _intParameters[HEOLib.ENABLE_PARAM_VOTER_WHITELIST].value;
    }
    function contractVoterWhiteListEnabled() public view returns(uint256) {
        return _intParameters[HEOLib.ENABLE_CONTRACT_VOTER_WHITELIST].value;
    }
    function budgetVoterWhiteListEnabled() public view returns(uint256) {
        return _intParameters[HEOLib.ENABLE_BUDGET_VOTER_WHITELIST].value;
    }
    function platformTokenAddress() public view returns(address) {
        return _contracts[HEOLib.PLATFORM_TOKEN_ADDRESS];
    }
    function fundraisingFee() public view returns(uint256) {
        return _intParameters[HEOLib.FUNDRAISING_FEE].value;
    }
    function fundraisingFeeDecimals() public view returns(uint256) {
        return _intParameters[HEOLib.FUNDRAISING_FEE_DECIMALS].value;
    }
    function isTokenAccepted(address tokenAddress) public view returns(uint256) {
        return _addrParameters[HEOLib.ACCEPTED_COINS].addrMap[tokenAddress];
    }
    function contractAddress(uint256 index) public view returns(address) {
        return _contracts[index];
    }
}
