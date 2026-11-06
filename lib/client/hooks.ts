"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { publicConfig } from "../config";
import type { InvoiceInput, MerchantInput, PlanInput } from "../schema";
import type {
  CheckoutData,
  DashboardStats,
  InvoiceRow,
  MerchantDTO,
  PlanDTO,
  SystemInfo,
  VerifyResult,
} from "../types";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body?.error?.code ?? "UNKNOWN", body?.error?.message ?? res.statusText, res.status);
  }
  return body as T;
}

/* ---------------------------------------------------------------- clock -- */

let clockNow = 0;
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | undefined;

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (!clockTimer) {
    clockNow = Date.now();
    clockTimer = setInterval(() => {
      clockNow = Date.now();
      clockListeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
}

/** Ticking wall clock in ms. Returns null during SSR and hydration so markup stays deterministic. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribeClock,
    () => {
      if (!clockNow) clockNow = Date.now();
      return clockNow;
    },
    () => null,
  );
}

/* ------------------------------------------------------------- invoices -- */

const SEEN_KEY = "sintingale:seen-invoices";
const merchantId = publicConfig.merchantId;

/**
 * A live Arkiv query never returns expired invoices. To still show them as
 * "Expired", the dashboard remembers every pending invoice it has seen and
 * marks those that disappear once their expiry has passed.
 */
function mergeWithSeen(live: InvoiceRow[]): InvoiceRow[] {
  if (typeof window === "undefined") return live;
  let seen: Record<string, InvoiceRow> = {};
  try {
    seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}");
  } catch {
    seen = {};
  }
  const liveIds = new Set(live.map((r) => r.invoiceId));
  const nowSec = Date.now() / 1000;
  const expired = Object.values(seen)
    .filter((r) => !liveIds.has(r.invoiceId) && (r.expiresAt ?? 0) <= nowSec)
    .map((r) => ({ ...r, status: "expired" as const }));

  const nextSeen: Record<string, InvoiceRow> = {};
  for (const row of [...live.filter((r) => r.status === "pending"), ...expired]) {
    nextSeen[row.invoiceId] = row;
  }
  const cutoff = nowSec - 7 * 86400;
  for (const [id, row] of Object.entries(nextSeen)) {
    if (row.status === "expired" && (row.expiresAt ?? 0) < cutoff) delete nextSeen[id];
  }
  localStorage.setItem(SEEN_KEY, JSON.stringify(nextSeen));
  return [...live, ...expired.filter((r) => nextSeen[r.invoiceId])];
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices", merchantId],
    queryFn: async () => {
      const { invoices } = await api<{ invoices: InvoiceRow[] }>(`/api/invoices?merchantId=${merchantId}`);
      return mergeWithSeen(invoices);
    },
    refetchInterval: 4_000,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<InvoiceInput, "currency">) =>
      api<{ invoiceKey: string; invoiceId: string; checkoutUrl: string; expiresAt: number }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify({ ...input, currency: "USDT" }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

/* ---------------------------------------------------------------- plans -- */

export function usePlans() {
  return useQuery({
    queryKey: ["plans", merchantId],
    queryFn: async () => (await api<{ plans: PlanDTO[] }>(`/api/plans?merchantId=${merchantId}`)).plans,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlanInput) =>
      api<{ plan: PlanDTO }>("/api/plans", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  });
}

/* ------------------------------------------------------------- merchant -- */

export function useMerchant() {
  return useQuery({
    queryKey: ["merchant", merchantId],
    queryFn: async () => (await api<{ merchant: MerchantDTO }>(`/api/merchants?merchantId=${merchantId}`)).merchant,
  });
}

export function useSaveMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MerchantInput) =>
      api<{ merchant: MerchantDTO }>("/api/merchants", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["merchant"] }),
  });
}

/* ---------------------------------------------------------------- stats -- */

export function useStats() {
  return useQuery({
    queryKey: ["stats", merchantId],
    queryFn: () => api<{ stats: DashboardStats; system: SystemInfo }>(`/api/stats?merchantId=${merchantId}`),
    refetchInterval: 5_000,
  });
}

/* ------------------------------------------------------- checkout/verify -- */

export function useCheckout(invoiceKey: string) {
  return useQuery({
    queryKey: ["checkout", invoiceKey],
    queryFn: () => api<CheckoutData>(`/api/invoices/${invoiceKey}`),
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
  });
}

export function useVerify(receiptKey: string) {
  return useQuery({
    queryKey: ["verify", receiptKey],
    queryFn: () => api<VerifyResult>(`/api/verify/${receiptKey}`),
    retry: false,
  });
}
