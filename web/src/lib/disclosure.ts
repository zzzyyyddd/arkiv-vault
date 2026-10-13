import {
  calculateSaltedRoot,
  createSaltedProof,
} from "./salted-merkle";

import type { MerkleProofStep } from "./merkle";

export type DisclosedField = {
  value: unknown;
  salt: string;
  proof: MerkleProofStep[];
};

export type DisclosurePackageV3 = {
  format: "arkiv-vault-disclosure-v3";
  sourceEntityKey: string;
  disclosedAt: string;
  disclosedFields: Record<string, DisclosedField>;
};

export async function createDisclosurePackage(
  evidence: Record<string, unknown>,
  salts: Record<string, string>,
  selectedFields: string[],
  entityKey: string,
  expectedRoot: string
): Promise<DisclosurePackageV3> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(entityKey)) {
    throw new Error("Invalid Arkiv entity key");
  }

  if (!/^[0-9a-f]{64}$/.test(expectedRoot)) {
    throw new Error("Invalid Merkle root");
  }

  if (selectedFields.length === 0) {
    throw new Error("Select at least one field");
  }

  const actualRoot = await calculateSaltedRoot(
    evidence,
    salts
  );

  if (actualRoot !== expectedRoot) {
    throw new Error("Evidence commitment mismatch");
  }

  const disclosedFields: Record<string, DisclosedField> =
    Object.create(null);

  for (const field of new Set(selectedFields)) {
    if (
      !Object.prototype.hasOwnProperty.call(evidence, field)
    ) {
      throw new Error(`Unknown evidence field: ${field}`);
    }

    disclosedFields[field] = {
      value: evidence[field],
      salt: salts[field],
      proof: await createSaltedProof(
        evidence,
        salts,
        field
      ),
    };
  }

  return {
    format: "arkiv-vault-disclosure-v3",
    sourceEntityKey: entityKey,
    disclosedAt: new Date().toISOString(),
    disclosedFields,
  };
}
