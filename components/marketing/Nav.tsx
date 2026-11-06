"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/format";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#developers", label: "Developers" },
  { href: "#features", label: "Features" },
  { href: "/demo", label: "Live demo" },
];

export function Nav() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useGSAP(
    () => {
      ScrollTrigger.create({
        start: 40,
        end: "max",
        toggleClass: { targets: ref.current!, className: "is-scrolled" },
      });
    },
    { scope: ref },
  );

  return (
    <header
      ref={ref}
      className={cn(
        "group fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-300",
        "text-white [&.is-scrolled]:bg-paper/95 [&.is-scrolled]:text-[#f44d1a] [&.is-scrolled]:shadow-[0_1px_0_rgba(244,77,26,0.15)] [&.is-scrolled]:backdrop-blur",
        open && "bg-paper text-[#f44d1a]",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight" aria-label="Sintingale home">
          <LogoMark
            className={cn(
              "text-white [--logo-ink:#f44d1a] group-[.is-scrolled]:text-[#f44d1a] group-[.is-scrolled]:[--logo-ink:#fff]",
              open && "text-[#f44d1a] [--logo-ink:#fff]",
            )}
          />
          Sintingale
        </Link>
        <nav className="hidden items-center gap-8 text-[15px] font-medium md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="opacity-90 transition-opacity hover:opacity-100">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className={cn(
              "hidden h-11 items-center gap-1.5 rounded-full px-5 text-[15px] font-semibold transition-colors sm:inline-flex",
              "bg-cta text-cta-ink hover:opacity-90 group-[.is-scrolled]:bg-[#f44d1a] group-[.is-scrolled]:text-white",
            )}
          >
            Dashboard <ArrowUpRight className="size-4" aria-hidden />
          </Link>
          <ThemeToggle className="size-11 rounded-full text-current hover:bg-current/10 hover:text-current" />
          <button
            className="grid size-11 place-items-center rounded-full md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="border-t border-[#f44d1a]/15 bg-paper px-5 pb-6 pt-2 md:hidden" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center border-b border-[#f44d1a]/10 font-display text-xl font-semibold"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="mt-5 flex h-12 items-center justify-center rounded-full bg-[#f44d1a] font-semibold text-white"
          >
            Open dashboard
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
