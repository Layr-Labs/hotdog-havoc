// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

////////////////////////////////////////////////////////////
// Hotdog Havoc
//
// This contract is the main contract for the Hotdog Havoc game.
// It is responsible for creating and managing levels, teams, and games.
//
// Each map is a 200x100 grid of blocks. Each block is 16x16 pixels.
//
////////////////////////////////////////////////////////////
contract HotdogHavoc {
    ////////////////////////////////////////////////////////////
    // Block
    //
    // A block is a 16x16 square on the map. It is represented by the grid
    // space in the world, which is 200x100 max. 
    ////////////////////////////////////////////////////////////
    struct Block {
        uint8 x;
        uint8 y;
    }

    ////////////////////////////////////////////////////////////
    // Level
    //
    // A level is a 2D grid of blocks that represent the topology of the level.
    ////////////////////////////////////////////////////////////
    struct Level {
        uint256 id;        // this will increase each time a new level is created
        address owner;     // the addressed of the owner who created the level
        string name;       // a human readable name for the level
        Block[] map;       // an array of sparse blocks that represent the topology
    }

    ////////////////////////////////////////////////////////////
    // STORAGE
    ////////////////////////////////////////////////////////////
    address public taskMailbox;                          // the address where all of our offchain tasks go
    
    mapping(uint256 => Level) public levels;              // index of all levels
    mapping(address => uint256[]) private ownerLevels;    // index of all levels owned by an address
    uint256 public levelCount = 0;                        // total number of levels created
    uint256 public blockCount = 0;                        // total number of blocks created

    ////////////////////////////////////////////////////////////
    // CONSTRUCTOR
    ////////////////////////////////////////////////////////////
    constructor(address mailbox) {
        taskMailbox = mailbox;
    }

    ////////////////////////////////////////////////////////////
    // EVENTS
    ////////////////////////////////////////////////////////////
    event LevelCreated(uint256 indexed levelId, address indexed owner, string name);

    ////////////////////////////////////////////////////////////
    // FUNCTIONS
    ////////////////////////////////////////////////////////////
    /**
     * @notice Creates a new level with the given name and block map
     * @dev This function creates a new level and assigns it a unique ID. The level is stored
     *      in the levels mapping and indexed by the owner's address. The function emits a
     *      LevelCreated event upon successful creation.
     * @param name The human-readable name for the level
     * @param map An array of Block structs representing the level's topology
     * @return levelId The unique identifier of the newly created level
     * @custom:security This function is public and can be called by anyone. 
     */
    function createLevel(string memory name, Block[] memory map) public returns (uint256 levelId) {
        // Increment the level counter to get the new level ID
        levelId = levelCount++;

        // Create empty level and assign fields manually
        Level storage newLevel = levels[levelId];
        newLevel.id = levelId;
        newLevel.owner = msg.sender;
        newLevel.name = name;

        for (uint256 i = 0; i < map.length; i++) {
            newLevel.map.push(Block({
                x: map[i].x,
                y: map[i].y
            }));
        }

        // Add the level to the owner's index
        ownerLevels[msg.sender].push(levelId);

        // Emit the creation event
        emit LevelCreated(levelId, msg.sender, name);

        return levelId;
    }

    /**
     * @notice Returns an array of level IDs owned by the specified address
     * @param owner The address to get level IDs for
     * @return An array of level IDs owned by the address
     */
    function getOwnerLevels(address owner) public view returns (uint256[] memory) {
        return ownerLevels[owner];
    }
}
