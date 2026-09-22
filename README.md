# Ayu Wallet DApp

Ayu Wallet is a **non-custodial Ethereum wallet DApp** focused on secure Sepolia testnet flows with MetaMask and ethers.js v6.

The current frontend intentionally separates:
- **MetaMask Wallet Balance** — native ETH held by the connected wallet.
- **Ayu Contract Account Balance** — the connected user's balance recorded inside the deployed contract.
- **Live Contract TVL** — the total ETH currently held by the contract on-chain.

There are **no demo balances** in the product UI. The contract TVL is read from the deployed Sepolia contract, and the **Add Balance** action performs a real payable `deposit()` transaction.

## Deployment

Ayu Wallet is deployed through GitHub Pages for Sepolia integration testing.

## Features

- MetaMask + Sepolia network enforcement
- Separate native wallet and contract-account balances
- Real **Add Balance** flow using the contract `deposit()` method
- Withdrawal and transfer flows
- Live contract TVL and cumulative statistics
- Frozen-wallet state
- Trusted-contact contract support
- On-chain recent activity from contract events
- Sepolia Etherscan links
- Responsive neon Matrix-style Web3 UI
- GitHub Actions validation and gated deployment

## Security & Privacy

The frontend includes defense-in-depth controls for a testnet wallet UI:

- Strict Content Security Policy in the page markup
- Referrer policy and restrictive Permissions Policy
- No seed phrase or private-key collection
- No analytics, advertising IDs, or customer profiling
- Wallet state is kept in browser memory for the active session
- Matrix UI preference is stored only in `sessionStorage`
- Transaction errors are not written to browser console logs
- Activity rows are rendered with DOM APIs rather than unsanitized `innerHTML`
- Contract address, ABI, and chain are explicitly configured
- GitHub Actions validates frontend structure, security rules, and the real on-chain funding flow before deployment

### Privacy limitation

Ethereum/Sepolia blockchain data is public by design. Wallet addresses, balances, transactions, and contract interactions can be inspected on-chain. The frontend does not claim to make public blockchain activity private.

**Never enter a seed phrase or private key into this application.**

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
2. Verify MetaMask balance and contract-account balance are separate.
3. Add a small test balance through **Add Balance**.
4. Confirm the user's contract balance increases after confirmation.
5. Confirm Live Contract TVL changes on-chain.
6. Verify the transaction on Etherscan.
7. Withdraw a small amount.
8. Transfer to a second test account.
9. Test network and account switching.
10. Test frozen/unfrozen behavior against the deployed contract.
11. Confirm trusted-contact reads/writes.
12. Confirm no secrets or personal data are stored by the frontend.

## Deployment plan

**Development:** local server + Sepolia.

**Integration:** automated JavaScript/ABI/UI/security validation.

**Pre-production:** GitHub Pages deployment only after validation succeeds.

**Mainnet readiness:** independently audit and verify the Solidity contract, review signing and custody controls, deploy a reviewed mainnet implementation, update `config.js`, run a final small-value smoke test, and publish only after operational security review.

The frontend is **testnet-oriented and not audited or mainnet-safe** until the contract and operational controls are independently reviewed.
