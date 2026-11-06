"use client";

import { LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useConnect, useConnection, useConnectors, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/Button";
import { cn, shortHash } from "@/lib/format";

export function ConnectButton({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const { address, isConnected, isConnecting } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();

  if (isConnected && address) {
    return (
      <Button
        variant="outline"
        size={size}
        className={cn("font-mono", className)}
        onClick={() => disconnect.mutate()}
        icon={<LogOut className="size-4" aria-hidden />}
        title="Disconnect wallet"
      >
        {shortHash(address)}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      className={className}
      loading={isConnecting || connect.isPending}
      icon={<Wallet className="size-4" aria-hidden />}
      onClick={() => {
        const connector = connectors[0];
        if (!connector) {
          toast.error("No browser wallet found. Install MetaMask or a compatible wallet.");
          return;
        }
        connect.mutate(
          { connector },
          { onError: (err) => toast.error(err.message.split("\n")[0] ?? "Could not connect wallet") },
        );
      }}
    >
      Connect wallet
    </Button>
  );
}
