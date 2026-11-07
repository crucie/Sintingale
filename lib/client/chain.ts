"use client";

import { isAddress, zeroAddress, type Address } from "viem";
import { useBalance, useReadContract } from "wagmi";
import { publicConfig } from "../config";
import { erc20Abi, paymentRouterAbi, whitechain } from "../whitechain";

const asAddress = (v: string | null | undefined): Address | undefined => (v && isAddress(v) ? (v as Address) : undefined);

/** Has this merchant wallet called `registerMerchant` on the PaymentRouter? Payments revert until it has. */
export function usePayoutStatus(merchantWallet: string | null | undefined) {
  const wallet = asAddress(merchantWallet);
  const query = useReadContract({
    address: publicConfig.paymentRouter,
    abi: paymentRouterAbi,
    functionName: "payoutOf",
    args: wallet ? [wallet] : undefined,
    chainId: whitechain.id,
    query: { enabled: Boolean(publicConfig.paymentRouter && wallet), refetchInterval: 15_000 },
  });
  const payout = query.data as Address | undefined;
  return {
    /** `undefined` while unknown (loading, no wallet, or no router configured). */
    registered: payout === undefined ? undefined : payout !== zeroAddress,
    payout: payout && payout !== zeroAddress ? payout : null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/** USDT and WBT (gas) balances of a wallet on Whitechain. */
export function useWalletFunds(owner: string | null | undefined) {
  const address = asAddress(owner);
  const usdt = useReadContract({
    address: publicConfig.usdt.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: whitechain.id,
    query: { enabled: Boolean(publicConfig.usdt.address && address), refetchInterval: 10_000 },
  });
  const gas = useBalance({ address, chainId: whitechain.id, query: { enabled: Boolean(address), refetchInterval: 10_000 } });
  return {
    usdt: usdt.data as bigint | undefined,
    gas: gas.data?.value,
    isLoading: usdt.isLoading || gas.isLoading,
  };
}
