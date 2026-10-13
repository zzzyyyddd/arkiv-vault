"use client";

import { useMemo, useState } from "react";
import { createDisclosurePackage } from "@/lib/disclosure";

type EvidenceRecord = Record<string, unknown>;

function isRecord(value: unknown): value is EvidenceRecord {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export function SelectiveDisclosure({
  evidence,
  entityKey,
  salts,
  merkleRoot,
}: {
  evidence: unknown;
  entityKey: string;
  salts: Record<string, string> | null;
  merkleRoot: string | null;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const supportsSaltedProof = salts !== null;

  const fields = useMemo(() => {
    return isRecord(evidence) ? Object.keys(evidence) : [];
  }, [evidence]);

  const disclosure = useMemo(() => {
    if (!isRecord(evidence)) return {};

    return Object.fromEntries(
      selected
        .filter((field) =>
          Object.prototype.hasOwnProperty.call(evidence, field)
        )
        .map((field) => [field, evidence[field]])
    );
  }, [evidence, selected]);

  function toggleField(field: string) {
    setSelected((current) =>
      current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field]
    );
  }

  async function downloadDisclosure() {
    if (selected.length === 0 || !isRecord(evidence)) return;

    setExportError("");
    setExporting(true);

    try {
      let packageData: unknown;

      if (salts !== null) {
        if (!merkleRoot) {
          throw new Error("Missing v3 Merkle root");
        }

        packageData = await createDisclosurePackage(
          evidence,
          salts,
          selected,
          entityKey,
          merkleRoot
        );
      } else {
        packageData = {
          format: "arkiv-vault-disclosure-v1",
          sourceEntityKey: entityKey,
          disclosedAt: new Date().toISOString(),
          disclosedFields: disclosure,
          verificationStatus: "unverified",
        };
      }

      const blob = new Blob(
        [JSON.stringify(packageData, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = salts
        ? "arkiv-vault-disclosure-v3.json"
        : "arkiv-vault-disclosure.json";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Disclosure export failed"
      );
    } finally {
      setExporting(false);
    }
  }

  if (!isRecord(evidence)) return null;

  return (
    <section className="mt-8 rounded-2xl border border-violet-400/20 bg-violet-400/5 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">
        Privacy Control
      </p>

      <h3 className="mt-2 text-xl font-bold text-white">
        Selective Disclosure
      </h3>

      <p className="mt-2 text-sm text-slate-400">
        {supportsSaltedProof
          ? "Choose fields to share with their Salted Merkle Proofs."
          : "Choose which evidence fields to share."}
        Unselected fields will not be included in the export.
      </p>

      <div className="mt-5 space-y-3">
        {fields.map((field) => (
          <label
            key={field}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-4"
          >
            <input
              type="checkbox"
              checked={selected.includes(field)}
              onChange={() => toggleField(field)}
              className="h-4 w-4 accent-violet-400"
            />
            <span className="text-sm text-white">
              {field}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-6">
        <p className="mb-2 text-sm font-semibold text-slate-300">
          Disclosure Preview
        </p>

        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs text-slate-200">
          {JSON.stringify(disclosure, null, 2)}
        </pre>
      </div>

      <button
        type="button"
        onClick={downloadDisclosure}
        disabled={selected.length === 0 || exporting}
        className="mt-5 rounded-xl bg-violet-400 px-6 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {exporting ? "Generating Proof..." : "Download Disclosure JSON"}
      </button>

      {exportError && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {exportError}
        </p>
      )}

      <p className="mt-4 text-xs text-amber-300">
        {supportsSaltedProof
          ? "This package includes cryptographic proofs, but independent verification against the Arkiv entity is still required."
          : "This disclosure is not yet cryptographically verified. The source entity reference alone does not prove authenticity."}
      </p>
    </section>
  );
}
