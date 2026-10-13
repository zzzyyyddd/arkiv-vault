import { verifySaltedProof } from "./salted-merkle";
import type { MerkleProofStep } from "./merkle";

type VerificationResult = {
  valid: boolean;
  verifiedFields: string[];
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export async function verifyDisclosurePackage(
  input: unknown,
  trustedRoot: string,
  expectedEntityKey: string
): Promise<VerificationResult> {
  if (!/^[0-9a-f]{64}$/.test(trustedRoot)) {
    return {
      valid: false,
      verifiedFields: [],
      error: "Invalid trusted Merkle root",
    };
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(expectedEntityKey)) {
    return {
      valid: false,
      verifiedFields: [],
      error: "Invalid expected entity key",
    };
  }

  if (
    !isRecord(input) ||
    input.format !== "arkiv-vault-disclosure-v3" ||
    typeof input.sourceEntityKey !== "string" ||
    input.sourceEntityKey.toLowerCase() !==
      expectedEntityKey.toLowerCase() ||
    !isRecord(input.disclosedFields)
  ) {
    return {
      valid: false,
      verifiedFields: [],
      error: "Invalid disclosure package or entity reference",
    };
  }

  const fields = Object.entries(input.disclosedFields);

  if (fields.length === 0) {
    return {
      valid: false,
      verifiedFields: [],
      error: "No disclosed fields",
    };
  }

  const verifiedFields: string[] = [];

  for (const [name, field] of fields) {
    if (
      !isRecord(field) ||
      !Object.hasOwn(field, "value") ||
      typeof field.salt !== "string" ||
      !/^[0-9a-f]{64}$/.test(field.salt) ||
      !Array.isArray(field.proof)
    ) {
      return {
        valid: false,
        verifiedFields: [],
        error: `Invalid proof structure for field: ${name}`,
      };
    }

    const proof: MerkleProofStep[] = [];

    for (const step of field.proof) {
      if (
        !isRecord(step) ||
        typeof step.hash !== "string" ||
        !/^[0-9a-f]{64}$/.test(step.hash) ||
        (step.position !== "left" &&
          step.position !== "right")
      ) {
        return {
          valid: false,
          verifiedFields: [],
          error: `Invalid proof step for field: ${name}`,
        };
      }

      proof.push({
        hash: step.hash,
        position: step.position,
      });
    }

    try {
      const valid = await verifySaltedProof(
        name,
        field.value,
        field.salt,
        proof,
        trustedRoot
      );

      if (!valid) {
        return {
          valid: false,
          verifiedFields: [],
          error: `Proof verification failed: ${name}`,
        };
      }
    } catch {
      return {
        valid: false,
        verifiedFields: [],
        error: `Malformed proof for field: ${name}`,
      };
    }

    verifiedFields.push(name);
  }

  return {
    valid: true,
    verifiedFields,
  };
}
