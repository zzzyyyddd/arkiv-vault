# Arkiv Vault — Developer Friction Report

## Environment

- Network: Arkiv Tiramisu testnet
- Chain ID: 7738577
- SDK: @arkiv-network/sdk 0.8.x
- Framework: Next.js, TypeScript, Viem
- Integration: Browser wallet and Arkiv public client

## Summary

Arkiv Vault successfully published and retrieved encrypted evidence
using the Arkiv SDK.

We did not encounter RPC failures during development.

The main challenge was planning entity expiration for a
time-sensitive hackathon submission.

## 1. Entity Expiration and Demo Availability

### Context

Arkiv Vault stores encrypted evidence and public Merkle commitments
in Arkiv entities.

Independent verification depends on retrieving the original
entity and its trusted Merkle root.

### Initial Implementation

Our initial implementation used:

```typescript
expires: ExpirationTime.fromDays(7)
```
We later realized that seven days might be insufficient
for judges to access the evidence during evaluation.

### Reproduction Steps

1. Publish an entity using ExpirationTime.fromDays(7).
2. Record its entity key and expiration metadata.
3. Compare the expiration with the judging period.
4. Change the configuration to ExpirationTime.fromDays(30).
5. Publish a new entity.
6. Retrieve the new entity and inspect its expiration metadata.

### Observed Behavior

The new entity used the updated expiration configuration.
Previously published entities retained their original expiration.

This was an application lifecycle planning challenge,
not an Arkiv SDK defect.

### Workaround

We changed the expiration configuration to 30 days
and published a new evidence entity.

### Suggested Improvement

Documentation could provide practical guidance for:

- Choosing expiration periods for different applications
- Keeping hackathon demos accessible during judging
- Inspecting entity expiration metadata
- Planning long-term verification workflows

## 2. Independent Verification Design

Arkiv Vault verifies selectively disclosed evidence without
requiring access to the full plaintext or AES decryption key.

A verifier should not trust a Merkle root supplied only
by the disclosure package itself.

Our verifier:

1. Reads the source entity key.
2. Retrieves the entity using client.getEntity().
3. Checks the application, record type, and version.
4. Reads the trusted merkle_root attribute from Arkiv.
5. Verifies the disclosed fields against that commitment.

### Suggested Improvement

An end-to-end documentation example covering independent
verification of entity attributes would be useful.

This is a documentation suggestion, not an SDK bug.

## 3. What Worked Well

- Entity creation through wallet.createEntity() worked.
- Entity retrieval through client.getEntity() worked.
- Custom attributes supported Merkle commitments.
- Read-only entities suited the evidence use case.
- Browser-wallet publishing worked.
- No RPC errors were encountered during development.

## 4. Report Scope

This report describes actual development experience.

We do not claim an SDK defect or RPC outage.
The expiration challenge was resolved through application
configuration and publishing a new entity.
