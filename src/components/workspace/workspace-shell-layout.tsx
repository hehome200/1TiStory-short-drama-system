"use client";

import type { ReactNode } from "react";
import { WorkspaceShellProvider, useWorkspaceShell } from "@/components/workspace/workspace-shell-context";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { SettingsModal } from "@/components/workspace/settings-modal";
import { ImportDialog } from "@/components/workspace/import-dialog";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function WorkspaceShellSurface({ children }: { children: ReactNode }) {
  const { config, isSettingsOpen, setIsSettingsOpen, importDialogOpen, setImportDialogOpen } = useWorkspaceShell();
  const auraCount = config.auraCount ?? null;

  return (
    <div className="layout">
      <SidebarProvider defaultOpen={false}>
        <WorkspaceSidebar
          primaryItems={config.primaryItems}
          secondaryItems={config.secondaryItems}
          auraCount={auraCount}
        />
        <SidebarInset className="min-h-screen bg-background">
          <article className={cn("min-h-full w-full", config.contentClassName)} style={{
            borderTopLeftRadius: "var(--radius-xl)",
            borderBottomLeftRadius: "var(--radius-xl)",
            background: "linear-gradient(180deg, rgba(10, 11, 17, 0.99), rgba(6, 7, 11, 0.99)), repeating-linear-gradient(-35deg, rgba(255, 255, 255, 0.03) 0, rgba(255, 255, 255, 0.03) 2px, transparent 2px, transparent 10px)",
            backgroundColor: "#000",
          }}>
            {children}
          </article>
        </SidebarInset>
      </SidebarProvider>
      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <ImportDialog />
    </div>
  );
}

export function WorkspaceShellLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceShellProvider>
      <WorkspaceShellSurface>{children}</WorkspaceShellSurface>
    </WorkspaceShellProvider>
  );
}
