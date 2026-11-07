import type { Metadata } from "next";
import { EarningsView } from "@/components/org/EarningsView";

export const metadata: Metadata = { title: "Your earnings" };

export default function EarningsPage() {
  return <EarningsView />;
}
