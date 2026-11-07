import type { Metadata } from "next";
import { Suspense } from "react";
import { ShareEditorPage } from "@/components/org/ShareEditor";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Share editor" };

async function Editor({ params }: { params: PageProps<"/dashboard/projects/[id]/shares">["params"] }) {
  const { id } = await params;
  return <ShareEditorPage projectId={id} />;
}

export default function SharesPage({ params }: PageProps<"/dashboard/projects/[id]/shares">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Editor params={params} />
    </Suspense>
  );
}
