import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createSaltedCommitment,
  verifySaltedProof,
} from "../src/lib/salted-merkle";

import { createDisclosurePackage } from "../src/lib/disclosure";

const entityKey = `0x${"ab".repeat(32)}`;

const evidence = {
  title: "Confidential Contract",
  owner: "Alice",
  secret: "PRIVATE-DO-NOT-SHARE-92741",
};

async function prepare() {
  const commitment = await createSaltedCommitment(evidence);

  const disclosure = await createDisclosurePackage(
    evidence,
    commitment.salts,
    ["title"],
    entityKey,
    commitment.root
  );

  return { commitment, disclosure };
}

test("disclosed field has a valid salted proof", async () => {
  const { commitment, disclosure } = await prepare();
  const field = disclosure.disclosedFields.title;

  assert.equal(
    await verifySaltedProof(
      "title",
      field.value,
      field.salt,
      field.proof,
      commitment.root
    ),
    true
  );
});

test("hidden fields and their salts are not exported", async () => {
  const { commitment, disclosure } = await prepare();

  assert.deepEqual(
    Object.keys(disclosure.disclosedFields),
    ["title"]
  );

  const exported = JSON.stringify(disclosure);

  assert.equal(exported.includes(evidence.secret), false);
  assert.equal(
    exported.includes(commitment.salts.secret),
    false
  );
  assert.equal(
    exported.includes(commitment.salts.owner),
    false
  );

  assert.equal(
    Object.hasOwn(disclosure, "decryptionKey"),
    false
  );
});

test("modified disclosed value fails verification", async () => {
  const { commitment, disclosure } = await prepare();
  const field = disclosure.disclosedFields.title;

  assert.equal(
    await verifySaltedProof(
      "title",
      "Modified Contract",
      field.salt,
      field.proof,
      commitment.root
    ),
    false
  );
});

test("modified disclosed salt fails verification", async () => {
  const { commitment, disclosure } = await prepare();
  const field = disclosure.disclosedFields.title;

  assert.equal(
    await verifySaltedProof(
      "title",
      field.value,
      "00".repeat(32),
      field.proof,
      commitment.root
    ),
    false
  );
});

test("incorrect commitment root is rejected", async () => {
  const commitment = await createSaltedCommitment(evidence);

  await assert.rejects(
    () =>
      createDisclosurePackage(
        evidence,
        commitment.salts,
        ["title"],
        entityKey,
        "00".repeat(32)
      ),
    /commitment mismatch/
  );
});

test("unknown fields cannot be disclosed", async () => {
  const commitment = await createSaltedCommitment(evidence);

  await assert.rejects(
    () =>
      createDisclosurePackage(
        evidence,
        commitment.salts,
        ["nonexistent"],
        entityKey,
        commitment.root
      ),
    /Unknown evidence field/
  );
});

test("empty disclosure is rejected", async () => {
  const commitment = await createSaltedCommitment(evidence);

  await assert.rejects(
    () =>
      createDisclosurePackage(
        evidence,
        commitment.salts,
        [],
        entityKey,
        commitment.root
      ),
    /Select at least one field/
  );
});
