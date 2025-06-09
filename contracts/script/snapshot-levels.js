const { ethers } = require('ethers');
const fs = require('fs');

// HotdogHavoc ABI - only the functions we need
const ABI = [
    "function levelCount() view returns (uint256)",
    "function getLevelBlocks(uint256) view returns (tuple(uint8 x, uint8 y)[])",
    "function levels(uint256) view returns (uint256 id, address owner, string name)"
];

async function main() {
    // Connect to local Anvil
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    
    // Get contract address from environment
    const contractAddress = process.env.HOTDOG_HAVOC_ADDRESS;
    if (!contractAddress) {
        console.error('Please set HOTDOG_HAVOC_ADDRESS environment variable');
        process.exit(1);
    }

    // Create contract instance
    const contract = new ethers.Contract(contractAddress, ABI, provider);

    // Get total level count
    const levelCount = await contract.levelCount();
    console.log(`Found ${levelCount} levels`);

    // Fetch each level's blocks and metadata
    const levels = [];
    for (let i = 0; i < levelCount; i++) {
        const [id, owner, name] = await contract.levels(i);
        const blocks = await contract.getLevelBlocks(i);
        levels.push({
            id: Number(id),
            owner: owner,
            name: name,
            blocks: blocks.map(block => ({
                x: Number(block.x),
                y: Number(block.y)
            }))
        });
        console.log(`Fetched level ${i + 1}/${levelCount}: ${name}`);
    }

    // Write to file
    const output = { levels };
    fs.writeFileSync('level-snapshot.json', JSON.stringify(output, null, 2));
    console.log('Level snapshot saved to level-snapshot.json');
}

main().catch(console.error); 