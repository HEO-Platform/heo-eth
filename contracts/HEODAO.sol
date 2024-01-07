// SPDX-License-Identifier: MIT
pragma solidity >=0.6.1;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";

import "./HEOToken.sol";
import "./IHEOBudget.sol";
import "./HEOParameters.sol";
import "./IHEOStaking.sol";
import "./HEOLib.sol";
import "./IHEOCampaignFactory.sol";
import "./IHEOCampaignRegistry.sol";
import "./IHEORewardFarm.sol";

contract HEODAO is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for HEOToken;
    using SafeERC20 for IERC20;

    HEOParameters private _heoParams;
    IHEOStaking private _heoStaking;

    function setParams(address params) external onlyOwner {
        _heoParams = HEOParameters(params);
        if(address(_heoStaking) != address(0)) {
            _heoStaking.setParams(params);
        }
    }
    function setStaking(address staking) external onlyOwner {
        if(address(_heoStaking) != address(0)) {
            _heoStaking.unstakeAll();
            Ownable(address(_heoStaking)).transferOwnership(_msgSender());
        }
        _heoStaking = IHEOStaking(staking);
        if(address(_heoParams) != address(0)) {
            _heoStaking.setParams(address(_heoParams));
        }
    }
    function initVoters(address[] calldata voters) external onlyOwner {
        // set initial integer parameters
        _heoParams.setIntParameterValue(HEOLib.ENABLE_PARAM_VOTER_WHITELIST, 1);
        _heoParams.setIntParameterValue(HEOLib.ENABLE_CONTRACT_VOTER_WHITELIST, 1);
        _heoParams.setIntParameterValue(HEOLib.ENABLE_BUDGET_VOTER_WHITELIST, 1);
        _heoParams.setIntParameterValue(HEOLib.MIN_VOTE_DURATION, 259200);
        _heoParams.setIntParameterValue(HEOLib.MAX_VOTE_DURATION, 7889231);
        _heoParams.setIntParameterValue(HEOLib.MIN_PASSING_VOTE, 51);
        _heoParams.setIntParameterValue(HEOLib.DONATION_YIELD, 1000000);
        _heoParams.setIntParameterValue(HEOLib.DONATION_YIELD_DECIMALS, 10000000000000000000);
        _heoParams.setIntParameterValue(HEOLib.FUNDRAISING_FEE, 250);
        _heoParams.setIntParameterValue(HEOLib.FUNDRAISING_FEE_DECIMALS, 10000);
        _heoParams.setIntParameterValue(HEOLib.DONATION_VESTING_SECONDS, 31536000);
        // add founders to parameter voter white list
        for(uint256 i = 0; i < voters.length; i++) {
            _heoParams.setAddrParameterValue(HEOLib.PARAM_WHITE_LIST, voters[i], 1);
            _heoParams.setAddrParameterValue(HEOLib.CONTRACT_WHITE_LIST, voters[i], 1);
            _heoParams.setAddrParameterValue(HEOLib.BUDGET_WHITE_LIST, voters[i], 1);
        }
    }

    /**
    @dev initial supply should be 100000000000000000000000000
    */
    function deployPlatformToken(uint256 _supply, string calldata _name, string calldata _symbol) external onlyOwner {
        require(_heoParams.contractAddress(HEOLib.PLATFORM_TOKEN_ADDRESS) == address(0));
        HEOToken token = new HEOToken(_supply, _name, _symbol);
        _heoParams.setContractAddress(HEOLib.PLATFORM_TOKEN_ADDRESS, address(token));
        if(_heoParams.addrParameterLength(HEOLib.VOTING_TOKEN_ADDRESS) == 0) {
            _heoParams.setAddrParameterValue(HEOLib.VOTING_TOKEN_ADDRESS, address(token), 1);
            // send 1 token to each of the whitelisted founders, so they can vote
            if(_heoParams.intParameterValue(HEOLib.ENABLE_PARAM_VOTER_WHITELIST) > 0) {
                for(uint256 i = 0; i < _heoParams.addrParameterLength(HEOLib.PARAM_WHITE_LIST); i++) {
                    token.safeTransfer(_heoParams.addrParameterAddressAt(HEOLib.PARAM_WHITE_LIST, i), 1000000000000000000);
                }
            }
        }
    }

    /**
    @dev Public view methods
    */
    function heoParams() public view returns(HEOParameters) {
        return _heoParams;
    }

    bytes32[] private _activeProposals; // IDs of active proposals
    mapping(bytes32=>HEOLib.Proposal) private _proposals; // Map of proposals
    mapping(bytes32=>HEOLib.ProposalStatus) private _proposalStatus; // Map of proposal statuses for easy checking
    mapping(bytes32=>uint256) private _proposalStartTimes; // Map of proposal start times
    mapping(bytes32=>uint256) private _proposalDurations; // Map of proposal durations

    event ProposalCreated (
        bytes32 indexed proposalId,
        address indexed proposer
    );

    event ProposalVoteCast(
        bytes32 indexed proposalId,
        address indexed voter,
        uint256 vote,
        uint256 amount
    );

    event ProposalExecuted(
        bytes32 indexed proposalId
    );
    event ProposalRejected(
        bytes32 indexed proposalId
    );

    modifier onlyVoter() {
        require(owner() == _msgSender() || _heoStaking.isVoter(_msgSender()));
        _;
    }

    function allowedToVote(address _voter, HEOLib.ProposalType _propType) internal view returns (bool) {
        if(owner() != _voter) {
            uint256 whiteListIndex;
            if(_propType == HEOLib.ProposalType.INTVAL || _propType == HEOLib.ProposalType.ADDRVAL) {
                whiteListIndex = HEOLib.PARAM_WHITE_LIST;
            } else if(_propType == HEOLib.ProposalType.BUDGET) {
                whiteListIndex = HEOLib.BUDGET_WHITE_LIST;
            } else if(_propType == HEOLib.ProposalType.CONTRACT) {
                whiteListIndex = HEOLib.CONTRACT_WHITE_LIST;
            } else {
                return false;
            }
            if(_heoParams.intParameterValue(whiteListIndex) > 0) {
                return (_heoParams.addrParameterValue(whiteListIndex, _voter) > 0);
            }
        }
        return true;
    }

    modifier isVotingToken(address _token) {
        require(_heoParams.addrParameterValue(HEOLib.VOTING_TOKEN_ADDRESS, _token) > 0);
        _;
    }
    /**
    @dev Register the caller to vote by locking voting token in the DAO.
    This function can also be used to increase the stake.
    @param _amount - amount of voting token to lock
    @param _token - address of voting token
    */
    function registerToVote(uint256 _amount, address _token) external isVotingToken(_token) nonReentrant {
        address voter = _msgSender();
        _heoStaking.increaseStake(_amount, _token, voter);
    }

    /**
    @dev Remove caller from the voting list or reduce stake. Returns staked tokens.
    @param _amount - amount of voting token to return
    @param _token - address of staked token
    */
    function deregisterVoter(uint256 _amount, address _token) external isVotingToken(_token) nonReentrant {
        _reduceStake(_amount, _token, _msgSender());
    }

    function _reduceStake(uint256 _amount, address _token, address _voter) private {
        uint256 remainingAmount = _heoStaking.voterStake(_voter).sub(_amount);
        //check that this voter is not withdrawing a stake locked in active vote
        for(uint256 i = 0; i < _activeProposals.length; i++) {
            require(_proposals[_activeProposals[i]].stakes[_voter] <= remainingAmount);
        }
        _heoStaking.reduceStake(_amount, _token, _voter);
    }
    /**
    @dev This method allows external callers to propose to set, delete, rename, or create an interger parameter.
    @param _opType - proposed operation (set, delete, rename, create) as defined in ProposedOperation
    @param _key - key of the parameter in _intParameters map
    @param _addrs[] - array of proposed addresses.
        When voting for address-type parameters, each address in _addrs array should have a corresponding
        integer value in _values[] array.
        When voting for budget allocations, the first address should point to IHEOBudget instance,
        the second address to address of an ERC20 token unless allocating native coins (BNB, ETH, NEAR).
    @param _values[] - array of proposed values
        * when voting, voters select the value that they vote for.
        * to reject the proposal, voters vote for option 0
        * to vote for the 1st proposed value (_values[0]), voters vote for option 1.
        * in budget proposals, the first address
    @param _duration - how long the proposal can be active until it expires
    @param _percentToPass = percentage of votes required to pass the proposal. Cannot be less than 51%.
    */
    function proposeVote(HEOLib.ProposalType _propType, HEOLib.ProposedOperation _opType, uint256 _key,
        address[] calldata _addrs, uint256[] calldata _values, uint256 _duration, uint256 _percentToPass) external
    onlyVoter {
        if(_propType == HEOLib.ProposalType.INTVAL && _key <= HEOLib.ENABLE_BUDGET_VOTER_WHITELIST) {
            require(owner() == _msgSender());
        }
        if(_propType == HEOLib.ProposalType.ADDRVAL && _key <= HEOLib.BUDGET_WHITE_LIST) {
            require(owner() == _msgSender());
        }
        require(allowedToVote(_msgSender(), _propType));
        if(_heoParams.intParameterValue(HEOLib.MIN_VOTE_DURATION) > 0) {
            require(_duration >= _heoParams.intParameterValue(HEOLib.MIN_VOTE_DURATION));
        }
        if(_heoParams.intParameterValue(HEOLib.MAX_VOTE_DURATION) > 0) {
            require(_duration <= _heoParams.intParameterValue(HEOLib.MAX_VOTE_DURATION));
        }
        require(_percentToPass >= HEOLib.MIN_PASSING_VOTE);
        if(_key == HEOLib.PLATFORM_TOKEN_ADDRESS && _propType == HEOLib.ProposalType.CONTRACT) {
            revert();
        }
        HEOLib.Proposal memory proposal;
        proposal.propType = _propType;
        proposal.opType = _opType;
        proposal.key = _key;
        proposal.values = _values;
        proposal.addrs = _addrs;
        proposal.proposer = _msgSender();
        proposal.percentToPass = _percentToPass;

        bytes32 proposalId = HEOLib._generateProposalId(proposal);
        //Check that identical proposal does not exist
        if(_proposalStartTimes[proposalId] > 0) {
            revert();
        }

        _proposals[proposalId] = proposal;
        _proposalStatus[proposalId] = HEOLib.ProposalStatus.OPEN;
        _proposalStartTimes[proposalId] = block.timestamp;
        _proposalDurations[proposalId] = _duration;
        _activeProposals.push(proposalId);
        emit ProposalCreated(proposalId, proposal.proposer);
    }

    /**
    @dev vote for a parameter value proposal
    @param _proposalId bytes32 ID of the proposal
    @param _vote value to vote for. Setting _vote to 0 is equivalent to rejecting the proposal
            Setting _vote to 1 is voting for the 1st value in the array of proposed values
    @param _weight - how much of staked amount to use for this vote
    */
    function vote(bytes32 _proposalId, uint256 _vote, uint256 _weight) external onlyVoter {
        require(_proposalStatus[_proposalId] == HEOLib.ProposalStatus.OPEN);
        require(_heoStaking.voterStake(_msgSender()) >= _weight);
        HEOLib.Proposal storage proposal = _proposals[_proposalId];
        require((block.timestamp.sub(_proposalStartTimes[_proposalId])) <=  _proposalDurations[_proposalId],
            "proposal has expired");
        require(allowedToVote(_msgSender(), proposal.propType));
        require(_vote <= proposal.values.length, "vote out of range");
        address voter = _msgSender();
        if(proposal.stakes[voter] > 0) {
            //If this voter has already staked his votes, unstake them first
            uint256 lastStake = proposal.stakes[voter];
            proposal.totalWeight = proposal.totalWeight.sub(lastStake);
            proposal.totalVoters = proposal.totalVoters.sub(1);
            proposal.votes[_vote] = proposal.votes[_vote].sub(lastStake);
        }
        //stake the votes for the selected option
        proposal.stakes[voter] = _weight;
        proposal.votes[_vote] = proposal.votes[_vote].add(_weight);
        proposal.totalWeight = proposal.totalWeight.add(_weight);
        proposal.totalVoters = proposal.totalVoters.add(1);
        emit ProposalVoteCast(_proposalId, voter, _vote, _weight);
    }

    /**
    @dev A proposal can be executed once it's duration time passes or everyone has voted
    */
    function executeProposal(bytes32 _proposalId) external onlyVoter nonReentrant {
        require(_proposalStatus[_proposalId] == HEOLib.ProposalStatus.OPEN);
        HEOLib.Proposal storage proposal = _proposals[_proposalId];
        require(allowedToVote(_msgSender(), proposal.propType));
        if(proposal.totalVoters < _heoStaking.numVoters()) {
            require((block.timestamp.sub(_proposalStartTimes[_proposalId])) >  _proposalDurations[_proposalId]);
        }
        uint256 winnerOption;
        uint256 winnerWeight;
        bool tie = false;
        uint256 minWeight = (proposal.totalWeight.div(100)).mul(proposal.percentToPass);
        for(uint256 i = 0; i <= proposal.values.length; i++) {
            if(proposal.votes[i] >= minWeight) {
                if(proposal.votes[i] > winnerWeight) {
                    winnerWeight = proposal.votes[i];
                    winnerOption = i;
                    tie = false;
                } else if (proposal.votes[i] == winnerWeight) {
                    tie = true;
                }
            }
        }
        bool success = false;
        if(!tie) {
            if(winnerOption > 0 && winnerOption <= proposal.values.length) {
                //valid winner
                uint256 winnerIndex = winnerOption.sub(1);
                if(proposal.propType == HEOLib.ProposalType.ADDRVAL || proposal.propType == HEOLib.ProposalType.INTVAL) {
                    success = _executeParamProposal(proposal, winnerIndex);
                } else if(proposal.propType == HEOLib.ProposalType.BUDGET) {
                    success = _executeBudgetProposal(proposal, winnerIndex);
                } else if(proposal.propType == HEOLib.ProposalType.CONTRACT) {
                    if(proposal.key == HEOLib.REWARD_FARM && _heoParams.contractAddress(HEOLib.REWARD_FARM) != address(0)) {
                        //withdraw tokens from current reward farm first
                        IHEOBudget(_heoParams.contractAddress(HEOLib.REWARD_FARM)).withdraw(_heoParams.contractAddress(HEOLib.PLATFORM_TOKEN_ADDRESS));
                    }
                    _heoParams.setContractAddress(proposal.key, proposal.addrs[winnerIndex]);
                    success = true;
                }
            }
        }

        if(success) {
            _proposalStatus[_proposalId] = HEOLib.ProposalStatus.EXECUTED;
            emit ProposalExecuted(_proposalId);
        } else {
            _proposalStatus[_proposalId] = HEOLib.ProposalStatus.REJECTED;
            emit ProposalRejected(_proposalId);
        }
        //delete from _activeProposals and shift
        uint256 i;
        for(i = 0; i < _activeProposals.length; i++) {
            if(_activeProposals[i] == _proposalId) {
                delete(_activeProposals[i]);
                break;
            }
        }
        for(uint256 k = i; k < _activeProposals.length - 1; k++) {
            _activeProposals[k] = _activeProposals[k+1];
        }
        _activeProposals.pop();
    }

    function _executeParamProposal(HEOLib.Proposal storage proposal, uint256 winnerIndex) private returns(bool) {
        if(proposal.opType == HEOLib.ProposedOperation.OP_DELETE_PARAM) {
            if(proposal.propType == HEOLib.ProposalType.INTVAL) {
                _heoParams.deleteIntParameter(proposal.key);
                return true;
            } else if(proposal.propType == HEOLib.ProposalType.ADDRVAL) {
                _heoParams.deleteAddParameter(proposal.key);
                return true;
            }
        } else if(proposal.opType == HEOLib.ProposedOperation.OP_SET_VALUE) {
            if(proposal.propType == HEOLib.ProposalType.INTVAL) {
                _heoParams.setIntParameterValue(proposal.key, proposal.values[winnerIndex]);
                return true;
            } else if(proposal.propType == HEOLib.ProposalType.ADDRVAL) {
                if(proposal.key == HEOLib.VOTING_TOKEN_ADDRESS && proposal.values[winnerIndex] == 0) {
                    //To remove one of the voting tokens, we have to unstake everyone, who staked it
                    uint256 numVoters = _heoStaking.numStakedVotersByToken(proposal.addrs[winnerIndex]);
                    for(uint256 i = 0; i < numVoters; i++) {
                        address _voter = _heoStaking.stakedVoterByToken(proposal.addrs[winnerIndex], i);
                        if(_heoStaking.stakedTokensByVoter(_voter, proposal.addrs[winnerIndex]) > 0) {
                            _reduceStake(_heoStaking.stakedTokensByVoter(_voter,
                                proposal.addrs[winnerIndex]), proposal.addrs[winnerIndex], _voter);
                        }
                    }
                }
                _heoParams.setAddrParameterValue(proposal.key, proposal.addrs[winnerIndex], proposal.values[winnerIndex]);
                return true;
            }
        }
        return false;
    }

    function _executeBudgetProposal(HEOLib.Proposal storage proposal, uint256 winnerIndex) private returns(bool) {
        IHEOBudget budget = IHEOBudget(payable(proposal.addrs[0]));
        if(proposal.opType == HEOLib.ProposedOperation.OP_SEND_TOKEN) {
            budget.assignTreasurer(_heoParams.contractAddress(HEOLib.TREASURER));
            IERC20(proposal.addrs[1]).approve(proposal.addrs[0], proposal.values[winnerIndex]);
            budget.replenish(proposal.addrs[1], proposal.values[winnerIndex]);
            return true;
        } else if(proposal.opType == HEOLib.ProposedOperation.OP_SEND_NATIVE) {
            budget.assignTreasurer(_heoParams.contractAddress(HEOLib.TREASURER));
            payable(proposal.addrs[0]).transfer(proposal.values[winnerIndex]);
            return true;
        } else if(proposal.opType == HEOLib.ProposedOperation.OP_WITHDRAW_NATIVE) {
            budget.withdraw(address(0));
            return true;
        } else if(proposal.opType == HEOLib.ProposedOperation.OP_WITHDRAW_TOKEN) {
            budget.withdraw(proposal.addrs[1]);
            return true;
        }
        return false;
    }

    //Public views
    function stakedForProposal(bytes32 _proposalId, address _voter) public view returns(uint256) {
        return _proposals[_proposalId].stakes[_voter];
    }
    function activeProposals() public view returns(bytes32[] memory proposals) {
        return _activeProposals;
    }
    function minWeightToPass(bytes32 _proposalId) public view returns(uint256) {
        uint256 minWeight = (_proposals[_proposalId].totalWeight.div(100)).mul(_proposals[_proposalId].percentToPass);
        return minWeight;
    }
    function proposalStatus(bytes32 _proposalId) public view returns(uint8) {
        return uint8(_proposalStatus[_proposalId]);
    }
    function proposalTime(bytes32 _proposalId) public view returns(uint256) {
        return _proposalStartTimes[_proposalId];
    }
    function proposalDuration(bytes32 _proposalId) public view returns(uint256) {
        return  _proposalDurations[_proposalId];
    }
    function proposalType(bytes32 _proposalId) public view returns(uint8) {
        return uint8(_proposals[_proposalId].propType);
    }
    function voteWeight(bytes32 _proposalId, uint256 _vote) public view returns(uint256) {
        return _proposals[_proposalId].votes[_vote];
    }
    function getProposal(bytes32 _proposalId) public view
    returns(address proposer, uint8 opType, uint256[] memory values, address[] memory addrs, uint256 key, uint256 totalWeight,
        uint256 totalVoters, uint256 percentToPass) {
        HEOLib.Proposal storage proposal = _proposals[_proposalId];
        proposer = proposal.proposer;
        opType = uint8(proposal.opType);
        values = proposal.values;
        addrs = proposal.addrs;
        key = proposal.key;
        totalWeight = proposal.totalWeight;
        totalVoters = proposal.totalVoters;
        percentToPass = proposal.percentToPass;
    }
    receive() external payable {}
}
