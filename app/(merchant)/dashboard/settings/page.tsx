import type { Metadata } from "next";
import { SettingsView } from "@/components/dashboard/SettingsView";
import { serverConfig } from "@/lib/config";
import { relayerAddress } from "@/lib/ledger";

export const metadata: Metadata = { title: "Settings" };

const DEMO_KEY = "sn_test_demo_key";

export default function SettingsPage() {
  const cfg = serverConfig();
  const isDemoKey = cfg.apiKey === DEMO_KEY;
  return (
    <SettingsView
      apiKey={isDemoKey ? cfg.apiKey : `${cfg.apiKey.slice(0, 8)}••••••••${cfg.apiKey.slice(-4)}`}
      apiKeyIsDemo={isDemoKey}
      relayer={relayerAddress()}
      ledger={cfg.arkivEnabled && cfg.arkivPrivateKey ? "arkiv" : "memory"}
    />
  );
}
