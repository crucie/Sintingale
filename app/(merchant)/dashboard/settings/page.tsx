import type { Metadata } from "next";
import { SettingsView } from "@/components/dashboard/SettingsView";
import { serverConfig } from "@/lib/config";
import { relayerAddress } from "@/lib/ledger";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  const { apiKey } = serverConfig();
  return <SettingsView apiKeyHint={`${apiKey.slice(0, 6)}••••••••${apiKey.slice(-4)}`} relayer={relayerAddress()} />;
}
