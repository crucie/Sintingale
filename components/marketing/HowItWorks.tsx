"use client";

import { FilePlus2, Fingerprint, LockOpen, Wallet } from "lucide-react";
import { useRef } from "react";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";

const STEPS = [
  { icon: FilePlus2, title: "Create", body: "Merchant creates “Pro Plan, 10 USDT” and gets a checkout link and QR in seconds." },
  { icon: Wallet, title: "Pay", body: "Customer opens the link on any phone, approves USDT and calls payInvoice() on Whitechain." },
  { icon: Fingerprint, title: "Record", body: "The relayer sees the Paid event and writes a receipt plus a period-long entitlement to Arkiv." },
  { icon: LockOpen, title: "Unlock", body: "Your backend calls hasAccess(). One query. When the period ends, access lapses by itself." },
];

export function HowItWorks() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { motion: MOTION, desktop: "(min-width: 1024px)" },
        (ctx) => {
          const { motion, desktop } = ctx.conditions as { motion: boolean; desktop: boolean };
          if (!motion) return;
          gsap.fromTo(
            "[data-rail]",
            desktop ? { scaleX: 0 } : { scaleY: 0 },
            {
              ...(desktop ? { scaleX: 1 } : { scaleY: 1 }),
              ease: "none",
              scrollTrigger: { trigger: "[data-steps]", start: "top 70%", end: "bottom 60%", scrub: true },
            },
          );
          gsap.utils.toArray<HTMLElement>("[data-step]").forEach((step) => {
            gsap.from(step, {
              y: 50,
              autoAlpha: 0,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: { trigger: step, start: "top 82%" },
            });
            gsap.from(step.querySelector("[data-dot]"), {
              scale: 0,
              duration: 0.6,
              ease: "back.out(3)",
              scrollTrigger: { trigger: step, start: "top 75%" },
            });
          });
          gsap.from("[data-how-title]", {
            y: 60,
            autoAlpha: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: "[data-how-title]", start: "top 85%" },
          });
        },
      );
    },
    { scope: root },
  );

  return (
    <section id="how" ref={root} className="scroll-mt-16 bg-paper px-5 py-28 text-[#f44d1a] sm:px-8 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <div data-how-title className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h2 className="max-w-3xl font-display text-[clamp(2.6rem,6vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
            From link to unlocked in four moves.
          </h2>
          <p className="max-w-sm text-xl leading-relaxed">No processor account, no webhook plumbing, no cron to revoke access.</p>
        </div>

        <div data-steps className="relative mt-20">
          <div aria-hidden className="absolute left-[27px] top-0 h-full w-1 rounded-full bg-[#f44d1a]/15 lg:left-0 lg:top-[27px] lg:h-1 lg:w-full">
            <div data-rail className="absolute inset-0 origin-top rounded-full bg-[#f44d1a] lg:origin-left" />
          </div>
          <ol className="relative grid gap-14 lg:grid-cols-4 lg:gap-8">
            {STEPS.map((s, i) => (
              <li key={s.title} data-step className="flex gap-6 lg:block">
                <span
                  data-dot
                  className="grid size-14 shrink-0 place-items-center rounded-full border-4 border-paper bg-[#f44d1a] text-white shadow-[0_0_0_2px_#f44d1a]"
                >
                  <s.icon className="size-6" aria-hidden />
                </span>
                <div className="lg:mt-8">
                  <p className="font-mono text-base font-semibold">0{i + 1}</p>
                  <h3 className="mt-1 font-display text-4xl font-extrabold tracking-tight">{s.title}</h3>
                  <p className="mt-3 text-lg leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
