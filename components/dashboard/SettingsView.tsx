"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Building2, Code2, KeyRound, Link2, Save, ShieldCheck, Users } from "lucide-react";
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
import { Switch } from "@/components/ui/Switch";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NetworkGuard } from "@/components/wallet/NetworkGuard";
import { ApiError, useMerchant, useSaveMerchant, useSetupMerchant } from "@/lib/client/hooks";
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

function SetupForm() {
  const setup = useSetupMerchant();
  const { address } = useConnection();
  const [name, setName] = useState("");
  const [payout, setPayout] = useState("");
  const [wallet, setWallet] = useState("");
  const [email, setEmail] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await setup.mutateAsync({
        merchantId: publicConfig.merchantId,
        name,
        payout: payout || address || "",
        wallet: wallet || address || "",
        email,
      });
      toast.success("Merchant created on Arkiv. Next: register your payout on the PaymentRouter, then add plans.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the merchant");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 p-5 md:grid-cols-2">
      <p className="text-sm text-fg-muted md:col-span-2">
        No merchant <code className="font-mono text-xs">{publicConfig.merchantId}</code> exists on Arkiv yet. Create it, then add
        your plans on the Products page.
      </p>
      <Field label="Business name" htmlFor="s-name">
        <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Billing email" htmlFor="s-email">
        <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Payout address" htmlFor="s-payout" hint="Defaults to the connected wallet.">
        <Input
          id="s-payout"
          className="font-mono"
          placeholder={address ?? "0x…"}
          value={payout}
          onChange={(e) => setPayout(e.target.value)}
          required={!address}
        />
      </Field>
      <Field label="Merchant wallet" htmlFor="s-wallet" hint="Must be the wallet that registers on the PaymentRouter.">
        <Input
          id="s-wallet"
          className="font-mono"
          placeholder={address ?? "0x…"}
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button type="submit" loading={setup.isPending} icon={<Save className="size-4" />}>
          Create merchant
        </Button>
        {!address ? <ConnectButton /> : null}
      </div>
    </form>
  );
}

const TEAM_FEATURES = [
  "Link an ENS name so checkout shows a verified business name",
  "Invite teammates, who get subnames like alice.yourname.eth",
  "Split project payments by each member's contribution",
  "Authorise agents with time-boxed, capped permissions",
];

function TeamsToggle({ merchant }: { merchant: MerchantDTO }) {
  const qc = useQueryClient();
  const save = useSaveMerchant();
  const enabled = merchant.teamsEnabled === true;

  async function toggle(next: boolean) {
    try {
      await save.mutateAsync({
        merchantId: merchant.merchantId,
        name: merchant.name,
        payout: merchant.payout,
        wallet: merchant.wallet ?? "",
        email: merchant.email ?? "",
        teamsEnabled: next,
      });
      await qc.invalidateQueries();
      toast.success(next ? "Teams & ENS turned on" : "Teams & ENS turned off. Checkout no longer looks up ENS.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the setting");
    }
  }

  return (
    <div className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between">
      <div className="max-w-2xl text-sm">
        <p className="font-medium text-fg">{enabled ? "On" : "Off (default)"}</p>
        <p className="mt-1 text-fg-muted">
          {enabled
            ? "Team pages are in the sidebar. Customers paying a linked organisation see its verified ENS name."
            : "Products, invoices, checkout links and receipts work as usual. Turn this on to add:"}
        </p>
        {!enabled ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-fg-muted">
            {TEAM_FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-xs text-fg-muted">
          Uses Ethereum Sepolia for ENS lookups only. Payments always stay on Whitechain. Turning it off hides team features without
          deleting any records.
        </p>
      </div>
      <label htmlFor="teams-toggle" className="flex items-center gap-3">
        <span className="text-sm font-medium text-fg">Enable Teams &amp; ENS</span>
        <Switch id="teams-toggle" checked={enabled} onChange={toggle} loading={save.isPending} label="Enable Teams and ENS" />
      </label>
    </div>
  );
}

function RegisterOnchain({ payout }: { payout: string }) {
  const { isConnected } = useConnection();
  const config = useConfig();
  const write = useWriteContract();
  const [busy, setBusy] = useState(false);

  if (!onchainEnabled) {
    return (
      <p className="text-sm text-danger">
        Payments are disabled: set <code className="font-mono text-xs">NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS</code> and{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_USDT_ADDRESS</code> and redeploy.
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

export function SettingsView({ apiKeyHint, relayer }: { apiKeyHint: string; relayer: string }) {
  const merchant = useMerchant();
  const merchantMissing = merchant.error instanceof ApiError && merchant.error.status === 404;
  const curl = `curl "$SINTINGALE_URL/api/access?merchantId=${publicConfig.merchantId}&planId=PLAN_ID&customer=0x…" \\
  -H "x-api-key: $SINTINGALE_API_KEY"`;

  return (
    <>
      <PageHeader title="Settings" description="Merchant profile, payout address and API access." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="xl:col-span-2">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Building2 className="size-4 text-brand" /> Merchant profile</span>} description="Stored as a merchant entity; the latest version wins." />
          {merchant.data ? (
            <ProfileForm key={merchant.data.key} merchant={merchant.data} />
          ) : merchantMissing ? (
            <SetupForm />
          ) : (
            <Skeleton className="m-5 h-48" />
          )}
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title={<span className="inline-flex items-center gap-2"><Users className="size-4 text-brand" /> Teams &amp; ENS</span>}
            description="Optional. Everything else in Sintingale works without it."
          />
          {merchant.data ? <TeamsToggle merchant={merchant.data} /> : <Skeleton className="m-5 h-24" />}
        </Card>

        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><KeyRound className="size-4 text-brand" /> API key</span>} description="For server-to-server calls from your SaaS backend." />
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-sm text-fg">{apiKeyHint}</code>
            </div>
            <p className="text-xs text-fg-muted">Configured through SINTINGALE_API_KEY. Only the prefix and suffix are shown.</p>
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
            <Row label="Ledger" value="Arkiv testnet (Rabdi)" mono={false} />
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
