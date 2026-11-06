"use client";

import { Activity, Fuel, Hourglass, Landmark, ShieldCheck, TimerOff } from "lucide-react";
import { useRef } from "react";
import { gsap, MOTION, ScrollTrigger, useGSAP } from "@/lib/gsap";

const FEATURES = [
  { icon: Hourglass, title: "Invoices that clean up after themselves", body: "Unpaid invoices expire at their due date plus a short grace period. Nothing to garbage-collect." },
  { icon: TimerOff, title: "Entitlements that lapse", body: "An entitlement lives exactly one billing period. Stop paying and access simply ends." },
  { icon: ShieldCheck, title: "Verifiable receipts", body: "A public receipt page checks the Arkiv record against the Whitechain Paid event, field by field." },
  { icon: Landmark, title: "Non-custodial router", body: "The PaymentRouter never holds a balance and rejects double payments for the same invoice." },
  { icon: Activity, title: "Live merchant dashboard", body: "Paid, pending and expired invoices, revenue and active customers, queried straight from Arkiv." },
  { icon: Fuel, title: "Sponsored gas (next)", body: "Customers sign, the relayer pays WBT gas. Your customers never need the gas token." },
];

export function Features() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION, () => {
        gsap.from("[data-feat-title]", {
          y: 60,
          autoAlpha: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-feat-title]", start: "top 85%" },
        });
        gsap.set("[data-feature]", { y: 60, autoAlpha: 0, rotation: 1.5 });
        ScrollTrigger.batch("[data-feature]", {
          start: "top 88%",
          onEnter: (els) =>
            gsap.to(els, { y: 0, rotation: 0, autoAlpha: 1, duration: 0.9, stagger: 0.1, ease: "power3.out", overwrite: true }),
        });
      });
    },
    { scope: root },
  );

  return (
    <section id="features" ref={root} className="scroll-mt-16 bg-paper px-5 py-28 text-[#f44d1a] sm:px-8 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <h2 data-feat-title className="max-w-4xl font-display text-[clamp(2.6rem,6vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
          Billing primitives, not a black box.
        </h2>
        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              data-feature
              className={
                i % 3 === 1
                  ? "rounded-[28px] bg-[#f44d1a] p-8 text-white"
                  : "rounded-[28px] border-2 border-[#f44d1a] p-8"
              }
            >
              <f.icon className="size-10" strokeWidth={2.2} aria-hidden />
              <h3 className="mt-10 font-display text-2xl font-bold leading-tight">{f.title}</h3>
              <p className="mt-3 text-lg leading-relaxed opacity-90">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
