"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, Search, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { api } from "@/lib/client/hooks";
import { orgActions, useSigner } from "@/lib/client/org";
import { publicConfig } from "@/lib/config";
import { shortHash } from "@/lib/format";
import type { SessionDTO } from "@/lib/types";
import { EnsBadge } from "./EnsBadge";
import { SessionGate } from "./OrgGate";

interface Check {
  ok: boolean;
  method: "addr" | "text" | "demo" | null;
  name: string;
  resolvedAddress: string | null;
  textRecord: string | null;
  avatar: string | null;
  reason?: string;
}

function Flow({ session }: { session: SessionDTO }) {
  const router = useRouter();
  const qc = useQueryClient();
  const sign = useSigner();
  const [name, setName] = useState(publicConfig.sepolia.parentNameHint || (session.demo ? "acme.demo" : ""));
  const [check, setCheck] = useState<Check | null>(null);
  const [checking, setChecking] = useState(false);
  const [linking, setLinking] = useState(false);

  async function runCheck(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    setCheck(null);
    try {
      setCheck(await api<Check>(`/api/ens/check?name=${encodeURIComponent(name.trim().toLowerCase())}&address=${session.address}`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not check the name");
    } finally {
      setChecking(false);
    }
  }

  async function link() {
    if (!check?.ok || !check.method || !check.resolvedAddress) return;
    setLinking(true);
    try {
      await orgActions.createOrg(sign, {
        orgId: check.name,
        ensName: check.name,
        owner: session.address,
        payout: check.resolvedAddress,
        merchantId: publicConfig.merchantId,
        verifyMethod: check.method,
        verifiedAt: Math.floor(Date.now() / 1000),
      });
      toast.success(`${check.name} is now your billing organisation`);
      await qc.invalidateQueries();
      router.push("/dashboard/org");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.split("\n")[0] : "Could not link the name");
    } finally {
      setLinking(false);
    }
  }

  if (session.org) {
    return (
      <Card className="p-6">
        <EnsBadge name={session.org.ensName} address={session.org.resolvedAddress} avatar={session.org.avatar} verified={session.org.payoutMatches} demo={session.org.demo} size="lg" />
        <p className="mt-4 text-sm text-fg-muted">This wallet already has a linked organisation.</p>
        <ButtonLink href="/dashboard/org" className="mt-4">Go to organisation</ButtonLink>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card className="p-6">
        <form onSubmit={runCheck} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Field label="ENS name on Sepolia" htmlFor="ens-name" className="flex-1" hint="For example acme.eth. Lookups run on Ethereum Sepolia; payments stay on Whitechain.">
            <Input id="ens-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="acme.eth" autoComplete="off" required />
          </Field>
          <Button type="submit" loading={checking} icon={<Search className="size-4" />}>
            Check name
          </Button>
        </form>

        {check ? (
          <div className="mt-6 rounded-2xl border border-border p-5">
            <EnsBadge name={check.name} address={check.resolvedAddress} avatar={check.avatar} verified={check.ok} demo={check.method === "demo"} />
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                {check.resolvedAddress === session.address ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
                )}
                <span>
                  ETH address record:{" "}
                  <span className="font-mono text-xs">{check.resolvedAddress ? shortHash(check.resolvedAddress, 8, 6) : "not set"}</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                {check.method === "text" ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
                )}
                <span>
                  <code className="font-mono text-xs">sintingale.owner</code> text record: {check.textRecord ? shortHash(check.textRecord, 8, 6) : "not set"}
                </span>
              </li>
            </ul>

            {check.ok ? (
              <div className="mt-5 space-y-3">
                <p className="text-sm text-fg-muted">
                  Customers will pay <strong className="text-fg">{check.name}</strong>. Payouts go to the address it resolves to:{" "}
                  <span className="font-mono text-xs text-fg">{check.resolvedAddress}</span>.
                </p>
                <Button onClick={link} loading={linking} icon={<ShieldCheck className="size-4" />}>
                  Sign and link {check.name}
                </Button>
              </div>
            ) : (
              <div role="alert" className="mt-5 rounded-xl bg-warning-soft p-4 text-sm text-fg">
                <p className="font-medium">Your wallet does not control {check.name}.</p>
                <p className="mt-1 text-fg-muted">
                  {check.reason === "NOT_RESOLVED"
                    ? "The name has no records yet."
                    : "The name points to a different address."}{" "}
                  In the ENS app, either set its ETH address to <span className="font-mono text-xs">{session.address}</span>, or add a text
                  record <code className="font-mono text-xs">sintingale.owner</code> with that address. Then check again.
                </p>
                <ButtonLink
                  href={`${publicConfig.sepolia.ensAppUrl}/${check.name}`}
                  target="_blank"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  icon={<ArrowUpRight className="size-4" aria-hidden />}
                >
                  Open {check.name} in the ENS app
                </ButtonLink>
              </div>
            )}
          </div>
        ) : null}
      </Card>

      <Card className="h-fit p-5 text-sm text-fg-muted">
        <p className="font-medium text-fg">How the proof works</p>
        <ol className="mt-3 list-decimal space-y-2 pl-4">
          <li>Sintingale resolves the name on Sepolia through the ENS Universal Resolver.</li>
          <li>Only the name&apos;s manager can edit its records, so a record pointing at your wallet proves control.</li>
          <li>You sign the link with your wallet. The org record on Arkiv carries that signature.</li>
        </ol>
        <p className="mt-3">ENS is optional: checkout links and payments keep working without it.</p>
      </Card>
    </div>
  );
}

export function ConnectOrg() {
  return (
    <>
      <PageHeader title="Link an ENS name" description="Prove you control a name, and it becomes your verified billing organisation." />
      <SessionGate description="Sign in with the wallet that manages your ENS name.">{(session) => <Flow session={session} />}</SessionGate>
    </>
  );
}
