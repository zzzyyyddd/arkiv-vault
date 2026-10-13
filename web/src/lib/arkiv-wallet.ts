import {
  createWalletClient,
  ExpirationTime,
  jsonToPayload,
} from "@arkiv-network/sdk";
import { custom, type Address, type EIP1193Provider } from "viem";
import { tiramisu } from "@/lib/wagmi";
import type { EncryptedEvidence } from "@/lib/encryption";

export function createArkivBrowserWallet(
  provider: EIP1193Provider,
  account: Address
) {
  return createWalletClient({
    chain: tiramisu,
    transport: custom(provider),
    account,
  });
}

export async function publishEncryptedEvidence(
  provider: EIP1193Provider,
  account: Address,
  encrypted: EncryptedEvidence
) {
  const wallet = createArkivBrowserWallet(
    provider,
    account
  );

  return wallet.createEntity({
    payload: jsonToPayload(encrypted),
    contentType: "application/json",
    attributes: {
      app: "arkiv-vault",
      record_type: "encrypted-evidence",
      encryption: "aes-256-gcm",
      ...((encrypted.version === 2 ||
        encrypted.version === 3) &&
      encrypted.merkleRoot
        ? {
            merkle_root: encrypted.merkleRoot,
            evidence_version: encrypted.version,
          }
        : {}),
    },
    expires: ExpirationTime.fromDays(30),
    flags: {
      readonly: true,
    },
  });
}
