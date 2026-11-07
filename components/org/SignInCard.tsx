"use client";

import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { useConnection } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useSignIn } from "@/lib/client/org";

export function SignInCard({ title = "Sign in with your wallet", description }: { title?: string; description?: string }) {
  const { isConnected } = useConnection();
  const { withWallet } = useSignIn();

  return (
    <Card className="mx-auto max-w-lg p-6">
      <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
        <LogIn className="size-6" aria-hidden />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold text-fg">{title}</h2>
      <p className="mt-1 text-sm text-fg-muted">
        {description ?? "Your wallet is your login. Signing a message is free and sends no transaction."}
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {isConnected ? (
          <Button
            loading={withWallet.isPending}
            onClick={() =>
              withWallet.mutate(undefined, {
                onError: (e) => toast.error(e instanceof Error ? e.message.split("\n")[0] : "Sign-in failed"),
              })
            }
            icon={<LogIn className="size-4" />}
          >
            Sign in with Ethereum
          </Button>
        ) : (
          <ConnectButton />
        )}
      </div>
    </Card>
  );
}
