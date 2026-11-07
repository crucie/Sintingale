import type { Metadata } from "next";
import { Suspense } from "react";
import { InviteLanding } from "@/components/org/InviteLanding";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Team invite" };

async function Landing({ params }: { params: PageProps<"/invite/[inviteKey]">["params"] }) {
  const { inviteKey } = await params;
  return <InviteLanding inviteKey={inviteKey} />;
}

export default function InvitePage({ params }: PageProps<"/invite/[inviteKey]">) {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-96" />}>
      <Landing params={params} />
    </Suspense>
  );
}
