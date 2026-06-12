"use client";

import type { SourceMode } from "@/lib/types";

type StudioMode = {
  id: SourceMode;
  label: string;
  description: string;
  icon: string;
};

const modes: StudioMode[] = [
  {
    id: "idea",
    label: "灵感创作",
    description: "通过标签选择和 AI 策划，从零开始创作剧本",
    icon: "💡",
  },
  {
    id: "outline",
    label: "按大纲写剧本",
    description: "已有大纲？AI 严格按照大纲生成剧本正文",
    icon: "📋",
  },
];

export function StudioModeSelector({
  value,
  onChange,
}: {
  value: SourceMode;
  onChange: (mode: SourceMode) => void;
}) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <h2 className="text-2xl font-semibold">选择创作模式</h2>
      <p className="mt-2 text-sm text-slate-400">
        选择适合你的创作方式，两种方式都可以生成完整的剧本
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {modes.map((mode) => {
          const active = value === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onChange(mode.id)}
              className={`relative flex flex-col items-start gap-4 rounded-[28px] border p-6 text-left transition-all ${
                active
                  ? "border-white bg-white/6 shadow-lg shadow-white/5"
                  : "border-white/8 bg-white/4 hover:bg-white/8 hover:border-white/20"
              }`}
            >
              {/* 图标 */}
              <span className="text-5xl">{mode.icon}</span>

              {/* 内容 */}
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{mode.label}</h3>
                <p className="mt-2 text-sm text-slate-400">{mode.description}</p>
              </div>

              {/* 选中指示器 */}
              {active && (
                <div className="absolute right-6 top-6">
                  <svg
                    className="h-6 w-6 text-cyan-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
