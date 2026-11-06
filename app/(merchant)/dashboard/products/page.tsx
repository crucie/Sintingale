import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/AppShell";
import { PlanForm } from "@/components/product/PlanForm";
import { PlanList } from "@/components/product/PlanList";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <>
      <PageHeader title="Products" description="Prices your customers can pay. One-time or recurring." />
      <div className="space-y-6">
        <PlanForm />
        <PlanList />
      </div>
    </>
  );
}
