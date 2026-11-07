import type { Metadata } from "next";
import { OrgOverview } from "@/components/org/OrgOverview";

export const metadata: Metadata = { title: "Organisation" };

export default function OrgPage() {
  return <OrgOverview />;
}
