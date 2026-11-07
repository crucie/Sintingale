import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectDetail } from "@/components/org/ProjectDetail";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Project" };

async function Detail({ params }: { params: PageProps<"/dashboard/projects/[id]">["params"] }) {
  const { id } = await params;
  return <ProjectDetail projectId={id} />;
}

export default function ProjectPage({ params }: PageProps<"/dashboard/projects/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Detail params={params} />
    </Suspense>
  );
}
