import type { Metadata } from "next";
import { InvoicesView } from "@/components/dashboard/InvoicesView";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return <InvoicesView />;
}
