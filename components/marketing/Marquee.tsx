"use client";

import { Sparkle } from "lucide-react";
import { useRef } from "react";
import { gsap, MOTION, ScrollTrigger, useGSAP } from "@/lib/gsap";

const ITEMS = ["USDT settlement", "Expiring invoices", "One-query access", "Non-custodial", "Verifiable receipts", "No cron jobs"];

export function Marquee() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION, () => {
        const loop = gsap.to("[data-track]", { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
        ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            const boost = Math.min(4, 1 + Math.abs(self.getVelocity()) / 600);
            gsap.to(loop, { timeScale: boost, duration: 0.3, overwrite: true });
            gsap.to(loop, { timeScale: 1, duration: 1.2, delay: 0.3 });
          },
        });
      });
    },
    { scope: root },
  );

  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden}>
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center gap-8 pr-8 font-display text-4xl font-bold tracking-tight sm:text-6xl">
          {item}
          <Sparkle className="size-8 fill-current sm:size-10" aria-hidden />
        </span>
      ))}
    </div>
  );

  return (
    <div ref={root} className="overflow-hidden border-y-2 border-[#f44d1a] bg-paper py-7 text-[#f44d1a]">
      <div data-track className="flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
