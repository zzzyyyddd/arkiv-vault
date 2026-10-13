import { createMerkleCommitment } from "./merkle";
import {
  createSaltedCommitment,
  calculateSaltedRoot,
} from "./salted-merkle";

export type EncryptedEvidence = {
  version: 1 | 2 | 3;
  algorithm: "AES-256-GCM";
  iv: string;
  ciphertext: string;
  authTag: string;
  merkleRoot?: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export async function encryptEvidence(
  evidence: object
): Promise<{
  encrypted: EncryptedEvidence;
  key: string;
}> {
  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  if (
    evidence === null ||
    Array.isArray(evidence) ||
    Object.keys(evidence).length === 0
  ) {
    throw new Error("Evidence must be a non-empty object");
  }

  const commitment = await createSaltedCommitment(
    evidence as Record<string, unknown>
  );

  const plaintext = new TextEncoder().encode(
    JSON.stringify({
      format: "arkiv-vault-private-payload-v3",
      evidence,
      salts: commitment.salts,
    })
  );

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    key,
    plaintext
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);

  const ciphertext = encryptedBytes.slice(0, -16);
  const authTag = encryptedBytes.slice(-16);

  const rawKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", key)
  );

  return {
    encrypted: {
      version: 3,
      algorithm: "AES-256-GCM",
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(ciphertext),
      authTag: bytesToBase64(authTag),
      merkleRoot: commitment.root,
    },
    key: Array.from(rawKey)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
  };
}

export type DecryptedEvidenceResult = {
  evidence: unknown;
  salts: Record<string, string> | null;
};

export async function decryptEvidenceWithSalts(
  encrypted: EncryptedEvidence,
  keyHex: string
): Promise<DecryptedEvidenceResult> {
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error("Invalid AES-256 key");
  }

  if (
    (encrypted.version !== 1 &&
      encrypted.version !== 2 &&
      encrypted.version !== 3) ||
    encrypted.algorithm !== "AES-256-GCM"
  ) {
    throw new Error("Unsupported encryption format");
  }

  const keyBytes = new Uint8Array(
    keyHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
  );

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    "AES-GCM",
    false,
    ["decrypt"]
  );

  const iv = base64ToBytes(encrypted.iv);
  const ciphertext = base64ToBytes(encrypted.ciphertext);
  const authTag = base64ToBytes(encrypted.authTag);

  if (iv.length !== 12 || authTag.length !== 16) {
    throw new Error("Invalid encryption parameters");
  }

  const combined = new Uint8Array(
    ciphertext.length + authTag.length
  );

  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    key,
    combined
  );

  const evidence: unknown = JSON.parse(
    new TextDecoder().decode(plaintext)
  );

  if (encrypted.version === 3) {
    if (
      !evidence ||
      typeof evidence !== "object" ||
      Array.isArray(evidence)
    ) {
      throw new Error("Invalid v3 private payload");
    }

    const payload = evidence as Record<string, unknown>;

    if (
      payload.format !== "arkiv-vault-private-payload-v3" ||
      !payload.evidence ||
      typeof payload.evidence !== "object" ||
      Array.isArray(payload.evidence) ||
      !payload.salts ||
      typeof payload.salts !== "object" ||
      Array.isArray(payload.salts) ||
      typeof encrypted.merkleRoot !== "string" ||
      !/^[0-9a-f]{64}$/.test(encrypted.merkleRoot)
    ) {
      throw new Error("Invalid v3 evidence commitment");
    }

    const originalEvidence =
      payload.evidence as Record<string, unknown>;

    const salts = payload.salts as Record<string, string>;

    const root = await calculateSaltedRoot(
      originalEvidence,
      salts
    );

    if (root !== encrypted.merkleRoot) {
      throw new Error("Evidence commitment mismatch");
    }

    return {
      evidence: originalEvidence,
      salts,
    };
  }

  if (encrypted.version === 2) {
    if (
      !evidence ||
      typeof evidence !== "object" ||
      Array.isArray(evidence) ||
      typeof encrypted.merkleRoot !== "string" ||
      !/^[0-9a-f]{64}$/.test(encrypted.merkleRoot)
    ) {
      throw new Error("Invalid v2 evidence commitment");
    }

    const commitment = await createMerkleCommitment(
      evidence as Record<string, unknown>
    );

    if (commitment.root !== encrypted.merkleRoot) {
      throw new Error("Evidence commitment mismatch");
    }
  }

  return {
    evidence,
    salts: null,
  };
}

export async function decryptEvidence(
  encrypted: EncryptedEvidence,
  keyHex: string
): Promise<unknown> {
  const result = await decryptEvidenceWithSalts(
    encrypted,
    keyHex
  );

  return result.evidence;
}
