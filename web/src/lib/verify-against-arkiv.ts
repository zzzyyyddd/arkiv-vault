import { getTrustedArkivRoot } from "./arkiv-verification";
import { verifyDisclosurePackage } from "./verify-disclosure";

type ArkivVerificationResult = {
  valid: boolean;
  verifiedFields: string[];
  entityKey?: string;
  error?: string;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export async function verifyDisclosureAgainstArkiv(
  disclosure: unknown
): Promise<ArkivVerificationResult> {
  if (
    !isRecord(disclosure) ||
    disclosure.format !== "arkiv-vault-disclosure-v3" ||
    typeof disclosure.sourceEntityKey !== "string" ||
    !/^0x[0-9a-fA-F]{64}$/.test(disclosure.sourceEntityKey)
  ) {
    return {
      valid: false,
      verifiedFields: [],
      error: "Invalid v3 disclosure or entity key",
    };
  }

  const entityKey = disclosure.sourceEntityKey;

  try {
    const trustedRoot = await getTrustedArkivRoot(entityKey);

    const result = await verifyDisclosurePackage(
      disclosure,
      trustedRoot,
      entityKey
    );

    return {
      ...result,
      entityKey,
    };
  } catch (error) {
    return {
      valid: false,
      verifiedFields: [],
      entityKey,
      error:
        error instanceof Error
          ? error.message
          : "Unable to verify against Arkiv",
    };
  }
}
