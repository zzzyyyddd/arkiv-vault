export type MerkleProofStep = {
  hash: string;
  position: "left" | "right";
};

export type MerkleCommitment = {
  root: string;
  fieldNames: string[];
  leaves: string[];
};

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error("Invalid SHA-256 hash");
  }

  return new Uint8Array(
    hex.match(/.{2}/g)!.map((part) => parseInt(part, 16))
  );
}

async function sha256(
  bytes: Uint8Array<ArrayBuffer>
): Promise<string> {
  const result = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(new Uint8Array(result));
}

async function hashLeaf(
  name: string,
  value: unknown
): Promise<string> {
  const encoded = new TextEncoder().encode(
    JSON.stringify(["arkiv-vault-leaf-v1", name, value])
  );

  return sha256(encoded);
}

async function hashPair(
  left: string,
  right: string
): Promise<string> {
  const bytes = new Uint8Array(65);

  bytes[0] = 1;
  bytes.set(fromHex(left), 1);
  bytes.set(fromHex(right), 33);

  return sha256(bytes);
}

async function buildLevels(
  leaves: string[]
): Promise<string[][]> {
  if (leaves.length === 0) {
    throw new Error("Cannot build an empty Merkle tree");
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

export async function createMerkleCommitment(
  evidence: Record<string, unknown>
): Promise<MerkleCommitment> {
  const fieldNames = Object.keys(evidence).sort();

  if (fieldNames.length === 0) {
    throw new Error("Evidence must contain at least one field");
  }

  const leaves = await Promise.all(
    fieldNames.map((name) => hashLeaf(name, evidence[name]))
  );

  const levels = await buildLevels(leaves);

  return {
    root: levels[levels.length - 1][0],
    fieldNames,
    leaves,
  };
}

export async function createMerkleProof(
  evidence: Record<string, unknown>,
  fieldName: string
): Promise<MerkleProofStep[]> {
  const commitment = await createMerkleCommitment(evidence);
  let index = commitment.fieldNames.indexOf(fieldName);

  if (index === -1) {
    throw new Error("Field not found");
  }

  const levels = await buildLevels(commitment.leaves);
  const proof: MerkleProofStep[] = [];

  for (let level = 0; level < levels.length - 1; level++) {
    const nodes = levels[level];
    const siblingIndex = index ^ 1;

    proof.push({
      hash: nodes[siblingIndex] ?? nodes[index],
      position: index % 2 === 0 ? "right" : "left",
    });

    index = Math.floor(index / 2);
  }

  return proof;
}

export async function verifyMerkleProof(
  fieldName: string,
  value: unknown,
  proof: MerkleProofStep[],
  expectedRoot: string
): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(expectedRoot)) {
    return false;
  }

  try {
    let current = await hashLeaf(fieldName, value);

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
