import assert from "node:assert/strict";
import { test } from "node:test";

import {
  encryptEvidence,
  decryptEvidence,
  type EncryptedEvidence,
} from "../src/lib/encryption";

import { createMerkleCommitment } from "../src/lib/merkle";

const evidence = {
  title: "Arkiv Vault v3 Test",
  content: "Confidential evidence",
  createdAt: "2026-10-13T03:45:49.239Z",
};

test("v3 encrypt and decrypt works", async () => {
  const { encrypted, key } = await encryptEvidence(evidence);

  assert.equal(encrypted.version, 3);
  assert.match(encrypted.merkleRoot!, /^[0-9a-f]{64}$/);

  const recovered = await decryptEvidence(encrypted, key);
  assert.deepEqual(recovered, evidence);
});

test("v3 modified Merkle root is rejected", async () => {
  const { encrypted, key } = await encryptEvidence(evidence);

  const tampered: EncryptedEvidence = {
    ...encrypted,
    merkleRoot: "0".repeat(64),
  };

  await assert.rejects(
    () => decryptEvidence(tampered, key),
    /commitment mismatch/
  );
});

test("v3 wrong decryption key is rejected", async () => {
  const { encrypted } = await encryptEvidence(evidence);

  await assert.rejects(
    () => decryptEvidence(encrypted, "00".repeat(32))
  );
});

test("v3 tampered ciphertext is rejected", async () => {
  const { encrypted, key } = await encryptEvidence(evidence);

  const tampered: EncryptedEvidence = {
    ...encrypted,
    ciphertext: btoa("tampered ciphertext"),
  };

  await assert.rejects(
    () => decryptEvidence(tampered, key)
  );
});

test("v3 encryption produces different roots", async () => {
  const first = await encryptEvidence(evidence);
  const second = await encryptEvidence(evidence);

  assert.notEqual(
    first.encrypted.merkleRoot,
    second.encrypted.merkleRoot
  );
});

async function encryptLegacy(
  version: 1 | 2
): Promise<{ encrypted: EncryptedEvidence; key: string }> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const plaintext = new TextEncoder().encode(
    JSON.stringify(evidence)
  );

  const result = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, tagLength: 128 },
      key,
      plaintext
    )
  );

  const rawKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", key)
  );

  const toBase64 = (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes));

  const encrypted: EncryptedEvidence = {
    version,
    algorithm: "AES-256-GCM",
    iv: toBase64(iv),
    ciphertext: toBase64(result.slice(0, -16)),
    authTag: toBase64(result.slice(-16)),
  };

  if (version === 2) {
    const commitment = await createMerkleCommitment(evidence);
    encrypted.merkleRoot = commitment.root;
  }

  return {
    encrypted,
    key: Array.from(rawKey)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
  };
}

test("legacy v1 remains decryptable", async () => {
  const { encrypted, key } = await encryptLegacy(1);
  assert.deepEqual(
    await decryptEvidence(encrypted, key),
    evidence
  );
});

test("legacy v2 remains decryptable", async () => {
  const { encrypted, key } = await encryptLegacy(2);
  assert.deepEqual(
    await decryptEvidence(encrypted, key),
    evidence
  );
});

test("legacy v2 modified commitment is rejected", async () => {
  const { encrypted, key } = await encryptLegacy(2);

  await assert.rejects(
    () =>
      decryptEvidence(
        { ...encrypted, merkleRoot: "0".repeat(64) },
        key
      ),
    /commitment mismatch/
  );
});
