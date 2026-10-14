# Arkiv Vault — Entity Schema

## Overview

Arkiv Vault uses Arkiv Tiramisu to publish encrypted evidence and
cryptographic commitments for selective disclosure verification.

The application encrypts evidence client-side before publishing it.
Arkiv stores the encrypted payload and public metadata, not the
plaintext evidence or the user's AES decryption key.

## Network

- Network: Arkiv Tiramisu testnet
- Chain ID: 7738577
- SDK: @arkiv-network/sdk 0.8.x
- Entity creation: wallet.createEntity()
- Payload content type: application/json

## Entity Creation

The browser wallet creates an entity with:

- payload: jsonToPayload(encrypted)
- contentType: application/json
- expires: ExpirationTime.fromDays(30)
- flags.readonly: true

The expiration applies to newly published entities using the
current application implementation. Earlier entities may have
different expiration settings.

## Entity Attributes

| Attribute | Type | Description |
| --- | --- | --- |
| app | string | Identifies the application as arkiv-vault |
| record_type | string | Identifies encrypted-evidence records |
| encryption | string | Indicates aes-256-gcm encryption |
| merkle_root | string | Public Merkle commitment for supported evidence versions |
| evidence_version | integer | Evidence format version, currently v3 |

The merkle_root and evidence_version attributes are included
when supported by the encrypted evidence version and when
a Merkle root is present.

## Encrypted Payload

The entity payload contains the JSON-serialized EncryptedEvidence
object produced by the client-side encryption implementation.

The payload is encrypted before being published to Arkiv.

The precise serialization and cryptographic fields are defined
by web/src/lib/encryption.ts.

## Selective Disclosure

Arkiv Vault supports v3 disclosure packages.

The verifier expects:

- format: arkiv-vault-disclosure-v3
- sourceEntityKey: a 32-byte Arkiv entity key
- disclosedFields: the selectively disclosed field data and proofs

The verifier obtains the trusted commitment from the referenced
Arkiv entity instead of trusting a commitment supplied solely
by the disclosure package.

It then checks the disclosure using the application's
Merkle proof verification implementation.

## Verification Flow

1. A user encrypts evidence locally.
2. The browser wallet publishes encrypted evidence to Arkiv.
3. Arkiv returns an entity key.
4. The owner retrieves and decrypts evidence locally.
5. The owner generates a selective disclosure package.
6. A verifier fetches the trusted Merkle root from Arkiv.
7. The verifier validates the disclosed fields against that root.
8. Modified disclosed values fail cryptographic verification.

## What Is Stored on Arkiv

- Encrypted evidence payload
- Public metadata attributes
- Merkle root commitment
- Evidence format version

## What Is Kept Off Arkiv

- AES decryption keys
- Unencrypted evidence
- Private backup files
- Undisclosed plaintext fields

Private backups remain under the user's control and must not
be committed to the public repository.

## Limitations

- Arkiv entity expiration limits long-term retrieval.
- Verification requires access to the referenced Arkiv entity.
- Merkle proofs establish consistency with a committed record,
  not the real-world truth of the original evidence.
- Selective disclosure is not a zero-knowledge proof.
- Public metadata and disclosed fields may reveal information.
- The application should be demonstrated with synthetic data.

## Source Files

- web/src/lib/arkiv-wallet.ts
- web/src/lib/arkiv-verification.ts
- web/src/lib/verify-against-arkiv.ts
- web/src/lib/verify-disclosure.ts
- web/src/lib/encryption.ts
- web/src/lib/salted-merkle.ts
- web/src/lib/disclosure.ts
