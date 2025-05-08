// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DebateContract {
    struct Debate {
        address creator;
        string topic;
        uint8 winner; // 0 = undecided, 1 = participant1, 2 = participant2
        bool isCertified;
    }
    
    Debate[] public debates;
    
    event DebateCreated(uint256 indexed debateId, address indexed creator, string topic);
    event DebateCertified(uint256 indexed debateId, uint8 winner);

    function createDebate(string memory _topic) public returns (uint256) {
        require(bytes(_topic).length <= 100, "Topic too long");
        
        uint256 newDebateId = debates.length;
        debates.push(Debate({
            creator: msg.sender,
            topic: _topic,
            winner: 0,
            isCertified: false
        }));
        
        emit DebateCreated(newDebateId, msg.sender, _topic);
        return newDebateId;
    }

    function getDebateCount() public view returns (uint256) {
        return debates.length;
    }

    function certifyResult(uint256 debateId, uint8 winner) public {
        require(debateId < debates.length, "Debate does not exist");
        require(msg.sender == debates[debateId].creator, "Not debate creator");
        require(winner == 1 || winner == 2, "Invalid winner code");
        require(!debates[debateId].isCertified, "Already certified");
        
        debates[debateId].winner = winner;
        debates[debateId].isCertified = true;
        emit DebateCertified(debateId, winner);
    }

    function getDebateResult(uint256 debateId) public view returns (string memory) {
        require(debateId < debates.length, "Debate does not exist");
        if(!debates[debateId].isCertified) return "Not certified";
        return debates[debateId].winner == 1 ? "Participant 1 wins" : "Participant 2 wins";
    }
}