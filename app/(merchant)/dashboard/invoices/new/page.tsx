import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { CreateInvoiceForm } from "@/components/dashboard/CreateInvoiceForm";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Create invoice" };

async function FormWithPlan({ searchParams }: { searchParams: PageProps<"/dashboard/invoices/new">["searchParams"] }) {
  const { plan } = await searchParams;
  return <CreateInvoiceForm initialPlanId={typeof plan === "string" ? plan : undefined} />;
}

export default function NewInvoicePage({ searchParams }: PageProps<"/dashboard/invoices/new">) {
  return (
    <>
      <PageHeader
        title="Create invoice"
        description="Writes an invoice entity that expires at its due date plus a short grace period."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <FormWithPlan searchParams={searchParams} />
      </Suspense>
    </>
  );
}
