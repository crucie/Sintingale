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
  simulated: boolean;
}

type StepId = "approve" | "pay" | "record";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errMessage = (err: unknown) => {
  if (err instanceof Error) {
    const short = (err as { shortMessage?: string }).shortMessage;
    return short ?? err.message.split("\n")[0];
  }
  return "Payment failed";
};
const randomHex = (bytes: number) =>
  `0x${Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("")}`;

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
    async (body: { txHash?: string; payer?: string; simulated?: boolean }) => {
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
        setPhase("awaiting-wallet");
        mark("approve", "active", "Simulated approval");
        await sleep(700);
        mark("approve", "done");
        current = "pay";
        mark("pay", "active", isProject ? "Simulated payProjectInvoice()" : "Simulated payInvoice()");
        setPhase("confirming");
        await sleep(1000);
        mark("pay", "done");
        current = "record";
        mark("record", "active", isProject ? "Relayer writing receipt + payouts" : "Relayer writing receipt + entitlement");
        const res = await notify({ simulated: true, payer: address ?? randomHex(20), txHash: randomHex(32) });
        mark("record", "done", `Receipt ${res.receiptKey.slice(0, 10)}…`);
        setResult({ ...res, simulated: true });
        setPhase("success");
        qc.invalidateQueries({ queryKey: ["checkout", invoiceKey] });
        return;
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
      if (balance < amount) throw new Error("Insufficient USDT balance for this invoice.");

      setPhase("awaiting-wallet");
      const allowance = await readContract(config, {
        address: token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, router],
        chainId: whitechain.id,
      });
      if (allowance < amount) {
        mark("approve", "active", "Confirm the approval in your wallet");
        const approveHash = await write.mutateAsync({
          address: token,
          abi: erc20Abi,
          functionName: "approve",
          args: [router, amount],
          chainId: whitechain.id,
        });
        setPhase("confirming");
        mark("approve", "active", "Waiting for approval to confirm");
        await waitForTransactionReceipt(config, { hash: approveHash, chainId: whitechain.id });
        mark("approve", "done", "Approved");
      } else {
        mark("approve", "skipped", "Allowance already sufficient");
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
      mark("pay", "active", `Tx ${payHash.slice(0, 10)}… confirming`);
      const receipt = await waitForTransactionReceipt(config, { hash: payHash as Hex, chainId: whitechain.id });
      if (receipt.status !== "success") throw new Error("The payment transaction reverted.");
      mark("pay", "done", `Confirmed in block ${receipt.blockNumber}`);

      current = "record";
      mark("record", "active", isProject ? "Relayer verifying the Credited events" : "Relayer verifying the Paid event");
      const res = await notify({ txHash: payHash, payer: address });
      mark("record", "done", `Receipt ${res.receiptKey.slice(0, 10)}…`);
      setResult({ ...res, simulated: false });
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
    { id: "approve", label: "Approve USDT", ...steps.approve },
    { id: "pay", label: data?.project ? "Pay project on Whitechain (split by contribution)" : "Pay invoice on Whitechain", ...steps.pay },
    { id: "record", label: data?.project ? "Receipt and payouts written to Arkiv" : "Receipt written to Arkiv", ...steps.record },
  ];

  return { phase, error, result, steps: stepList, pay, reset };
}
