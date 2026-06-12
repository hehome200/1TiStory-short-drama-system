"use client";

import Link from "next/link";
import { useState } from "react";
import { useWorkspaceShell } from "@/components/workspace/workspace-shell-context";
import { CreationDirectionModal } from "@/components/creation-direction-modal";

export default function TopNav() {
  const { sessionUser, setIsSettingsOpen } = useWorkspaceShell();
  const [creationModalOpen, setCreationModalOpen] = useState(false);

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-inner">
          <Link href="/" className="brand">
            以太内容实验室
          </Link>
          <nav className="top-links" aria-label="top navigation">
            <button
              onClick={() => setCreationModalOpen(true)}
              className="top-link"
            >
              工作台
            </button>
            <Link href="/account" className="top-link">
              账户中心
            </Link>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="top-link"
            >
              设置
            </button>
            <a
              href="https://github.com/hehome200/1TiStory"
              target="_blank"
              rel="noopener noreferrer"
              className="top-link"
            >
              帮助
            </a>
            <span className="top-link text-[var(--muted)]">
              {sessionUser?.email ?? sessionUser?.name ?? "本地使用者"}
            </span>
          </nav>
        </div>
      </header>

      {/* Creation Direction Modal */}
      <CreationDirectionModal
        open={creationModalOpen}
        onClose={() => setCreationModalOpen(false)}
      />
    </>
  );
}
