const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  let buyer, seller, inspector, lender, realEstate, escrow;

  beforeEach(async () => {
    [buyer, seller, inspector, lender] = await ethers.getSigners();
    const RealEstateDeploy = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstateDeploy.deploy();

    console.log(realEstate.address);

    // Mint
    let transaction = await realEstate
      .connect(seller)
      .mint(
        "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"
      );
    await transaction.wait();

    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(
      realEstate.address,
      seller.address,
      inspector.address,
      lender.address
    );

    // Approve property
    transaction = await realEstate.connect(seller).approve(escrow.address, 1);
    await transaction.wait();

    // List Property
    transaction = await escrow
      .connect(seller)
      .list(1, buyer.address, tokens(10), tokens(5));
    await transaction.wait();
  });

  describe("Deployment", async () => {
    it("Returns NFT address", async () => {
      const result = await escrow.nftAddress();
      expect(result).to.be.equal(realEstate.address);
    });

    it("Returns seller", async () => {
      const result = await escrow.seller();
      expect(result).to.be.equal(seller.address);
    });
    it("Returns inspector", async () => {
      const result = await escrow.inspector();
      expect(result).to.be.equal(inspector.address);
    });
    it("Returns lender", async () => {
      const result = await escrow.lender();
      expect(result).to.be.equal(lender.address);
    });
  });

  describe("Listing", () => {
    it("Update as listed", async () => {
      const result = await escrow.isListed(1);
      expect(result).to.be.equal(true);
    });

    it("Update ownership", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
    });

    it("Update purchase", async () => {
      const result = await escrow.purchasePrice(1);
      expect(result).to.be.equal(tokens(10));
    });

    it("Update amount", async () => {
      const result = await escrow.escrowAmount(1);
      expect(result).to.be.equal(tokens(5));
    });

    it("Update buyer", async () => {
      const result = await escrow.buyer(1);
      expect(result).to.be.equal(buyer.address);
    });
  });

  describe("Deposits", () => {
    it("Balance must be equal amount", async () => {
      const transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(5) });
      await transaction.wait();
      const result = await escrow.getBalance();
      expect(result).to.be.equal(tokens(5));
    });
  });

  describe("Inspection", () => {
    it("Inspection passed must be true", async () => {
      const transaction = await escrow
        .connect(inspector)
        .updateInpectionStatus(1, true);
      await transaction.wait();

      const result = await escrow.inspectionPassed(1);
      expect(result).to.be.equal(true);
    });
  });

  describe("Approval", () => {
    it("Update approval status", async () => {
      let transaction = await escrow.connect(buyer).approveSale(1);
      transaction = await escrow.connect(seller).approveSale(1);
      transaction = await escrow.connect(inspector).approveSale(1);
      await transaction.wait();

      expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
      expect(await escrow.approval(1, seller.address)).to.be.equal(true);
      expect(await escrow.approval(1, inspector.address)).to.be.equal(true);
    });
  });

  describe("Sale", () => {
    beforeEach(async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositEarnest(1, { value: tokens(10) });
      await transaction.wait();

      console.log(await escrow.getBalance())
      console.log(await escrow.purchasePrice(1))

      transaction = await escrow.connect(seller).approveSale(1);
      await transaction.wait();
      transaction = await escrow.connect(lender).approveSale(1);
      await transaction.wait();
      transaction = await escrow.connect(inspector).approveSale(1);
      await transaction.wait();
      transaction = await escrow.connect(buyer).approveSale(1);
      await transaction.wait();

      transaction = await escrow
        .connect(inspector)
        .updateInpectionStatus(1, true);
      await transaction.wait();

      transaction = await escrow.finalizeSale(1)
      await transaction.wait()
    });

    it("Updated balance after sold", async () => {
      const result = await escrow.getBalance();
      expect(result).to.be.equal(0);
    })

    it("Update ownerOf the NFT", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
    })

    it("Is it listed?", async () => {
      const result = await escrow.isListed(1);
      expect(result).to.be.equal(false);
    })
  });
});
