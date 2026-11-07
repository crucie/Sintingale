"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, HandCoins, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useConfig, useConnection, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import type { Hex } from "viem";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NetworkGuard } from "@/components/wallet/NetworkGuard";
import { splitterAbi } from "@/lib/chain/splitter";
import { useClaimable } from "@/lib/client/org";
import { publicConfig } from "@/lib/config";
import { formatUsdt, shortHash } from "@/lib/format";
import type { ClaimableDTO, SessionDTO } from "@/lib/types";
import { explorerTx, whitechain } from "@/lib/whitechain";
import { SessionGate } from "./OrgGate";
import { PayoutTable } from "./PayoutTable";

type ClaimState = "idle" | "confirming" | "success" | "error";

function ClaimPanel({ entry, session }: { entry: ClaimableDTO; session: SessionDTO }) {
  const qc = useQueryClient();
  const config = useConfig();
  const write = useWriteContract();
  const { address } = useConnection();
  const [state, setState] = useState<ClaimState>("idle");
  const [tx, setTx] = useState<string | null>(null);

  async function claim() {
    setState("confirming");
    try {
      if (!publicConfig.splitter || !publicConfig.usdt.address) throw new Error("The ProjectSplitter is not configured on this deployment.");
      const hash = await write.mutateAsync({
        address: publicConfig.splitter,
        abi: splitterAbi,
        functionName: "claim",
        args: [entry.onchainId as Hex, publicConfig.usdt.address],
        chainId: whitechain.id,
      });
      setTx(hash);
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: whitechain.id });
      if (receipt.status !== "success") throw new Error("Claim reverted on Whitechain.");
      setState("success");
      toast.success(`Claimed ${formatUsdt(entry.claimable)}`);
      qc.invalidateQueries({ queryKey: ["claimable"] });
    } catch (e) {
      setState("error");
      toast.error(e instanceof Error ? (e as { shortMessage?: string }).shortMessage ?? e.message.split("\n")[0] : "Claim failed");
    }
  }

  const wrongWallet = address && address.toLowerCase() !== session.address;
  const button = (
    <Button onClick={claim} loading={state === "confirming"} disabled={entry.claimable <= 0 || Boolean(wrongWallet)} icon={<HandCoins className="size-4" />}>
      {state === "confirming" ? "Confirm in wallet…" : `Claim ${formatUsdt(entry.claimable)}`}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-bg p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-fg-muted">
          {entry.projectName} · <span className="text-fg">{entry.orgId}</span>
        </p>
        <p className="mt-1 font-display text-3xl font-bold tabular-nums text-fg">{formatUsdt(entry.claimable)}</p>
        <p className="text-xs text-fg-muted">
          {formatUsdt(entry.credited)} credited · {formatUsdt(entry.claimed)} claimed · balance read from the splitter
        </p>
        {tx ? (
          <a href={explorerTx(tx)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline">
            {shortHash(tx)} <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : null}
        {wrongWallet ? <p className="mt-1 text-xs text-warning">Switch your wallet to {shortHash(session.address)} to claim.</p> : null}
      </div>
      {state === "success" ? (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" aria-hidden /> Claimed
        </span>
      ) : address ? (
        <NetworkGuard action="Claims">{button}</NetworkGuard>
      ) : (
        <ConnectButton />
      )}
    </div>
  );
}

function Earnings({ session }: { session: SessionDTO }) {
  const claimable = useClaimable(true);
  const balances = claimable.data?.balances ?? [];
  const payouts = balances.flatMap((b) => b.payouts).sort((a, b) => b.paidAt - a.paidAt);
  const total = balances.reduce((s, b) => s + b.claimable, 0);

  return (
    <>
      <PageHeader title="Your earnings" description={`Shares credited to ${shortHash(session.address)} across every project you contribute to.`} />
      <Card className="mb-6 p-5">
        <p className="text-sm text-fg-muted">Claimable now</p>
        <p className="mt-1 font-display text-4xl font-bold tabular-nums text-fg">{claimable.isLoading ? "…" : formatUsdt(total)}</p>
      </Card>
      {claimable.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !balances.length ? (
        <Card>
          <EmptyState icon={Wallet} title="No payouts yet" description="When a customer pays a project you have a share in, it appears here." />
        </Card>
      ) : (
        <div className="space-y-4">
          {balances.map((b) => (
            <ClaimPanel key={`${b.orgId}:${b.projectId}`} entry={b} session={session} />
          ))}
        </div>
      )}
      {payouts.length ? (
        <Card className="mt-6">
          <CardHeader title="Payout history" />
          <PayoutTable payouts={payouts} showProject />
        </Card>
      ) : null}
    </>
  );
}

export function EarningsView() {
  return <SessionGate description="Sign in to see and claim your shares.">{(session) => <Earnings session={session} />}</SessionGate>;
}
