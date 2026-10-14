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


## Exact EncryptedEvidence Payload Schema

The JSON payload stored in Arkiv follows the TypeScript
`EncryptedEvidence` type.

| Field | Type | Description |
| --- | --- | --- |
| version | 1, 2, or 3 | Current publisher produces version 3 |
| algorithm | string | Always AES-256-GCM |
| iv | string | Base64-encoded 12-byte initialization vector |
| ciphertext | string | Base64-encoded encrypted evidence |
| authTag | string | Base64-encoded 16-byte authentication tag |
| merkleRoot | optional string | Salted Merkle commitment |

For v3, the encrypted plaintext contains an object with:

- format: arkiv-vault-private-payload-v3
- evidence: the original evidence object
- salts: per-field random salts used for commitments

These private values are encrypted together before publishing.

## Exact DisclosurePackageV3 Schema

The disclosure package is a separate JSON document:

| Field | Type | Description |
| --- | --- | --- |
| format | string | arkiv-vault-disclosure-v3 |
| sourceEntityKey | string | Arkiv entity key, 0x plus 64 hex characters |
| disclosedAt | string | ISO 8601 timestamp |
| disclosedFields | object | Mapping of disclosed field names to proof data |

Each entry in `disclosedFields` contains:

| Field | Type | Description |
| --- | --- | --- |
| value | any JSON value | Disclosed evidence field value |
| salt | string | Salt associated with that field |
| proof | array | Merkle proof steps for the disclosed field |

The verifier retrieves the trusted `merkle_root` attribute
from Arkiv using `sourceEntityKey`.

A disclosure package does not need to expose the AES key,
the full evidence document, or undisclosed field values.


## Merkle Proof Construction (v3)

Evidence fields are sorted alphabetically before building
the Merkle tree.

Each field receives a cryptographically random 32-byte salt,
represented as 64 lowercase hexadecimal characters.

A leaf hash is computed as SHA-256 of the UTF-8 encoding of:

    JSON.stringify([
      "arkiv-vault-salted-leaf-v3",
      fieldName,
      fieldValue,
      salt
    ])

An internal node is computed as SHA-256 of the following bytes:

    0x01 || leftHashBytes || rightHashBytes

Each hash is 32 bytes. When a tree level contains an odd
number of nodes, the final node is duplicated.

### MerkleProofStep

Each proof step contains:

| Field | Type | Description |
| --- | --- | --- |
| hash | string | Sibling hash, 64 lowercase hexadecimal characters |
| position | "left" or "right" | Position of the sibling relative to the current hash |

Verification starts with the disclosed field's salted leaf hash.

For each proof step, the verifier combines the sibling hash
on the indicated side and computes the parent hash.

The resulting root must equal the trusted `merkle_root`
attribute retrieved independently from Arkiv.

A modified field value, salt, or proof should fail verification.

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
