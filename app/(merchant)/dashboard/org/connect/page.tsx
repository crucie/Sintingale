import type { Metadata } from "next";
import { ConnectOrg } from "@/components/org/ConnectOrg";

export const metadata: Metadata = { title: "Link an ENS name" };

export default function ConnectOrgPage() {
  return <ConnectOrg />;
}
