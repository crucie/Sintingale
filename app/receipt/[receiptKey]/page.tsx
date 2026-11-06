import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyPanel } from "@/components/receipt/VerifyPanel";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Receipt" };

async function Receipt({ params }: { params: PageProps<"/receipt/[receiptKey]">["params"] }) {
  const { receiptKey } = await params;
  return <VerifyPanel receiptKey={receiptKey} />;
}

export default function ReceiptPage({ params }: PageProps<"/receipt/[receiptKey]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-2xl p-6">
          <Skeleton className="h-[480px] w-full" />
        </div>
      }
    >
      <Receipt params={params} />
    </Suspense>
  );
}
