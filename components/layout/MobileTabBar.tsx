"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTeamsEnabled } from "@/lib/client/org";
import { cn } from "@/lib/format";
import { isActive, tabsFor } from "./nav";

export function MobileTabBar() {
  const pathname = usePathname();
  const tabs = tabsFor(useTeamsEnabled() === true);
  return (
    <nav
      aria-label="Dashboard tabs"
      className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-4 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {tabs.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
              active ? "text-brand" : "text-fg-muted",
            )}
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
