"use client";

import { ExternalLink, FlaskConical } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/format";
import { isActive, NAV } from "./nav";

export function NavLinks({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Dashboard">
      {NAV.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
              collapsed && "justify-center px-0",
              active ? "bg-brand-soft text-brand" : "text-fg-muted hover:bg-muted hover:text-fg",
            )}
          >
            <item.icon className="size-[18px] shrink-0" aria-hidden />
            <span className={cn(collapsed && "sr-only")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SecondaryLinks({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const link = cn(
    "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-fg-muted transition-colors hover:bg-muted hover:text-fg",
    collapsed && "justify-center px-0",
  );
  return (
    <div className="flex flex-col gap-1">
      <Link href="/demo" className={link} onClick={onNavigate} title={collapsed ? "Demo SaaS app" : undefined}>
        <FlaskConical className="size-[18px] shrink-0" aria-hidden />
        <span className={cn(collapsed && "sr-only")}>Demo SaaS app</span>
      </Link>
      <Link href="/" className={link} onClick={onNavigate} title={collapsed ? "Website" : undefined}>
        <ExternalLink className="size-[18px] shrink-0" aria-hidden />
        <span className={cn(collapsed && "sr-only")}>Website</span>
      </Link>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface md:flex md:w-[76px] lg:w-60">
      <div className="flex h-16 items-center px-5 md:justify-center lg:justify-start">
        <Link href="/dashboard" aria-label="Sintingale dashboard">
          <LogoMark className="lg:hidden" />
          <Logo className="hidden lg:inline-flex" />
        </Link>
      </div>
      <div className="flex flex-1 flex-col justify-between px-3 pb-4 pt-2">
        <div className="lg:hidden">
          <NavLinks collapsed />
        </div>
        <div className="hidden lg:block">
          <NavLinks />
        </div>
        <div>
          <div className="lg:hidden">
            <SecondaryLinks collapsed />
          </div>
          <div className="hidden lg:block">
            <SecondaryLinks />
          </div>
        </div>
      </div>
    </aside>
  );
}
