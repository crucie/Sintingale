import { twMerge } from "tailwind-merge";
import { publicConfig } from "./config";

const DECIMALS = publicConfig.usdt.decimals;

export const toBaseUnits = (amount: string): number => Math.round(Number(amount) * 10 ** DECIMALS);
export const fromBaseUnits = (units: number): number => units / 10 ** DECIMALS;

export function formatUsdt(units: number, opts: { symbol?: boolean } = {}): string {
  const value = fromBaseUnits(units).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return opts.symbol === false ? value : `${value} USDT`;
}

export function shortHash(value: string, head = 6, tail = 4): string {
  if (!value) return "";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, "0")}s`;
  return `${sec}s`;
}

export function formatDate(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(unixSec: number, nowMs: number): string {
  const diff = Math.round((nowMs - unixSec * 1000) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const cn = (...classes: Array<string | false | null | undefined>) => twMerge(classes.filter(Boolean).join(" "));
