// SPDX-License-Identifier: MIT
pragma solidity >=0.6.1;

library HEOLib {
    // Indexes of reserved integer parameters
    uint8 public constant ENABLE_PARAM_VOTER_WHITELIST = 0;
    uint8 public constant ENABLE_CONTRACT_VOTER_WHITELIST = 1;
    uint8 public constant ENABLE_BUDGET_VOTER_WHITELIST = 2;
    uint8 public constant MIN_VOTE_DURATION = 3; //259200
    uint8 public constant MAX_VOTE_DURATION = 4; //7889231
    uint8 public constant MIN_PASSING_VOTE = 5; //51
    uint8 public constant DONATION_YIELD = 6; //default value is 1,000,000
    uint8 public constant DONATION_YIELD_DECIMALS = 7; //default value is 10 * 10^18
    uint8 public constant FUNDRAISING_FEE = 8; //defaut value is 250, which corresponds to 0.025 or 2.5%
    uint8 public constant FUNDRAISING_FEE_DECIMALS = 9; //defaut value is 10,000
    uint8 public constant DONATION_VESTING_SECONDS = 10; //default value is 31536000, which represents 1 year in seconds
    uint8 public constant ENABLE_FUNDRAISER_WHITELIST = 11;
    uint8 public constant ANON_CAMPAIGN_LIMIT = 12;
    uint8 public constant ANON_DONATION_LIMIT = 13;
    uint8 public constant INVESTMENT_VESTING_SECONDS = 14;

    // Indexes of reserved addr parameters
    uint8 public constant PARAM_WHITE_LIST = 0;
    uint8 public constant CONTRACT_WHITE_LIST = 1;
    uint8 public constant BUDGET_WHITE_LIST = 2;
    uint8 public constant VOTING_TOKEN_ADDRESS = 3;
    uint8 public constant ACCEPTED_COINS = 4;
    uint8 public constant FUNDRAISER_WHITE_LIST = 5;

    // Indexes of contract addresses
    uint8 public constant CAMPAIGN_FACTORY = 0;
    uint8 public constant CAMPAIGN_REGISTRY = 1;
    uint8 public constant REWARD_FARM = 2;
    uint8 public constant DAO_ADDRESS = 3;
    uint8 public constant PRICE_ORACLE = 4;
    uint8 public constant PLATFORM_TOKEN_ADDRESS = 5;
    uint8 public constant TREASURER = 6;

    enum ProposalStatus { OPEN, EXECUTED, REJECTED }
    enum ProposalType { INTVAL, ADDRVAL, BUDGET, CONTRACT }
    // Types of votes
    enum ProposedOperation {
        OP_SET_VALUE,
        OP_DELETE_PARAM,
        OP_SEND_NATIVE,
        OP_SEND_TOKEN,
        OP_WITHDRAW_NATIVE,
        OP_WITHDRAW_TOKEN
    }
    struct Proposal {
        ProposalType propType;
        address proposer;
        ProposedOperation opType;
        uint256 key;
        address[] addrs; //array of proposed addresses
        uint256[] values; //array of proposed integer values
        uint256 totalVoters; //total number of voters in this proposal
        uint256 totalWeight; //total amount voted in this proposal
        uint256 percentToPass;
        mapping(address=>uint256) stakes; // Records amounts voted by each voter
        mapping(uint256=>uint256) votes; //Maps vote options to amount of staked votes for each option
    }

    function _generateProposalId(Proposal memory proposal) internal view returns(bytes32) {
        //check requirements for budget proposals
        if(proposal.propType == ProposalType.BUDGET) {
            require(proposal.addrs[0] != address(0), "_addrs[0] cannot be empty");
            if(proposal.opType == ProposedOperation.OP_SEND_TOKEN) {
                require(proposal.addrs[1] != address(0), "_addrs[1] cannot be empty");
            } else if (proposal.opType == ProposedOperation.OP_WITHDRAW_TOKEN) {
                require(proposal.addrs[1] != address(0), "_addrs[1] cannot be empty");
            }
            return keccak256(abi.encodePacked(proposal.addrs[0], proposal.addrs[1], proposal.proposer, proposal.values[0], block.timestamp));
        } else {
            return keccak256(abi.encodePacked(uint8(proposal.propType), uint8(proposal.opType), proposal.proposer, proposal.key, block.timestamp));
        }
    }
}
