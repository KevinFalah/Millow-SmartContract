const hre = require("hardhat");

const tokens = (n) => {
  return hre.ethers.utils.parseUnits(n.toString(), "ether");
};

async function main() {
  let transaction
  const [buyer, seller, inspector, lender] = await hre.ethers.getSigners();
  const RealEstateDeploy = await hre.ethers.getContractFactory("RealEstate");
  const realEstate = await RealEstateDeploy.deploy();

  console.log(`Deployed Real Estate Contract at ${realEstate.address}`)
  console.log('Minting 3 Properties...')

  
  for(let i = 0; i <= 3; i++) {
    transaction = await realEstate.connect(seller).mint(`https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/${i + 1}.json`)
   await transaction.wait()
 }
  
  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(
    realEstate.address,
    seller.address,
    inspector.address,
    lender.address
  );
  await escrow.deployed()

  for(let i = 0; i <= 3; i++) {
    transaction = await realEstate.connect(seller).approve(escrow.address, i + 1)
    await transaction.wait()
  }

  transaction = await escrow
  .connect(seller)
  .list(1, buyer.address, tokens(20), tokens(10));
await transaction.wait();
  transaction = await escrow
  .connect(seller)
  .list(2, buyer.address, tokens(15), tokens(5));
await transaction.wait();
  transaction = await escrow
  .connect(seller)
  .list(3, buyer.address, tokens(10), tokens(5));
await transaction.wait();

console.log('Deploy Success')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
