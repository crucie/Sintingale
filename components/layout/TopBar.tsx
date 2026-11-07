"use client";

import { Database, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SessionChip } from "@/components/org/SessionChip";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useStats } from "@/lib/client/hooks";
import { cn } from "@/lib/format";
import { NavLinks, SecondaryLinks } from "./Sidebar";

function LedgerBadge() {
  const { data } = useStats();
  if (!data) return null;
  const { ledger, onchain } = data.system;
  return (
    <span
      className="hidden items-center gap-1.5 rounded-full border border-border bg-bg px-3 py-1.5 text-xs text-fg-muted sm:inline-flex"
      title={ledger === "arkiv" ? "Entities are written to the Arkiv testnet" : "Entities live in the in-memory Arkiv emulator"}
    >
      <Database className="size-3.5" aria-hidden />
      {ledger === "arkiv" ? "Arkiv testnet" : "Local ledger"}
      <span className="text-border">|</span>
      {onchain ? "Whitechain" : "Simulated pay"}
    </span>
  );
}

export function TopBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur sm:px-6">
        <button
          className="grid size-11 place-items-center rounded-xl text-fg hover:bg-muted md:hidden"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" />
        </button>
        <Link href="/dashboard" className="md:hidden" aria-label="Sintingale dashboard">
          <Logo />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <LedgerBadge />
          <SessionChip />
          <ThemeToggle />
          <ConnectButton size="sm" className="hidden sm:inline-flex" />
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-bg shadow-2xl transition-transform duration-300 md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Logo />
          <button
            className="grid size-11 place-items-center rounded-xl hover:bg-muted"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-1 flex-col justify-between p-3">
          <NavLinks onNavigate={() => setOpen(false)} />
          <div className="space-y-3">
            <SecondaryLinks onNavigate={() => setOpen(false)} />
            <ConnectButton className="w-full" />
          </div>
        </div>
      </aside>
    </>
  );
}
