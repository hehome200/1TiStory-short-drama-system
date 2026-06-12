"use client";

export type ScriptType = "ai_comic" | "short_drama";

interface ScriptTypeSelectorProps {
  value: ScriptType;
  onChange: (value: ScriptType) => void;
  variant?: "button" | "card";
}

/**
 * 统一的剧本类型选择器 - AI漫剧 / 真人短剧
 * 用于剧本原创、分集大纲、剧本改写等入口
 */
export function ScriptTypeSelector({
  value,
  onChange,
  variant = "button",
}: ScriptTypeSelectorProps) {
  if (variant === "card") {
    return (
      <div className="grid gap-3">
        <button
          onClick={() => onChange("ai_comic")}
          className={`rounded-2xl px-5 py-4 text-left text-xl transition ${
            value === "ai_comic"
              ? "bg-white text-slate-950"
              : "bg-white/6 text-slate-200 hover:bg-white/10"
          }`}
        >
          AI漫剧
        </button>
        <button
          onClick={() => onChange("short_drama")}
          className={`rounded-2xl px-5 py-4 text-left text-xl transition ${
            value === "short_drama"
              ? "bg-white text-slate-950"
              : "bg-white/6 text-slate-200 hover:bg-white/10"
          }`}
        >
          真人短剧
        </button>
      </div>
    );
  }

  // button variant - 默认样式
  return (
    <div className="flex h-10 w-[140px] overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => onChange("ai_comic")}
        className={`flex-1 text-sm font-medium transition ${
          value === "ai_comic"
            ? "bg-[#62b8fd] text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        AI漫剧
      </button>
      <button
        onClick={() => onChange("short_drama")}
        className={`flex-1 text-sm font-medium transition ${
          value === "short_drama"
            ? "bg-[#f9b75b] text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        真人短剧
      </button>
    </div>
  );
}

/** ScriptType 与旧格式的映射 */
export function scriptTypeToAdaptFormat(scriptType: ScriptType): "ai_short" | "live_action" {
  return scriptType === "ai_comic" ? "ai_short" : "live_action";
}
