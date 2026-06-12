"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScriptThinkingPanelProps {
  reasoningText: string | undefined;
  isGenerating: boolean;
  episodeNumber: number;
  floating?: boolean;
}

export function ScriptThinkingPanel({
  reasoningText,
  isGenerating,
  episodeNumber,
  floating = false,
}: ScriptThinkingPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasContent = Boolean(reasoningText?.trim());

  // Auto-scroll when generating
  useEffect(() => {
    if (isGenerating && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [reasoningText, isGenerating]);

  // Auto-expand when generating or has content
  useEffect(() => {
    if (isGenerating || hasContent) {
      setCollapsed(false);
    }
  }, [isGenerating, hasContent]);

  const handleCopy = async () => {
    if (!reasoningText?.trim()) return;
    try {
      await navigator.clipboard.writeText(reasoningText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  // Floating collapsed state: show a small toggle button
  if (floating && collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        title="展开生成思路"
        className="absolute right-0 top-0 z-10 rounded-lg border border-cyan-400/30 bg-slate-950/90 backdrop-blur px-2.5 py-1 text-[11px] text-cyan-200/70 hover:text-cyan-100 hover:border-cyan-400/50 transition"
      >
        {isGenerating ? "⏳ 思考中…" : "💭 思路"}
      </button>
    );
  }

  return (
    <div className={`shrink-0 rounded-lg border border-white/10 bg-slate-950/90 backdrop-blur overflow-hidden ${
      floating ? "absolute right-0 top-0 z-10 w-[440px] shadow-lg shadow-black/30" : ""
    }`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.02] transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-cyan-100/80">生成思路</span>
          <span className="text-[10px] text-slate-500 truncate">模型真实 thinking 记录</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isGenerating && (
            <span className="text-[10px] text-cyan-300/60 animate-pulse">
              正在思考中…
            </span>
          )}
          {hasContent && (
            <span className="text-[10px] text-slate-600">
              第 {episodeNumber} 集
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-slate-500 transition-transform ${collapsed ? "" : "rotate-180"}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-3 pb-3">
          {hasContent ? (
            <>
              {/* Copy button */}
              <div className="flex items-center justify-end mb-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy();
                  }}
                  className="rounded-md border border-cyan-300/10 px-2 py-0.5 text-[10px] text-slate-500 hover:text-slate-400 hover:bg-white/3 transition"
                >
                  {copied ? "已复制" : "复制思路"}
                </button>
              </div>
              {/* Content */}
              <div className="rounded-lg border border-white/6 bg-slate-950/60">
                <ScrollArea className="h-[160px]">
                  <div
                    ref={scrollRef}
                    className="px-2.5 py-2 text-[11px] leading-5 text-slate-300 whitespace-pre-wrap break-words"
                  >
                    {reasoningText}
                  </div>
                </ScrollArea>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-6">
              <p className="text-[11px] text-slate-500">
                {isGenerating ? "等待模型返回 thinking…" : "本次模型未返回 thinking。"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
