import { expect, use } from 'chai';
import { Contract } from 'ethers';
import { deployContract, MockProvider, solidity } from 'ethereum-waffle';
import zarp from '../build/contracts/ZARP.json';

use(solidity);

let contract: Contract;
let contractAsMinter: Contract;
let contractAsVerifier: Contract;
let contractAsVerified: Contract;
let contractAsUnverified: Contract;
let contractAsBurner: Contract;
let contractAsFraudster: Contract;

const [owner, minter, verified, fraudster, verifier, unverified, burner] = new MockProvider().getWallets();

describe('ZARP Access Control Tests', () => {
  beforeEach('Deploy contract with R10, so we have something to work with. Typically we would start at 0 though', async () => {
    contract = await deployContract(owner, zarp);
    await contract.grantRole(await contract.MINTER_ROLE(), minter.address);
    await contract.grantRole(await contract.VERIFIER_ROLE(), verifier.address);
    await contract.grantRole(await contract.BURNER_ROLE(), burner.address);
    contractAsMinter = contract.connect(minter);
    contractAsVerified = contract.connect(verified);
    contractAsUnverified = contract.connect(unverified);
    contractAsVerifier = contract.connect(verifier);
    contractAsBurner = contract.connect(burner);
    contractAsFraudster = contract.connect(fraudster);
    await contractAsVerifier.verify(verified.address);
  });

  it('MINTER_ROLE can Mint to `Verified`', async () => {
    await contractAsMinter.mint(verified.address, 1000);
    expect(await contract.totalSupply()).to.equal(1000);
    expect(await contract.balanceOf(owner.address)).to.equal(0);
    expect(await contract.balanceOf(verified.address)).to.equal(1000);
  });

  it("Non-MINTER_ROLE can't mint", async () => {
    await expect(contractAsFraudster.mint(verified.address, 1000)).to.be.revertedWith('Sender doesnt have the MINTER_ROLE role');
    expect(await contract.balanceOf(verified.address)).to.equal(0);
    expect(await contract.totalSupply()).to.equal(0);
  });

  it("MINTER_ROLE can't mint to unverified", async () => {
    await expect(contractAsMinter.mint(unverified.address, 1000)).to.be.revertedWith('Account needs to be verified to accept minting');
    expect(await contract.balanceOf(unverified.address)).to.equal(0);
    expect(await contract.totalSupply()).to.equal(0);
  });

  it('MINTER_ROLE not allowed to be verified', async () => {
    await expect(contractAsVerifier.verify(minter.address)).to.be.revertedWith('MINTER_ROLE role not allowed to be verified');
    expect(await contract.isVerified(minter.address)).to.equal(false);
  });

  it('BURNER_ROLE can recieve tokens from verified address and burn them', async () => {
    await contractAsMinter.mint(verified.address, 1000);
    await contractAsVerified.transfer(burner.address, 1000);
    await contractAsBurner.burn(1000);
    expect(await contract.totalSupply()).to.equal(0);
    expect(await contract.balanceOf(burner.address)).to.equal(0);
    expect(await contract.balanceOf(verified.address)).to.equal(0);
  });

  it('non BURNER_ROLE cant burn tokens', async () => {
    await contractAsMinter.mint(verified.address, 1000);
    await expect(contractAsVerified.burn(1000)).to.be.revertedWith('Sender doesnt have the BURNER_ROLE role');
  });

  it('Non verified cant transfer to BURNER_ROLE', async () => {
    await contractAsMinter.mint(verified.address, 1000);
    await contractAsVerified.transfer(unverified.address, 1000);
    await expect(contractAsUnverified.transfer(burner.address, 1000)).to.be.revertedWith(
      "Sender Account needs to be 'verified' to allow transfer to burn account",
    );
  });

  it('BURNER_ROLE not allowed to be verified', async () => {
    await expect(contractAsVerifier.verify(burner.address)).to.be.revertedWith('BURNER_ROLE role not allowed to be verified');
    expect(await contract.isVerified(burner.address)).to.equal(false);
  });

  it('VERIFIER_ROLE can verify account', async () => {
    expect(await contract.isVerified(unverified.address)).to.equal(false);
    await contractAsVerifier.verify(unverified.address);
    expect(await contract.isVerified(unverified.address)).to.equal(true);
  });

  it('non-VERIFIER_ROLE cant verify account', async () => {
    expect(await contract.isVerified(unverified.address)).to.equal(false);
    await expect(contractAsMinter.verify(unverified.address)).to.be.revertedWith('Sender doesnt have the VERIFIER_ROLE role');
    expect(await contract.isVerified(unverified.address)).to.equal(false);
  });

  it('VERIFIER_ROLE can remove Verification on account', async () => {
    expect(await contract.isVerified(verified.address)).to.equal(true);
    await contractAsVerifier.removeVerification(verified.address);
    expect(await contract.isVerified(verified.address)).to.equal(false);
  });

  it('non-VERIFIER_ROLE cant remove Verification on account', async () => {
    expect(await contract.isVerified(verified.address)).to.equal(true);
    await expect(contractAsMinter.removeVerification(verified.address)).to.be.revertedWith('Sender doesnt have the VERIFIER_ROLE role');
    expect(await contract.isVerified(verified.address)).to.equal(true);
  });

  it('VERIFIER_ROLE not allowed to be verified', async () => {
    await expect(contractAsVerifier.verify(verifier.address)).to.be.revertedWith('VERIFIER_ROLE role not allowed to be verified');
    expect(await contract.isVerified(verifier.address)).to.equal(false);
  });

  it('DEFAULT_ADMIN_ROLE not allowed to be verified', async () => {
    await contract.grantRole(await contract.DEFAULT_ADMIN_ROLE(), unverified.address);
    await expect(contractAsVerifier.verify(unverified.address)).to.be.revertedWith('DEFAULT_ADMIN_ROLE role not allowed to be verified');
    expect(await contract.isVerified(unverified.address)).to.equal(false);
  });

  it('Owner not allowed to be verified', async () => {
    await contract.transferOwnership(unverified.address);
    await expect(contractAsVerifier.verify(unverified.address)).to.be.revertedWith('Owner not allowed to be verified');
    expect(await contract.isVerified(unverified.address)).to.equal(false);
  });

  it("Non-DEFAULT_ADMIN_ROLE can't assign roles", async () => {
    await expect(contractAsMinter.grantRole(await contract.MINTER_ROLE(), fraudster.address)).to.be.revertedWith(
      'sender must be an admin to grant',
    );
  });
});

describe('ZARP Core Tests', () => {
  beforeEach('Deploy contract with R10, so we have something to work with. Typically we would start at 0 though', async () => {
    contract = await deployContract(owner, zarp);
    await contract.grantRole(await contract.MINTER_ROLE(), minter.address);
    await contract.grantRole(await contract.VERIFIER_ROLE(), verifier.address);
    contractAsMinter = contract.connect(minter);
    contractAsBurner = contract.connect(burner);
    contractAsVerifier = contract.connect(verifier);
    contractAsVerified = contract.connect(verified);
    await contractAsVerifier.verify(verified.address);
  });

  it('Check Token Setup', async () => {
    expect(await contract.name()).to.equal('ZARP (Rand Reserve)');
    expect(await contract.decimals()).to.equal(2);
    expect(await contract.symbol()).to.equal('ZARP');
  });

  it('Assigns initial balance', async () => {
    expect(await contract.balanceOf(owner.address)).to.equal(0);
  });

  it('Mints R10 to customer', async () => {
    await contractAsMinter.mint(verified.address, 1000);
    expect(await contract.totalSupply()).to.equal(1000);
    expect(await contract.balanceOf(verified.address)).to.equal(1000);
  });

  it('Minting incrementally increases totalSupply', async () => {
    await contractAsMinter.mint(verified.address, 1000);
    expect(await contract.totalSupply()).to.equal(1000);
    await contractAsMinter.mint(verified.address, 1000);
    expect(await contract.totalSupply()).to.equal(2000);
  });

  it('Transfer adds amount to destination account', async () => {
    await contractAsMinter.mint(verified.address, 7);
    await contractAsVerified.transfer(unverified.address, 7);
    expect(await contract.balanceOf(verified.address)).to.equal(0);
    expect(await contract.balanceOf(unverified.address)).to.equal(7);
  });

  it('Transfer emits event', async () => {
    await contractAsMinter.mint(verified.address, 7);
    await expect(contractAsVerified.transfer(unverified.address, 7))
      .to.emit(contract, 'Transfer')
      .withArgs(verified.address, unverified.address, 7);
  });

  it('Can not transfer above the amount', async () => {
    await contractAsMinter.mint(verified.address, 10);
    await expect(contractAsVerified.transfer(unverified.address, 11)).to.be.reverted;
  });

  it('Can not transfer from empty account', async () => {
    await expect(contractAsVerified.transfer(unverified.address, 1)).to.be.reverted;
  });

  it('Calls totalSupply on ZARP contract', async () => {
    await contract.totalSupply();
    expect('totalSupply').to.be.calledOnContract(contract);
  });

  it('Calls balanceOf with sender address on ZARP contract', async () => {
    await contract.balanceOf(owner.address);
    expect('balanceOf').to.be.calledOnContractWith(contract, [owner.address]);
  });

  it("Doesn't allow burning without BURNER_ROLE role", async () => {
    await expect(contract.burn(10)).to.be.revertedWith('Sender doesnt have the BURNER_ROLE role');
  });

  it('Allows creating a customer-specific burn address', async () => {
    await contractAsMinter.mint(verified.address, 20);
    await contract.grantRole(await contract.BURNER_ROLE(), burner.address);
    await expect(contractAsBurner.burn(10)).to.be.revertedWith('burn amount exceeds balance');
    await contractAsVerified.transfer(burner.address, 20);
    expect(await contract.balanceOf(burner.address)).to.equal(20);
    await contractAsBurner.burn(5);
    expect(await contract.balanceOf(burner.address)).to.equal(15);
  });

  it('Verify emits event', async () => {
    await expect(contractAsVerifier.verify(unverified.address))
      .to.emit(contract, 'AddressVerificationChanged')
      .withArgs(unverified.address, verifier.address, true);
  });

  it('Remove Verification emits event', async () => {
    await expect(contractAsVerifier.removeVerification(verified.address))
      .to.emit(contract, 'AddressVerificationChanged')
      .withArgs(verified.address, verifier.address, false);
  });
});
