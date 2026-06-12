"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  exportDocument,
  downloadExportedWordDocument,
  ALL_EXPORT_SECTIONS,
  EXPORT_SECTION_LABELS,
  type ExportSection,
} from "@/lib/original/export/templates/export-document.template";
import type { OriginalDraft } from "@/lib/types";

type ExportProjectPopoverProps = {
  draft: OriginalDraft;
  projectTitle: string;
  className?: string;
};

function calcPanelStyle(trigger: HTMLElement | null): CSSProperties {
  if (!trigger) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const rect = trigger.getBoundingClientRect();
  const panelW = 300;
  const gap = 8;

  let left = rect.right - panelW;
  if (left < 8) left = 8;
  if (left + panelW > window.innerWidth - 8) {
    left = window.innerWidth - panelW - 8;
  }

  const panelH = 400;
  const spaceBelow = window.innerHeight - rect.bottom;
  if (spaceBelow >= panelH + gap) {
    return { left: `${left}px`, top: `${rect.bottom + gap}px` };
  }
  return { left: `${left}px`, bottom: `${window.innerHeight - rect.top + gap}px` };
}

export function ExportProjectPopover({
  draft,
  projectTitle,
  className,
}: ExportProjectPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ExportSection[]>([...ALL_EXPORT_SECTIONS]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const timer = setTimeout(
      () => document.addEventListener("mousedown", handler),
      0,
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  // Close on scroll
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("scroll", handler, { passive: true, capture: true });
    return () =>
      window.removeEventListener("scroll", handler, { capture: true });
  }, [open]);

  const safeTitle = (projectTitle || "未命名项目").replace(
    /[\\/:*?"<>|]/g,
    "_",
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!open) setSelected([...ALL_EXPORT_SECTIONS]);
          setOpen((v) => !v);
        }}
        className={className}
        title="整体导出"
      >
        <svg
          className="h-3.5 w-3.5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span>整体导出</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              zIndex: 60,
              width: 300,
              ...calcPanelStyle(triggerRef.current),
            }}
            className="rounded-2xl border border-white/10 bg-[#18181b] p-5 shadow-2xl shadow-black/40"
          >
            <h3 className="text-base font-semibold text-white">
              整体导出
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              选择需要导出的板块内容，将生成 Word 文件下载。
            </p>

            <div className="mt-4 space-y-2">
              {/* 全选 */}
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 px-3 py-2 hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={selected.length === ALL_EXPORT_SECTIONS.length}
                  onChange={() =>
                    setSelected(
                      selected.length === ALL_EXPORT_SECTIONS.length
                        ? []
                        : [...ALL_EXPORT_SECTIONS],
                    )
                  }
                  className="h-3.5 w-3.5 accent-cyan-400"
                />
                <span className="text-sm font-medium text-white">全选</span>
              </label>

              {ALL_EXPORT_SECTIONS.map((section) => (
                <label
                  key={section}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-white/10 px-3 py-2 hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(section)}
                    onChange={() =>
                      setSelected((prev) =>
                        prev.includes(section)
                          ? prev.filter((s) => s !== section)
                          : [...prev, section],
                      )
                    }
                    className="h-3.5 w-3.5 accent-cyan-400"
                  />
                  <span className="text-sm text-slate-300">
                    {EXPORT_SECTION_LABELS[section]}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selected.length === 0) return;
                  const md = exportDocument(draft, selected);
                  const filename = `${safeTitle}-整体导出.doc`;
                  downloadExportedWordDocument(md, filename);
                  setOpen(false);
                }}
                disabled={selected.length === 0}
                className="flex-1 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-40"
              >
                确认导出
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
