// blockchain.ts
import { ethers } from "ethers";
import DebateContract from "../contracts/DebateContract.json";

declare global {
  interface Window {
    ethereum: any;
  }
}

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const CONTRACT_ABI = DebateContract.abi;

export async function connectDebateContract() {
  if (!window.ethereum) throw new Error("Install MetaMask!");
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    signer
  );
}

export async function createNewDebate(topic: string): Promise<number> {
  if (!window.ethereum) throw new Error("No Ethereum provider");
  
  try {
    const contract = await connectDebateContract();
    
    // Estimate gas first
    const gasEstimate = await contract.createDebate.estimateGas(topic);
    
    // Send transaction with gas buffer
    const tx = await contract.createDebate(topic, {
      gasLimit: gasEstimate + 10000n // Add 10% buffer
    });
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    if (!receipt.status) {
      throw new Error("Transaction failed");
    }

    // Get debate count directly
    const debateCount = await contract.getDebateCount();
    return Number(debateCount) - 1;
    
  } catch (error) {
    console.error("Detailed error:", error);
    throw new Error("Failed to create debate. Please try again.");
  }
}

export async function declareDebateWinner(
  debateId: number,
  winnerCode: 1 | 2
): Promise<string> {
  const contract = await connectDebateContract();
  const tx = await contract.certifyResult(debateId, winnerCode);
  await tx.wait();
  return tx.hash;
}