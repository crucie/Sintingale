"use client";

import { ArrowRight, BadgeCheck, Check, Database, Play, Timer, Wallet } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { gsap, MOTION, REDUCED, useGSAP } from "@/lib/gsap";

const LINES = [["Get", "paid", "in", "USDT."], ["Skip", "Stripe."]];

function CheckoutMock() {
  return (
    <div data-card className="relative w-full max-w-[380px] rounded-[28px] bg-tile p-6 text-tile-ink shadow-[0_40px_80px_-20px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#f44d1a] font-display text-lg font-bold text-white">A</span>
        <div>
          <p className="text-sm font-semibold">Acme Analytics</p>
          <p className="font-mono text-xs opacity-70">inv_9f2a1c</p>
        </div>
      </div>
      <p className="mt-6 text-sm font-medium opacity-80">Pro Plan, monthly</p>
      <p className="font-display text-5xl font-bold tracking-tight">
        10.00<span className="ml-2 text-lg font-semibold opacity-70">USDT</span>
      </p>
      <div className="mt-5 space-y-2.5 rounded-2xl bg-[#f44d1a]/[0.07] p-4 text-sm">
        {["Approve USDT", "Pay on Whitechain", "Receipt on Arkiv"].map((s) => (
          <p key={s} data-step className="flex items-center gap-2 font-medium">
            <span className="grid size-5 place-items-center rounded-full bg-[#f44d1a] text-white">
              <Check className="size-3" aria-hidden />
            </span>
            {s}
          </p>
        ))}
      </div>
      <div className="mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#f44d1a] font-semibold text-white">
        <Wallet className="size-4" aria-hidden /> Pay with wallet
      </div>
    </div>
  );
}

function Chip({ icon, children, className }: { icon: React.ReactNode; children: React.ReactNode; className: string }) {
  return (
    <div
      data-chip
      className={`absolute flex items-center gap-2 rounded-full bg-tile px-4 py-2.5 text-sm font-semibold text-tile-ink shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] ${className}`}
    >
      {icon}
      {children}
    </div>
  );
}

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION, () => {
        gsap.set("[data-hero]", { autoAlpha: 1 });
        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
        tl.from("[data-pill]", { y: 20, autoAlpha: 0, duration: 0.6 })
          .from("[data-word]", { yPercent: 115, duration: 1.1, stagger: 0.07 }, "-=0.3")
          .from("[data-sub]", { y: 24, autoAlpha: 0, duration: 0.8 }, "-=0.7")
          .from("[data-cta] > *", { y: 20, autoAlpha: 0, duration: 0.6, stagger: 0.1 }, "-=0.6")
          .from("[data-card]", { y: 80, rotation: 6, autoAlpha: 0, duration: 1.2 }, "-=1")
          .from("[data-step]", { x: -16, autoAlpha: 0, duration: 0.5, stagger: 0.15 }, "-=0.5")
          .from("[data-chip]", { scale: 0.6, autoAlpha: 0, duration: 0.7, stagger: 0.15, ease: "back.out(2)" }, "-=0.6");

        gsap.to("[data-chip]", {
          y: (i) => (i % 2 ? 10 : -10),
          duration: 2.4,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: 0.4,
          delay: 2,
        });

        gsap.to("[data-visual]", {
          yPercent: -12,
          rotation: -3,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 1 },
        });
        gsap.to("[data-copy]", {
          yPercent: 18,
          autoAlpha: 0.2,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to("[data-ring]", { rotation: 360, duration: 60, ease: "none", repeat: -1 });
      });
      mm.add(REDUCED, () => {
        gsap.set("[data-hero]", { autoAlpha: 1 });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="flood-glow relative overflow-hidden bg-flood text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12] dark:opacity-[0.05] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div
        data-ring
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 size-[640px] rounded-full border-[56px] border-white/10 border-dashed dark:border-[#f44d1a]/20"
      />

      <div data-hero className="invisible relative mx-auto grid min-h-dvh max-w-7xl items-center gap-14 px-5 pb-20 pt-28 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-24">
        <div data-copy>
          <p data-pill className="inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-sm font-medium">
            <span className="size-2 rounded-full bg-white" /> ETHGlobal Mumbai · Whitechain × Arkiv
          </p>
          <h1 className="mt-6 font-display text-[clamp(3.2rem,9vw,6.5rem)] font-extrabold leading-[0.92] tracking-[-0.04em] lg:text-[clamp(4rem,6.4vw,6.5rem)]">
            {LINES.map((line, li) => (
              <span key={li} className="block">
                {line.map((word) => (
                  <span key={word} className="mr-[0.22em] inline-block overflow-hidden pb-[0.08em] align-bottom">
                    <span data-word className={word === "USDT." ? "inline-block dark:text-[#f44d1a]" : "inline-block"}>
                      {word}
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <p data-sub className="mt-7 max-w-xl text-xl leading-relaxed text-white/90">
            Sintingale is drop-in billing for SaaS: checkout links, invoices and subscriptions settled in USDT on
            Whitechain, with every receipt living on Arkiv as a queryable, self-expiring record.
          </p>
          <div data-cta className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-cta px-7 text-lg font-semibold text-cta-ink transition-opacity hover:opacity-90"
            >
              Start accepting USDT <ArrowRight className="size-5" aria-hidden />
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-white/70 px-7 text-lg font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Play className="size-4 fill-current" aria-hidden /> Try the live demo
            </Link>
          </div>
        </div>

        <div data-visual className="relative mx-auto flex w-full max-w-md justify-center py-10">
          <CheckoutMock />
          <Chip icon={<Database className="size-4" aria-hidden />} className="-left-2 top-0 sm:-left-10">
            Receipt written to Arkiv
          </Chip>
          <Chip icon={<BadgeCheck className="size-4" aria-hidden />} className="-right-2 top-1/2 sm:-right-12">
            hasAccess() → true
          </Chip>
          <Chip icon={<Timer className="size-4" aria-hidden />} className="bottom-0 left-4 sm:-left-6">
            Entitlement expires in 30d
          </Chip>
        </div>
      </div>
    </section>
  );
}
