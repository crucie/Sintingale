"use client";

import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Address } from "viem";
import { useConfig, useConnection, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { Button } from "@/components/ui/Button";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NetworkGuard } from "@/components/wallet/NetworkGuard";
import { usePayoutStatus } from "@/lib/client/chain";
import { onchainEnabled, publicConfig } from "@/lib/config";
import { cn, shortHash } from "@/lib/format";
import type { MerchantDTO } from "@/lib/types";
import { explorerTx, paymentRouterAbi, whitechain } from "@/lib/whitechain";

export const merchantWalletOf = (m: Pick<MerchantDTO, "wallet" | "payout">) => (m.wallet || m.payout).toLowerCase();

const walletError = (err: unknown) => {
  const msg = err instanceof Error ? ((err as { shortMessage?: string }).shortMessage ?? err.message) : String(err);
  if (/user rejected|denied/i.test(msg)) return "You cancelled the request in your wallet.";
  if (/insufficient funds/i.test(msg)) return "Your wallet needs a little WBT on Whitechain to pay the network fee.";
  return msg.split("\n")[0];
};

/**
 * One-time on-chain step: the merchant wallet calls `registerMerchant(payout)` so the
 * PaymentRouter knows where to forward USDT. Until then every customer payment reverts.
 */
export function PayoutRegistration({ merchant, className }: { merchant: MerchantDTO; className?: string }) {
  const { address, isConnected } = useConnection();
  const config = useConfig();
  const write = useWriteContract();
  const merchantWallet = merchantWalletOf(merchant);
  const status = usePayoutStatus(merchantWallet);
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState<string | null>(null);

  if (!onchainEnabled) {
    return (
      <p className={cn("text-sm text-danger", className)}>
        Payments are disabled on this deployment: the PaymentRouter or USDT address is not configured.
      </p>
    );
  }

  if (status.registered === undefined) {
    return (
      <p className={cn("flex items-center gap-2 text-sm text-fg-muted", className)}>
        <Loader2 className="size-4 animate-spin" aria-hidden /> Checking your payout on Whitechain…
      </p>
    );
  }

  const payoutMismatch = status.registered && status.payout?.toLowerCase() !== merchant.payout.toLowerCase();

  if (status.registered && !payoutMismatch) {
    return (
      <div className={cn("flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-sm", className)}>
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
        <div>
          <p className="font-medium text-fg">Ready to accept USDT</p>
          <p className="mt-0.5 text-fg-muted">
            Customer payments go straight to <span className="font-mono text-fg">{shortHash(merchant.payout)}</span> in the same
            transaction. Sintingale never holds your funds.
          </p>
        </div>
      </div>
    );
  }

  const wrongWallet = isConnected && address && address.toLowerCase() !== merchantWallet;

  async function register() {
    setBusy(true);
    try {
      const hash = await write.mutateAsync({
        address: publicConfig.paymentRouter!,
        abi: paymentRouterAbi,
        functionName: "registerMerchant",
        args: [merchant.payout as Address],
        chainId: whitechain.id,
      });
      setTx(hash);
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: whitechain.id });
      if (receipt.status !== "success") throw new Error("The registration transaction reverted.");
      await status.refetch();
      toast.success("Payout registered. You can now accept USDT payments.");
    } catch (err) {
      toast.error(walletError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm", className)}>
      <p className="flex items-center gap-2 font-medium text-fg">
        <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
        {payoutMismatch ? "Your registered payout is out of date" : "One step left: register your payout on Whitechain"}
      </p>
      <p className="mt-1 text-fg-muted">
        {payoutMismatch ? (
          <>
            Payments currently go to <span className="font-mono text-fg">{shortHash(status.payout ?? "0x")}</span>, but your profile says{" "}
            <span className="font-mono text-fg">{shortHash(merchant.payout)}</span>. Register again to update it.
          </>
        ) : (
          <>
            Customers can&apos;t pay you until your merchant wallet signs one transaction telling the payment contract to forward USDT to{" "}
            <span className="font-mono text-fg">{shortHash(merchant.payout)}</span>. It costs a tiny amount of WBT for gas.
          </>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!isConnected ? (
          <ConnectButton />
        ) : wrongWallet ? (
          <p className="text-xs text-fg">
            You&apos;re connected as <span className="font-mono">{shortHash(address!)}</span>. Switch your wallet to the merchant wallet{" "}
            <span className="font-mono">{shortHash(merchantWallet)}</span> from your profile, or update the profile.
          </p>
        ) : (
          <NetworkGuard action="Registration">
            <Button loading={busy} onClick={register} icon={<ShieldCheck className="size-4" />}>
              {payoutMismatch ? "Update payout" : "Register payout"}
            </Button>
          </NetworkGuard>
        )}
        {tx ? (
          <a href={explorerTx(tx)} target="_blank" rel="noreferrer" className="font-mono text-xs text-brand hover:underline">
            {shortHash(tx)} on the explorer
          </a>
        ) : null}
      </div>
    </div>
  );
}
