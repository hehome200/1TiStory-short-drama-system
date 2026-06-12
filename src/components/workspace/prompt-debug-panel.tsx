"use client";

import { useState } from "react";
import type { Character, OriginalDraft, OriginalStep } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type DebugAssetStatus = "included" | "candidate" | "not_connected" | "display_only" | "connected" | "unknown";

type DebugAssetItem = {
  name: string;
  status: DebugAssetStatus;
  source?: string;
  note?: string;
  category?: string;
  stage?: string;
};

type DebugAssets = {
  promptRules: DebugAssetItem[];
  userConstraintGroups: DebugAssetItem[];
  qualityAssets: DebugAssetItem[];
  skills: DebugAssetItem[];
  agents: DebugAssetItem[];
};

type PromptDebugResponse = {
  ok: boolean;
  step?: OriginalStep;
  outlineGenerationMode?: "batch_rough_outlines" | "batch_episodes" | null;
  context?: string;
  prompt?: string;
  contextChars?: number;
  promptChars?: number;
  sections?: Array<{
    title: string;
    source: string;
    chars: number;
    content: string;
  }>;
  debugAssets?: DebugAssets;
  meta?: {
    batchIndex: number | null;
    startEpisode: number | null;
    endEpisode: number | null;
    totalEpisodeCount: number | null;
    currentEpisode: number | null;
    adaptationTargetMarket: string | null;
    adaptationStrategy: string | null;
    characterSource?: {
      characterCountSource: string;
      sourceMaterialExtractionCharacterCount: number | null;
      sourceMaterialExtractionMissing: boolean;
      supportingCharacterCount: number;
      aliasCount: number;
    };
  };
  error?: string;
};

type PromptDebugPanelProps = {
  draft: OriginalDraft;
  step: OriginalStep;
  outlineGenerationMode?: "batch_rough_outlines" | "batch_episodes" | null;
  batchIndex?: number;
  startEpisode?: number;
  endEpisode?: number;
  roughOutline?: string;
  totalEpisodeCount?: number;
  currentEpisode?: number;
};

const isDebugVisible =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_PROMPT_DEBUG === "true";

async function copyText(value: string) {
  if (!value) return;
  await navigator.clipboard.writeText(value);
}

/**
 * 格式化角色卡为纯文本，方便复制给 ChatGPT 审核
 */
function formatCharacterCardsForCopy(characters: Character[]): string {
  if (!characters || characters.length === 0) {
    return "【人物卡总数】0\n\n暂无人物数据";
  }

  const lines: string[] = [`【人物卡总数】${characters.length}`];

  characters.forEach((char, index) => {
    const meta = char.adaptationMeta;
    lines.push(`\n【${index + 1}】`);
    lines.push(`id: ${char.id || "未填写"}`);
    lines.push(`name: ${char.name || "未填写"}`);
    lines.push(`sourceName: ${meta?.sourceName || "未填写"}`);
    lines.push(`adaptedName: ${meta?.adaptedName || "未填写"}`);
    lines.push(`gender: ${char.gender || "未填写"}`);
    lines.push(`role: ${char.role || "未填写"}`);
    lines.push(`age: ${char.age ?? "未填写"}`);
    lines.push(`traits: ${char.traits || "未填写"}`);
    lines.push(`background: ${char.background || "未填写"}`);
    lines.push(`relationToMaleLead: ${char.relationToMaleLead || "未填写"}`);
    lines.push(`relationToFemaleLead: ${char.relationToFemaleLead || "未填写"}`);
    lines.push(`relationshipTags: ${Array.isArray(char.relationshipTags) && char.relationshipTags.length > 0 ? char.relationshipTags.join("、") : "未填写"}`);
    lines.push(`publicIdentity: ${meta?.publicIdentity || "未填写"}`);
    lines.push(`hiddenIdentity: ${meta?.hiddenIdentity || "未填写"}`);
    lines.push(`misreadIdentity: ${meta?.misreadIdentity || "未填写"}`);
    lines.push(`trueMotivation: ${meta?.trueMotivation || "未填写"}`);
    lines.push(`reversalTags: ${Array.isArray(meta?.reversalTags) && meta.reversalTags.length > 0 ? meta.reversalTags.join("、") : "未填写"}`);
    lines.push(`revealStage: ${meta?.revealStage || "未填写"}`);
    lines.push(`roleFunction: ${meta?.roleFunction || "未填写"}`);
    lines.push(`relationshipHook: ${meta?.relationshipHook || "未填写"}`);
    lines.push(`sourceGenderHint: ${meta?.sourceGenderHint || "未填写"}`);
    lines.push(`genderConfidence: ${typeof meta?.genderConfidence === "number" ? meta.genderConfidence : "未填写"}`);
    lines.push(`localizationNote: ${meta?.localizationNote || "未填写"}`);
  });

  return lines.join("\n");
}

/**
 * 生成 ProjectDraft 调试摘要（只用于 dev/debug 面板排错）
 */
function buildDraftDebugSummary(draft: OriginalDraft): string {
  const lines: string[] = [];

  lines.push("=== ProjectDraft 调试摘要 ===");
  lines.push(`title: ${draft.title || "未填写"}`);
  lines.push(`overview: ${draft.overview?.projectBrief ? "有" : "无"} (projectBrief)`);

  const charCount = draft.characters?.length ?? 0;
  lines.push(`characters: ${charCount} 人`);

  const outlineCount = draft.outlines?.episodes?.length ?? 0;
  lines.push(`outlines.episodes: ${outlineCount} 条`);

  lines.push(`script: ${draft.script?.content ? `有 (${draft.script.content.length} chars)` : "空"}`);

  const episodeScriptKeys = draft.episodeScripts ? Object.keys(draft.episodeScripts) : [];
  lines.push(`episodeScripts: ${episodeScriptKeys.length} 集 [${episodeScriptKeys.join(", ")}]`);

  const hasAdaptation = !!draft.adaptation;
  lines.push(`adaptation: ${hasAdaptation ? "已标注" : "无"}`);

  const reportCount = draft.qualityReports?.length ?? 0;
  lines.push(`qualityReports: ${reportCount} 条`);
  if (draft.qualityReports && draft.qualityReports.length > 0) {
    draft.qualityReports.forEach((r, i) => {
      const ep = r.episodeNumber ? `E${r.episodeNumber}` : "?";
      lines.push(`  [${i + 1}] ${ep} stage=${r.stage} score=${r.overallScore ?? "?"} issues=${r.issues?.length ?? "?"}`);
    });
  }

  lines.push("");

  return lines.join("\n");
}

/**
 * 格式化调试资产为纯文本（复制用）
 */
function buildDebugAssetsText(assets: DebugAssets): string {
  const lines: string[] = [];
  lines.push("# 调试资产");
  lines.push("");

  // Prompt 内规则
  lines.push("## Prompt 内规则");
  lines.push("");
  const statusLabels: Record<DebugAssetStatus, string> = {
    included: "✅ 已进入 prompt",
    candidate: "⚠️ 仅候选/未注入",
    not_connected: "❌ 未接入",
    display_only: "📋 展示层",
    connected: "✅ 已接入",
    unknown: "❓ 未知",
  };
  if (assets.promptRules.length > 0) {
    for (const r of assets.promptRules) {
      const statusText = statusLabels[r.status] ?? r.status;
      lines.push(`- [${statusText}] ${r.name} (${r.category ?? "?"})`);
      if (r.note) lines.push(`  ${r.note}`);
      if (r.source) lines.push(`  来源: ${r.source}`);
    }
  } else {
    lines.push("无");
  }
  lines.push("");

  // 用户约束包分组
  lines.push("## 用户约束包分组");
  lines.push("");
  if (assets.userConstraintGroups.length > 0) {
    for (const g of assets.userConstraintGroups) {
      lines.push(`- ${g.name}: 展示层规则，不改变生成prompt`);
    }
  } else {
    lines.push("无");
  }
  lines.push("");

  // 审计/Quality 资产
  lines.push("## 审计 / Quality 资产");
  lines.push("");
  if (assets.qualityAssets.length > 0) {
    for (const q of assets.qualityAssets) {
      lines.push(`- ${q.name}: ${q.note ?? ""}`);
    }
  } else {
    lines.push("无");
  }
  lines.push("");

  // Skills
  lines.push("## Skills");
  lines.push("");
  if (assets.skills.length > 0) {
    for (const s of assets.skills) {
      lines.push(`- ${s.name} (${s.source ?? "?"}): ${s.note ?? ""}`);
    }
  } else {
    lines.push("无");
  }
  lines.push("");

  return lines.join("\n");
}

export function PromptDebugPanel({
  draft,
  step,
  outlineGenerationMode = null,
  batchIndex,
  startEpisode,
  endEpisode,
  roughOutline,
  totalEpisodeCount,
  currentEpisode,
}: PromptDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PromptDebugResponse | null>(null);
  const [copiedCards, setCopiedCards] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState("");
  const [activeTab, setActiveTab] = useState("prompt");
  const [showRawJson, setShowRawJson] = useState(false);

  if (!isDebugVisible) return null;

  const copyWithFeedback = async (label: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(""), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopiedLabel(label);
        setTimeout(() => setCopiedLabel(""), 2000);
      } catch {
        // silent
      }
      document.body.removeChild(textarea);
    }
  };

  const copyCharacterCards = async () => {
    const text = formatCharacterCardsForCopy(draft.characters);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCards(true);
      setTimeout(() => setCopiedCards(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopiedCards(true);
        setTimeout(() => setCopiedCards(false), 2000);
      } catch {
        setError("复制失败，请手动复制");
      }
      document.body.removeChild(textarea);
    }
  };

  const loadDebugPrompt = async () => {
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const context = buildDraftDebugSummary(draft);
      const prompt = JSON.stringify({
        step,
        outlineGenerationMode,
        batchIndex,
        startEpisode,
        endEpisode,
        roughOutline,
        totalEpisodeCount,
        currentEpisode,
        draft,
      }, null, 2);
      const data: PromptDebugResponse = {
        ok: true,
        step,
        outlineGenerationMode,
        context,
        prompt,
        contextChars: context.length,
        promptChars: prompt.length,
        sections: [
          { title: "草稿摘要", source: "local", chars: context.length, content: context },
          { title: "生成输入", source: "local", chars: prompt.length, content: prompt },
        ],
        debugAssets: {
          promptRules: [],
          userConstraintGroups: [],
          qualityAssets: [],
          skills: [],
          agents: [],
        },
        meta: {
          batchIndex: batchIndex ?? null,
          startEpisode: startEpisode ?? null,
          endEpisode: endEpisode ?? null,
          totalEpisodeCount: totalEpisodeCount ?? null,
          currentEpisode: currentEpisode ?? null,
          adaptationTargetMarket: null,
          adaptationStrategy: null,
        },
      };
      setResult(data);
      setIsOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt debug failed");
      setResult(null);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const copyAll = async () => {
    if (!result) return;
    const allText = [
      `STEP: ${result.step ?? step}`,
      `OUTLINE_MODE: ${result.outlineGenerationMode ?? "null"}`,
      `CONTEXT:\n${result.context ?? ""}`,
      `PROMPT:\n${result.prompt ?? ""}`,
    ].join("\n\n");
    await copyWithFeedback("all", allText);
  };

  const copyRawJson = async () => {
    if (!result) return;
    const jsonStr = JSON.stringify(result, null, 2);
    await copyWithFeedback("rawJSON", jsonStr);
  };

  const copySectionsRawJson = async () => {
    if (!result?.sections) return;
    const jsonStr = JSON.stringify(result.sections, null, 2);
    await copyWithFeedback("sectionsJSON", jsonStr);
  };

  const copyDraftSummary = async () => {
    const summary = buildDraftDebugSummary(draft);
    await copyWithFeedback("draftSummary", summary);
  };

  const copyDebugAssets = async () => {
    if (!result?.debugAssets) return;
    const text = buildDebugAssetsText(result.debugAssets);
    await copyWithFeedback("debugAssets", text);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIsOpen(false);
      setActiveTab("prompt");
      setShowRawJson(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <button
        type="button"
        onClick={loadDebugPrompt}
        disabled={isLoading}
        className="inline-flex h-8 items-center rounded-full border border-white/10 bg-slate-950/70 px-3 text-xs font-medium text-slate-300 transition hover:border-cyan-300/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Prompt..." : "Prompt"}
      </button>

      <SheetContent
        side="left"
        showCloseButton={true}
        className="w-[840px] sm:max-w-[840px] max-w-[calc(100vw-48px)] flex flex-col bg-[#0f0f13] border-white/10"
      >
        <SheetHeader>
          <SheetTitle className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
            Prompt Inspector
          </SheetTitle>
          <div className="text-sm text-slate-400">
            step: <span className="text-white">{result?.step ?? step}</span>
            {"  "}
            mode:{" "}
            <span className="text-white">
              {result?.outlineGenerationMode ?? "null"}
            </span>
            {result && (
              <span className="ml-2 text-xs text-slate-500">
                contextChars: {result.contextChars ?? 0} · promptChars:{" "}
                {result.promptChars ?? 0}
              </span>
            )}
          </div>
        </SheetHeader>

        {/* 顶部操作按钮栏（跨 Tab 不变） */}
        <div className="flex flex-wrap gap-2 px-4 pt-4">
          <button
            type="button"
            onClick={loadDebugPrompt}
            disabled={isLoading}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "刷新中..." : "刷新"}
          </button>
          {step === "characters" && (
            <button
              type="button"
              onClick={copyCharacterCards}
              className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-300/15"
            >
              {copiedCards ? "已复制角色卡" : "复制全部角色卡"}
            </button>
          )}
        </div>

        {/* 三 Tab 内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 mt-2">
          <div className="px-4">
            <TabsList className="w-full">
              <TabsTrigger value="prompt" className="text-xs">Prompt</TabsTrigger>
              <TabsTrigger value="assets" className="text-xs">调试资产</TabsTrigger>
              <TabsTrigger value="debug" className="text-xs">调试信息</TabsTrigger>
            </TabsList>
          </div>

          {/* Prompt Tab */}
          <TabsContent value="prompt" className="flex-1 min-h-0">
            <ScrollArea className="h-full -mx-4 px-4">
              <div className="space-y-4 pb-6 pt-4">
                {/* 错误 */}
                {error ? (
                  <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}

                {/* Meta 面板 */}
                {result?.meta ? (
                  <div className="grid gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-xs text-slate-300 sm:grid-cols-2">
                    <div>batchIndex: {result.meta.batchIndex ?? "null"}</div>
                    <div>startEpisode: {result.meta.startEpisode ?? "null"}</div>
                    <div>endEpisode: {result.meta.endEpisode ?? "null"}</div>
                    <div>
                      totalEpisodeCount: {result.meta.totalEpisodeCount ?? "null"}
                    </div>
                    <div>currentEpisode: {result.meta.currentEpisode ?? "null"}</div>
                    <div>
                      adaptationTargetMarket:{" "}
                      {result.meta.adaptationTargetMarket ?? "null"}
                    </div>
                    <div>
                      adaptationStrategy:{" "}
                      {result.meta.adaptationStrategy ?? "null"}
                    </div>
                    {result.meta.characterSource ? (
                      <>
                        <div className="sm:col-span-2 mt-1 border-t border-white/6 pt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
                          角色来源
                        </div>
                        <div>
                          characterCountSource:{" "}
                          <span
                            className={
                              result.meta.characterSource.characterCountSource ===
                              "source_material_extraction"
                                ? "text-emerald-300"
                                : result.meta.characterSource.characterCountSource ===
                                    "fallback_source_character_roster"
                                  ? "text-amber-300"
                                  : "text-slate-400"
                            }
                          >
                            {result.meta.characterSource.characterCountSource}
                          </span>
                        </div>
                        {result.meta.characterSource
                          .sourceMaterialExtractionCharacterCount != null ? (
                          <div>
                            sourceMaterialExtraction:{" "}
                            <span className="text-emerald-300">
                              {
                                result.meta.characterSource
                                  .sourceMaterialExtractionCharacterCount
                              }{" "}
                              人
                            </span>
                          </div>
                        ) : result.meta.characterSource
                            .sourceMaterialExtractionMissing ? (
                          <div>
                            sourceMaterialExtractionMissing:{" "}
                            <span className="text-amber-300">true</span>
                          </div>
                        ) : null}
                        {(result.meta.characterSource.supportingCharacterCount ??
                          0) > 0 ? (
                          <div>
                            supportingCharacters:{" "}
                            <span className="text-slate-400">
                              {
                                result.meta.characterSource
                                  .supportingCharacterCount
                              }{" "}
                              人
                            </span>
                          </div>
                        ) : null}
                        {(result.meta.characterSource.aliasCount ?? 0) > 0 ? (
                          <div>
                            aliases:{" "}
                            <span className="text-slate-400">
                              {result.meta.characterSource.aliasCount} 个
                            </span>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}

                {/* Sections */}
                {result?.sections?.length ? (
                  <div className="grid gap-3">
                    {result.sections.map((section) => (
                      <div
                        key={`${section.title}-${section.source}`}
                        className="rounded-xl border border-white/8 bg-white/[0.03] p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-medium text-white">
                            {section.title}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {section.source} · {section.chars} chars
                          </div>
                        </div>
                        <textarea
                          readOnly
                          value={section.content}
                          className="mt-2 h-28 w-full resize-y rounded-xl border border-white/8 bg-slate-950/70 px-3 py-2 text-xs leading-5 text-slate-200 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Context */}
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="text-sm font-medium text-white">Context</div>
                    <button
                      type="button"
                      onClick={() => copyWithFeedback("context", result?.context ?? "")}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/6"
                    >
                      {copiedLabel === "context" ? "已复制" : "复制 Context"}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={result?.context ?? ""}
                    className="h-56 w-full resize-y rounded-xl border border-white/8 bg-slate-950/70 px-3 py-2 text-xs leading-5 text-slate-200 outline-none"
                  />
                </div>

                {/* Prompt */}
                <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="text-sm font-medium text-white">Prompt</div>
                    <button
                      type="button"
                      onClick={() => copyWithFeedback("prompt", result?.prompt ?? "")}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/6"
                    >
                      {copiedLabel === "prompt" ? "已复制" : "复制 Prompt"}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={result?.prompt ?? ""}
                    className="h-64 w-full resize-y rounded-xl border border-white/8 bg-slate-950/70 px-3 py-2 text-xs leading-5 text-slate-200 outline-none"
                  />
                </div>

                {/* Prompt Tab 底部操作 */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyAll}
                    className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-300/15"
                  >
                    {copiedLabel === "all" ? "已复制" : "复制全部"}
                  </button>
                  <button
                    type="button"
                    onClick={copyRawJson}
                    className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-300/15"
                  >
                    {copiedLabel === "rawJSON" ? "已复制" : "复制 raw JSON"}
                  </button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 调试资产 Tab */}
          <TabsContent value="assets" className="flex-1 min-h-0">
            <ScrollArea className="h-full -mx-4 px-4">
              <div className="space-y-4 pb-6 pt-4">
                {result?.debugAssets ? (
                  <>
                    {/* 复制按钮 */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={copyDebugAssets}
                        className="rounded-full border border-violet-300/30 bg-violet-300/10 px-3 py-1.5 text-xs text-violet-100 hover:bg-violet-300/15"
                      >
                        {copiedLabel === "debugAssets"
                          ? "已复制"
                          : "复制调试资产"}
                      </button>
                    </div>

                    {/* Prompt 内规则 */}
                    <div>
                      <div className="mb-2 text-[11px] text-slate-400">
                        Prompt 内规则（{result.debugAssets.promptRules.length}{" "}
                        条）
                      </div>
                      {result.debugAssets.promptRules.length > 0 ? (
                        <div className="space-y-1">
                          {result.debugAssets.promptRules.map((rule) => {
                            const statusBadge =
                              rule.status === "included"
                                ? "bg-emerald-400/10 text-emerald-300"
                                : rule.status === "candidate"
                                  ? "bg-amber-400/10 text-amber-300"
                                  : "bg-slate-400/10 text-slate-400";
                            const statusText =
                              rule.status === "included"
                                ? "已进入prompt"
                                : rule.status === "candidate"
                                  ? "仅候选"
                                  : "未接入";
                            return (
                              <div
                                key={rule.name}
                                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/6 bg-white/[0.02] px-2 py-1.5 text-[11px]"
                              >
                                <span className="text-slate-200 font-medium">
                                  {rule.name}
                                </span>
                                <span
                                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${statusBadge}`}
                                >
                                  {statusText}
                                </span>
                                <span className="text-slate-500">
                                  {rule.category ?? "?"}
                                </span>
                                {rule.note && (
                                  <span className="w-full text-slate-500 leading-relaxed">
                                    {rule.note}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-600">
                          当前未检测到已进入 prompt 的规则
                        </div>
                      )}
                    </div>

                    {/* 用户约束包分组 */}
                    <div>
                      <div className="mb-2 text-[11px] text-slate-400">
                        用户约束包分组（展示层规则，不改变生成prompt）
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        {result.debugAssets.userConstraintGroups.map((g) => (
                          <span
                            key={g.name}
                            className="rounded-full border border-white/6 px-2 py-0.5 text-slate-400"
                          >
                            {g.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 审计 / Quality 资产 */}
                    <div>
                      <div className="mb-2 text-[11px] text-slate-400">
                        审计 / Quality 资产
                      </div>
                      {result.debugAssets.qualityAssets.map((q) => {
                        const icon =
                          q.status === "connected"
                            ? "✅"
                            : q.status === "not_connected"
                              ? "❌"
                              : "❓";
                        return (
                          <div
                            key={q.name}
                            className="flex items-center gap-2 text-[11px] text-slate-400 py-0.5"
                          >
                            <span>{icon}</span>
                            <span className="text-slate-300">{q.name}</span>
                            {q.note && (
                              <span className="text-slate-500">{q.note}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Skills */}
                    <div>
                      <div className="mb-2 text-[11px] text-slate-400">
                        Skills（quality-os 治理层，不注入当前 script prompt）
                      </div>
                      {result.debugAssets.skills.length > 0 ? (
                        <div className="space-y-1">
                          {result.debugAssets.skills.map((skill) => (
                            <div
                              key={skill.name}
                              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/6 bg-white/[0.02] px-2 py-1.5 text-[11px]"
                            >
                              <span className="text-slate-300">
                                {skill.name}
                              </span>
                              <span className="text-slate-500">
                                {skill.source ?? "?"}
                              </span>
                              {skill.note && (
                                <span className="w-full text-slate-500 leading-relaxed">
                                  {skill.note}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-600">
                          当前未检测到独立 Skill 资产
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-600">
                      当前仅展示规则、技能与执行依据，不再包含独立执行角色。
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-slate-500 py-8 text-center">
                    暂无调试资产数据。请在 Prompt Tab 先加载调试信息。
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* 调试信息 Tab */}
          <TabsContent value="debug" className="flex-1 min-h-0">
            <ScrollArea className="h-full -mx-4 px-4">
              <div className="space-y-4 pb-6 pt-4">
                {/* Debug 操作按钮 */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copySectionsRawJson}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/6"
                  >
                    {copiedLabel === "sectionsJSON"
                      ? "已复制"
                      : "复制 Sections raw JSON"}
                  </button>
                  <button
                    type="button"
                    onClick={copyDraftSummary}
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/6"
                  >
                    {copiedLabel === "draftSummary"
                      ? "已复制"
                      : "复制 ProjectDraft 摘要"}
                  </button>
                </div>

                {/* raw JSON 可折叠 */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="flex w-full items-center gap-2 text-[11px] text-slate-400 hover:text-slate-300 transition"
                  >
                    <span>调试响应 raw JSON</span>
                    <span className="text-[10px]">
                      {showRawJson ? "▲" : "▼"}
                    </span>
                  </button>
                  {showRawJson && result && (
                    <textarea
                      readOnly
                      value={JSON.stringify(result, null, 2)}
                      className="mt-2 h-96 w-full resize-y rounded-xl border border-white/8 bg-slate-950/70 px-3 py-2 text-[11px] leading-5 text-slate-200 outline-none font-mono"
                    />
                  )}
                </div>

                {/* ProjectDraft 摘要 */}
                <div>
                  <div className="mb-2 text-[11px] text-slate-400">
                    ProjectDraft 摘要
                  </div>
                  <textarea
                    readOnly
                    value={buildDraftDebugSummary(draft)}
                    className="h-48 w-full resize-y rounded-xl border border-white/8 bg-slate-950/70 px-3 py-2 text-[11px] leading-5 text-slate-200 outline-none font-mono"
                  />
                </div>

                {/* GenerationQualityReport 摘要 */}
                {draft.qualityReports && draft.qualityReports.length > 0 ? (
                  <div>
                    <div className="mb-2 text-[11px] text-slate-400">
                      GenerationQualityReport ({draft.qualityReports.length}{" "}
                      条)
                    </div>
                    {draft.qualityReports.map((report, index) => (
                      <div
                        key={report.id ?? index}
                        className="mb-2 rounded-lg border border-white/6 bg-white/[0.02] p-2 text-[11px] text-slate-300"
                      >
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <span>
                            episode: E{report.episodeNumber ?? "?"}
                          </span>
                          <span>stage: {report.stage ?? "?"}</span>
                          <span>
                            score: {report.overallScore ?? "?"}
                          </span>
                          <span>
                            issues: {report.issues?.length ?? "?"}
                          </span>
                          <span>
                            rules: {report.rules?.length ?? "?"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600">
                    GenerationQualityReport: 无
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
