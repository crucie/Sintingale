import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SettingsView } from "@/components/dashboard/SettingsView";
import { Skeleton } from "@/components/ui/Skeleton";
import { missingConfig, serverConfig } from "@/lib/config";
import { relayerAddress } from "@/lib/ledger";

export const metadata: Metadata = { title: "Settings" };

/** Reads secrets at request time only, so a deployment builds even before every variable is set. */
async function Settings() {
  await connection();
  const missing = missingConfig();
  if (missing.length) {
    return (
      <div role="alert" className="rounded-2xl border border-danger/40 bg-danger-soft p-5 text-sm text-fg">
        <p className="font-medium">Sintingale is not configured on this deployment.</p>
        <p className="mt-1 text-fg-muted">Set these environment variables and redeploy:</p>
        <ul className="mt-2 list-disc pl-5 font-mono text-xs">
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    );
  }
  const { apiKey } = serverConfig();
  return <SettingsView apiKeyHint={`${apiKey.slice(0, 6)}••••••••${apiKey.slice(-4)}`} relayer={relayerAddress()} />;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Settings />
    </Suspense>
  );
}
