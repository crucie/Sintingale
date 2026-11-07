"use client";

import { Check, ExternalLink, Loader2, Plus, X } from "lucide-react";
import type { ReactNode } from "react";
import { formatEther } from "viem";
import { useWatchAsset } from "wagmi";
import { usePayoutStatus, useWalletFunds } from "@/lib/client/chain";
import { publicConfig } from "@/lib/config";
import { cn, formatUsdt } from "@/lib/format";

const FAUCET_URL = "https://faucet.testnet.whitechain.io";

type CheckState = "ok" | "fail" | "pending";

interface Check {
  id: "merchant" | "usdt" | "gas";
  label: string;
  state: CheckState;
  help?: ReactNode;
}

/** What has to be true before the Pay button can succeed, checked from the chain, not guessed. */
export function usePaymentReadiness(opts: {
  payer: string | undefined;
  amount: number;
  merchantWallet: string;
  /** The payout the seller advertises; a different on-chain payout means funds would go elsewhere. */
  merchantPayout: string;
  isProject: boolean;
}) {
  const funds = useWalletFunds(opts.payer);
  const payout = usePayoutStatus(opts.isProject ? null : opts.merchantWallet);
  const need = BigInt(opts.amount);

  const checks: Check[] = [];
  if (!opts.isProject) {
    const payoutMatches = payout.payout?.toLowerCase() === opts.merchantPayout.toLowerCase();
    checks.push({
      id: "merchant",
      label: "Seller can receive payments",
      state: payout.registered === undefined ? "pending" : payout.registered && payoutMatches ? "ok" : "fail",
      help: payout.registered
        ? "The seller's payment address on Whitechain doesn't match the one shown here, so payment is paused to protect you. Let the seller know."
        : "This seller hasn't finished setting up payments yet. Nothing will be charged. Let them know and try again later.",
    });
  }
  checks.push({
    id: "usdt",
    label:
      funds.usdt === undefined
        ? "Checking your USDT balance"
        : `USDT balance: ${formatUsdt(Number(funds.usdt))} (needs ${formatUsdt(opts.amount)})`,
    state: funds.usdt === undefined ? "pending" : funds.usdt >= need ? "ok" : "fail",
    help: "You need more test USDT on Whitechain Sepolia in this wallet. Ask the seller or the Whitechain team for test USDT, then refresh.",
  });
  checks.push({
    id: "gas",
    label: funds.gas === undefined ? "Checking WBT for the network fee" : `WBT for the network fee: ${Number(formatEther(funds.gas)).toFixed(4)}`,
    state: funds.gas === undefined ? "pending" : funds.gas > 0n ? "ok" : "fail",
    help: (
      <>
        Whitechain charges a tiny fee in WBT.{" "}
        <a href={FAUCET_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-brand hover:underline">
          Get free test WBT <ExternalLink className="size-3" aria-hidden />
        </a>
      </>
    ),
  });

  const blocking = checks.find((c) => c.state === "fail");
  return {
    checks,
    ready: checks.every((c) => c.state === "ok"),
    pending: checks.some((c) => c.state === "pending"),
    blockingReason:
      blocking?.id === "merchant" ? "Seller not ready yet" : blocking?.id === "usdt" ? "Not enough USDT" : blocking?.id === "gas" ? "Need WBT for the fee" : null,
  };
}

const ICON: Record<CheckState, ReactNode> = {
  ok: <Check className="size-3.5" aria-hidden />,
  fail: <X className="size-3.5" aria-hidden />,
  pending: <Loader2 className="size-3.5 animate-spin" aria-hidden />,
};

export function ReadinessList({ readiness }: { readiness: ReturnType<typeof usePaymentReadiness> }) {
  const watch = useWatchAsset();
  return (
    <div className="mt-5 rounded-2xl border border-border p-4">
      <p className="text-sm font-medium text-fg">Before you pay</p>
      <ul className="mt-3 space-y-3">
        {readiness.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-3 text-sm">
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                c.state === "ok" && "bg-success text-white",
                c.state === "fail" && "bg-danger text-white",
                c.state === "pending" && "bg-muted text-fg-muted",
              )}
            >
              {ICON[c.state]}
            </span>
            <div className="min-w-0">
              <p className={cn(c.state === "fail" ? "text-fg" : "text-fg-muted")}>{c.label}</p>
              {c.state === "fail" && c.help ? <p className="mt-0.5 text-xs text-fg-muted">{c.help}</p> : null}
              {c.id === "usdt" && c.state === "fail" && publicConfig.usdt.address ? (
                <button
                  type="button"
                  onClick={() =>
                    watch.mutate({
                      type: "ERC20",
                      options: { address: publicConfig.usdt.address!, symbol: "USDT", decimals: publicConfig.usdt.decimals },
                    })
                  }
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                >
                  <Plus className="size-3" aria-hidden /> Show USDT in my wallet
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
