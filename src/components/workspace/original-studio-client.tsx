"use client";

import dynamic from "next/dynamic";

const OriginalStudioInner = dynamic(
  () =>
    import("@/components/workspace/original-studio").then((mod) => mod.OriginalStudio),
  { ssr: false },
);

export function OriginalStudioClient({ projectId }: { projectId: string }) {
  return <OriginalStudioInner projectId={projectId} />;
}
