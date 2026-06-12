import { Suspense } from "react";
import { WorkspaceLandingPageClient } from "@/components/workspace/workspace-landing-page-client";

export default function WorkspacePage() {
  return (
    <Suspense fallback={null}>
      <WorkspaceLandingPageClient />
    </Suspense>
  );
}
