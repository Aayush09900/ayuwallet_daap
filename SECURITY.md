# Security Policy

## Scope

Ayu Wallet is currently a Sepolia testnet application. This repository does not collect or store seed phrases, private keys, customer passwords, or personal identity records.

## Frontend privacy controls

- Wallet address state is kept in browser memory for the active session.
- The app does not use customer analytics, advertising identifiers, or tracking pixels.
- UI preference state uses sessionStorage rather than long-lived application storage.
- Transaction and provider errors are presented generically and are not written to the browser console.
- Activity rendering uses DOM APIs instead of interpolating blockchain values into unsanitized HTML.
- The page uses a Content Security Policy, restrictive referrer policy, and Permissions Policy.

## Important blockchain privacy limitation

Ethereum and Sepolia are public networks. Wallet addresses, contract balances, transaction history, and contract interactions are publicly observable. The application does not provide on-chain anonymity or confidentiality.

## Secrets

Never commit:

- seed phrases
- private keys
- RPC credentials that are intended to remain private
- API secrets
- customer passwords
- database credentials
- production signing material

## Reporting

Please do not publish active security vulnerabilities or exposed credentials in a public issue. Report sensitive findings privately to the repository owner and include reproduction steps, affected files, and impact.

## Production readiness

Before real funds or mainnet deployment, independently audit the Solidity contract and review wallet custody, authorization, withdrawal controls, rate limits, monitoring, incident response, dependency integrity, and deployment infrastructure.
