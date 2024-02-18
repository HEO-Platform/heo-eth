// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IHEOStaking.sol";
import "./HEOParameters.sol";

contract HEOStaking is Ownable, IHEOStaking {
    using SafeERC20 for IERC20;

    // Maps voters to amounts staked
    mapping(address=>uint256) _voterStakes;
    // Maps tokens to total amounts staked
    mapping(address=>uint256) _tokenStakes;
    // array of staked tokens
    address[] _tokens;
    // Maps voters to tokens, to amounts staked [voter=>[token=>amount]]
    mapping(address=>mapping(address=>uint256)) _stakedAmountsVT;
    //Maps voters to stakedToken [token=>[voters]]
    mapping(address=>address[]) _stakedVotersByToken;
    // Sum of all staked amounts by all voters
    uint256 _totalAmountStaked;
    uint256 _numVoters;

    HEOParameters private _heoParams;

    constructor() Ownable(msg.sender) public {
    }
    function setParams(address params) external override onlyOwner {
        _heoParams = HEOParameters(params);
    }

    function increaseStake(uint256 _amount, address _token, address _voter) external override onlyOwner {
        require(_amount > 0, "_amount should be > 0");
        IERC20 stakingToken = IERC20(_token);
        require(stakingToken.transferFrom(_voter, address(this), _amount), "failed to transfer token to DAO");
        if(_voterStakes[_voter] == 0 && _amount > 0) {
            //new voter registration
            _numVoters = _numVoters + (1);
        }
        if(_stakedAmountsVT[_voter][_token] == 0 && _amount > 0) {
            // new token for this voter
            _stakedVotersByToken[_token].push(_voter);
        }
        _voterStakes[_voter] = _voterStakes[_voter] + (_amount);
        _stakedAmountsVT[_voter][_token] = _stakedAmountsVT[_voter][_token] + (_amount);
        _totalAmountStaked = _totalAmountStaked + (_amount);
        //this is a new token that was not staked before
        if(_tokenStakes[_token] == 0) {
            _tokens.push(_token);
        }
        _tokenStakes[_token] = _tokenStakes[_token] + (_amount);
    }

    function reduceStake(uint256 _amount, address _token, address _voter) external override onlyOwner {
        if(_amount == 0 || _voter == address(0)) {
            return;
        }
        //unstake tokens
        uint256 remainingAmount = _reduceStake(_amount, _token, _voter);

        //update internal maps
        _voterStakes[_voter] = remainingAmount;
        _stakedAmountsVT[_voter][_token] = _stakedAmountsVT[_voter][_token] - (_amount);
        _totalAmountStaked = _totalAmountStaked - (_amount);
        _tokenStakes[_token] = _tokenStakes[_token] - (_amount);

        //voter removed their entire stake
        if(remainingAmount == 0) {
            _numVoters = _numVoters - (1);
            uint256 voterIndex;
            for(voterIndex = 0; voterIndex < _stakedVotersByToken[_token].length; voterIndex++) {
                if(_stakedVotersByToken[_token][voterIndex] == _voter) {
                    delete(_stakedVotersByToken[_token][voterIndex]);
                    break;
                }
            }
            for(uint256 k = voterIndex; k < _stakedVotersByToken[_token].length - 1; k++) {
                _stakedVotersByToken[_token][k] = _stakedVotersByToken[_token][k+1];
            }
            _stakedVotersByToken[_token].pop();

            //token is no longer staked
            if(_tokenStakes[_token] == 0) {
               uint256 tokenIndex;
                for(tokenIndex = 0; tokenIndex < _tokens.length; tokenIndex++) {
                    if(_tokens[tokenIndex] == _token) {
                        delete _tokens[tokenIndex];
                        break;
                    }
                }
                for(uint256 i = tokenIndex; i < _tokens.length - 1; i++) {
                    _tokens[i] = _tokens[i+1];
                }
            }
        }
    }

    /**
    @dev this internal method transfers the staked token back to voter, but does not update internal maps
    @return remaining amount staked by the voter
    */
    function _reduceStake(uint256 _amount, address _token, address _voter) private returns (uint256) {
        IERC20 stakingToken = IERC20(_token);
        stakingToken.safeTransfer(_voter, _amount);
        uint256 remainingAmount = _voterStakes[_voter] - (_amount);
        return remainingAmount;
    }

    /**
    @dev sends all staked tokens back to voters and clears internal maps
    */
    function unstakeAll() external override onlyOwner {
        for(uint256 i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];
            uint256 numVoters = _stakedVotersByToken[token].length;
            for(uint256 j = 0; j < numVoters; j++) {
                address voter = _stakedVotersByToken[token][j];
                uint256 amount = _stakedAmountsVT[voter][token];
                if(amount > 0) {
                    _reduceStake(amount, token, voter);
                }
                delete _stakedAmountsVT[voter][token];
                delete _voterStakes[voter];
            }
            delete _stakedVotersByToken[token];
            delete _tokenStakes[token];
        }
        delete _tokens;
        _totalAmountStaked = 0;
        _numVoters = 0;
    }

    function isVoter(address _voter) external view override returns(bool) {
        return (_voterStakes[_voter] > 0);
    }

    function stakedTokensByVoter(address voter, address token) external view override returns(uint256) {
        return _stakedAmountsVT[voter][token];
    }

    function stakedVoterByToken(address token, uint256 index) external view override returns(address) {
        return _stakedVotersByToken[token][index];
    }

    function numStakedVotersByToken(address token) external view override returns(uint256) {
        return _stakedVotersByToken[token].length;
    }

    function voterStake(address voter) external view override returns(uint256) {
        return _voterStakes[voter];
    }

    function stakedTokens(address token) external view override returns(uint256) {
        return _tokenStakes[token];
    }

    function totalAmountStaked() external view override returns (uint256) {
        return _totalAmountStaked;
    }

    function numVoters() external view override returns(uint256) {
        return _numVoters;
    }

    function canVoteForParams(address voter) external view returns(uint256) {
        if(_heoParams.intParameterValue(HEOLib.ENABLE_PARAM_VOTER_WHITELIST) > 0) {
            if(_heoParams.addrParameterValue(HEOLib.PARAM_WHITE_LIST, voter) > 0) {
                return _voterStakes[voter];
            } else {
                return 0;
            }
        } else {
            return _voterStakes[voter];
        }
    }
    function canVoteForContracts(address voter) external view returns(uint256) {
        if(_heoParams.intParameterValue(HEOLib.CONTRACT_WHITE_LIST) > 0) {
            if(_heoParams.addrParameterValue(HEOLib.CONTRACT_WHITE_LIST, voter) > 0) {
                return _voterStakes[voter];
            } else {
                return 0;
            }
        } else {
            return _voterStakes[voter];
        }
    }
    function canVoteForBudget(address voter) public view returns(uint256) {
        if(_heoParams.intParameterValue(HEOLib.BUDGET_WHITE_LIST) > 0) {
            if(_heoParams.addrParameterValue(HEOLib.BUDGET_WHITE_LIST, voter) > 0) {
                return _voterStakes[voter];
            } else {
                return 0;
            }
        } else {
            return _voterStakes[voter];
        }
    }
 }
