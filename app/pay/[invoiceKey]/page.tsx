import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutCard } from "@/components/checkout/CheckoutCard";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Checkout" };

async function Checkout({ params }: { params: PageProps<"/pay/[invoiceKey]">["params"] }) {
  const { invoiceKey } = await params;
  return <CheckoutCard invoiceKey={invoiceKey} />;
}

export default function PayPage({ params }: PageProps<"/pay/[invoiceKey]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[480px] p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <Checkout params={params} />
    </Suspense>
  );
}
