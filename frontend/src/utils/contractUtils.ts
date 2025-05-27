import { ethers } from 'ethers';
import HotdogHavocABI from '../abis/HotdogHavoc.json';
import devnetManifest from '../manifests/devnet.json';

// Contract address from manifest
const CONTRACT_ADDRESS = devnetManifest.addresses.HotdogHavoc;
console.log('Contract address from manifest:', CONTRACT_ADDRESS);

// Type for a block in the level
interface Block {
  x: number;
  y: number;
}

// Add and switch to devnet
export const switchToDevnet = async () => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('No Ethereum wallet found');
  }

  try {
    // Try to switch to the devnet
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${devnetManifest.chainInfo.chainId.toString(16)}` }],
    });
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${devnetManifest.chainInfo.chainId.toString(16)}`,
              chainName: 'Local Devnet',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['http://localhost:8545'],
            },
          ],
        });
      } catch (addError) {
        throw new Error('Failed to add devnet to MetaMask');
      }
    } else {
      throw new Error('Failed to switch to devnet');
    }
  }
};

// Get contract instance
export const getContract = async () => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('No Ethereum wallet found');
  }

  // Get the first provider (MetaMask if available)
  let provider = new ethers.BrowserProvider(window.ethereum as any);
  
  // Check if we're on the right network
  const network = await provider.getNetwork();
  console.log('Current network:', network);
  
  if (network.chainId !== BigInt(devnetManifest.chainInfo.chainId)) {
    // Try to switch to devnet
    await switchToDevnet();
    // Get a new provider after switching
    const newProvider = new ethers.BrowserProvider(window.ethereum as any);
    const newNetwork = await newProvider.getNetwork();
    if (newNetwork.chainId !== BigInt(devnetManifest.chainInfo.chainId)) {
      throw new Error(`Please connect to chain ID ${devnetManifest.chainInfo.chainId}`);
    }
    provider = newProvider;
  }
  
  const signer = await provider.getSigner();
  
  console.log('Creating contract with:', {
    address: CONTRACT_ADDRESS,
    abi: HotdogHavocABI.abi
  });
  
  const contract = new ethers.Contract(CONTRACT_ADDRESS, HotdogHavocABI.abi, signer);
  console.log('Contract created with address:', contract.address);
  return contract;
};

// Create a new level
export const createLevel = async (name: string, blocks: Block[]) => {
  let contract;
  try {
    console.log('Getting contract...');
    contract = await getContract();
    console.log('Contract obtained:', contract.address);
    
    // Convert blocks to the format expected by the contract
    const formattedBlocks = blocks.map(block => ({
      x: block.x,
      y: block.y
    }));

    console.log('Creating level with:', {
      name,
      blockCount: formattedBlocks.length,
      blocks: formattedBlocks
    });

    // Call createLevel on the contract
    console.log('Preparing transaction...');
    try {
      console.log('Checking contract method:', {
        hasCreateLevel: !!contract.createLevel,
        interface: contract.interface.format(),
        address: contract.address
      });
      
      console.log('Estimating gas...');
      const gasEstimate = await contract.createLevel.estimateGas(name, formattedBlocks);
      console.log('Gas estimate:', gasEstimate.toString());
      
      console.log('Sending transaction...');
      const tx = await contract.createLevel(name, formattedBlocks);
      console.log('Transaction sent:', tx.hash);
      
      // Wait for transaction to be mined
      console.log('Waiting for transaction to be mined...');
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      
      // Find the LevelCreated event in the receipt
      const event = receipt.logs.find(
        (log: any) => log.fragment && log.fragment.name === 'LevelCreated'
      );

      if (event) {
        return {
          levelId: event.args[0],
          owner: event.args[1],
          name: event.args[2]
        };
      }

      throw new Error('LevelCreated event not found in transaction receipt');
    } catch (txError: any) {
      console.error('Transaction error details:', {
        code: txError.code,
        message: txError.message,
        data: txError.data,
        error: txError,
        stack: txError.stack
      });
      throw txError;
    }
  } catch (error: any) {
    console.error('Error creating level:', error);
    
    // Check for specific error types
    if (error.code === 'ACTION_REJECTED') {
      throw new Error('Transaction was rejected by user');
    }
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient funds for gas * price + value');
    }
    
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      console.error('Gas estimation failed. This usually means the transaction will fail. Details:', error);
      throw new Error('Transaction would fail. Check console for details.');
    }
    
    // If it's a revert, try to decode the reason
    if (error.data && contract) {
      try {
        const decodedError = contract.interface.parseError(error.data);
        console.error('Transaction reverted with reason:', decodedError);
        throw new Error(`Transaction reverted: ${decodedError?.name || 'Unknown reason'}`);
      } catch (e) {
        console.error('Could not decode revert reason:', e);
      }
    }
    
    throw error;
  }
};

// Get total number of levels
export const getLevelCount = async () => {
  try {
    const contract = await getContract();
    return await contract.levelCount();
  } catch (error) {
    console.error('Error getting level count:', error);
    throw error;
  }
};

// Get level details by ID
export const getLevel = async (levelId: number) => {
  try {
    const contract = await getContract();
    return await contract.levels(levelId);
  } catch (error) {
    console.error('Error getting level:', error);
    throw error;
  }
};

// Get all level IDs owned by an address
export const getOwnerLevels = async (ownerAddress: string): Promise<number[]> => {
  try {
    const contract = await getContract();
    const levelIds = await contract.getOwnerLevels(ownerAddress);
    console.log('Level IDs:', levelIds);
    return levelIds.map((id: bigint) => Number(id));
  } catch (error) {
    console.error('Error getting owner levels:', error);
    throw error;
  }
}; 