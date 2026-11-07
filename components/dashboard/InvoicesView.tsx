"use client";

import { Download, FilePlus2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useInvoices } from "@/lib/client/hooks";
import { publicConfig } from "@/lib/config";
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
            <a
              href={`/api/invoices/export?merchantId=${publicConfig.merchantId}`}
              download
              className={buttonClass("outline")}
              aria-label="Export paid invoices as CSV"
            >
              <Download className="size-4" aria-hidden />
              <span className="hidden sm:inline">Export CSV</span>
            </a>
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
