"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useConfig, useConnection, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import type { Address, Hex } from "viem";
import { api, ApiError } from "@/lib/client/hooks";
import { onchainEnabled, publicConfig, splitterEnabled } from "@/lib/config";
import { splitterAbi } from "@/lib/chain/splitter";
import type { CheckoutData } from "@/lib/types";
import { erc20Abi, invoiceIdToBytes32, paymentRouterAbi, whitechain } from "@/lib/whitechain";
import type { Step, StepState } from "./TxStatus";

export type PaymentPhase = "ready" | "awaiting-wallet" | "confirming" | "success" | "error";

interface Result {
  txHash: string;
  receiptKey: string;
}

type StepId = "approve" | "pay" | "record";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Wallet and contract errors in words a customer can act on. */
const errMessage = (err: unknown) => {
  const raw = err instanceof Error ? ((err as { shortMessage?: string }).shortMessage ?? err.message) : String(err);
  if (/user rejected|user denied|rejected the request/i.test(raw)) return "You cancelled the request in your wallet. Nothing was charged.";
  if (/insufficient funds/i.test(raw)) return "Your wallet needs a little WBT on Whitechain to pay the network fee.";
  if (/UnregisteredMerchant/i.test(raw)) return "This seller hasn't finished setting up payments yet. Nothing was charged.";
  if (/AlreadyPaid/i.test(raw)) return "This invoice has already been paid.";
  return raw.split("\n")[0] || "Payment failed";
};

/** approve → pay → relayer receipt, as an explicit state machine the UI can render step by step. */
export function usePayment(data: CheckoutData | undefined, invoiceKey: string) {
  const config = useConfig();
  const { address } = useConnection();
  const write = useWriteContract();
  const qc = useQueryClient();

  const [phase, setPhase] = useState<PaymentPhase>("ready");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [steps, setSteps] = useState<Record<StepId, { state: StepState; detail?: string }>>({
    approve: { state: "idle" },
    pay: { state: "idle" },
    record: { state: "idle" },
  });

  const mark = (id: StepId, state: StepState, detail?: string) =>
    setSteps((s) => ({ ...s, [id]: { state, detail: detail ?? s[id].detail } }));

  const notify = useCallback(
    async (body: { txHash: string; payer: string }) => {
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          return await api<{ receiptKey: string; txHash: string }>("/api/payments/notify", {
            method: "POST",
            body: JSON.stringify({ invoiceKey, ...body }),
          });
        } catch (err) {
          const retryable = err instanceof ApiError && err.code === "PAYMENT_NOT_VERIFIED" && /confirmation/i.test(err.message);
          if (!retryable || attempt === 7) throw err;
          await sleep(1500);
        }
      }
      throw new Error("Relayer did not confirm the payment in time.");
    },
    [invoiceKey],
  );

  const pay = useCallback(async () => {
    if (!data) return;
    setError(null);
    const amount = BigInt(data.invoice.amount);
    let current: StepId = "approve";
    const isProject = Boolean(data.project && data.invoice.projectId);
    try {
      if (data.identity.mismatch) throw new Error("Payment blocked: the seller's ENS name no longer points at its payout address.");
      if (!(isProject ? splitterEnabled : onchainEnabled)) {
        throw new Error("Payments are not configured on this deployment. Contact the merchant.");
      }

      if (!address) throw new Error("Connect a wallet first.");
      const token = publicConfig.usdt.address!;
      const router = (isProject ? publicConfig.splitter : publicConfig.paymentRouter)!;
      const merchant = (data.merchant.wallet || data.merchant.payout) as Address;

      const balance = await readContract(config, {
        address: token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
        chainId: whitechain.id,
      });
      if (balance < amount) throw new Error("Not enough USDT in this wallet for this invoice.");

      setPhase("awaiting-wallet");
      const allowance = await readContract(config, {
        address: token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, router],
        chainId: whitechain.id,
      });
      if (allowance < amount) {
        mark("approve", "active", "Confirm in your wallet: allow this exact amount");
        const approveHash = await write.mutateAsync({
          address: token,
          abi: erc20Abi,
          functionName: "approve",
          args: [router, amount],
          chainId: whitechain.id,
        });
        setPhase("confirming");
        mark("approve", "active", "Waiting for Whitechain to confirm");
        await waitForTransactionReceipt(config, { hash: approveHash, chainId: whitechain.id });
        mark("approve", "done", "Allowed");
      } else {
        mark("approve", "skipped", "Already allowed");
      }

      current = "pay";
      setPhase("awaiting-wallet");
      mark("pay", "active", "Confirm the payment in your wallet");
      const payHash = isProject
        ? await write.mutateAsync({
            address: router,
            abi: splitterAbi,
            functionName: "payProjectInvoice",
            args: [data.project!.onchainId as Hex, invoiceIdToBytes32(data.invoice.invoiceId), token, amount],
            chainId: whitechain.id,
          })
        : await write.mutateAsync({
            address: router,
            abi: paymentRouterAbi,
            functionName: "payInvoice",
            args: [invoiceIdToBytes32(data.invoice.invoiceId), merchant, token, amount],
            chainId: whitechain.id,
          });
      setPhase("confirming");
      mark("pay", "active", "Waiting for Whitechain to confirm (a few seconds)");
      const receipt = await waitForTransactionReceipt(config, { hash: payHash as Hex, chainId: whitechain.id });
      if (receipt.status !== "success") throw new Error("The payment transaction reverted.");
      mark("pay", "done", `Confirmed in block ${receipt.blockNumber}`);

      current = "record";
      mark("record", "active", "Checking the payment and issuing your receipt");
      const res = await notify({ txHash: payHash, payer: address });
      mark("record", "done", "Receipt issued");
      setResult(res);
      setPhase("success");
      qc.invalidateQueries({ queryKey: ["checkout", invoiceKey] });
    } catch (err) {
      mark(current, "error");
      setError(errMessage(err));
      setPhase("error");
    }
  }, [address, config, data, invoiceKey, notify, qc, write]);

  const reset = useCallback(() => {
    setPhase("ready");
    setError(null);
    setSteps({ approve: { state: "idle" }, pay: { state: "idle" }, record: { state: "idle" } });
  }, []);

  const stepList: Step[] = [
    { id: "approve", label: "Allow USDT", ...steps.approve },
    { id: "pay", label: data?.project ? "Send payment (split between the team)" : "Send payment", ...steps.pay },
    { id: "record", label: "Get your receipt", ...steps.record },
  ];

  return { phase, error, result, steps: stepList, pay, reset };
}
