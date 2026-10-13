"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { tiramisu } from "@/lib/wagmi";

export function ConnectWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongNetwork =
    isConnected && chainId !== tiramisu.id;

  return (
    <div className="flex flex-col items-end gap-2">
      {!isConnected ? (
        <button
          type="button"
          disabled={isPending || connectors.length === 0}
          onClick={() => {
            if (connectors[0]) {
              connect({ connector: connectors[0] });
            }
          }}
          className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
        >
          {isPending ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : wrongNetwork ? (
        <button
          type="button"
          disabled={switching}
          onClick={() =>
            switchChain({ chainId: tiramisu.id })
          }
          className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
        >
          {switching ? "Switching..." : "Switch to Tiramisu"}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 font-mono text-xs text-cyan-300">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>

          <button
            type="button"
            onClick={() => disconnect()}
            className="rounded-xl border border-white/15 px-4 py-3 text-xs text-slate-300"
          >
            Disconnect
          </button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="max-w-72 text-right text-xs text-red-400"
        >
          {error.message}
        </p>
      )}
    </div>
  );
}
