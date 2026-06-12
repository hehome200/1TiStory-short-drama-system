import { Suspense } from "react";
import { WorkspaceEditorRouteClient } from "@/components/workspace/editor-route-client";

export default function OriginalEditorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">加载中...</div>}>
      <WorkspaceEditorRouteClient kind="original" />
    </Suspense>
  );
}
