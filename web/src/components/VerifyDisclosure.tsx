"use client";

import { useState } from "react";
import { verifyDisclosureAgainstArkiv } from "@/lib/verify-against-arkiv";

type VerificationResult = {
  valid: boolean;
  verifiedFields: string[];
  entityKey?: string;
  error?: string;
};

export function VerifyDisclosure() {
  const [disclosure, setDisclosure] = useState<unknown>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] =
    useState<VerificationResult | null>(null);
  const [error, setError] = useState("");

  async function handleFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setDisclosure(null);
    setResult(null);
    setError("");
    setFileName("");

    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError("Disclosure file exceeds the 1 MB limit.");
      return;
    }

    try {
      const parsed: unknown = JSON.parse(await file.text());

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed) ||
        !("format" in parsed) ||
        parsed.format !== "arkiv-vault-disclosure-v3"
      ) {
        throw new Error("Please select a v3 disclosure JSON file.");
      }

      setDisclosure(parsed);
      setFileName(file.name);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to read disclosure file."
      );
    }
  }

  async function handleVerify() {
    if (!disclosure || loading) return;

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const verification =
        await verifyDisclosureAgainstArkiv(disclosure);

      setResult(verification);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Verification failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
        Independent Verification
      </p>

      <h2 className="mt-2 text-2xl font-bold text-white">
        Verify Disclosure
      </h2>

      <p className="mt-3 text-sm text-slate-400">
        Upload a v3 disclosure JSON file. The verifier retrieves
        the commitment from Arkiv and checks each disclosed
        field without requiring the original evidence or AES key.
      </p>

      <label className="mt-5 block text-sm font-semibold text-slate-200">
        Disclosure JSON
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-slate-300"
        />
      </label>

      {fileName && (
        <p className="mt-3 break-all text-sm text-cyan-300">
          Selected: {fileName}
        </p>
      )}

      <button
        type="button"
        onClick={handleVerify}
        disabled={!disclosure || loading}
        className="mt-5 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Verifying Against Arkiv..." : "Verify Disclosure"}
      </button>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}

      {result && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-white/10 bg-slate-950 p-5"
        >
          <p
            className={
              result.valid
                ? "font-bold text-emerald-400"
                : "font-bold text-red-400"
            }
          >
            {result.valid
              ? "VALID — Proof matches Arkiv commitment"
              : "INVALID — Verification unsuccessful"}
          </p>

          {result.valid && (
            <p className="mt-3 text-sm text-slate-300">
              Verified fields: {result.verifiedFields.join(", ")}
            </p>
          )}

          {result.entityKey && (
            <p className="mt-3 break-all text-xs text-slate-400">
              Entity: {result.entityKey}
            </p>
          )}

          {result.error && (
            <p className="mt-3 text-sm text-red-300">
              {result.error}
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-amber-300">
        Verification confirms consistency with the Arkiv
        commitment, not the real-world truth of the evidence.
        Expired or unavailable entities cannot be verified.
      </p>
    </section>
  );
}
