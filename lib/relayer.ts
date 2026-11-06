import "server-only";
import { createPublicClient, decodeEventLog, http, type Hex } from "viem";
import { publicConfig, serverConfig } from "./config";
import { invoiceIdToBytes32, paymentRouterAbi, whitechain } from "./whitechain";

const LOG_PAGE = 1_000n;

const client = createPublicClient({ chain: whitechain, transport: http(publicConfig.whitechain.rpcUrl) });

export interface PaidEvent {
  invoiceIdHash: Hex;
  merchant: string;
  payer: string;
  token: string;
  amount: bigint;
  txHash: Hex;
  blockNumber: bigint;
}

export interface ExpectedPayment {
  invoiceId: string;
  amount: number;
  merchant?: string;
}

/** Reads the `Paid` event out of a transaction receipt and checks it against the Arkiv invoice. */
export async function verifyPaidTx(txHash: Hex, expected: ExpectedPayment): Promise<PaidEvent> {
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("Transaction reverted on Whitechain.");

  const head = await client.getBlockNumber();
  const confirmations = Number(head - receipt.blockNumber) + 1;
  if (confirmations < serverConfig().confirmations) {
    throw new Error(`Waiting for confirmations (${confirmations}/${serverConfig().confirmations}).`);
  }

  const event = receipt.logs
    .filter((log) => log.address.toLowerCase() === publicConfig.paymentRouter?.toLowerCase())
    .map((log) => {
      try {
        const decoded = decodeEventLog({ abi: paymentRouterAbi, data: log.data, topics: log.topics });
        return decoded.eventName === "Paid" ? { ...decoded.args, blockNumber: log.blockNumber } : null;
      } catch {
        return null;
      }
    })
    .find(Boolean);
  if (!event) throw new Error("No Paid event from the PaymentRouter in this transaction.");

  if (event.invoiceId.toLowerCase() !== invoiceIdToBytes32(expected.invoiceId).toLowerCase()) {
    throw new Error("Paid event is for a different invoice.");
  }
  if (event.amount !== BigInt(expected.amount)) {
    throw new Error("On-chain amount does not match the invoice amount.");
  }
  if (event.token.toLowerCase() !== publicConfig.usdt.address?.toLowerCase()) {
    throw new Error("Payment used an unexpected token.");
  }
  if (expected.merchant && event.merchant.toLowerCase() !== expected.merchant.toLowerCase()) {
    throw new Error("Payment was routed to a different merchant.");
  }
  return {
    invoiceIdHash: event.invoiceId,
    merchant: event.merchant,
    payer: event.payer,
    token: event.token,
    amount: event.amount,
    txHash,
    blockNumber: event.blockNumber,
  };
}

const cursor = globalThis as unknown as { __sintingaleLastBlock?: bigint };

/**
 * Pages through `Paid` logs from the last processed block, in ≤1,000-block
 * chunks because the public Whitechain RPC caps `eth_getLogs` ranges.
 */
export async function pollPaidEvents(maxPages = 5): Promise<{ events: PaidEvent[]; fromBlock: bigint; toBlock: bigint }> {
  if (!publicConfig.paymentRouter) return { events: [], fromBlock: 0n, toBlock: 0n };
  const head = (await client.getBlockNumber()) - BigInt(Math.max(0, serverConfig().confirmations - 1));
  const start = cursor.__sintingaleLastBlock !== undefined ? cursor.__sintingaleLastBlock + 1n : head - LOG_PAGE;
  const events: PaidEvent[] = [];
  let from = start < 0n ? 0n : start;
  let pages = 0;
  while (from <= head && pages < maxPages) {
    const to = from + LOG_PAGE - 1n > head ? head : from + LOG_PAGE - 1n;
    const logs = await client.getContractEvents({
      address: publicConfig.paymentRouter,
      abi: paymentRouterAbi,
      eventName: "Paid",
      fromBlock: from,
      toBlock: to,
    });
    for (const log of logs) {
      events.push({
        invoiceIdHash: log.args.invoiceId!,
        merchant: log.args.merchant!,
        payer: log.args.payer!,
        token: log.args.token!,
        amount: log.args.amount!,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      });
    }
    cursor.__sintingaleLastBlock = to;
    from = to + 1n;
    pages++;
  }
  return { events, fromBlock: start, toBlock: cursor.__sintingaleLastBlock ?? head };
}

export async function fetchTxSummary(txHash: Hex) {
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  return { status: receipt.status, blockNumber: receipt.blockNumber, logs: receipt.logs };
}
