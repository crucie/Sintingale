"use client";

import { Check, Terminal } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { gsap, MOTION, useGSAP } from "@/lib/gsap";

const CODE: Array<Array<[string, "kw" | "str" | "fn" | "plain" | "dim"]>> = [
  [["import", "kw"], [" { Sintingale } ", "plain"], ["from", "kw"], [' "@sintingale/sdk"', "str"], [";", "plain"]],
  [],
  [["const", "kw"], [" gp = ", "plain"], ["new", "kw"], [" Sintingale", "fn"], ["({ baseUrl, apiKey });", "plain"]],
  [],
  [["// Is this customer entitled to Pro right now?", "dim"]],
  [["const", "kw"], [" active = ", "plain"], ["await", "kw"], [" gp.", "plain"], ["hasAccess", "fn"], ["({", "plain"]],
  [["  merchantId: ", "plain"], ['"m_123"', "str"], [",", "plain"]],
  [["  planId: ", "plain"], ['"pro"', "str"], [",", "plain"]],
  [["  customer: ", "plain"], ['"0xCustomer…"', "str"], [",", "plain"]],
  [["});", "plain"]],
  [],
  [["if", "kw"], [" (!active) ", "plain"], ["return", "kw"], [" res.", "plain"], ["redirect", "fn"], ["(checkoutUrl);", "plain"]],
];

const tone = {
  kw: "font-semibold",
  str: "underline decoration-[#f44d1a]/30 underline-offset-4",
  fn: "font-bold",
  plain: "",
  dim: "opacity-60 italic",
};

export function Developers() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION, () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: "[data-code]", start: "top 75%" } });
        tl.from("[data-code]", { y: 80, rotation: 2, autoAlpha: 0, duration: 1, ease: "power3.out" })
          .from("[data-code-line]", { x: -24, autoAlpha: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" }, "-=0.5")
          .from("[data-response]", { scale: 0.5, autoAlpha: 0, duration: 0.6, ease: "back.out(2.5)" });

        gsap.from("[data-dev-copy] > *", {
          y: 40,
          autoAlpha: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-dev-copy]", start: "top 80%" },
        });
      });
    },
    { scope: root },
  );

  return (
    <section id="developers" ref={root} className="scroll-mt-16 overflow-hidden flood-glow bg-flood px-5 py-28 text-white sm:px-8 sm:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <div data-dev-copy>
          <p className="text-lg font-semibold uppercase tracking-[0.2em] text-white/80">For developers</p>
          <h2 className="mt-4 font-display text-[clamp(2.6rem,6vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
            Your paywall is one line.
          </h2>
          <p className="mt-6 max-w-lg text-xl leading-relaxed text-white/90">
            The SDK wraps a single Arkiv query: an unexpired entitlement, for this plan and customer, written by the Sintingale relayer.
          </p>
          <ul className="mt-8 space-y-3 text-lg">
            {[
              "Filtered on $creator so look-alike entities are ignored",
              "No database to sync, no webhooks to retry",
              "REST endpoint for any language: GET /api/access",
            ].map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-cta text-cta-ink">
                  <Check className="size-4" aria-hidden />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <Link
            href="/demo"
            className="mt-10 inline-flex h-14 items-center rounded-full bg-cta px-7 text-lg font-semibold text-cta-ink transition-opacity hover:opacity-90"
          >
            See it unlock a page
          </Link>
        </div>

        <div className="relative">
          <div data-code className="rounded-[28px] bg-tile p-2 text-tile-ink shadow-[0_40px_80px_-20px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-2 px-4 py-3">
              <span className="size-3 rounded-full bg-[#f44d1a]" />
              <span className="size-3 rounded-full bg-[#f44d1a]/50" />
              <span className="size-3 rounded-full bg-[#f44d1a]/25" />
              <span className="ml-3 flex items-center gap-1.5 font-mono text-sm opacity-80">
                <Terminal className="size-4" aria-hidden /> server/paywall.ts
              </span>
            </div>
            <pre className="overflow-x-auto rounded-[22px] bg-[#f44d1a]/[0.06] p-6 font-mono text-[13px] leading-7 sm:text-sm">
              {CODE.map((line, i) => (
                <div key={i} data-code-line className="min-h-7 whitespace-pre">
                  {line.map(([text, t], j) => (
                    <span key={j} className={tone[t]}>
                      {text}
                    </span>
                  ))}
                </div>
              ))}
            </pre>
          </div>
          <div
            data-response
            className="absolute -bottom-6 right-4 rounded-2xl bg-tile px-5 py-3 font-mono text-base font-semibold text-tile-ink shadow-[0_20px_40px_-12px_rgba(0,0,0,0.35)] sm:-right-6"
          >
            {"→ { active: true }"}
          </div>
        </div>
      </div>
    </section>
  );
}
