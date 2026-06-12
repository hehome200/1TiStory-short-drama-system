"use client";

import dynamic from "next/dynamic";

export const RewriteListPageClient = dynamic(
  () =>
    import("@/components/workspace/rewrite-list-page").then((mod) => mod.RewriteListPage),
  { ssr: false },
);
