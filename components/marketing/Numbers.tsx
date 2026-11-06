"use client";

import { useRef } from "react";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";

const STATS = [
  { value: 0, prefix: "", suffix: "", label: "cron jobs to revoke access" },
  { value: 1, prefix: "", suffix: "", label: "query to check entitlement" },
  { value: 1, prefix: "~", suffix: "s", label: "Whitechain block time" },
  { value: 100, prefix: "", suffix: "%", label: "of funds forwarded in-tx" },
];

export function Numbers() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION, () => {
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const target = Number(el.dataset.count);
          const counter = { v: target === 0 ? 9 : 0 };
          gsap.to(counter, {
            v: target,
            duration: 1.6,
            ease: "power2.out",
            snap: { v: 1 },
            scrollTrigger: { trigger: el, start: "top 85%" },
            onUpdate: () => {
              el.textContent = String(counter.v);
            },
          });
        });
        gsap.from("[data-stat]", {
          y: 40,
          autoAlpha: 0,
          stagger: 0.12,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 75%" },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="flood-glow bg-flood px-5 py-24 text-white sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} data-stat className="border-t-2 border-white/40 pt-6">
            <p className="font-display text-[clamp(4rem,9vw,7rem)] font-extrabold leading-none tracking-[-0.05em] tabular-nums dark:text-[#f44d1a] lg:text-[clamp(4rem,6vw,6rem)]">
              {s.prefix}
              <span data-count={s.value}>{s.value}</span>
              {s.suffix}
            </p>
            <p className="mt-3 text-lg font-medium text-white/90">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
