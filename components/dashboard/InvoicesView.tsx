"use client";

import { FilePlus2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useInvoices } from "@/lib/client/hooks";
import { InvoiceTable } from "./InvoiceTable";

export function InvoicesView() {
  const invoices = useInvoices();
  return (
    <>
      <PageHeader
        title="Invoices"
        description="Paid means a relayer receipt exists. Pending invoices expire on their own."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => invoices.refetch()}
              loading={invoices.isFetching && !invoices.isLoading}
              icon={<RefreshCw className="size-4" aria-hidden />}
              aria-label="Refresh"
            >
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <ButtonLink href="/dashboard/invoices/new" icon={<FilePlus2 className="size-4" aria-hidden />}>
              Create invoice
            </ButtonLink>
          </div>
        }
      />
      <Card>
        <InvoiceTable
          invoices={invoices.data}
          loading={invoices.isLoading}
          error={invoices.error}
          onRetry={() => invoices.refetch()}
        />
      </Card>
    </>
  );
}
