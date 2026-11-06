"use client";

import { Coins, Database, KeyRound } from "lucide-react";
import { useRef } from "react";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";

const LINES = [
  {
    icon: Coins,
    lead: "Money moves",
    tail: "on Whitechain.",
    body: "Customers pay USDT through a non-custodial PaymentRouter. Funds hit your payout address in the same transaction.",
  },
  {
    icon: Database,
    lead: "State lives",
    tail: "on Arkiv.",
    body: "Invoices, receipts and entitlements are attribute-indexed entities you can query directly. No indexer, no private database.",
  },
  {
    icon: KeyRound,
    lead: "Access is",
    tail: "a query.",
    body: "An unexpired entitlement grants access. When the billing period ends, it expires on its own. No cron jobs, no webhooks.",
  },
];

export function Principle() {
  const root = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`${MOTION} and (min-width: 1024px)`, () => {
        const lines = gsap.utils.toArray<HTMLElement>("[data-line]");
        const panels = gsap.utils.toArray<HTMLElement>("[data-panel]");
        gsap.set(lines, { opacity: 0.25 });
        gsap.set(panels, { autoAlpha: 0, y: 40 });
        gsap.set(lines[0], { opacity: 1 });
        gsap.set(panels[0], { autoAlpha: 1, y: 0 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pinRef.current,
            start: "top top",
            end: "+=220%",
            pin: true,
            scrub: 0.8,
            snap: { snapTo: [0, 0.5, 1], duration: 0.4, ease: "power1.inOut" },
          },
        });
        lines.slice(1).forEach((line, i) => {
          tl.to(lines[i], { opacity: 0.25, duration: 0.5 }, i)
            .to(panels[i], { autoAlpha: 0, y: -40, duration: 0.5 }, i)
            .to(line, { opacity: 1, duration: 0.5 }, i + 0.1)
            .to(panels[i + 1], { autoAlpha: 1, y: 0, duration: 0.5 }, i + 0.2);
        });
        tl.fromTo("[data-progress]", { scaleY: 0 }, { scaleY: 1, ease: "none", duration: 2 }, 0);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="flood-glow bg-flood text-white">
      <div ref={pinRef} className="mx-auto flex min-h-dvh max-w-7xl flex-col justify-center gap-14 px-5 py-24 sm:px-8 lg:flex-row lg:items-center lg:gap-20">
        <div className="relative flex-1">
          <p className="mb-8 text-lg font-semibold uppercase tracking-[0.2em] text-white/80">The design principle</p>
          <div className="flex gap-6">
            <div aria-hidden className="relative hidden w-1 rounded-full bg-white/20 lg:block">
              <div data-progress className="absolute inset-0 origin-top rounded-full bg-white dark:bg-[#f44d1a]" />
            </div>
            <div className="space-y-4">
              {LINES.map((l) => (
                <p
                  key={l.lead}
                  data-line
                  className="font-display text-[clamp(2.5rem,6vw,5.25rem)] font-extrabold leading-[0.98] tracking-[-0.035em]"
                >
                  {l.lead} <span className="block sm:inline">{l.tail}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
        <div className="relative grid flex-1 gap-5 lg:block lg:h-80">
          {LINES.map((l) => (
            <div
              key={l.lead}
              data-panel
              className="rounded-[28px] bg-tile p-8 text-tile-ink lg:absolute lg:inset-x-0 lg:top-0"
            >
              <l.icon className="size-10" strokeWidth={2.2} aria-hidden />
              <p className="mt-6 font-display text-3xl font-bold">
                {l.lead} {l.tail}
              </p>
              <p className="mt-3 text-lg leading-relaxed">{l.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
