import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { chainFromName } from "@arkiv-network/sdk";

export const tiramisu = chainFromName("tiramisu");

export const wagmiConfig = createConfig({
  chains: [tiramisu],
  connectors: [injected()],
  transports: {
    [tiramisu.id]: http(),
  },
  ssr: true,
});
