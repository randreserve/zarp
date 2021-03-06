# ZARP Contribution Guide

## Principles

Brief list of principles, and impact on tech:

- Use and trust openzeppelin. We believe that sticking to battle-tested open-source implementations results in simple, robust and secure contracts
- Test-driven, but don't recreate all the openzeppelin tests (see above)
- Use frameworks for what they are best at: Waffle allows for simple and elegant testing, Truffle allows for simple and elegant deployments, and Ganache creates clean sanboxes to test in

## Running the project

```js
// For local chains run truffle develop, truffle ganache-cli, or truffle ganache-desktop
yarn truffle
yarn truffle:gc
yarn truffle:gd
// For ropsten, have .env setup and run
yarn truffle:ropsten

// Examples
migrate // Migrate (if needed)
# Test
let contract = await ZARP.deployed()
await contract.name() // Query name from contract  (verifies that migration worked correctly)
contract.address // Can then add address to e.g. metamask accounts
let accounts = await web3.eth.getAccounts()
await contract.grantRole(await contract.MINTER_ROLE(), accounts[1])
await contract.grantRole(await contract.BURNER_ROLE(), accounts[1])
await contract.grantRole(await contract.VERIFIER_ROLE(), accounts[2])
await contract.verify(accounts[3], {from: accounts[2]})
await contract.mint(accounts[3], 100000000, {from: accounts[1]})
(await contract.balanceOf(accounts[3])).toNumber()
await contract.transfer(accounts[4], 20000000, {from: accounts[3]})
await contract.transfer(accounts[1], 30000000, {from: accounts[3]})
await contract.burn(30000000, {from: accounts[1]})
(await contract.totalSupply()).toNumber()

```

Requirements for .env:

```conf
ROPSTEN_MNEMONIC=""
INFURA_API_KEY=""
```

## Tests

Before submitting a PR, make sure that all tests pass

`yarn test`
