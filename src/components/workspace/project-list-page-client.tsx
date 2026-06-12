"use client";

import dynamic from "next/dynamic";

export const ProjectListPageClient = dynamic(
  () =>
    import("@/components/workspace/project-list-page").then((mod) => mod.ProjectListPage),
  { ssr: false },
);
