"use client";

import { useSearchParams } from "next/navigation";
import { OriginalStudioClient } from "@/components/workspace/original-studio-client";
import { RewriteStudioClient } from "@/components/workspace/rewrite-studio-client";

type EditorKind = "original" | "rewrite";

export function WorkspaceEditorRouteClient({ kind }: { kind: EditorKind }) {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? "";

  if (kind === "original") {
    return <OriginalStudioClient projectId={projectId} />;
  }

  if (kind === "rewrite") {
    return <RewriteStudioClient projectId={projectId} />;
  }

  return <OriginalStudioClient projectId={projectId} />;
}
