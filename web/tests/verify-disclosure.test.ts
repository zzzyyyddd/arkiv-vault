import assert from "node:assert/strict";
import { test } from "node:test";

import { createSaltedCommitment } from "../src/lib/salted-merkle";
import { createDisclosurePackage } from "../src/lib/disclosure";
import { verifyDisclosurePackage } from "../src/lib/verify-disclosure";

const entityKey = `0x${"ab".repeat(32)}`;
const anotherEntityKey = `0x${"cd".repeat(32)}`;

const evidence = {
  title: "Arkiv Vault Contract",
  owner: "Alice",
  secret: "CONFIDENTIAL-92847",
};

async function fixture() {
  const commitment = await createSaltedCommitment(evidence);

  const disclosure = await createDisclosurePackage(
    evidence,
    commitment.salts,
    ["title"],
    entityKey,
    commitment.root
  );

  return {
    root: commitment.root,
    disclosure,
  };
}

test("valid disclosure passes verification", async () => {
  const { root, disclosure } = await fixture();

  const result = await verifyDisclosurePackage(
    disclosure,
    root,
    entityKey
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.verifiedFields, ["title"]);
});

test("modified disclosed value is rejected", async () => {
  const { root, disclosure } = await fixture();

  const tampered = structuredClone(disclosure);
  tampered.disclosedFields.title.value = "Fake Contract";

  const result = await verifyDisclosurePackage(
    tampered,
    root,
    entityKey
  );

  assert.equal(result.valid, false);
});

test("modified salt is rejected", async () => {
  const { root, disclosure } = await fixture();

  const tampered = structuredClone(disclosure);
  tampered.disclosedFields.title.salt = "00".repeat(32);

  const result = await verifyDisclosurePackage(
    tampered,
    root,
    entityKey
  );

  assert.equal(result.valid, false);
});

test("incorrect Merkle root is rejected", async () => {
  const { disclosure } = await fixture();

  const result = await verifyDisclosurePackage(
    disclosure,
    "00".repeat(32),
    entityKey
  );

  assert.equal(result.valid, false);
});

test("incorrect entity key is rejected", async () => {
  const { root, disclosure } = await fixture();

  const result = await verifyDisclosurePackage(
    disclosure,
    root,
    anotherEntityKey
  );

  assert.equal(result.valid, false);
});

test("empty disclosed fields are rejected", async () => {
  const { root, disclosure } = await fixture();

  const tampered = structuredClone(disclosure);
  tampered.disclosedFields = {};

  const result = await verifyDisclosurePackage(
    tampered,
    root,
    entityKey
  );

  assert.equal(result.valid, false);
});

test("malformed proof is rejected", async () => {
  const { root, disclosure } = await fixture();

  const tampered = structuredClone(disclosure);
  tampered.disclosedFields.title.proof = [
    {
      hash: "invalid-hash",
      position: "left",
    },
  ];

  const result = await verifyDisclosurePackage(
    tampered,
    root,
    entityKey
  );

  assert.equal(result.valid, false);
});
