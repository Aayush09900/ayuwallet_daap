# Ayu Wallet deployment plan

## Phase 1 — Development
- Run locally with VS Code Live Server.
- Use Sepolia only.
- Verify MetaMask connection, ABI loading, contract address and read calls.

## Phase 2 — Integration
- Test deposit, withdrawal and transfer with small test amounts.
- Verify event-driven activity against Etherscan.
- Test frozen/unfrozen and trusted-contact methods.
- Test account switching and wrong-network handling.

## Phase 3 — Pre-production
- Deploy the static frontend with GitHub Pages.
- Run a clean-browser / second-account regression.
- Confirm no secrets are committed.
- Tag a release candidate.

## Phase 4 — Mainnet readiness
- Independently audit the Solidity contract.
- Verify published contract source.
- Deploy the reviewed mainnet contract.
- Update `config.js` only after sign-off.
- Run a small-value production smoke test.

## Phase 5 — Production
- Publish the reviewed build.
- Monitor failed transactions and user reports.
- Maintain releases and a rollback path.
