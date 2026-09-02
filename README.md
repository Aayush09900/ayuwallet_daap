# Ayu Wallet DApp

Ayu Wallet is a non-custodial Ethereum wallet DApp using MetaMask, ethers.js v6, and the deployed Ayu Wallet contract on Sepolia.

## Features

- MetaMask + Sepolia network enforcement
- On-chain wallet balance via `balances(address)`
- Deposit, withdraw, and transfer flows
- Contract statistics and health
- Frozen-wallet state
- Trusted-contact contract support
- On-chain recent activity from contract events
- Sepolia Etherscan links
- Responsive Web3 UI
- GitHub Pages deployment workflow

## Contract

`0x10bb66634d453ad417ee1c66811ea0c8636dc2be`

Explorer: https://sepolia.etherscan.io/address/0x10bb66634d453ad417ee1c66811ea0c8636dc2be

## Run locally

Use VS Code Live Server, or:

```bash
python -m http.server 5500
```

Then open `http://127.0.0.1:5500`.

## Test plan

1. Connect on Sepolia.
2. Verify balance and counters.
3. Deposit a small test amount.
4. Verify transaction on Etherscan.
5. Withdraw a small amount.
6. Transfer to a second test account.
7. Test network and account switching.
8. Test frozen/unfrozen behavior against the deployed contract.
9. Confirm trusted-contact reads/writes.
10. Confirm no private keys or secrets exist in the repository.

## Deployment plan

**Development:** local server + Sepolia.

**Integration:** transaction and event regression testing.

**Pre-production:** GitHub Pages deployment and clean-browser regression.

**Mainnet readiness:** independently audit and verify the Solidity contract, deploy a reviewed mainnet implementation, update `config.js`, run a final small-value smoke test, then publish.

The frontend is testnet-oriented and should not be represented as audited or mainnet-safe until the contract and operational controls are independently reviewed.
