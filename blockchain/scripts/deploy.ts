import { ethers } from "hardhat";

async function main() {
  const DebateContract = await ethers.getContractFactory("DebateContract");
  const contract = await DebateContract.deploy();
  await contract.waitForDeployment();
  console.log("Contract deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});