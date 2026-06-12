"use client";

import dynamic from "next/dynamic";

const RewriteStudioInner = dynamic(
  () =>
    import("@/components/workspace/rewrite-studio").then((mod) => mod.RewriteStudio),
  { ssr: false },
);

export function RewriteStudioClient({ projectId }: { projectId: string }) {
  return <RewriteStudioInner projectId={projectId} />;
}
