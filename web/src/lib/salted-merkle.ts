import type { MerkleProofStep } from "./merkle";

export type SaltedMerkleCommitment = {
  version: 3;
  root: string;
  salts: Record<string, string>;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error("Invalid 32-byte hex value");
  }

  return new Uint8Array(
    hex.match(/.{2}/g)!.map((part) => parseInt(part, 16))
  );
}

async function sha256(
  bytes: Uint8Array<ArrayBuffer>
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

async function hashLeaf(
  field: string,
  value: unknown,
  salt: string
): Promise<string> {
  hexToBytes(salt);

  const encoded = new TextEncoder().encode(
    JSON.stringify([
      "arkiv-vault-salted-leaf-v3",
      field,
      value,
      salt,
    ])
  );

  return sha256(encoded);
}

async function hashPair(
  left: string,
  right: string
): Promise<string> {
  const bytes = new Uint8Array(65);
  bytes[0] = 1;
  bytes.set(hexToBytes(left), 1);
  bytes.set(hexToBytes(right), 33);
  return sha256(bytes);
}

async function buildLevels(
  leaves: string[]
): Promise<string[][]> {
  if (leaves.length === 0) {
    throw new Error("Evidence cannot be empty");
  }

  const levels: string[][] = [[...leaves]];

  while (levels[levels.length - 1].length > 1) {
    const current = levels[levels.length - 1];
    const next: string[] = [];

    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1] ?? left;
      next.push(await hashPair(left, right));
    }

    levels.push(next);
  }

  return levels;
}

export async function createSaltedCommitment(
  evidence: Record<string, unknown>
): Promise<SaltedMerkleCommitment> {
  const fields = Object.keys(evidence).sort();

  if (fields.length === 0) {
    throw new Error("Evidence cannot be empty");
  }

  const salts: Record<string, string> = Object.create(null);

  for (const field of fields) {
    salts[field] = bytesToHex(
      crypto.getRandomValues(new Uint8Array(32))
    );
  }

  const leaves = await Promise.all(
    fields.map((field) =>
      hashLeaf(field, evidence[field], salts[field])
    )
  );

  const levels = await buildLevels(leaves);

  return {
    version: 3,
    root: levels[levels.length - 1][0],
    salts,
  };
}

export async function createSaltedProof(
  evidence: Record<string, unknown>,
  salts: Record<string, string>,
  field: string
): Promise<MerkleProofStep[]> {
  const fields = Object.keys(evidence).sort();
  let index = fields.indexOf(field);

  if (index === -1) {
    throw new Error("Field not found");
  }

  const leaves = await Promise.all(
    fields.map((name) =>
      hashLeaf(name, evidence[name], salts[name])
    )
  );

  const levels = await buildLevels(leaves);
  const proof: MerkleProofStep[] = [];

  for (let level = 0; level < levels.length - 1; level++) {
    const nodes = levels[level];
    const sibling = index ^ 1;

    proof.push({
      hash: nodes[sibling] ?? nodes[index],
      position: index % 2 === 0 ? "right" : "left",
    });

    index = Math.floor(index / 2);
  }

  return proof;
}

export async function verifySaltedProof(
  field: string,
  value: unknown,
  salt: string,
  proof: MerkleProofStep[],
  expectedRoot: string
): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(expectedRoot)) {
    return false;
  }

  try {
    let current = await hashLeaf(field, value, salt);

    for (const step of proof) {
      current =
        step.position === "left"
          ? await hashPair(step.hash, current)
          : await hashPair(current, step.hash);
    }

    return current === expectedRoot;
  } catch {
    return false;
  }
}

export async function calculateSaltedRoot(
  evidence: Record<string, unknown>,
  salts: Record<string, string>
): Promise<string> {
  const fields = Object.keys(evidence).sort();

  if (fields.length === 0) {
    throw new Error("Evidence cannot be empty");
  }

  const leaves = await Promise.all(
    fields.map((field) => {
      if (
        !Object.prototype.hasOwnProperty.call(salts, field) ||
        typeof salts[field] !== "string"
      ) {
        throw new Error(`Missing salt for field: ${field}`);
      }

      return hashLeaf(field, evidence[field], salts[field]);
    })
  );

  const levels = await buildLevels(leaves);

  return levels[levels.length - 1][0];
}
