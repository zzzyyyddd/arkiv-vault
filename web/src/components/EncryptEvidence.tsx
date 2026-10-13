"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { tiramisu } from "@/lib/wagmi";
import { publishEncryptedEvidence } from "@/lib/arkiv-wallet";
import {
  encryptEvidence,
  type EncryptedEvidence,
} from "@/lib/encryption";

export function EncryptEvidence() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [encrypted, setEncrypted] =
    useState<EncryptedEvidence | null>(null);
  const [key, setKey] = useState("");
  const { address, chainId, isConnected, connector } = useAccount();

  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    entityKey: string;
    txHash: string;
  } | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleEncrypt() {
    if (!title.trim() || !content.trim()) {
      setError("Title and evidence content are required.");
      return;
    }

    setBusy(true);
    setError("");
    setEncrypted(null);
    setKey("");
    setBackupDownloaded(false);
    setPublishResult(null);

    try {
      const result = await encryptEvidence({
        title: title.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
      });

      setEncrypted(result.encrypted);
      setKey(result.key);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Encryption failed."
      );
    } finally {
      setBusy(false);
    }
  }

  function downloadBackup() {
    if (!encrypted || !key) return;

    const backup = {
      format: "arkiv-vault-backup-v1",
      encrypted,
      decryptionKey: key,
    };

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "arkiv-vault-private-backup.json";
    anchor.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupDownloaded(true);
  }

  async function handlePublish() {
    if (!encrypted || !backupDownloaded) {
      setError("Download your private backup before publishing.");
      return;
    }

    if (!isConnected || !address || chainId !== tiramisu.id) {
      setError("Connect MetaMask to Arkiv Tiramisu first.");
      return;
    }

    if (!connector) {
      setError("Wallet connector is not ready.");
      return;
    }

    setPublishing(true);
    setError("");

    try {
      const provider = await connector.getProvider();

      if (
        !provider ||
        typeof provider !== "object" ||
        !("request" in provider) ||
        !("on" in provider) ||
        !("removeListener" in provider)
      ) {
        throw new Error("Unsupported wallet provider.");
      }

      const walletProvider = provider as Parameters<
        typeof publishEncryptedEvidence
      >[0];

      const chainIdHex = await walletProvider.request({
        method: "eth_chainId",
      });

      if (
        typeof chainIdHex !== "string" ||
        Number(BigInt(chainIdHex)) !== tiramisu.id
      ) {
        throw new Error("Switch MetaMask to Arkiv Tiramisu.");
      }

      const result = await publishEncryptedEvidence(
        walletProvider,
        address,
        encrypted
      );

      setPublishResult({
        entityKey: result.entityKey,
        txHash: result.txHash,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Publish failed."
      );
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section
      id="encrypt-evidence"
      className="rounded-2xl border border-white/10 bg-[#101622] p-6 md:p-8"
    >
      <div className="mb-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
          LOCAL ENCRYPTION
        </p>
        <h3 className="text-2xl font-semibold">
          Encrypt Evidence
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Your evidence is encrypted inside your browser.
          No plaintext is uploaded by this form.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label
            htmlFor="evidence-title"
            className="mb-2 block text-sm text-slate-300"
          >
            Evidence Title
          </label>
          <input
            id="evidence-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setEncrypted(null);
              setKey("");
            }}
            placeholder="Example: Confidential Agreement"
            className="w-full rounded-xl border border-white/10 bg-[#080b12] px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <label
            htmlFor="evidence-content"
            className="mb-2 block text-sm text-slate-300"
          >
            Evidence Content
          </label>
          <textarea
            id="evidence-content"
            rows={6}
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              setEncrypted(null);
              setKey("");
            }}
            placeholder="Enter your private evidence..."
            className="w-full resize-y rounded-xl border border-white/10 bg-[#080b12] px-4 py-3 text-white outline-none focus:border-cyan-400"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={handleEncrypt}
          className="rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
        >
          {busy ? "Encrypting..." : "Encrypt Locally"}
        </button>

        {encrypted && (
          <div className="space-y-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5">
            <p className="font-semibold text-emerald-300">
              Encryption successful
            </p>

            <p className="text-sm text-slate-400">
              AES-256-GCM ciphertext generated locally.
            </p>

            <div className="break-all rounded-lg bg-[#080b12] p-4 font-mono text-xs text-slate-400">
              {encrypted.ciphertext.slice(0, 120)}...
            </div>

            <button
              type="button"
              onClick={downloadBackup}
              className="rounded-xl border border-cyan-400/40 px-5 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              Download Private Backup
            </button>

            <p className="text-xs leading-5 text-amber-300">
              Important: This backup contains your decryption key.
              Keep it private and secure. Anyone with this file
              can decrypt the evidence.
            </p>
            <div className="mt-6 border-t border-white/10 pt-6">
              <button
                type="button"
                disabled={
                  !backupDownloaded ||
                  !isConnected ||
                  chainId !== tiramisu.id ||
                  publishing ||
                  publishResult !== null
                }
                onClick={handlePublish}
                className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {publishing
                  ? "Publishing to Arkiv..."
                  : publishResult
                    ? "Published"
                    : "Publish to Arkiv"}
              </button>

              {!backupDownloaded && (
                <p className="mt-3 text-xs text-amber-300">
                  Download your private backup to enable publishing.
                </p>
              )}

              {publishResult && (
                <div className="mt-5 space-y-3 rounded-xl border border-emerald-400/30 p-4">
                  <p className="font-semibold text-emerald-300">
                    Published successfully!
                  </p>
                  <p className="break-all font-mono text-xs text-slate-300">
                    Entity: {publishResult.entityKey}
                  </p>
                  <p className="break-all font-mono text-xs text-slate-300">
                    Transaction: {publishResult.txHash}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
