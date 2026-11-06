"use client";

import { Building2, Code2, KeyRound, Link2, Save, ShieldCheck } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useConfig, useConnection, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { Field, Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NetworkGuard } from "@/components/wallet/NetworkGuard";
import { useMerchant, useSaveMerchant } from "@/lib/client/hooks";
import { onchainEnabled, publicConfig } from "@/lib/config";
import { paymentRouterAbi, whitechain } from "@/lib/whitechain";
import type { MerchantDTO } from "@/lib/types";

function Row({ label, value, mono = true }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className={`min-w-0 break-all text-sm text-fg sm:text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function ProfileForm({ merchant }: { merchant: MerchantDTO }) {
  const save = useSaveMerchant();
  const [name, setName] = useState(merchant.name);
  const [payout, setPayout] = useState(merchant.payout);
  const [wallet, setWallet] = useState(merchant.wallet ?? "");
  const [email, setEmail] = useState(merchant.email ?? "");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({ merchantId: merchant.merchantId, name, payout, wallet, email });
      toast.success("Merchant profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 p-5 md:grid-cols-2">
      <Field label="Business name" htmlFor="m-name">
        <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Billing email" htmlFor="m-email">
        <Input id="m-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Payout address" htmlFor="m-payout" hint="USDT is forwarded here in the same transaction.">
        <Input id="m-payout" className="font-mono" value={payout} onChange={(e) => setPayout(e.target.value)} required />
      </Field>
      <Field label="Merchant wallet" htmlFor="m-wallet" hint="The address that registered on the PaymentRouter.">
        <Input
          id="m-wallet"
          className="font-mono"
          placeholder={payout}
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
        />
      </Field>
      <div className="md:col-span-2">
        <Button type="submit" loading={save.isPending} icon={<Save className="size-4" />}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

function RegisterOnchain({ payout }: { payout: string }) {
  const { isConnected } = useConnection();
  const config = useConfig();
  const write = useWriteContract();
  const [busy, setBusy] = useState(false);

  if (!onchainEnabled) {
    return (
      <p className="text-sm text-fg-muted">
        Set <code className="font-mono text-xs">NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_USDT_ADDRESS</code> to enable on-chain settlement. Until then,
        checkout runs a clearly labelled simulation.
      </p>
    );
  }
  if (!isConnected) return <ConnectButton />;
  return (
    <NetworkGuard>
      <Button
        loading={busy}
        icon={<ShieldCheck className="size-4" />}
        onClick={async () => {
          setBusy(true);
          try {
            const hash = await write.mutateAsync({
              address: publicConfig.paymentRouter!,
              abi: paymentRouterAbi,
              functionName: "registerMerchant",
              args: [payout as `0x${string}`],
              chainId: whitechain.id,
            });
            await waitForTransactionReceipt(config, { hash, chainId: whitechain.id });
            toast.success("Merchant registered on Whitechain");
          } catch (err) {
            toast.error(err instanceof Error ? err.message.split("\n")[0] : "Registration failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        Register payout on PaymentRouter
      </Button>
    </NetworkGuard>
  );
}

export function SettingsView({
  apiKey,
  apiKeyIsDemo,
  relayer,
  ledger,
}: {
  apiKey: string;
  apiKeyIsDemo: boolean;
  relayer: string;
  ledger: "memory" | "arkiv";
}) {
  const merchant = useMerchant();
  const curl = `curl "$SINTINGALE_URL/api/access?merchantId=${publicConfig.merchantId}&planId=pro&customer=0x…" \\
  -H "x-api-key: ${apiKeyIsDemo ? apiKey : "$SINTINGALE_API_KEY"}"`;

  return (
    <>
      <PageHeader title="Settings" description="Merchant profile, payout address and API access." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="xl:col-span-2">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Building2 className="size-4 text-brand" /> Merchant profile</span>} description="Stored as a merchant entity; the latest version wins." />
          {merchant.data ? <ProfileForm key={merchant.data.key} merchant={merchant.data} /> : <Skeleton className="m-5 h-48" />}
        </Card>

        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><KeyRound className="size-4 text-brand" /> API key</span>} description="For server-to-server calls from your SaaS backend." />
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-sm text-fg">{apiKey}</code>
              {apiKeyIsDemo ? <CopyButton value={apiKey} label="Copy API key" toastMessage="API key copied" /> : null}
            </div>
            <p className="text-xs text-fg-muted">
              {apiKeyIsDemo
                ? "This is the public demo key. Set SINTINGALE_API_KEY to use your own."
                : "Configured through SINTINGALE_API_KEY. Only the prefix and suffix are shown."}
            </p>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-fg">
                <Code2 className="size-4" aria-hidden /> Check access from your backend
              </p>
              <div className="relative rounded-xl bg-[#1d1410] p-4 pr-12">
                <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-[#ffd9cc]">{curl}</pre>
                <CopyButton value={curl} label="Copy command" className="absolute right-2 top-2 text-white/60 hover:bg-white/10 hover:text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><Link2 className="size-4 text-brand" /> Network</span>} description="Money moves on Whitechain. State lives on Arkiv." />
          <dl className="divide-y divide-border px-5">
            <Row label="Ledger backend" value={ledger === "arkiv" ? "Arkiv testnet (Rabdi)" : "In-memory Arkiv emulator"} mono={false} />
            <Row label="Trusted relayer ($creator)" value={relayer} />
            <Row label="Settlement chain" value={`${whitechain.name} · ${whitechain.id}`} mono={false} />
            <Row label="PaymentRouter" value={publicConfig.paymentRouter ?? "Not configured"} />
            <Row label="USDT token" value={publicConfig.usdt.address ?? "Not configured"} />
          </dl>
          <div className="border-t border-border p-5">
            <RegisterOnchain payout={merchant.data?.payout ?? ""} />
          </div>
        </Card>
      </div>
    </>
  );
}
