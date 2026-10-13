import { createPublicClient } from "@arkiv-network/sdk";
import { http, type Hex } from "viem";
import { tiramisu } from "./wagmi";

const client = createPublicClient({
  chain: tiramisu,
  transport: http(),
});

export async function getTrustedArkivRoot(
  entityKey: string
): Promise<string> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(entityKey)) {
    throw new Error("Invalid Arkiv entity key");
  }

  const entity = await client.getEntity(entityKey as Hex);
  const attributes = entity.attributes;

  if (!attributes) {
    throw new Error("Arkiv entity has no attributes");
  }

  const app = attributes.app;
  const recordType = attributes.record_type;
  const version = attributes.evidence_version;
  const root = attributes.merkle_root;

  if (
    app?.type !== "str" ||
    app.value !== "arkiv-vault" ||
    recordType?.type !== "str" ||
    recordType.value !== "encrypted-evidence"
  ) {
    throw new Error("Not an Arkiv Vault evidence entity");
  }

  if (
    version?.type !== "i32" ||
    version.value !== 3
  ) {
    throw new Error("Entity is not evidence version 3");
  }

  if (
    root?.type !== "str" ||
    !/^[0-9a-f]{64}$/.test(root.value)
  ) {
    throw new Error("Invalid Arkiv Merkle root attribute");
  }

  return root.value;
}
