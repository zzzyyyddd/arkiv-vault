# Arkiv Vault

**Encrypted Evidence Storage with Verifiable Selective Disclosure**

Arkiv Vault is a privacy-focused application built on Arkiv Network. It allows users to encrypt evidence locally, publish encrypted records, recover them securely, and disclose selected fields with cryptographic proofs.

## Features

- **Client-side encryption:** AES-256-GCM encryption before publishing.
- **Arkiv storage:** Encrypted evidence is published to Arkiv Tiramisu.
- **Private recovery:** Evidence can be retrieved and decrypted using a private backup key.
- **Selective disclosure:** Share selected evidence fields without revealing the complete record.
- **Salted Merkle commitments:** Each field receives a random salt before commitment.
- **Independent verification:** Verify disclosed fields against a Merkle root retrieved from Arkiv.
- **Tamper detection:** Modified disclosed values fail cryptographic verification.

## How It Works

1. The user enters evidence in the browser.
2. Arkiv Vault encrypts the evidence using AES-256-GCM.
3. A salted Merkle commitment is generated for the evidence fields.
4. The encrypted payload and public commitment are published to Arkiv.
5. The user saves a private backup containing the decryption key.
6. Evidence can be retrieved from Arkiv and decrypted locally.
7. The user selects fields to disclose.
8. A disclosure package containing selected values, salts, and Merkle proofs is generated.
9. A verifier retrieves the commitment from Arkiv and checks the disclosed fields.

## Technology Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Arkiv SDK
- Viem
- Wagmi
- Web Crypto API

## Run Locally

Requirements:

- Node.js
- npm
- A browser with a compatible EVM wallet for publishing

```bash
cd web
npm ci
npm run dev
```


Open http://localhost:3000 in your browser.

## Tests

Run from the web directory:

- npx tsc --noEmit
- npx tsx --test tests/*.test.ts
- npm run build

The automated suite contains 35 passing tests.

## Verified End-to-End Demo

The following workflow was manually tested on Arkiv Tiramisu:

1. Encrypt evidence locally.
2. Publish encrypted evidence to Arkiv.
3. Retrieve and decrypt evidence.
4. Generate a v3 selective disclosure package.
5. Verify an authentic disclosure against Arkiv.
6. Reject a disclosure with a tampered field value.

Public demo entity key:

0x0a8e134677220b6023c131883a941168022a44be005d526a4bd5053232d80160

## Security and Limitations

- Encryption and decryption happen in the browser.
- Private backup files contain the decryption key and must remain confidential.
- Selective disclosure operates on top-level evidence fields.
- Verification proves consistency with a commitment, not real-world truth.
- Verification depends on the Arkiv RPC endpoint.
- This is not a zero-knowledge proof system.
- Published entities currently expire after seven days.
- The prototype has not undergone an independent security audit.

## Network

Arkiv Tiramisu Testnet, Chain ID: 7738577.

## Project Status

Functional hackathon prototype with successful end-to-end testing.
