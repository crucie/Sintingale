"use client";

import { FlaskConical, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useConnection } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useSession, useSignIn } from "@/lib/client/org";
import { DEMO_IDENTITIES, type DemoRole } from "@/lib/demo";

const DEMO_PICKS: Array<{ role: DemoRole; label: string }> = [
  { role: "owner", label: "Owner of acme.demo" },
  { role: "alice", label: "alice.acme.demo" },
  { role: "bob", label: "bob.acme.demo" },
  { role: "carol", label: "carol (invited)" },
];

export function SignInCard({ title = "Sign in with your wallet", description }: { title?: string; description?: string }) {
  const { isConnected } = useConnection();
  const { data } = useSession();
  const { withWallet, asDemo } = useSignIn();

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

      {data?.demoAvailable ? (
        <div className="mt-6 border-t border-border pt-5">
          <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
            <FlaskConical className="size-4 text-brand" aria-hidden /> No ENS name yet? Explore as a demo identity
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            Local ledger only. These <code className="font-mono">.demo</code> names are not real ENS names.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {DEMO_PICKS.map((p) => (
              <Button
                key={p.role}
                variant="outline"
                size="sm"
                loading={asDemo.isPending && asDemo.variables === p.role}
                onClick={() => asDemo.mutate(p.role, { onError: (e) => toast.error(e.message) })}
                className="justify-start"
                title={DEMO_IDENTITIES[p.role].address}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
