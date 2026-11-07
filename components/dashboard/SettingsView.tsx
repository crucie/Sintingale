"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Building2, Code2, KeyRound, Link2, Save, Users, Wallet } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useConnection } from "wagmi";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { Field, Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { PayoutRegistration } from "./PayoutRegistration";
import { ApiError, useMerchant, useSaveMerchant, useSetupMerchant } from "@/lib/client/hooks";
import { publicConfig } from "@/lib/config";
import { whitechain } from "@/lib/whitechain";
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
      toast.success("Profile saved");
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
      <Field label="Payout address" htmlFor="m-payout" hint="Where customer USDT lands. Can be a different wallet, e.g. a treasury.">
        <Input id="m-payout" className="font-mono" value={payout} onChange={(e) => setPayout(e.target.value)} required />
      </Field>
      <Field label="Merchant wallet" htmlFor="m-wallet" hint="The wallet you sign in with to register your payout. Leave empty to use the payout address.">
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
      toast.success("Business created. Next: register your payout below, then add a product.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the merchant");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 p-5 md:grid-cols-2">
      <p className="text-sm text-fg-muted md:col-span-2">
        Welcome! Start by telling customers who they are paying. Connect the wallet you&apos;ll manage payments with; it
        fills in the addresses for you.
      </p>
      <Field label="Business name" htmlFor="s-name">
        <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="Billing email" htmlFor="s-email">
        <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Payout address" htmlFor="s-payout" hint="Where customer USDT lands. Defaults to the connected wallet.">
        <Input
          id="s-payout"
          className="font-mono"
          placeholder={address ?? "0x…"}
          value={payout}
          onChange={(e) => setPayout(e.target.value)}
          required={!address}
        />
      </Field>
      <Field label="Merchant wallet" htmlFor="s-wallet" hint="The wallet you'll use to register your payout. Defaults to the connected wallet.">
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
          Create business profile
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

export function SettingsView({ apiKeyHint, relayer }: { apiKeyHint: string; relayer: string }) {
  const merchant = useMerchant();
  const merchantMissing = merchant.error instanceof ApiError && merchant.error.status === 404;
  const curl = `curl "$SINTINGALE_URL/api/access?merchantId=${publicConfig.merchantId}&planId=PLAN_ID&customer=0x…" \\
  -H "x-api-key: $SINTINGALE_API_KEY"`;

  return (
    <>
      <PageHeader title="Settings" description="Your business profile, where you get paid, and API access for your backend." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="xl:col-span-2">
          <CardHeader title={<span className="inline-flex items-center gap-2"><Building2 className="size-4 text-brand" /> Merchant profile</span>} description="Shown to customers at checkout. Saved on Arkiv; each save creates a new version." />
          {merchant.data ? (
            <ProfileForm key={merchant.data.key} merchant={merchant.data} />
          ) : merchantMissing ? (
            <SetupForm />
          ) : (
            <Skeleton className="m-5 h-48" />
          )}
        </Card>

        {merchant.data ? (
          <Card className="xl:col-span-2">
            <CardHeader
              title={<span className="inline-flex items-center gap-2"><Wallet className="size-4 text-brand" /> Get paid on Whitechain</span>}
              description="Payments in USDT go straight from the customer to your payout address."
            />
            <div className="p-5">
              <PayoutRegistration merchant={merchant.data} />
            </div>
          </Card>
        ) : null}

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
          <CardHeader title={<span className="inline-flex items-center gap-2"><Link2 className="size-4 text-brand" /> Network</span>} description="Technical details: where money and records live." />
          <dl className="divide-y divide-border px-5">
            <Row label="Ledger" value="Arkiv testnet (Rabdi)" mono={false} />
            <Row label="Record writer (trusted $creator)" value={relayer} />
            <Row label="Settlement chain" value={`${whitechain.name} · ${whitechain.id}`} mono={false} />
            <Row label="PaymentRouter" value={publicConfig.paymentRouter ?? "Not configured"} />
            <Row label="USDT token" value={publicConfig.usdt.address ?? "Not configured"} />
          </dl>
        </Card>
      </div>
    </>
  );
}
