"use client";

import { useState } from "react";
import { useWorkspaceShell } from "@/components/workspace/workspace-shell-context";
import { hydrateProjectsCache } from "@/lib/projects";

export function ImportDialog() {
  const { importDialogOpen, setImportDialogOpen, sessionUser } = useWorkspaceShell();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!importDialogOpen) return null;

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      await hydrateProjectsCache();
      setImportDialogOpen(false);
    } catch {
      setError("导入失败，请稍后重试");
    } finally {
      setImporting(false);
    }
  };

  const handleDismiss = () => {
    if (sessionUser) {
      localStorage.setItem(`sboard:legacyImportDismissed:${sessionUser.id}`, "1");
    }
    setImportDialogOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md p-6 rounded-xl bg-[var(--panel)] border border-[var(--line)]">
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
          检测到本地项目数据
        </h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          发现未导入的本地项目，是否导入到当前账号？导入后原有本地数据不会被删除。
        </p>

        {error && (
          <div className="mb-4 px-3 py-2 rounded bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleDismiss}
            disabled={importing}
            className="px-4 py-2 rounded bg-[var(--panel-soft)] text-[var(--muted)] text-sm hover:text-[var(--foreground)] transition-colors"
          >
            跳过
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {importing ? "导入中..." : "导入"}
          </button>
        </div>
      </div>
    </div>
  );
}
