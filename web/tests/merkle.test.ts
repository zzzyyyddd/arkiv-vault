import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createMerkleCommitment,
  createMerkleProof,
  verifyMerkleProof,
} from "../src/lib/merkle";

const evidence = {
  title: "Arkiv Vault Browser Test",
  content: "Private evidence content",
  createdAt: "2026-10-13T03:45:49.239Z",
};

test("valid Merkle proof is accepted", async () => {
  const commitment = await createMerkleCommitment(evidence);

  const proof = await createMerkleProof(evidence, "title");

  const valid = await verifyMerkleProof(
    "title",
    evidence.title,
    proof,
    commitment.root
  );

  assert.equal(valid, true);
});

test("modified field value is rejected", async () => {
  const commitment = await createMerkleCommitment(evidence);
  const proof = await createMerkleProof(evidence, "title");

  const valid = await verifyMerkleProof(
    "title",
    "Forged evidence title",
    proof,
    commitment.root
  );

  assert.equal(valid, false);
});

test("modified field name is rejected", async () => {
  const commitment = await createMerkleCommitment(evidence);
  const proof = await createMerkleProof(evidence, "title");

  const valid = await verifyMerkleProof(
    "content",
    evidence.title,
    proof,
    commitment.root
  );

  assert.equal(valid, false);
});

test("incorrect Merkle root is rejected", async () => {
  const proof = await createMerkleProof(evidence, "title");

  const valid = await verifyMerkleProof(
    "title",
    evidence.title,
    proof,
    "0".repeat(64)
  );

  assert.equal(valid, false);
});

test("odd number of fields works correctly", async () => {
  const commitment = await createMerkleCommitment(evidence);

  for (const [field, value] of Object.entries(evidence)) {
    const proof = await createMerkleProof(evidence, field);

    const valid = await verifyMerkleProof(
      field,
      value,
      proof,
      commitment.root
    );

    assert.equal(valid, true, `Proof failed for ${field}`);
  }
});

test("empty evidence is rejected", async () => {
  await assert.rejects(
    () => createMerkleCommitment({}),
    /at least one field/
  );
});
