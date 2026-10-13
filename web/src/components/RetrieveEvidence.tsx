"use client";

import { useState } from "react";
import { SelectiveDisclosure } from "@/components/SelectiveDisclosure";
import { createPublicClient } from "@arkiv-network/sdk";
import { http, type Hex } from "viem";
import { tiramisu } from "@/lib/wagmi";
import {
  decryptEvidenceWithSalts,
  type EncryptedEvidence,
} from "@/lib/encryption";

const client = createPublicClient({
  chain: tiramisu,
  transport: http(),
});

function isEncryptedEvidence(
  value: unknown
): value is EncryptedEvidence {
  if (!value || typeof value !== "object") return false;

  const data = value as Record<string, unknown>;

  return (
    (data.version === 1 ||
      ((data.version === 2 || data.version === 3) &&
        typeof data.merkleRoot === "string" &&
        /^[0-9a-f]{64}$/.test(data.merkleRoot))) &&
    data.algorithm === "AES-256-GCM" &&
    typeof data.iv === "string" &&
    typeof data.ciphertext === "string" &&
    typeof data.authTag === "string"
  );
}

export default function RetrieveEvidence() {
  const [entityKey, setEntityKey] = useState("");
  const [encrypted, setEncrypted] =
    useState<EncryptedEvidence | null>(null);
  const [decryptionKey, setDecryptionKey] = useState("");
  const [decrypted, setDecrypted] = useState<unknown>(null);
  const [privateSalts, setPrivateSalts] =
    useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function handleRetrieve() {
    setError("");
    setStatus("");
    setEncrypted(null);
    setDecrypted(null);
    setPrivateSalts(null);
    setDecryptionKey("");

    if (!/^0x[0-9a-fA-F]{64}$/.test(entityKey.trim())) {
      setError("Enter a valid 32-byte Arkiv Entity Key.");
      return;
    }

    setLoading(true);

    try {
      const entity = await client.getEntity(
        entityKey.trim() as Hex
      );

      const json = JSON.parse(
        new TextDecoder().decode(entity.payload)
      ) as unknown;

      if (!isEncryptedEvidence(json)) {
        throw new Error(
          "This entity is not a supported Arkiv Vault record."
        );
      }

      setEncrypted(json);
      setStatus("Encrypted evidence retrieved from Arkiv.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to retrieve entity."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleBackup(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError("");
    setDecrypted(null);
    setPrivateSalts(null);
    setDecryptionKey("");

    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError("Backup file is too large.");
      return;
    }

    try {
      const backup = JSON.parse(
        await file.text()
      ) as Record<string, unknown>;

      if (
        backup.format !== "arkiv-vault-backup-v1" ||
        typeof backup.decryptionKey !== "string" ||
        !/^[0-9a-fA-F]{64}$/.test(backup.decryptionKey)
      ) {
        throw new Error("Invalid Arkiv Vault backup.");
      }

      setDecryptionKey(backup.decryptionKey);
      setStatus("Private backup loaded locally.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to read backup."
      );
    } finally {
      event.target.value = "";
    }
  }

  async function handleDecrypt() {
    if (!encrypted || !decryptionKey) {
      setError("Retrieve evidence and load a backup first.");
      return;
    }

    setError("");

    try {
      const result = await decryptEvidenceWithSalts(
        encrypted,
        decryptionKey
      );

      setPrivateSalts(result.salts);
      setDecrypted(result.evidence);
      setStatus("Evidence decrypted successfully.");
    } catch {
      setDecrypted(null);
    setPrivateSalts(null);
      setError(
        "Decryption failed. The key may be incorrect or the ciphertext may have changed."
      );
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 md:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
          Evidence Recovery
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          Retrieve & Decrypt
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Retrieve encrypted evidence from Arkiv and decrypt it
          locally using your private backup.
        </p>
      </div>

      <label className="mb-2 block text-sm text-slate-300">
        Arkiv Entity Key
      </label>

      <input
        value={entityKey}
        onChange={(event) => {
          setEntityKey(event.target.value);
          setEncrypted(null);
          setDecrypted(null);
    setPrivateSalts(null);
          setDecryptionKey("");
          setStatus("");
        }}
        placeholder="0x..."
        className="w-full rounded-xl border border-white/10 bg-slate-950 p-4 font-mono text-sm text-white outline-none focus:border-cyan-400"
      />

      <button
        type="button"
        onClick={handleRetrieve}
        disabled={loading}
        className="mt-4 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 disabled:opacity-50"
      >
        {loading ? "Retrieving..." : "Retrieve from Arkiv"}
      </button>

      {encrypted && (
        <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
          <h3 className="font-semibold text-cyan-300">
            Encrypted Evidence Found
          </h3>

          <p className="mt-2 text-sm text-slate-400">
            AES-256-GCM ciphertext retrieved successfully.
          </p>

          <p className="mt-4 text-xs text-slate-400">
            Load your private backup file:
          </p>

          <input
            type="file"
            accept=".json,application/json"
            onChange={handleBackup}
            className="mt-2 block w-full text-sm text-slate-300"
          />

          <button
            type="button"
            disabled={!decryptionKey}
            onClick={handleDecrypt}
            className="mt-5 rounded-xl border border-cyan-400 px-6 py-3 font-bold text-cyan-300 disabled:opacity-40"
          >
            Decrypt Locally
          </button>
        </div>
      )}

      {decrypted !== null && (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <h3 className="font-semibold text-emerald-300">
            Evidence Recovered Successfully
          </h3>

          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-sm text-slate-200">
            {JSON.stringify(decrypted, null, 2)}
          </pre>

          <SelectiveDisclosure
            key={entityKey.trim()}
            evidence={decrypted}
            entityKey={entityKey.trim()}
            salts={privateSalts}
            merkleRoot={encrypted?.merkleRoot ?? null}
          />
        </div>
      )}

      {status && (
        <p className="mt-4 text-sm text-emerald-300">
          {status}
        </p>
      )}

      {error && (
        <p className="mt-4 break-words rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </p>
      )}

      <p className="mt-6 text-xs text-amber-300">
        Your decryption key stays in this browser session.
        Never share your private backup file.
      </p>
    </section>
  );
}
