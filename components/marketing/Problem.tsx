"use client";

import { Code2, FileQuestion, Globe, Percent } from "lucide-react";
import { useRef } from "react";
import { gsap, MOTION, ScrollTrigger, useGSAP } from "@/lib/gsap";

const PAINS = [
  { icon: Percent, title: "High fees, no stablecoins", body: "Card rails take their cut and treat USDT like a foreign object." },
  { icon: Globe, title: "Regional walls", body: "Whole markets are blocked at onboarding before you write a line of code." },
  { icon: FileQuestion, title: "Receipts you can't verify", body: "Your processor's database is the only source of truth. Customers have to trust it." },
  { icon: Code2, title: "DIY crypto billing", body: "Checkout, invoice tracking and subscription state take weeks to build right." },
];

export function Problem() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION, () => {
        gsap.from("[data-heading] > *", {
          y: 60,
          autoAlpha: 0,
          duration: 1,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-heading]", start: "top 80%" },
        });
        gsap.set("[data-pain]", { y: 70, autoAlpha: 0 });
        ScrollTrigger.batch("[data-pain]", {
          start: "top 85%",
          onEnter: (els) => gsap.to(els, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.12, ease: "power3.out", overwrite: true }),
        });
        gsap.fromTo(
          "[data-strike]",
          { scaleX: 0 },
          { scaleX: 1, ease: "none", scrollTrigger: { trigger: "[data-heading]", start: "top 70%", end: "top 35%", scrub: true } },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="bg-paper px-5 py-28 text-[#f44d1a] sm:px-8 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <div data-heading className="max-w-4xl">
          <p className="text-lg font-semibold uppercase tracking-[0.2em]">The problem</p>
          <h2 className="mt-4 font-display text-[clamp(2.6rem,6vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
            <span className="relative inline-block">
              Stripe
              <span data-strike aria-hidden className="absolute left-0 top-[55%] h-[0.12em] w-full origin-left bg-[#f44d1a]" />
            </span>{" "}
            wasn&apos;t built for indie, regional and crypto-native SaaS.
          </h2>
        </div>
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PAINS.map((p) => (
            <article
              key={p.title}
              data-pain
              className="group rounded-[28px] border-2 border-[#f44d1a] p-7 transition-colors duration-300 hover:bg-[#f44d1a] hover:text-white"
            >
              <p.icon className="size-9" strokeWidth={2.2} aria-hidden />
              <h3 className="mt-8 font-display text-2xl font-bold leading-tight">{p.title}</h3>
              <p className="mt-3 text-lg leading-relaxed opacity-90">{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
