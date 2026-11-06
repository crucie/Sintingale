"use client";

import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useChainId, useConnection, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/Button";
import { whitechain } from "@/lib/whitechain";

/** Renders children only when the connected wallet is on Whitechain; otherwise offers a switch. */
export function NetworkGuard({ children }: { children: ReactNode }) {
  const { isConnected, chainId: walletChain } = useConnection();
  const configured = useChainId();
  const switchChain = useSwitchChain();
  const onRightChain = !isConnected || (walletChain ?? configured) === whitechain.id;

  if (onRightChain) return <>{children}</>;

  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning-soft p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
        <div>
          <p className="font-medium text-fg">Wrong network</p>
          <p className="text-sm text-fg-muted">
            Payments settle on {whitechain.name} (chain {whitechain.id}). Switch your wallet to continue.
          </p>
        </div>
      </div>
      <Button
        loading={switchChain.isPending}
        onClick={() =>
          switchChain.mutate(
            { chainId: whitechain.id },
            { onError: (err) => toast.error(err.message.split("\n")[0] ?? "Could not switch network") },
          )
        }
      >
        Switch to {whitechain.name}
      </Button>
    </div>
  );
}
