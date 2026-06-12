import type { ReactNode } from "react";
import { WorkspaceShellLayout } from "@/components/workspace/workspace-shell-layout";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShellLayout>{children}</WorkspaceShellLayout>;
}
