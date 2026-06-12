"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { OriginalDraft } from "@/lib/types";
import type { GenerationQualityReport } from "@/lib/quality-os/types";
import { buildLocalScriptAudit } from "@/lib/quality-os/build-local-script-audit";
import { buildScriptQualityGate, type LocalQualityGate, type LocalQualityGateStatus } from "@/lib/quality-os/build-script-quality-gate";
import {
  buildProjectedConstraintCard,
  formatConstraintCardForCopy,
  type ProjectedConstraintCard,
} from "@/lib/quality-os/build-user-constraint-pack";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ============================================================
// EpisodeTracePanel — 每集"生成轨迹"右侧 Sheet
// 只读取已有数据，不触发 LLM、不写 DB、不扣费
// ============================================================

type DebugPromptResponse = {
  ok: boolean;
  contextChars?: number;
  promptChars?: number;
  sections?: Array<{
    title: string;
    source: string;
    chars: number;
    content: string;
  }>;
  context?: string;
  prompt?: string;
  error?: string;
};

type TabId = "context" | "thinking" | "audit";

type EpisodeTracePanelProps = {
  open: boolean;
  onClose: () => void;
  draft: OriginalDraft;
  episodeNumber: number;
  initialTab?: TabId;
  episodeTitle?: string;
  reasoningText?: string;
  scriptContent?: string;
};

function getReportTime(report: GenerationQualityReport): number {
  const time = Date.parse(report.createdAt ?? "");
  return Number.isFinite(time) ? time : 0;
}

function formatReportTime(createdAt: string): string {
  const time = Date.parse(createdAt);
  if (!Number.isFinite(time)) return createdAt;
  return new Date(time).toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================
// Tab: 约束 — 打开即加载，不显示"查看生成约束"按钮
// ============================================================

function ConstraintsTab({
  draft,
  episodeNumber,
  open,
}: {
  draft: OriginalDraft;
  episodeNumber: number;
  open: boolean;
}) {
  const [result, setResult] = useState<DebugPromptResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReferenceMaterial, setShowReferenceMaterial] = useState(false);
  const [copied, setCopied] = useState("");
  const constraintCard = useMemo<ProjectedConstraintCard>(() => {
    if (!result) {
      return {
        executionCard: { mustWriteEvents: [], episodeHook: "", nextEpisodeBoundary: "", isEmpty: true },
        hardConstraints: [],
        characters: [],
        isEmpty: true,
      };
    }
    return buildProjectedConstraintCard(result.sections, result.context);
  }, [result]);

  const constraintText = useMemo(() => {
    return formatConstraintCardForCopy(constraintCard);
  }, [constraintCard]);

  const copyToClipboard = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied(`复制失败`);
      setTimeout(() => setCopied(""), 1500);
    }
  }, []);

  const toggleReferenceMaterial = useCallback(() => {
    setShowReferenceMaterial((prev) => !prev);
  }, []);

  const load = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      const data: DebugPromptResponse = {
        ok: true,
        contextChars: draft.script?.content?.length ?? 0,
        promptChars: draft.script?.content?.length ?? 0,
        sections: [
          {
            title: `第 ${episodeNumber} 集脚本`,
            source: "local",
            chars: draft.script?.content?.length ?? 0,
            content: draft.script?.content ?? "",
          },
        ],
        context: draft.script?.content ?? "",
        prompt: draft.script?.content ?? "",
      };
      setResult(data);
      setShowReferenceMaterial(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setIsLoading(false);
    }
  }, [draft, episodeNumber, isLoading]);

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-slate-400">加载生成约束中...</p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          约束加载失败：{error}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/6"
        >
          重新加载
        </button>
      </div>
    );
  }

  // ── Empty (no structured data extracted) ──
  if (constraintCard.isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-sm text-slate-400">
          当前未识别到结构化约束摘要。
        </p>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/6"
        >
          重新加载
        </button>
      </div>
    );
  }

  const ec = constraintCard.executionCard;

  // ── Content ──
  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-white">本集创作执行卡</div>
        {ec.episodeNumber && (
          <span className="text-[11px] text-slate-500">第 {ec.episodeNumber} 集</span>
        )}
      </div>

      {/* 复制操作栏 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => copyToClipboard("本集约束", constraintText)}
          disabled={!!copied}
          className="rounded-md border border-cyan-300/20 bg-cyan-300/5 px-2.5 py-1 text-[11px] text-cyan-100/80 hover:text-cyan-100 hover:bg-cyan-300/10 transition shrink-0 disabled:opacity-50"
        >
          {copied === "本集约束" ? "已复制" : "复制本集约束"}
        </button>
        {copied === "复制失败" && (
          <span className="text-[11px] text-rose-400 shrink-0">复制失败</span>
        )}
      </div>

      {/* 1. 本集执行卡 — 始终展开置顶 */}
      <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.02] overflow-hidden">
        <div className="px-4 py-3">
          <span className="text-sm font-medium text-cyan-100/80">本集执行卡</span>
        </div>
        {!ec.isEmpty ? (
          <div className="px-4 pb-3 space-y-3">
            {/* 本集必须写 */}
            <div>
              <div className="text-[11px] font-medium text-slate-400 mb-1.5">本集必须写</div>
              <ul className="grid gap-1">
                {ec.mustWriteEvents.map((event, idx) => (
                  <li
                    key={idx}
                    className="rounded-lg border border-white/6 bg-slate-950/60 px-3 py-1.5 text-xs leading-5 text-slate-200"
                  >
                    {event}
                  </li>
                ))}
              </ul>
            </div>

            {/* 本集结尾钩子 */}
            {ec.episodeHook && (
              <div>
                <div className="text-[11px] font-medium text-slate-400 mb-1.5">本集结尾钩子</div>
                <div className="rounded-lg border border-amber-300/10 bg-amber-300/[0.03] px-3 py-1.5 text-xs leading-5 text-amber-100/70">
                  {ec.episodeHook}
                </div>
              </div>
            )}

            {/* 下一集边界 */}
            {ec.nextEpisodeBoundary && (
              <div>
                <div className="text-[11px] font-medium text-slate-400 mb-1.5">下一集边界</div>
                <div className="rounded-lg border border-white/6 bg-slate-950/60 px-3 py-1.5 text-xs leading-5 text-slate-300">
                  {ec.nextEpisodeBoundary}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 pb-3">
            <p className="text-xs text-slate-500 py-1">
              当前未识别到明确本集目标，请查看下方完整约束。
            </p>
          </div>
        )}
      </div>

      {/* 2. 硬性约束 — 默认展开 */}
      {constraintCard.hardConstraints.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/[0.03] overflow-hidden">
          <div className="px-4 py-3">
            <span className="text-sm font-medium text-slate-300">
              硬性约束
              <span className="ml-1.5 text-xs text-slate-500">（{constraintCard.hardConstraints.length}）</span>
            </span>
          </div>
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              {constraintCard.hardConstraints.map((hc, idx) => (
                <span
                  key={idx}
                  className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-xs text-slate-300"
                >
                  {hc.label}：{hc.value}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. 连续性与禁区 — 固定文案，默认展开 */}
      <div className="rounded-xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="px-4 py-3">
          <span className="text-sm font-medium text-slate-300">连续性与禁区</span>
        </div>
        <div className="px-4 pb-3">
          <ul className="grid gap-1">
            <li className="rounded-lg border border-white/6 bg-slate-950/60 px-3 py-1.5 text-xs leading-5 text-slate-300">
              不得提前写下一集事件。
            </li>
            <li className="rounded-lg border border-white/6 bg-slate-950/60 px-3 py-1.5 text-xs leading-5 text-slate-300">
              不得新增当前集大纲没有的新主线。
            </li>
            <li className="rounded-lg border border-white/6 bg-slate-950/60 px-3 py-1.5 text-xs leading-5 text-slate-300">
              不得改变角色身份、职位、阵营。
            </li>
            <li className="rounded-lg border border-white/6 bg-slate-950/60 px-3 py-1.5 text-xs leading-5 text-slate-300">
              不得把怀疑、伏笔或线索升级成已经掌握证据。
            </li>
            <li className="rounded-lg border border-white/6 bg-slate-950/60 px-3 py-1.5 text-xs leading-5 text-slate-300">
              新证据必须在本集现场产生。
            </li>
          </ul>
        </div>
      </div>

      {/* 4. 参考材料 — 默认折叠，只展示角色摘要 */}
      {constraintCard.characters.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/[0.03] overflow-hidden">
          <button
            type="button"
            onClick={toggleReferenceMaterial}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            <span>
              参考材料
              <span className="ml-1.5 text-xs text-slate-500">（{constraintCard.characters.length}）</span>
            </span>
            <span className="text-xs text-slate-500">
              {showReferenceMaterial ? "收起" : "展开"}
            </span>
          </button>
          {showReferenceMaterial && (
            <div className="px-4 pb-3 space-y-2">
              <p className="text-[11px] leading-relaxed text-slate-500 px-0.5">
                以下内容用于保持设定一致，不代表本集必须全部写入。
              </p>
              <ul className="grid gap-1">
                {constraintCard.characters.map((ch, idx) => (
                  <li
                    key={idx}
                    className="rounded-lg border border-white/6 bg-slate-950/60 px-3 py-1.5 text-xs leading-5 text-slate-300"
                  >
                    <span className="font-medium text-slate-200">{ch.name}</span>
                    {ch.description && <span className="text-slate-400">：{ch.description}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 未提取到结构化数据的提示 */}
      {!ec.isEmpty && constraintCard.hardConstraints.length === 0 && constraintCard.characters.length === 0 && (
        <p className="text-[11px] text-slate-600 text-center pt-2">
          硬性约束和角色摘要未从当前数据中识别。
        </p>
      )}
    </div>
  );
}

// ============================================================
// Tab: 思路 — 展示真实 thinking 数据
// ============================================================

function ThinkingTab({ reasoningText }: { reasoningText?: string }) {
  const [copied, setCopied] = useState(false);

  if (reasoningText) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-cyan-100/80">生成思路</span>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(reasoningText);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch { /* ignore */ }
            }}
            className="rounded-md border border-cyan-300/10 px-2 py-1 text-[11px] text-slate-500 hover:text-slate-400 hover:bg-white/3 transition"
          >
            {copied ? "已复制" : "复制思路"}
          </button>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <div className="max-h-80 overflow-y-auto rounded-lg border border-white/6 bg-slate-950/60 px-3 py-2 text-xs leading-6 text-slate-200 whitespace-pre-wrap break-words">
            {reasoningText}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <p className="text-sm text-slate-400">本次模型未返回 thinking。</p>
    </div>
  );
}

// ============================================================
// 质量 Gate 状态样式
// ============================================================

const GATE_STATUS_STYLE: Record<LocalQualityGateStatus, { dot: string; text: string; bg: string; border: string }> = {
  pass: {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    bg: "bg-emerald-400/[0.06]",
    border: "border-emerald-400/20",
  },
  warning: {
    dot: "bg-amber-400",
    text: "text-amber-300",
    bg: "bg-amber-400/[0.06]",
    border: "border-amber-400/20",
  },
  fail: {
    dot: "bg-rose-400",
    text: "text-rose-300",
    bg: "bg-rose-400/[0.06]",
    border: "border-rose-400/20",
  },
  unknown: {
    dot: "bg-slate-500",
    text: "text-slate-400",
    bg: "bg-slate-400/[0.04]",
    border: "border-slate-400/15",
  },
};

const GATE_STATUS_CN: Record<LocalQualityGateStatus, string> = {
  pass: "通过",
  warning: "注意",
  fail: "未通过",
  unknown: "无数据",
};

// ============================================================
// Tab: 审计 — 展示已有 qualityReports + 本地质量 Gate
// ============================================================

function AuditTab({
  reports,
  episodeNumber,
  scriptContent,
  characters,
  outlines,
  reasoningText,
}: {
  reports?: GenerationQualityReport[];
  episodeNumber: number;
  scriptContent?: string;
  characters?: OriginalDraft["characters"];
  outlines?: OriginalDraft["outlines"];
  reasoningText?: string;
}) {
  const filtered = (reports ?? [])
    .filter(
      (r) =>
        r.episodeNumber === episodeNumber ||
        r.episodeNumber == null
    )
    .slice()
    .sort((a, b) => getReportTime(b) - getReportTime(a));

  // 即时本地审计：有正文但无审计记录时，纯前端计算
  const fallbackLocalAudit = useMemo(() => {
    if (filtered.length > 0) return null;
    const text = scriptContent?.trim();
    if (!text) return null;
    return buildLocalScriptAudit({ episodeNumber, scriptText: text });
  }, [filtered.length, scriptContent, episodeNumber]);

  // 本地质量 Gate：基于正文 + 大纲 + 人物数据的前端规则检查
  const qualityGates = useMemo<LocalQualityGate[]>(() => {
    const text = scriptContent?.trim();
    if (!text) return [];
    if (!characters || characters.length === 0) {
      // 无人物数据时也尽量检查
      if (!outlines) return [];
    }
    try {
      return buildScriptQualityGate({
        episodeNumber,
        scriptContent: text,
        characters: characters ?? [],
        outlines: outlines ?? { range: "", macro: "", characterText: "", episodes: [], stageLabels: [] },
        reasoningText,
      });
    } catch {
      return [];
    }
  }, [episodeNumber, scriptContent, characters, outlines, reasoningText]);

  const hasQualityGates = qualityGates.length > 0;

  // 空态：无正文
  if (filtered.length === 0 && !fallbackLocalAudit && !hasQualityGates) {
    if (!scriptContent?.trim()) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-slate-400">当前集暂无正文，无法审计</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-slate-400">暂无审计记录</p>
      </div>
    );
  }

  const displayReports = filtered.length > 0 ? filtered : (fallbackLocalAudit ? [fallbackLocalAudit] : []);

  const isFallbackAudit = (report: GenerationQualityReport) =>
    filtered.length === 0 && report.source === "local_static";

  return (
    <div className="space-y-4">
      {/* ── 本地质量 Gate ── */}
      {hasQualityGates && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">本地质量 Gate</span>
            <span className="text-[11px] text-slate-500">本地规则检查</span>
          </div>
          <div className="grid gap-2">
            {qualityGates.map((gate) => {
              const style = GATE_STATUS_STYLE[gate.status];
              return (
                <div
                  key={gate.id}
                  className={`rounded-xl border ${style.border} ${style.bg} p-3.5`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                      <span className="text-[13px] font-medium text-slate-200">{gate.title}</span>
                    </div>
                    <span className={`text-[11px] font-medium ${style.text}`}>
                      {GATE_STATUS_CN[gate.status]}
                    </span>
                  </div>
                  {gate.evidence.length > 0 && (
                    <ul className="space-y-0.5 mb-1.5">
                      {gate.evidence.map((evi, ei) => (
                        <li key={ei} className="text-[11px] leading-5 text-slate-400">
                          {evi}
                        </li>
                      ))}
                    </ul>
                  )}
                  {gate.suggestion && (
                    <p className="text-[11px] leading-5 text-cyan-300/70">
                      建议：{gate.suggestion}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 已有质量报告 / fallback 本地审计 ── */}
      {displayReports.map((report, idx) => (
        <div
          key={report.id || idx}
          className="rounded-xl border border-white/8 bg-white/[0.03] p-4"
        >
          {/* 头部信息 */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs text-slate-400">
              {isFallbackAudit(report) ? "本地审计" : formatReportTime(report.createdAt)}
            </span>
            {report.overallScore != null && (
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-0.5 text-xs text-cyan-100">
                综合评分 {report.overallScore}
              </span>
            )}
          </div>

          {/* 摘要 */}
          {report.summary && (
            <p className="text-sm leading-7 text-slate-200 mb-3">
              {report.summary}
            </p>
          )}

          {/* 问题列表 */}
          {report.issues && report.issues.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-slate-400 mb-2">
                问题项（{report.issues.length}）
              </div>
              <ul className="grid gap-1.5">
                {report.issues.slice(0, 5).map((issue, i) => (
                  <li
                    key={issue.id || i}
                    className="rounded-lg border border-white/6 bg-slate-950/40 px-3 py-2 text-xs leading-6 text-slate-300"
                  >
                    <span className="font-medium text-white">{issue.title}</span>
                    {issue.description && (
                      <span className="ml-1.5 text-slate-400">
                        — {issue.description}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {report.issues.length > 5 && (
                <p className="mt-1 text-xs text-slate-500">
                  还有 {report.issues.length - 5} 项未展示
                </p>
              )}
            </div>
          )}

          {/* 指标 */}
          {report.metrics && report.metrics.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-slate-400 mb-2">指标</div>
              <div className="flex flex-wrap gap-2">
                {report.metrics.map((m, i) => (
                  <span
                    key={m.id || i}
                    className="rounded-full border border-white/8 bg-white/4 px-2.5 py-0.5 text-xs text-slate-300"
                  >
                    {m.name}: {m.value}
                    {m.unit ? ` ${m.unit}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 建议 */}
          {report.recommendation && (
            <div className="rounded-lg border border-cyan-300/10 bg-cyan-300/[0.03] px-3 py-2 text-xs leading-6 text-slate-300">
              <span className="font-medium text-cyan-100">建议：</span>
              {report.recommendation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// EpisodeTracePanel — 主组件：右侧 Sheet + 三 Tab
// ============================================================

export function EpisodeTracePanel({
  open,
  onClose,
  draft,
  episodeNumber,
  initialTab = "context",
  episodeTitle,
  reasoningText,
  scriptContent,
}: EpisodeTracePanelProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent
        side="right"
        className="w-[560px] sm:max-w-[560px] flex flex-col bg-[#0f0f13] border-white/10"
      >
        <SheetHeader>
          <SheetTitle className="text-white">生成轨迹</SheetTitle>
          <SheetDescription className="text-slate-400">
            第 {episodeNumber} 集{episodeTitle ? ` · ${episodeTitle}` : ""}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue={initialTab} className="flex-1 flex flex-col min-h-0 -mx-1">
          <TabsList variant="line" className="shrink-0 px-1">
            <TabsTrigger value="context">约束</TabsTrigger>
            <TabsTrigger value="audit">审计</TabsTrigger>
            <TabsTrigger value="thinking">思路</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto mt-3">
            <TabsContent value="context" className="px-0.5">
              <ConstraintsTab draft={draft} episodeNumber={episodeNumber} open={open} />
            </TabsContent>
            <TabsContent value="audit" className="px-0.5">
              <AuditTab
                reports={draft.qualityReports}
                episodeNumber={episodeNumber}
                scriptContent={scriptContent}
                characters={draft.characters}
                outlines={draft.outlines}
                reasoningText={reasoningText}
              />
            </TabsContent>
            <TabsContent value="thinking" className="px-0.5">
              <ThinkingTab reasoningText={reasoningText} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
