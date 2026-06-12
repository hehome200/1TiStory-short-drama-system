"use client";

import Link from "next/link";
import { useEffect } from "react";
import { WorkspaceFrame } from "@/components/workspace/workspace-frame";
import { useWorkspaceShell } from "@/components/workspace/workspace-shell-context";

export function SettingsPage() {
  const { setIsSettingsOpen } = useWorkspaceShell();

  useEffect(() => {
    setIsSettingsOpen(true);
  }, [setIsSettingsOpen]);

  return (
    <WorkspaceFrame
      primaryItems={[
        { key: "original", label: "剧本原创", href: "/workspace", icon: "original" },
        { key: "rewrite", label: "剧本改写", href: "/workspace/rewrite", icon: "rewrite" },
      ]}
      contentClassName="scrollbar-thin p-5 md:p-8"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/workspace"
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回工作台
          </Link>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
