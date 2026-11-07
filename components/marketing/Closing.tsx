"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";

export function Closing() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION, () => {
        gsap.from("[data-cta-word]", {
          yPercent: 110,
          duration: 1,
          stagger: 0.06,
          ease: "power4.out",
          scrollTrigger: { trigger: "[data-cta-title]", start: "top 80%" },
        });
        gsap.fromTo(
          "[data-cta-blob]",
          { scale: 0.6 },
          { scale: 1.15, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true } },
        );
      });
    },
    { scope: root },
  );

  const words = "Ship billing before the demo starts.".split(" ");

  return (
    <>
      <section ref={root} className="relative overflow-hidden bg-paper px-5 py-32 text-[#f44d1a] sm:px-8 sm:py-44">
        <div
          data-cta-blob
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f44d1a]/[0.06] dark:bg-[#f44d1a]/[0.12]"
        />
        <div className="relative mx-auto max-w-5xl text-center">
          <h2 data-cta-title className="font-display text-[clamp(3rem,8vw,7rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
            {words.map((w, i) => (
              <span key={i} className="mr-[0.2em] inline-block overflow-hidden pb-[0.08em] align-bottom">
                <span data-cta-word className="inline-block">
                  {w}
                </span>
              </span>
            ))}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-xl leading-relaxed">
            Create a product, share the link, watch the receipt land on Arkiv. It takes about a minute.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard/products"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#f44d1a] px-8 text-lg font-semibold text-white transition-transform hover:scale-[1.03]"
            >
              Create your first product <ArrowRight className="size-5" aria-hidden />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-14 items-center justify-center rounded-full border-2 border-[#f44d1a] px-8 text-lg font-semibold transition-colors hover:bg-[#f44d1a] hover:text-white"
            >
              Open the dashboard
            </Link>
          </div>
        </div>
      </section>

      <footer className="flood-glow bg-flood px-5 py-14 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 font-display text-2xl font-bold">
              <LogoMark className="text-white [--logo-ink:#f44d1a]" /> Sintingale
            </p>
            <p className="mt-3 max-w-sm text-lg text-white/90">Money on Whitechain. State on Arkiv. Access is a query.</p>
          </div>
          <nav className="grid grid-cols-2 gap-x-12 gap-y-3 text-base font-medium sm:grid-cols-3" aria-label="Footer">
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <Link href="/dashboard/invoices" className="hover:underline">Invoices</Link>
            <Link href="/demo" className="hover:underline">Example app</Link>
            <Link href="#how" className="hover:underline">How it works</Link>
            <Link href="#developers" className="hover:underline">Developers</Link>
            <Link href="#features" className="hover:underline">Features</Link>
          </nav>
        </div>
        <p className="mx-auto mt-12 max-w-7xl border-t border-white/30 pt-6 text-sm text-white/80">
          Built for ETHGlobal Mumbai · Testnet only · Whitechain Sepolia & Arkiv
        </p>
      </footer>
    </>
  );
}
