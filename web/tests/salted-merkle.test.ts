import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createSaltedCommitment,
  createSaltedProof,
  verifySaltedProof,
} from "../src/lib/salted-merkle";

const evidence = {
  title: "Arkiv Vault Test",
  content: "Confidential evidence",
  createdAt: "2026-10-13T03:45:49.239Z",
};

test("valid salted proof is accepted", async () => {
  const commitment = await createSaltedCommitment(evidence);
  const proof = await createSaltedProof(
    evidence,
    commitment.salts,
    "title"
  );

  assert.equal(
    await verifySaltedProof(
      "title",
      evidence.title,
      commitment.salts.title,
      proof,
      commitment.root
    ),
    true
  );
});

test("modified field value is rejected", async () => {
  const commitment = await createSaltedCommitment(evidence);
  const proof = await createSaltedProof(
    evidence,
    commitment.salts,
    "title"
  );

  assert.equal(
    await verifySaltedProof(
      "title",
      "Forged title",
      commitment.salts.title,
      proof,
      commitment.root
    ),
    false
  );
});

test("modified salt is rejected", async () => {
  const commitment = await createSaltedCommitment(evidence);
  const proof = await createSaltedProof(
    evidence,
    commitment.salts,
    "title"
  );

  assert.equal(
    await verifySaltedProof(
      "title",
      evidence.title,
      "00".repeat(32),
      proof,
      commitment.root
    ),
    false
  );
});

test("different commitments use different salts", async () => {
  const first = await createSaltedCommitment(evidence);
  const second = await createSaltedCommitment(evidence);

  assert.notEqual(first.salts.title, second.salts.title);
  assert.notEqual(first.root, second.root);
});

test("hidden field is not required for verification", async () => {
  const commitment = await createSaltedCommitment(evidence);
  const proof = await createSaltedProof(
    evidence,
    commitment.salts,
    "title"
  );

  const disclosed = {
    field: "title",
    value: evidence.title,
    salt: commitment.salts.title,
    proof,
  };

  assert.equal(
    await verifySaltedProof(
      disclosed.field,
      disclosed.value,
      disclosed.salt,
      disclosed.proof,
      commitment.root
    ),
    true
  );

  assert.equal(
    Object.hasOwn(disclosed, "content"),
    false
  );
});

test("modified hidden field changes commitment", async () => {
  const original = await createSaltedCommitment(evidence);
  const modifiedEvidence = {
    ...evidence,
    content: "Modified confidential evidence",
  };

  const modified = await createSaltedCommitment(
    modifiedEvidence
  );

  assert.notEqual(original.root, modified.root);
});

test("empty evidence is rejected", async () => {
  await assert.rejects(
    () => createSaltedCommitment({}),
    /Evidence cannot be empty/
  );
});
