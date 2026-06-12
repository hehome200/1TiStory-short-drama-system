import type {
  OriginalDraft,
  OriginalStep,
  AdaptDraft,
  InputVisibility,
  RevealBeat,
  RewriteDraft,
  RewriteOverviewField,
  RewriteStep,
  OutlineFactSheet,
  OutlineBatch,
  StructuredSummary,
} from "@/lib/types";
import type { InspirationDiagnosis } from "@/lib/original/story-intent-summary";
import {
  detectCrossEraHook,
  getScenarioEraInstruction,
  type EraProseValidationResult,
} from "@/lib/original/scenario-era-consistency";
import {
  buildAdaptProjectContext,
  buildProjectContext,
  buildRewriteProjectContext,
  getTargetCharacterCount,
  resolveCharacterRosterInfo,
  resolveGenerationConstraints,
  buildRequiredCharacterSlots,
  formatRequiredCharacterSlots,
} from "@/lib/ai/context";
import { buildPhoneticNameMappingHint } from "@/lib/original/name-library";
import { buildLocalizationHints, buildOutlineLocalizationHints } from "@/lib/original/localization/prompt-hints";
import { formatPromptSkillsForTarget } from "@/lib/quality-os";
import type { RuleApplyTarget } from "@/lib/quality-os";
import { getRhythmTemplate, getRhythmBatch, getRhythmAnchorsForRange } from "@/lib/quality-os/rhythm-templates";

type PromptBundle = {
  system: string;
  user: string;
};

type OutlineGenerationMode = "batch_rough_outlines" | "batch_episodes";

function buildCharactersJsonSchema(targetCharacterCount?: number, includeAdaptationMeta = true) {
  const baseTemplates = includeAdaptationMeta
    ? [
        '{"id":"protagonist","name":"string","gender":"male","role":"主角","age":22,"traits":"string","background":"string","adaptationMeta":{"sourceName":"string","adaptedName":"string","targetMarket":"string","roleFunction":"string","publicIdentity":"string","hiddenIdentity":"string","factionOrSpecies":"string","relationshipHook":"string","localizationNote":"string"}}',
        '{"id":"antagonist","name":"string","gender":"male","role":"对手/反派","age":22,"traits":"string","background":"string","adaptationMeta":{"sourceName":"string","adaptedName":"string","targetMarket":"string","roleFunction":"string","publicIdentity":"string","hiddenIdentity":"string","factionOrSpecies":"string","relationshipHook":"string","localizationNote":"string"}}',
        '{"id":"relationship","name":"string","gender":"female","role":"情感/关系角色","age":22,"traits":"string","background":"string","adaptationMeta":{"sourceName":"string","adaptedName":"string","targetMarket":"string","roleFunction":"string","publicIdentity":"string","hiddenIdentity":"string","factionOrSpecies":"string","relationshipHook":"string","localizationNote":"string"}}',
        '{"id":"ally","name":"string","gender":"male","role":"关键助推角色","age":22,"traits":"string","background":"string","adaptationMeta":{"sourceName":"string","adaptedName":"string","targetMarket":"string","roleFunction":"string","publicIdentity":"string","hiddenIdentity":"string","factionOrSpecies":"string","relationshipHook":"string","localizationNote":"string"}}',
        '{"id":"obstacle","name":"string","gender":"male","role":"关键阻碍角色","age":22,"traits":"string","background":"string","adaptationMeta":{"sourceName":"string","adaptedName":"string","targetMarket":"string","roleFunction":"string","publicIdentity":"string","hiddenIdentity":"string","factionOrSpecies":"string","relationshipHook":"string","localizationNote":"string"}}',
      ]
    : [
        '{"id":"protagonist","name":"string","gender":"male","role":"主角","age":22,"traits":"string","background":"string"}',
        '{"id":"antagonist","name":"string","gender":"male","role":"对手/反派","age":22,"traits":"string","background":"string"}',
        '{"id":"relationship","name":"string","gender":"female","role":"情感/关系角色","age":22,"traits":"string","background":"string"}',
        '{"id":"ally","name":"string","gender":"male","role":"关键助推角色","age":22,"traits":"string","background":"string"}',
        '{"id":"obstacle","name":"string","gender":"male","role":"关键阻碍角色","age":22,"traits":"string","background":"string"}',
      ];

  const normalizedTarget = typeof targetCharacterCount === "number" && Number.isFinite(targetCharacterCount)
    ? Math.max(3, Math.min(Math.trunc(targetCharacterCount), 8))
    : 5;

  if (normalizedTarget <= baseTemplates.length) {
    return `[${baseTemplates.slice(0, normalizedTarget).join(",")}]`;
  }

  const extraCount = normalizedTarget - baseTemplates.length;
  const extras = Array.from({ length: extraCount }, (_, index) =>
    `{"id":"supporter_${index + 1}","name":"string","gender":"male","role":"关键配角","age":22,"traits":"string","background":"string"}`,
  );

  return `[${baseTemplates.concat(extras).join(",")}]`;
}

/** 为 fixed-slot 改编模式生成动态 characters JSON schema，用 requiredCharacterSlots 的 slotId 替换旧 ID */
function buildFixedSlotCharactersJsonSchema(slots: Array<{ slotId: string }>) {
  const templates = slots.map(
    (slot) =>
      `{"id":"${slot.slotId}","name":"string","role":"中文角色功能描述","age":22,"traits":"string","background":"string","gender":"male | female | unknown","relationToMaleLead":"string","relationToFemaleLead":"string","relationshipTags":["string"],"adaptationMeta":{"slotId":"${slot.slotId}","sourceName":"string","adaptedName":"string","targetMarket":"string","roleFunction":"string","publicIdentity":"string","hiddenIdentity":"string","factionOrSpecies":"string","relationshipHook":"string","localizationNote":"string"}}`,
  );
  return `[${templates.join(",")}]`;
}

function getFixedSlotCharactersJsonRules(slots: Array<{ slotId: string }>) {
  return [
    "只返回 JSON，不要 Markdown，不要解释，不要额外说明。",
    "保持字段名完全一致。",
    `返回结构必须满足：${buildFixedSlotCharactersJsonSchema(slots)}`,
    `数组长度必须等于 ${slots.length}。`,
  ].join("\n");
}

function getJsonRules(
  step: OriginalStep,
  options?: { outlineGenerationMode?: OutlineGenerationMode },
  targetCharacterCount?: number,
  includeAdaptationMeta?: boolean,
) {
  const schemas: Record<OriginalStep, string> = {
    overview:
      '{"audience":"string","genres":"string","coreHooks":"string","styleTags":"string","worldview":"string","highlight":"string","premise":"string"}',
    characters: buildCharactersJsonSchema(targetCharacterCount, includeAdaptationMeta),
    outlines:
      options?.outlineGenerationMode === "batch_rough_outlines"
        ? '{"macro":"string","outlineBatches":[{"batchIndex":1,"startEpisode":1,"endEpisode":10,"roughOutline":"string","status":"rough_ready|empty","arcIndex":1,"majorBeatAnchor":"string"}]}'
        : options?.outlineGenerationMode === "batch_episodes"
          ? '{"episodes":[{"episodeNumber":1,"title":"string","summary":"string","hook":"string"}]}'
        : '{"range":"string","macro":"string","episodes":["string"],"originalPhaseRanges":[{"phase":"起|承|转|合","startEpisode":1,"endEpisode":3,"stageTask":"string","relationshipTask":"string","emotionTask":"string","mustHaveCardTypes":["string"]}]}',
    script: '{"episode":"string","content":"string"}',
  };

  const lines = [
    "只返回 JSON，不要 Markdown，不要解释，不要额外说明。",
    "保持字段名完全一致。",
    `返回结构必须满足：${schemas[step]}`,
  ];
  if (step === "characters") {
    lines.push("数组长度必须等于角色数量目标。");
  }
  return lines.join("\n");
}

function cleanOptionalText(value: unknown, fallback = "未填写") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getAdaptationStrategyLabel(value: unknown) {
  switch (value) {
    case "auto":
      return "自动匹配";
    case "preserve_original":
      return "保留原设";
    case "market_package":
      return "市场化包装";
    case "short_drama_boost":
      return "强化短剧爽点";
    default:
      return "自动匹配";
  }
}

/** P0-Rule-4: OriginalStep → RuleApplyTarget 映射 */
function stepToPromptSkillTarget(step: OriginalStep): RuleApplyTarget | null {
  switch (step) {
    case "overview": return "overview";
    case "characters": return "characters";
    case "outlines": return "outline";
    default: return null;
  }
}

/** P0-Rule-4: 将非空规则块追加到 prompt 末尾，空则不输出噪音 */
function appendPromptSkillBlock(block: string): string {
  if (!block.trim()) return "";
  return `\n\n【Quality OS 生成约束】\n${block}`;
}

// ==================== 批次粗纲节奏提示 helpers ====================

/** 30集单元内六段卡点定义 */
const THIRTY_UNIT_BEATS: { key: string; label: string; start: number; end: number; desc: string }[] = [
  { key: "\u8d77", label: "\u8d77", start: 1, end: 3, desc: "\u8d77\uff1a\u5f00\u5c40\u70b8\u70b9\u3001\u7acb\u4eba\u8bbe\u3001\u5f3a\u53cd\u5dee" },
  { key: "\u56f0", label: "\u56f0", start: 4, end: 9, desc: "\u56f0\uff1a\u538b\u8feb\u52a0\u6df1\u3001\u8bef\u5224\u62c9\u626f\uff0c\u670d\u52a1\u4e00\u5361" },
  { key: "\u53cd", label: "\u53cd", start: 10, end: 12, desc: "\u53cd\uff1a\u4e00\u5361\u7206\u53d1\u3001\u7b2c\u4e00\u8f6e\u53cd\u8f6c\u3001\u4f59\u9707/\u52a0\u5361" },
  { key: "\u5347", label: "\u5347", start: 13, end: 21, desc: "\u5347\uff1a\u65b0\u538b\u8feb\u6e90\u5165\u573a\uff0c\u51b2\u7a81\u5347\u7ea7\uff0c\u670d\u52a1\u4e8c\u5361\u548c\u538b\u8feb\u5361" },
  { key: "\u723d", label: "\u723d", start: 22, end: 27, desc: "\u723d\uff1a\u84c4\u529b\u53cd\u6740\u3001\u96c6\u4e2d\u5151\u73b0\u3001\u9636\u6bb5\u6253\u8138" },
  { key: "\u5408", label: "\u5408", start: 28, end: 30, desc: "\u5408\uff1a\u9636\u6bb5\u6536\u675f\uff0c\u629b\u4e0b\u4e00\u5355\u5143\u94a9\u5b50" },
];

/** 30集单元内的锚点定义（local episode） */
const THIRTY_UNIT_ANCHORS: { localEp: number; label: string }[] = [
  { localEp: 1, label: "\u5f00\u5c40\u70b8\u70b9" },
  { localEp: 3, label: "\u7b2c\u4e00\u7559\u5b58\u94a9" },
  { localEp: 6, label: "\u671f\u5f85\u5f3a\u5316\u5361" },
  { localEp: 9, label: "\u4e00\u5361\u524d\u591c" },
  { localEp: 10, label: "\u4e00\u5361/\u7b2c\u4e00\u5f3a\u4ed8\u8d39\u70b9" },
  { localEp: 12, label: "\u4e00\u5361\u4f59\u9707/\u52a0\u5361" },
  { localEp: 16, label: "\u4e8c\u5361\u524d\u591c" },
  { localEp: 17, label: "\u4e8c\u5361/\u4e2d\u6bb5\u5f3a\u4ed8\u8d39\u70b9" },
  { localEp: 21, label: "\u5347\u7ea7\u540e\u538b\u8feb\u5361" },
  { localEp: 24, label: "\u4e09\u5361\u524d\u591c" },
  { localEp: 27, label: "\u4e09\u5361/\u9636\u6bb5\u5927\u723d\u70b9" },
  { localEp: 30, label: "\u5355\u5143\u7ed3\u5c3e\u94a9" },
];

/**
 * 1. resolveSeriesAct(totalEpisodes, episodeNumber)
 * 按全剧四幕总控（起/承/转/合）定位单集所属幕段。
 */
function resolveSeriesAct(totalEpisodes: number, episodeNumber: number): string {
  const n = totalEpisodes;
  const acts: { act: string; start: number; end: number }[] = [];
  if (n === 30) { acts.push({ act: "\u8d77", start: 1, end: 10 }, { act: "\u627f", start: 11, end: 17 }, { act: "\u8f6c", start: 18, end: 27 }, { act: "\u5408", start: 28, end: 30 }); }
  else if (n === 40) { acts.push({ act: "\u8d77", start: 1, end: 3 }, { act: "\u627f", start: 4, end: 12 }, { act: "\u8f6c", start: 13, end: 30 }, { act: "\u5408", start: 31, end: 40 }); }
  else if (n === 60) { acts.push({ act: "\u8d77", start: 1, end: 10 }, { act: "\u627f", start: 11, end: 30 }, { act: "\u8f6c", start: 31, end: 50 }, { act: "\u5408", start: 51, end: 60 }); }
  else if (n === 80) { acts.push({ act: "\u8d77", start: 1, end: 3 }, { act: "\u627f", start: 4, end: 12 }, { act: "\u8f6c", start: 13, end: 30 }, { act: "\u5408", start: 31, end: 40 }, { act: "\u8d77", start: 41, end: 43 }, { act: "\u627f", start: 44, end: 52 }, { act: "\u8f6c", start: 53, end: 70 }, { act: "\u5408", start: 71, end: 80 }); }
  else if (n === 100) { acts.push({ act: "\u8d77", start: 1, end: 20 }, { act: "\u627f", start: 21, end: 50 }, { act: "\u8f6c", start: 51, end: 80 }, { act: "\u5408", start: 81, end: 100 }); }
  else if (n === 120) { acts.push({ act: "\u8d77", start: 1, end: 30 }, { act: "\u627f", start: 31, end: 60 }, { act: "\u8f6c", start: 61, end: 90 }, { act: "\u5408", start: 91, end: 120 }); }
  else {
    // fallback 比例法
    const q1 = Math.ceil(n * 0.2);
    const q2 = Math.ceil(n * 0.5);
    const q3 = Math.ceil(n * 0.8);
    acts.push({ act: "\u8d77", start: 1, end: q1 }, { act: "\u627f", start: q1 + 1, end: q2 }, { act: "\u8f6c", start: q2 + 1, end: q3 }, { act: "\u5408", start: q3 + 1, end: n });
  }
  for (const a of acts) { if (episodeNumber >= a.start && episodeNumber <= a.end) return a.act; }
  return "\u5408";
}

/**
 * 2. resolveEpisodeUnit(episodeNumber)
 * 计算 episodeNumber 所属的 30 集单元索引和本地集号。
 */
function resolveEpisodeUnit(episodeNumber: number): { unitIndex: number; unitStart: number; localEpisode: number } {
  const unitIndex = Math.floor((episodeNumber - 1) / 30) + 1;
  const unitStart = (unitIndex - 1) * 30 + 1;
  const localEpisode = episodeNumber - unitStart + 1;
  return { unitIndex, unitStart, localEpisode };
}

/**
 * 3. resolveMicroBeat(localEpisode)
 * 按 30 集单元内六段卡点返回 localEpisode 所属段。
 */
function resolveMicroBeat(localEpisode: number): typeof THIRTY_UNIT_BEATS[number] | null {
  for (const beat of THIRTY_UNIT_BEATS) {
    if (localEpisode >= beat.start && localEpisode <= beat.end) return beat;
  }
  return null;
}

/**
 * 4. resolveBatchCoverage(startEpisode, endEpisode)
 * 用区间交集计算批次覆盖哪些六段功能段。
 * 返回覆盖的 beat 列表，每项附带交集范围。
 */
function resolveBatchCoverage(startEpisode: number, endEpisode: number): { beat: typeof THIRTY_UNIT_BEATS[number]; localCoverStart: number; localCoverEnd: number; episodeCoverStart: number; episodeCoverEnd: number }[] {
  const { unitIndex, unitStart } = resolveEpisodeUnit(startEpisode);
  const localStart = startEpisode - unitStart + 1;
  const localEnd = endEpisode - unitStart + 1;
  const result: { beat: typeof THIRTY_UNIT_BEATS[number]; localCoverStart: number; localCoverEnd: number; episodeCoverStart: number; episodeCoverEnd: number }[] = [];
  for (const beat of THIRTY_UNIT_BEATS) {
    const overlapStart = Math.max(localStart, beat.start);
    const overlapEnd = Math.min(localEnd, beat.end);
    if (overlapStart <= overlapEnd) {
      result.push({
        beat,
        localCoverStart: overlapStart,
        localCoverEnd: overlapEnd,
        episodeCoverStart: unitStart + overlapStart - 1,
        episodeCoverEnd: unitStart + overlapEnd - 1,
      });
    }
  }
  return result;
}

/**
 * 5. resolveBatchAnchors(startEpisode, endEpisode)
 * 用区间筛选：返回批次覆盖的锚点列表。
 */
function resolveBatchAnchors(startEpisode: number, endEpisode: number): { localEp: number; episodeNumber: number; label: string }[] {
  const { unitIndex, unitStart } = resolveEpisodeUnit(startEpisode);
  const localStart = startEpisode - unitStart + 1;
  const localEnd = endEpisode - unitStart + 1;
  return THIRTY_UNIT_ANCHORS
    .filter((a) => a.localEp >= localStart && a.localEp <= localEnd)
    .map((a) => ({ localEp: a.localEp, episodeNumber: unitStart + a.localEp - 1, label: a.label }));
}

/**
 * 6. resolveBatchRhythmContext(totalEpisodes, startEpisode, endEpisode)
 * 组合输出批次的完整节奏上下文。
 */
function resolveBatchRhythmContext(totalEpisodes: number, startEpisode: number, endEpisode: number): {
  seriesAct: string;
  unitIndex: number;
  unitStart: number;
  coverage: ReturnType<typeof resolveBatchCoverage>;
  anchors: ReturnType<typeof resolveBatchAnchors>;
  coverageText: string;
  anchorText: string;
  batchTask: string;
} {
  const seriesAct = resolveSeriesAct(totalEpisodes, startEpisode);
  const { unitIndex, unitStart } = resolveEpisodeUnit(startEpisode);
  const coverage = resolveBatchCoverage(startEpisode, endEpisode);
  let anchors = resolveBatchAnchors(startEpisode, endEpisode);

  let coverageText = coverage
    .map((c) => `EP${c.episodeCoverStart}-${c.episodeCoverEnd} ${c.beat.key}`)
    .join("\uff0c");

  let batchTask = "";

  // 40/80集：使用共享节奏模板覆盖（非均匀六段锚点、覆盖、批次任务）
  if (totalEpisodes === 40 || totalEpisodes === 80) {
    const template = getRhythmTemplate(totalEpisodes);
    if (template) {
      anchors = getRhythmAnchorsForRange(totalEpisodes, startEpisode, endEpisode).map((a) => ({
        localEp: a.episodeNumber,
        episodeNumber: a.episodeNumber,
        label: a.labelForPrompt,
      }));
      const batch = getRhythmBatch(totalEpisodes, startEpisode, endEpisode);
      if (batch) {
        coverageText = batch.coverageText;
        if (batch.batchTaskForPrompt) {
          batchTask = batch.batchTaskForPrompt;
        }
      }
    }
  }

  const anchorText = anchors.length > 0
    ? anchors.map((a) => `EP${a.episodeNumber} ${a.label}`).join(" / ")
    : "\u65e0";

  // 按 coverage 中出现的 beat 判断本批任务（仅60/100/120/30等使用30集单元系统时）
  if (!batchTask) {
    const beatKeys = coverage.map((c) => c.beat.key);
    const hasQi = beatKeys.includes("\u8d77");
    const hasKun = beatKeys.includes("\u56f0");
    const hasFan = beatKeys.includes("\u53cd");
    const hasSheng = beatKeys.includes("\u5347");
    const hasShuang = beatKeys.includes("\u723d");
    const hasHe = beatKeys.includes("\u5408");

    if (hasQi && hasKun && hasFan) batchTask = "\u5efa\u7acb\u4e3b\u89d2\u5904\u5883\u3001\u6838\u5fc3\u8bef\u5224\u3001\u538b\u8feb\u6e90\u548c\u7b2c\u4e00\u6b21\u5f3a\u53cd\u8f6c\uff08\u8d77\u2192\u56f0\u2192\u53cd\uff09";
    else if (hasFan && hasSheng) batchTask = "\u627f\u63a5\u4e0a\u4e00\u5361\u723d\u70b9\uff0c\u5f15\u5165\u66f4\u9ad8\u5c42\u538b\u529b\uff0c\u4e3b\u89d2\u8fdb\u5165\u66f4\u6df1\u5c40\uff08\u53cd\u2192\u5347\uff09";
    else if (hasSheng && hasShuang && hasHe) batchTask = "\u5347\u538b\u8f6c\u723d\u6536\u675f\uff0c\u4e3b\u89d2\u53cd\u6740\u5151\u73b0\u5e76\u629b\u4e0b\u4e00\u5355\u5143\u94a9\u5b50\uff08\u5347\u2192\u723d\u2192\u5408\uff09";
    else if (hasShuang && hasHe) batchTask = "\u96c6\u4e2d\u5151\u73b0\u723d\u70b9\uff0c\u9636\u6bb5\u6536\u675f\u629b\u94a9\uff08\u723d\u2192\u5408\uff09";
    else if (hasQi && hasKun) batchTask = "\u5efa\u7acb\u4eba\u8bbe\u3001\u5236\u9020\u53cd\u5dee\u3001\u52a0\u6df1\u538b\u8feb\uff08\u8d77\u2192\u56f0\uff09";
    else batchTask = "\u4ece\u672c\u6279\u5f00\u5c40\u63a8\u8fdb\u5230\u672c\u6279\u672b\u5c3e\u5361\u70b9";
  }

  return { seriesAct, unitIndex, unitStart, coverage, anchors, coverageText, anchorText, batchTask };
}

/**
 * 为 batch_rough_outlines prompt 生成每个批次的节奏提示文本。
 * 使用区间交集法确保批次覆盖的功能段准确。
 */
function buildBatchRoughOutlineRhythmHints(
  batchPlan: OutlineBatch[],
  totalEpisodeCount: number,
): string {
  return batchPlan
    .map((batch) => {
      const ctx = resolveBatchRhythmContext(totalEpisodeCount, batch.startEpisode, batch.endEpisode);
      const localStart = batch.startEpisode - ctx.unitStart + 1;
      const localEnd = batch.endEpisode - ctx.unitStart + 1;
      const lines = [
        `第${batch.batchIndex}批 第${batch.startEpisode}-${batch.endEpisode}集：`,
        `- 全剧幕段：${ctx.seriesAct}`,
        `- 30集单元：第${ctx.unitIndex}单元（本地 EP${localStart}-${localEnd}）`,
        `- 覆盖功能段：${ctx.coverageText}`,
        `- 批次锚点：${ctx.anchorText}`,
        `- 本批任务：${ctx.batchTask}`,
        `- roughOutline 写法：连续事件链，从本批开局推进到本批末尾卡点，不要写成策划摘要`,
      ];
      // 80集第二循环递增提示（来自共享节奏模板）
      if (totalEpisodeCount === 80 && batch.batchIndex >= 5) {
        const tpl = getRhythmTemplate(80);
        if (tpl?.secondCycleEscalationHint) {
          lines.push(`- ${tpl.secondCycleEscalationHint}`);
        }
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

export function buildPrompt(
  step: OriginalStep,
  draft: OriginalDraft,
  contextOptions?: {
    factSheet?: OutlineFactSheet;
    structuredSummary?: StructuredSummary;
    factSheetStale?: boolean;
    structuredSummaryStale?: boolean;
    revealBeats?: RevealBeat[];
    currentEpisode?: number;
    outlineGenerationMode?: OutlineGenerationMode;
    totalEpisodeCount?: number;
    batchPlan?: OutlineBatch[];
    batchIndex?: number;
    startEpisode?: number;
    endEpisode?: number;
    roughOutline?: string;
    /** 自动补救模式 */
    repairMode?: boolean;
    validationFailure?: {
      reason: "too_short" | "zero_scenes" | "too_many_scenes";
      contentLength: number;
      minLength: number;
      sceneCount: number;
      sceneLimitPerEpisode: number;
      targetWordsPerEpisode: number;
    };
  },
): PromptBundle {
  const context = buildProjectContext(draft, { ...contextOptions, step });
  const targetCharacterCount = getTargetCharacterCount(draft);
  const rosterInfo = resolveCharacterRosterInfo(draft);
  const rawRequiredCharacterSlots = buildRequiredCharacterSlots(draft);
  const isFixedSlotCharactersPrompt =
    step === "characters" &&
    rawRequiredCharacterSlots.length > 0 &&
    rosterInfo?.characterCountSource !== "configured_main_characters_limit";
  const requiredCharacterSlots = isFixedSlotCharactersPrompt
    ? rawRequiredCharacterSlots
    : rawRequiredCharacterSlots.slice(0, targetCharacterCount);
  const effectiveCharacterCount = isFixedSlotCharactersPrompt ? requiredCharacterSlots.length : targetCharacterCount;
  const adaptation = draft.adaptation?.status === "applied" ? draft.adaptation : undefined;
  const localizationHints =
    isFixedSlotCharactersPrompt && adaptation
      ? buildLocalizationHints(requiredCharacterSlots, adaptation.targetMarket)
      : "";
  const scriptAdaptationNotes =
    step === "script" && adaptation
      ? "【改编项目】本项目来自上传大纲改编。改编策略已在上下文中声明，正文只做表达层本土化，不改故事骨架和角色功能。"
      : "";
  const outlineAdaptationNotes =
    step === "outlines" && adaptation
      ? [
          "【改编项目模式】本项目来自上传大纲改编。",
          `目标市场：${adaptation.targetMarket}`,
          adaptation.targetMarket === "中国"
            ? "中国市场：正常中文短剧改编，保留原设优先，不强制海外化，不强制替换原设。"
            : adaptation.targetMarket === "北美"
              ? "北美市场：北美英语短剧本土化，优先从公开高频类型池选择合适外壳，不机械套用狼人或吸血鬼。"
              : adaptation.targetMarket === "日本"
                ? "日本市场：日本市场本土化，命名可倾向日文名，复杂设定优先降低理解门槛。"
                : adaptation.targetMarket === "韩国"
                  ? "韩国市场：韩国市场本土化，命名可倾向韩文名，强化阶层压迫、家族关系和复仇爽点。"
                  : adaptation.targetMarket === "印度"
                    ? "印度市场：印度市场本土化，命名可倾向印度名，强化家族、婚约、名誉和阶层翻盘。"
                    : "东南亚市场：东南亚区域本土化，保留东方情绪结构但降低复杂设定门槛。",
          "原文分集大纲、故事梗概、人物小传、世界观、故事背景，以及改编抽取与市场改写建议都已在上下文中提供。",
          `总集数约束：以 outlineConstraints.targetEpisodeCount 为准；用户选择多少集，终局就落在多少集。`,
          "分集生成必须优先保留原大纲事件推进和角色功能，只做目标市场表达层本土化，不改故事骨架。",
          "人物称呼硬规则：中文分集大纲正文的人物称呼必须使用人物小传中的中文显示名 character.name；不得直接使用 adaptedName 英文名；sourceName 只用于原文对照，不作为正文称呼。",
        ].join("\n")
      : "";
  const outlineLocalizationHints =
    step === "outlines" && adaptation
      ? buildOutlineLocalizationHints({
          projectBrief: draft.overview.projectBrief
            ? [
                draft.overview.projectBrief.genres?.join(" "),
                draft.overview.projectBrief.coreHooks?.join(" "),
                draft.overview.projectBrief.styleTags?.join(" "),
                draft.overview.projectBrief.coreEmotion,
              ].filter(Boolean).join(" ")
            : undefined,
          scriptPlan: draft.overview.scriptPlan
            ? [
                draft.overview.scriptPlan.logline,
                draft.overview.scriptPlan.mainConflict,
                draft.overview.scriptPlan.protagonistGoal,
                draft.overview.scriptPlan.antagonistPressure,
                draft.overview.scriptPlan.relationshipEngine,
              ].filter(Boolean).join(" ")
            : undefined,
          overview: [
            draft.overview.premise,
            draft.overview.worldview,
            draft.overview.highlight,
          ].filter(Boolean).join(" "),
          characters: draft.characters
            .slice(0, 8)
            .map((c) => [c.name, c.role, c.background].filter(Boolean).join(" "))
            .join(" "),
          outlines: draft.outlines.macro,
          roughOutlines: draft.outlines.outlineBatches
            ?.map((b) => b.roughOutline)
            .filter(Boolean)
            .join(" "),
          sourceMaterialExtraction: adaptation.sourceMaterialExtraction
            ? [
                ...(Array.isArray(adaptation.sourceMaterialExtraction.characters)
                  ? adaptation.sourceMaterialExtraction.characters.map(c => c.sourceName).filter(Boolean)
                  : []),
                ...(Array.isArray(adaptation.sourceMaterialExtraction.powerSystem)
                  ? adaptation.sourceMaterialExtraction.powerSystem
                  : []),
                ...(Array.isArray(adaptation.sourceMaterialExtraction.keyEvents)
                  ? adaptation.sourceMaterialExtraction.keyEvents.slice(0, 3)
                  : []),
              ].filter(Boolean).join(" ")
            : undefined,
          sourceSections: [
            draft.outlines.sourceSections?.storySynopsisText,
            draft.outlines.sourceSections?.storyBackgroundText,
            draft.outlines.sourceSections?.worldSettingText,
          ].filter(Boolean).join(" "),
          targetMarket: adaptation.targetMarket,
        })
      : "";

  const system = [
    "你是资深短剧策划师、编剧统筹和改编编辑。",
    "你擅长生成男频/女频短剧设定、角色小传、分集大纲和剧本正文。",
    "请严格继承用户当前项目上下文，保证人物、世界观、冲突和爽点一致。",
    "输出必须适合短剧平台创作后台直接回填。",
    isFixedSlotCharactersPrompt
      ? getFixedSlotCharactersJsonRules(requiredCharacterSlots)
      : getJsonRules(step, contextOptions, effectiveCharacterCount, !!adaptation),
  ].join("\n");

  const scriptConstraints = step === "script" ? resolveGenerationConstraints(draft) : null;

  const tasks: Record<OriginalStep, string> = {
    overview: [
      "请补全并优化故事梗概。",
      "要求：把当前项目重写为统一的故事母本，不要只输出抽象设定摘要或题材标签。",
      draft.characters.length > 0
        ? "上下文里已经有人物小传时，必须沿用现有人物名、身份关系、主角目标和反派压力；不得另起一套人物或关系。"
        : "如果后续有人物小传，故事梗概必须能承接人物化落地，而不是停留在抽象设定。",
      "优先级：1) projectBrief / scriptPlan 的受众、题材、集数、世界规则和核心设定；2) 已有人物小传中的姓名、身份、关系、目标和压迫源；3) 原故事梗概 / worldview / highlight 的抽象摘要。",
      "最终输出必须包含：主角是谁、主角表面身份/隐藏身份、主角当前困境、压迫源是谁、核心规则/世界机制、主角目标、可承接后续分集的主线矛盾。",
      "如果已有字段写得不错，可以在原意基础上增强，但要把抽象设定重写成更统一、更具体的人物化母本。",
    ].join("\n"),
    characters: isFixedSlotCharactersPrompt
      ? [
          "本项目来自上传大纲改编，已识别原文人物表。",
          "请严格按固定角色槽位逐项生成，不要自行新增 supporter_x / rival_y。",
          "",
          `【数量硬约束】本轮固定槽位输出：${requiredCharacterSlots.length} 人。本轮只生成 fixed-slot 中列出的 ${requiredCharacterSlots.length} 个角色，不补齐原文全部人物。`,
          "",
          "必须按 requiredCharacterSlots 顺序生成，每个 slot 恰好 1 个角色。",
          "id 与 adaptationMeta.slotId 必须等于对应 slotId。",
          "",
          "【固定角色槽位】",
          formatRequiredCharacterSlots(requiredCharacterSlots),
          "",
          "",
          "【角色命名规则 — 必须严格遵守】",
          (() => {
            const hintNames = requiredCharacterSlots.map((s) => s.adaptedName).filter((n): n is string => !!n);
            const hint = buildPhoneticNameMappingHint(hintNames);
            return hint
              ? `- name：必须是 adaptedName 的中文音译显示名。常用映射参考：${hint}。`
              : "- name：必须是 adaptedName 的中文音译显示名，按标准音译规则将英文名转为中文名。";
          })(),
          "- name 不得直接输出英文名（如 Ethan、Noah、Ava、Mia）。",
          "- name 不得生成原创中文短剧角色名（如 陆以辰、顾沉舟、苏念卿）。",
          "- adaptedName：保留英文标准名，不做更改。",
          "- sourceName：保留原大纲中文名，不做更改。",
          "- 后续回译以 adaptedName 为准，name 仅用于前台中文显示。",
          "",
          "【输出格式硬约束】",
          "- 必须返回顶层 JSON 数组，长度必须等于角色数量目标。",
          "- 每个角色对象必须包含 id、name、role、age、traits、background、gender、relationToMaleLead、relationToFemaleLead、relationshipTags、adaptationMeta。",
          "- id 与 adaptationMeta.slotId 必须等于对应槽位的 slotId。",
          "- gender 只允许 \"male\"、\"female\"、\"unknown\"，不明确时输出 \"unknown\"。",
          "- role 必须是中文角色功能描述，不要使用 supporter_x、rival_y、slotId 或调试词。",
          "- background 只写自然人物设定卡：身份、性格、欲望、弱点、秘密、行动方式，不要写内部模板词、slot 功能词、debug 文案。不要把 roleFunction 原样写进 background / publicIdentity / relationshipHook。",
          "- 如果原文关系不明确，relationToMaleLead=\"unknown\"、relationToFemaleLead=\"unknown\"、relationshipTags=[]。",
          "- relationshipHook 同理，不明确时输出 \"\"。",
          "- 不要写案件经过、具体场景、具体组织事件、具体会议、具体饭局、具体项目。",
          "",
          ...(localizationHints ? [localizationHints, ""] : []),
          "背景要为人物行动提供动机，但不要补完整剧情开端；人物小传只保留潜在反转空间，不提前定死终局反转。",
        ].join("\n")
      : [
          "请根据当前项目上下文、策划约束和剧本策划，生成核心人物卡。",
          "人物阵容必须严格服务于上方项目约束、剧本策划、主线冲突、关系引擎和爽点设计。",
          adaptation
            ? [
                "【改编项目模式】本项目来自上传大纲改编，必须优先保留原角色功能，再做目标市场本土化命名与身份映射。",
                `目标市场：${adaptation.targetMarket}`,
                adaptation.targetMarket === "中国"
                  ? "中国市场：正常中文短剧改编，默认保留原角色名和原设定，只强化短剧人物欲望、关系张力、冲突功能和阶段成长。"
                  : adaptation.targetMarket === "北美"
                    ? "北美市场：北美英语短剧本土化，优先参考公开高频类型池承接原角色功能，不机械套用狼人或吸血鬼。"
                    : adaptation.targetMarket === "日本"
                      ? "日本市场：日本市场本土化，命名可倾向日文名，复杂设定优先降低理解门槛。"
                      : adaptation.targetMarket === "韩国"
                        ? "韩国市场：韩国市场本土化，命名可倾向韩文名，强化阶层压迫、家族关系和复仇爽点。"
                        : adaptation.targetMarket === "印度"
                          ? "印度市场：印度市场本土化，命名可倾向印度名，强化家族、婚约、名誉和阶层翻盘。"
                          : "东南亚市场：东南亚区域本土化，保留东方情绪结构但降低复杂设定门槛。",
                "sourceName 与 adaptedName 必须保留对照；中国市场允许 adaptedName 与 sourceName 相同。",
                "人物小传可补充 adaptationMeta，用于记录原角色名、目标市场名、角色功能、公开身份、隐藏身份、阵营或组织、关系钩子和本土化说明。",
              ].join("\n")
            : [
                "【中文命名约束 — 必须严格遵守】",
                "本项目为原创中文短剧，所有角色 name 必须使用中文姓名。",
                "严禁使用英文名、音译名或海外化姓名（如 Alex、乔丹、凯西、朱利安、伊森、Ava、Mia 等）。",
                "应使用常见中文姓氏+两字名，如张建国、李秀英、王大海、陈雪梅等。",
                "年代/古装/现代题材应符合对应历史时期的命名习惯。",
                "年代题材（如九十年代国营厂）应使用当时常见的中文姓名，符合时代语境。",
              ].join("\n"),
          "",
          `【数量硬约束】角色数量目标：${targetCharacterCount} 个。必须严格生成对应数量的角色，禁止多写或少写。`,
          "",
          targetCharacterCount <= 3
            ? "【3 人模式】只需生成：1. 主角 2. 对手/反派 3. 情感/关系角色或关键关系变量。第三人只能主打一个功能：情感/关系变量、关键证人、或暂时盟友但有隐藏立场，三选一，不要同时兼任多种功能。不要强行扩展到 5 类角色。"
            : [
                "【角色覆盖优先级】优先覆盖主角、对手/反派、情感/亲情关系角色、关键助推角色、关键阻碍角色，必要时用复合角色承接多种功能。",
                "如果角色数量目标大于 5，新增角色应作为关键配角/阻碍者/信息提供者/关系变量，扩展冲突网络。",
                "如果角色数量目标小于 5，优先保留主角、对手/反派、情感关系角色，可合并助推与阻碍功能。",
              ].join("\n"),
          "",
          "【输出格式硬约束】",
          "- 必须返回顶层 JSON 数组，长度必须等于角色数量目标",
          "- 每个 id 使用语义化标识（如 protagonist / antagonist / relationship / ally / obstacle / supporter_x / rival_y 等）",
          "- 禁止用对象包装（如 {\"characters\":[...]} 或 {\"protagonist\":{...}}），直接输出数组",
          "- 每个角色必须有 id、name、gender、role、age、traits、background 七个字段",
          "- gender 只允许 \"male\"、\"female\"、\"unknown\"，不明确时输出 \"unknown\"。必须与人物姓名、身份、称谓、background 保持一致。主角必须是明确性别，不得输出 unknown",
          "- role 必须填写中文角色功能（如'主角''对手/反派'），不能为空",
          "- traits 必须是逗号分隔的字符串，如\"坚韧,重情,隐忍\"",
          "- 【角色定位硬约束】role 是主角时，background 不能把该角色写成幕后黑手、最终反派、主要压迫者；role 是对手/反派时，background 不能在人物小传阶段把该角色写成最终守护者、真正盟友、恋爱归宿、共同对抗目标；role 是情感/关系角色时，background 不能把该角色写成最终反派、幕后黑手、终极 Boss、主要压迫者。",
          "- 人物可以有秘密、误会、隐藏立场，但不能推翻当前 role 定位；终局反转、洗白、黑化、背叛只能保留为后续粗纲/分集的潜在空间，不要在人物小传中定死。",
          "- 【traits 一致性约束】主角 traits 应体现隐忍、专业能力、反击、克制、底牌、成长等；对手/反派 traits 应体现压迫、强势、伪善、控制欲、资源优势、误导等；情感/关系角色 traits 应体现立场摇摆、掌握线索、情感牵引、保护欲、隐瞒、信任危机等。",
          "- 情感/关系角色禁止直接使用'斯文败类'、'伪善'、'幕后黑手'、'终极反派'、'真正黑手'等反派定位词；对手/反派禁止直接使用'守护者'、'护短'、'深情守护'、'最终盟友'等洗白定位词。",
          "- 如果要表现复杂性，使用'立场复杂'、'利益牵连'、'隐瞒线索'、'暂不可信'，不要直接改写角色阵营。",
          "- background 必须是纯字符串，写成人物设定卡，不写完整剧情开端或案件经过。它只能包含：表面身份、隐藏身份/隐藏能力/隐秘动机、与主线核心设定的关系、与主角/反派/关系角色的关系张力、欲望/弱点/秘密/行动方式。",
          "- 不要写已经发生的案件经过、具体场景、具体组织事件、具体会议、具体饭局、具体项目。",
          "- 如果必须提到案件/真相/证据，只能写成与某个未揭开的旧案/真相/证据相关，不要展开细节。",
          "- 如果必须写关系角色，只写关系功能和隐藏立场，不要直接写成固定桥段名称，除非故事母本明确存在。",
          "- 禁止把多个人物的关系写在一个角色的 background 里来替代多人物输出",
          "- 【3 人模式补充】第三人只能提供关系张力或线索张力，不要同时承担盟友、幕后黑手、终极对手、情感对象多重功能；如果需要隐藏立场，只能写成'掌握部分真相但未完全坦白'或'利益上有保留'，不能写成'幕后操纵一切'。",
          "- 禁止用嵌套对象或子数组作为字段值",
          "",
          "背景要为人物行动提供动机，但不要补完整剧情开端；人物小传只保留潜在反转空间，不提前定死终局反转。",
        ].join("\n"),
    outlines:
      contextOptions?.outlineGenerationMode === "batch_rough_outlines"
        ? [
            outlineAdaptationNotes,
            `请生成 ${contextOptions.totalEpisodeCount ?? draft.overview.projectBrief?.episodeCount ?? 60} 集的批次粗纲。`,
            "只输出 JSON，不要 Markdown，不要解释，不要逐集分集。",
            "macro 输出整部剧总粗纲，outlineBatches 输出所有 10 集批次粗纲。",
            "outlineBatches 中的 roughOutline 必须是单行 JSON string，禁止 Markdown，禁止代码块，禁止多行字符串。",
            "",
            "【全剧四幕总控】起→承→转→合。",
            "【30集剧情单元】起→困→反→升→爽→合。",
            "【10集批次事件链】每个批次 10 集为一个连续事件链单元。",
            (contextOptions?.totalEpisodeCount === 40
              ? "关键卡点锚：EP10 一卡，EP17 二卡，EP27 三卡，EP37 终局收束（EP40 仅收束钩）。"
              : contextOptions?.totalEpisodeCount === 80
                ? "关键卡点锚：EP10 一卡，EP17 二卡，EP27 三卡，EP37 第一循环收束，EP50 第二循环一卡，EP57 二卡，EP67 三卡，EP77 终局收束（EP80 仅结尾钩）。"
                : "关键卡点锚：EP1 开局炸点，EP10 一卡，EP17 二卡，EP27 三卡，EP30 单元结尾钩。"),
            "60集按两个30集单元串联；80集按两个40集非均匀六段循环（起1-3/困4-9/反10-12/升13-21/爽22-30/合31-40→起41-43/困44-49/反50-52/升53-61/爽62-70/合71-80），第二轮不能机械重复，必须在压迫源、反派层级、信息量、爽点代价上递增；100/120集继续按30集单元串联。",
            "前台不展示内部术语，但这次生成必须以内在约束方式使用这些卡点逻辑。",
            "不要生成完整 episodes，不要生成 originalPhaseRanges，不要把粗纲写成字段表。",
            "",
            (contextOptions.batchPlan && contextOptions.totalEpisodeCount
              ? [
                  "【各批次节奏提示】",
                  buildBatchRoughOutlineRhythmHints(contextOptions.batchPlan, contextOptions.totalEpisodeCount),
                ].join("\n")
              : `批次计划如下：\n${(contextOptions.batchPlan ?? []).map((batch) => `- 第${batch.batchIndex}批：第${batch.startEpisode}-${batch.endEpisode}集`).join("\n")}`),
            "",
            "【批次粗纲写法硬约束（roughOutline）】",
            "1. roughOutline 必须写成\u201c连续剧情事件链\u201d，不是策划摘要。",
            "2. 禁止以\u201c本批推进……\u201d\u201c本批围绕……\u201d\u201c本批核心……\u201d作为开头。",
            "3. 禁止输出阶段目标、核心冲突、关键人物推进这类字段表。",
            "4. 禁止直接写成第X集、第X+1集的完整分集大纲。",
            "5. 必须按事件因果顺序写：",
            "   主角处境 / 上批余波",
            "   → 新压迫入场",
            "   → 压迫逐层加码",
            "   → 主角主动动作",
            "   → 反派反制或误判升级",
            "   → 阶段卡点爆发",
            "   → 批尾钩子",
            "6. 每个 roughOutline 建议 450-900 中文字。",
            "7. roughOutline 可以分 2-4 个自然段，但作为 JSON string 必须正确转义换行；如果担心转义失败，则输出单行长字符串。",
            "8. roughOutline 必须能被下一步拆成当前批次的 10 集分集大纲。",
            "9. roughOutline 文案中不要暴露\u201c全剧四幕\u201d\u201c六段卡点\u201d\u201cEP17 二卡\u201d等内部术语；但生成时必须在内在逻辑上服从这些卡点。",
            (contextOptions?.totalEpisodeCount === 40
              ? "10. majorBeatAnchor 必须填写当前批次服务的关键卡点，如\u201cEP10 一卡\u201d\u201cEP17 二卡\u201d\u201cEP27 三卡\u201d\u201cEP37 终局收束\u201d。"
              : contextOptions?.totalEpisodeCount === 80
                ? "10. majorBeatAnchor 必须填写当前批次服务的关键卡点，如\u201cEP10 一卡\u201d\u201cEP17 二卡\u201d\u201cEP27 三卡\u201d\u201cEP37 第一循环收束\u201d\u201cEP50 一卡\u201d\u201cEP57 二卡\u201d\u201cEP67 三卡\u201d\u201cEP77 终局收束\u201d。"
                : "10. majorBeatAnchor 必须填写当前批次服务的关键卡点，如\u201cEP10 一卡\u201d\u201cEP17 二卡\u201d\u201cEP27 三卡\u201d\u201cEP30 单元结尾钩\u201d。"),
            "",
            "【粗纲表达去 AI 约束】",
            "roughOutline 必须像真实编剧写的批次剧情事件链，禁止 AI 策划报告腔。",
            "禁止使用\u201c本批推进\u201d\u201c本批围绕\u201d\u201c本批核心\u201d\u201c阶段目标是\u201d\u201c通过……展现\u201d\u201c进一步深化\u201d\u201c层层递进\u201d\u201c不断升级\u201d\u201c在……过程中\u201d等总结腔开头或过渡。",
            "每句话优先写：具体人物 + 具体动作 + 具体阻力 + 具体结果。",
            "可以概括，但必须是事件概括（谁做了什么、结果怎样），不是主题概括（本批讲述了……）。",
            "不要写成字段表、分析报告、主题摘要，不要拆成逐集大纲。",
            "必须保留：压迫递进、主角主动动作、反击机制、阶段反转、批尾钩子。",
            "",
            "【可读性去 AI 约束】",
            "不要使用生硬拗口的抽象词堆叠，优先用观众一眼能懂的说法。",
            "专业词可以出现，但一句话最多保留 1 个核心专业词；复杂规则必须用\u201c谁做了什么、导致谁失去什么/得到什么\u201d说清。",
            "禁止连续使用\u201c解释权、托管、主理人、外部变量、观察席位、承继链、互认条款、身份判定\u201d等抽象词推进剧情。",
            "每个复杂规则后必须落到可见动作，例如：冻结余款、堵门逼债、当众投屏、夺回仓单、赔款到账、封存账册、签下认责书。",
            "每句话尽量只表达一个动作或一个结果，不要把三层规则、两层反转和多人关系塞进一句话。",
            "如果一个词不影响剧情理解，优先换成更直白的说法。",
            "粗纲可以有专业设定，但必须让普通观众不查资料也能看懂当前危机。",
            "",
            "【Planning 优先级规则（必须遵守）】",
            "1. 用户最新编辑的项目约束、世界设定、剧本策划，优先于旧故事梗概和旧分集大纲。",
            "2. 项目硬约束必须遵守：剧本类型、总集数、单集目标字数、单集时长、主要人物上限、单集场景上限、制作复杂度。",
            "3. 世界设定不是装饰背景。如果世界设定包含强设定词，如\u201c三国\u201d\u201c机甲\u201d\u201c夜医\u201d\u201c规则怪谈\u201d\u201c玄幻\u201d\u201c末世\u201d\u201c权谋\u201d等，必须转化为分集事件、人物行动、场景规则、冲突机制或权力结构。",
            "4. 剧本策划决定戏剧推进：必须服务一句话故事、商业钩子、主冲突、主角目标、反派压力、关系引擎、前三集钩子和付费点设计。",
            "5. 人物小传决定人物行动方式与关系张力：每集事件要让主要角色产生目标、阻碍、选择、关系变化，但不得改写项目主线。",
            "6. 故事梗概只是摘要；如果故事梗概与项目策划、人物小传冲突，以最新项目主线和世界规则为准，不得另起主线。",
            "7. 旧分集大纲只能作为参考。重新生成时，如果旧大纲与最新设定冲突，必须重构，不得沿用旧时代、旧地点、旧规则。",
            "",
            "【短剧原则】",
            "- 低理解成本、强钩子、强冲突、强关系、强反转",
            "- 每集有增量，不写设定百科",
            ...(outlineLocalizationHints ? ["", outlineLocalizationHints] : []),
          ].filter(Boolean).join("\n")
        : contextOptions?.outlineGenerationMode === "batch_episodes"
          ? [
              outlineAdaptationNotes,
              "请只生成当前批次范围内的分集大纲。",
              `当前批次：第${contextOptions.startEpisode ?? 1}-${contextOptions.endEpisode ?? 10}集。`,
              "必须读取当前批次 roughOutline 作为唯一批次粗纲依据。",
              "只输出 JSON，不要 Markdown，不要解释，不要生成范围外集数。",
              `episodes 数组长度必须等于 ${Math.max(1, (contextOptions.endEpisode ?? 10) - (contextOptions.startEpisode ?? 1) + 1)}，并且必须连续覆盖第${contextOptions.startEpisode ?? 1}-${contextOptions.endEpisode ?? 10}集，不能跳号、缺号或补别的集数。`,
              "episodes 数组中的每一项必须包含 episodeNumber、title、summary、hook 四个字段。",
              "title 必须是 6-12 个字的剧情标题，不能直接写成\u201c第X集\u201d。",              "summary 必须是 60-110 字的自然语言段落，禁止列表、禁止流水账、禁止空话。",
              "hook 必须是 10-35 字的具体悬念或强反转，不要写\u201c留下悬念\u201d这种空话。",              "每集都要服务当前批次 roughOutline 的核心目标，不要另起炉灶。",
              "summary / hook 必须是单行 JSON string，禁止未转义换行，禁止 Markdown，禁止代码块。",
              "不要输出除 JSON 以外任何字符，最后一个字符必须是 }。",
              "如果字符串里必须出现双引号，请转义为 \\\"。",
              "后台生成仍需遵循六段卡点模型与关键卡点锚（EP1、EP10、EP17、EP27、EP30），但前台不要暴露这些术语。",
              "",
              "【短剧切集原则（必须遵守）】",
              "第1集必须炸开局，不是原文第一段摘要，不是线性平均切粗纲。",
              "第1集必须选择当前批次粗纲中最强的不可逆压力作为开场或结尾。",
              "允许冷开：可以把当前批次内稍后的高压事件前置为开场，再用闪回补足因果。",
              "不允许改变事件因果，不允许写出当前批次范围外事件。",
              "对\u201c低位主角被高位误认、假冒强者、不装就会死\u201d类故事，优先选择\u201c高位误认 / 生死威胁 / 身份错配 / 低位反控\u201d作为第1集核心钩子。",              "第1集不要只停在\u201c穿越、测试、异象\u201d这种铺垫，必须让主角进入不可逆危机或强身份误判。",              "例：如果粗纲中段有高位误认事件，可前置为第1集开场，再闪回解释因果——不要按时间顺序从最平淡处开始。",
              "第1集可以冷开或前置强危机，但 summary 必须保留危机触发因果：主角为什么被误认、误认依据是什么、为什么无法脱身。不得为了压缩字数删掉误认触发物、关键交易、关键证据或死亡威胁来源。",
              "",
              "【候选开篇机制（从当前批次粗纲中选择最强 1-2 个组合，用于第1集开场/结尾）】",
              "- 生死威胁：主角面临直接死亡危险，被迫做出不可逆选择。",
              "- 高位误认：主角被强者误认为不可惹的大人物，必须假装。",
              "- 身份错配：主角的隐藏身份被人当众揭露或错误归因。",
              "- 低位羞辱：主角因低身份/低战力被公开羞辱，但拥有反制资本。",
              "- 规则测试失败：主角在关键测试中失败，触发不可逆后果。",
              "- 异象降临：不可控的超自然异象爆发，把主角卷入核心冲突。",
              "注意：只选择与当前批次粗纲事件匹配的 1-2 个机制，不要把全部机制塞进分集大纲。",
              "",
              "【人物称呼硬规则（分集大纲专用，必须遵守）】",
              "分集大纲中的人物称呼必须优先使用人物小传中的 character.name（中文显示名）。",
              "sourceName / 原文名只用于原文对照，不得作为中文集纲中的正式称呼。",
              "如果当前批次粗纲中包含 sourceName（原文名），必须映射为对应人物的 character.name。",
              "如果无法映射到已知人物，不要生造核心人物名，使用功能称呼（如\u201c神秘少年\u201d\u201c黑袍男人\u201d\u201c测试官\u201d），并在 summary 中保持事件功能。",
              "",
              "【集纲表达去 AI 约束】",
              "每集集纲必须是可拍的单集事件卡，禁止 AI 摘要腔。",
              "每集 summary 必须包含：事件压力、主角动作、结果变化、结尾钩子。",
              "禁止使用\u201c本集围绕\u201d\u201c矛盾升级\u201d\u201c关系升温\u201d\u201c埋下伏笔\u201d\u201c继续展开\u201d\u201c逐步推进\u201d\u201c进一步\u201d\u201c在这个过程中\u201d等空泛表达，除非后面紧接具体事件内容。",
              "禁止只写情绪变化或关系变化，必须落到具体动作和可见结果（谁对谁做了什么、局面如何改变）。",
              "hook 必须是具体未解决问题、证据变化、身份风险、关系误判或新压迫，禁止写\u201c危机加深\u201d\u201c悬念升级\u201d等空话。",
              "如果第1集采用冷开，第2集 summary 必须明确回到前因（闪回或因果补足），避免时间线断裂。",
              "前半批只能埋线索，不得提前揭开本批末尾卡点。",
              "",
              "【可读性去 AI 约束】",
              "summary / hook 用词必须直白易懂，禁止生硬拗口的抽象词堆叠。",
              "一句话最多保留 1 个核心专业词；禁止连续使用\u201c解释权、托管、主理人、外部变量、观察席位、承继链、互认条款、身份判定\u201d等抽象词推进剧情。",
              "每个复杂规则后必须落到可见动作，例如：冻结余款、堵门逼债、当众投屏、夺回仓单、赔款到账、封存账册、签下认责书。",
              "每句话尽量只表达一个动作或一个结果，不要把多层规则和多人关系塞进一句话。",
              "如果一个词不影响剧情理解，优先换成更直白的说法。",
              "集纲可以有专业设定，但必须让普通观众不查资料也能看懂当前危机。",
              "",
              contextOptions.startEpisode === 1
                ? "当前是开局批次：第1集必须按上面【短剧切集原则】炸开局；前3集快速立人设和核心欲望；第7-10集持续蓄力到强卡点。"
                : contextOptions.endEpisode !== undefined && contextOptions.endEpisode <= 20
                  ? "当前是中段批次：前半段承接上一卡余震，中段持续加压，末段务必推到中段强卡点。"
                  : "当前是单元收束批次：前半段蓄力，中段推进强兑现，末段收束本单元并抛出下一单元钩子。",
              "不要输出 macro、outlineBatches、originalPhaseRanges，不要重写其他批次。",
              `当前批次粗纲：${cleanOptionalText(contextOptions.roughOutline)}`,
              ...(outlineLocalizationHints ? ["", outlineLocalizationHints] : []),
            ].filter(Boolean).join("\n")
        : [
            outlineAdaptationNotes,
            `请生成 ${draft.outlines.range || "1-10"} 的分集大纲。`,
            "macro 输出整段粗纲，episodes 输出按\u201c第1集：...\u201d格式排列的单集集纲。",            "要突出起承转合、每集钩子和阶段性升级。",
            "",
            "originalPhaseRanges：按起承转合划分阶段，每段含集数范围、阶段任务、关系线任务、情绪任务、必出卡类型。",
            "",
            "【Planning 优先级规则（必须遵守）】",
            "1. 用户最新编辑的项目约束、世界设定、剧本策划，优先于旧故事梗概和旧分集大纲。",
            "2. 项目硬约束必须遵守：剧本类型、总集数、单集目标字数、单集时长、主要人物上限、单集场景上限、制作复杂度。",
            "3. 世界设定不是装饰背景。如果世界设定包含强设定词，如\u201c三国\u201d\u201c机甲\u201d\u201c夜医\u201d\u201c规则怪谈\u201d\u201c玄幻\u201d\u201c末世\u201d\u201c权谋\u201d等，必须转化为分集事件、人物行动、场景规则、冲突机制或权力结构。",            "4. 剧本策划决定戏剧推进：必须服务一句话故事、商业钩子、主冲突、主角目标、反派压力、关系引擎、前三集钩子和付费点设计。",
            "5. 人物小传决定人物行动方式与关系张力：每集事件要让主要角色产生目标、阻碍、选择、关系变化，但不得改写项目主线。",
            "6. 故事梗概只是摘要；如果故事梗概与项目策划、人物小传冲突，以最新项目主线和世界规则为准，不得另起主线。",
            "7. 旧分集大纲只能作为参考。重新生成时，如果旧大纲与最新设定冲突，必须重构，不得沿用旧时代、旧地点、旧规则。",
            "",
            "【强世界设定处理】",
            "如果世界设定为高概念设定（如\u201c三国时期机甲世界\u201d），分集大纲必须显性体现：",            "- 对应时代/世界观的核心阵营结构",
            "- 核心设定作为权力、战争、身份、资源或禁忌体系",
            "- 主角目标与核心设定世界绑定",
            "- 反派压力来自阵营、军权、核心设定控制权、能源规则或技术禁忌",
            "- 前三集必须快速建立核心设定的爽点",
            "",
            "【短剧原则】",
            "- 低理解成本、强钩子、强冲突、强关系、强反转",
            "- 每集有增量，不写设定百科",
            ...(outlineLocalizationHints ? ["", outlineLocalizationHints] : []),
          ].filter(Boolean).join("\n"),
    script: [
      scriptAdaptationNotes,
      `【任务】完整生成 ${(() => {
        const ep = typeof contextOptions?.currentEpisode === "number" && contextOptions.currentEpisode >= 1
          ? contextOptions.currentEpisode
          : (() => { const m = draft.script.episode?.match(/(\d+)/); return m ? parseInt(m[1], 10) : undefined; })();
        return ep ? `第${ep}集` : (draft.script.episode || "第1集");
      })()} 的剧本正文。`,
      "",
      "【最高优先级】当前集集纲（上下文已提供）。必须逐项覆盖大纲中全部事件节点。",
      "",
      "【大纲为唯一剧情执行源】",
      "当前集纯文本大纲（上下文已提供）是唯一剧情执行依据，必须逐字覆盖大纲中全部事件节点、场景地点、人物动作和冲突推进。",
      "其他原文锚点、人物卡、题材标签、市场映射、coreHooks、styleTags 只能作为背景信息，不得生成当前集大纲未出现的新主线事件。",
      "严禁新增以下当前集大纲未出现设定：新家族（如叶家/林家/苏家等）、退婚/悔婚、赘婿、婚礼、灵根/灵脉/武魂、系统绑定/系统提示、豪门继承/血脉觉醒。",
      "如果当前集大纲只描述了某个具体场景/事件，正文必须围绕该事件展开，不得自行引入新势力、新系统、新婚约、新退婚等无关主线。",
      "",
      "【约束】读取 projectBrief（唯一权威来源），不要自创第二套字数/场数/人物数。",
      scriptConstraints
        ? (() => {
            const minWords = Math.max(300, Math.floor(scriptConstraints.targetWordsPerEpisode * 0.75));
            return `当前 projectBrief 约束（硬性要求，必须遵守）：单集目标字数 ${scriptConstraints.targetWordsPerEpisode} 中文字（合格范围 ${minWords}-${scriptConstraints.targetWordsPerEpisode + 150} 字，不得低于 ${minWords} 字）、场景上限 ${scriptConstraints.sceneLimitPerEpisode} 场、人物上限 ${scriptConstraints.mainCharactersLimit}、单集时长 ${scriptConstraints.episodeDuration}、剧本类型 ${scriptConstraints.scriptType === "ai_comic" ? "AI漫剧" : "真人短剧"}。`;
          })()
        : "",
      "",
      "【写法】",
      "短剧语言：开场要有冲突或强画面。",
      "每场必须推进事件，不得扩写无效寒暄。",
      "不得提前写下一集。结尾落在当前集钩子。",
      "",
      "【正文格式】",
      "content 必须使用投稿剧本格式。",
      "每集开头写：第X集：标题（标题可省略，但「第X集：」必须写）。",
      "每个场景必须以「集数-场次 时间 内/外 地点」开头，例如：",
      "1-1 日 外 偏远山村集市",
      "1-2 夜 内 破旧木屋",
      "每个场景头下面必须写人物行：",
      "人物：姓名（角色身份，括号标注）、姓名...",
      "画面、动作、神态前使用「△」。",
      "景别写在【】内，例如【特写】【远景】【近景】。",
      "心理活动使用「人物OS：」。",
      "画外音使用「人物VO：」。",
      "回忆段落开头使用【闪回】，结束使用【闪出】。",
      "人物第一次出场时，在人物行或首次正文旁白中用括号标注「角色身份」。",
      "不得只写旁白摘要，不得用一段话概述剧情。",
      scriptConstraints
        ? `本周为短剧剧本，单集场景上限 ${scriptConstraints.sceneLimitPerEpisode} 场，建议 2-3 场。`
        : "",
    ].filter(Boolean).join("\n"),
  };

  // P0-Rule-4: 为目标阶段注入已启用的 Prompt Skill 规则块
  const skillTarget = stepToPromptSkillTarget(step);
  const promptSkillBlock = skillTarget ? formatPromptSkillsForTarget(skillTarget) : "";
  const user = `${tasks[step]}\n\n当前项目上下文如下：\n${context}${appendPromptSkillBlock(promptSkillBlock)}`;

  if (process.env.NODE_ENV !== "production" && step === "outlines") {
    console.log("[original-outline-prompt]", {
      outlineGenerationMode: contextOptions?.outlineGenerationMode ?? null,
      totalEpisodeCount: contextOptions?.totalEpisodeCount ?? draft.overview.projectBrief?.episodeCount ?? null,
      batchIndex: contextOptions?.batchIndex ?? null,
      startEpisode: contextOptions?.startEpisode ?? null,
      endEpisode: contextOptions?.endEpisode ?? null,
      contextChars: context.length,
      systemChars: system.length,
      userChars: user.length,
      promptChars: system.length + user.length,
    });
  }

  return {
    system,
    user,
  };
}

function getRewriteJsonRules(step: RewriteStep) {
  const schemas: Record<RewriteStep, string> = {
    infoflow:
      '{"sourceFileName":"string","sourceText":"string","uploaded":true,"format":"ai_short|live_action","sourceTitle":"string","sourceSynopsis":"string","keyNodes":"string","overview":{"audience":"string","genres":"string","coreHooks":"string","styleTags":"string","worldview":"string","highlight":"string","premise":"string"},"characters":[{"id":"string","name":"string","age":27,"traits":"string","background":"string"}],"macro":{"content":"string"},"episodes":{"episodes":["string"]}}',
    overview:
      '{"audience":"string","genre":"string","coreHooks":["string"],"styleTags":["string"],"worldview":"string","highlight":"string","premise":"string"}',
    characters:
      '[{"id":"string","name":"string","role":"string","age":27,"traits":"string","background":"string"}]',
    outlines:
      '{"macro":"string","episodes":["string"],"stageLabels":["起\\n1-N1","承\\nN1+1-N2","转\\nN2+1-N3","合\\nN3+1-N4"]}',
    script: '{"episode":"string","content":"string"}',
  };

  return [
    "只返回 JSON，不要 Markdown，不要解释，不要额外说明。",
    "保持字段名完全一致。",
    `返回结构必须满足：${schemas[step]}`,
  ].join("\n");
}

export function buildRewritePrompt(
  step: RewriteStep,
  draft: RewriteDraft,
  overviewField?: RewriteOverviewField,
): PromptBundle {
  const context = buildRewriteProjectContext(draft);

  const system = [
    "你是资深短剧改编策划、短剧拆解编辑和剧本医生。",
    "你擅长把已有故事素材改写成适合短剧平台的故事梗概、人物卡、分集大纲和拍摄正文。",
    "请保留原素材最有传播力的钩子，同时强化短剧节奏、冲突、反转和结尾留钩。",
    "输出必须适合创作后台直接回填。",
    getRewriteJsonRules(step),
  ].join("\n");

  const tasks: Record<RewriteStep, string> = {
    infoflow: [
      "请从导入的原始剧本中提炼完整的信息流，包含故事梗概、人物设定、粗纲和集纲。",
      "overview 部分：提炼目标受众（男频/女频）、题材类型、核心设定、风格元素、世界观、核心亮点和核心梗概。",
      "characters 部分：从原素材中提取主要角色，每个角色包含姓名、年龄、性格特点和背景故事。",
      "macro 部分：输出完整的故事粗纲，包含起承转合。",
      "episodes 部分：输出分集剧情摘要，至少 10 集。",
      "sourceTitle 从原素材提炼，sourceSynopsis 输出 180 到 260 字的剧情摘要，keyNodes 输出用顿号分隔的核心信息点。",
    ].join("\n"),
    overview:
      overviewField === "worldview"
        ? [
            "请基于当前已选的目标受众、题材类型、核心设定和风格元素，只生成故事世界观。",
            "只重点补全 worldview 字段，其他字段请尽量保持当前上下文原值。",
            "世界观要交代时代/阶层/规则/冲突底盘，适合短剧改写。",
          ].join("\n")
        : overviewField === "highlight"
          ? [
              "请基于当前已选的目标受众、题材类型、核心设定和风格元素，只生成核心亮点。",
              "只重点补全 highlight 字段，其他字段请尽量保持当前上下文原值。",
              "核心亮点要突出卖点、钩子、打脸点、反转点和情绪价值。",
            ].join("\n")
          : overviewField === "premise"
            ? [
                "请基于当前已选的目标受众、题材类型、核心设定和风格元素，只生成核心梗概。",
                "只重点补全 premise 字段，其他字段请尽量保持当前上下文原值。",
                "核心梗概要能直接用于短剧项目介绍，结构清楚、冲突明确、结尾带钩。",
              ].join("\n")
            : [
                "请基于原素材信息流，提炼一版适合短剧改写的故事梗概。",
                "强化核心设定、风格元素、世界观、核心亮点和核心梗概。",
                "如果用户已经手动选了一部分标签，请尽量继承，不要完全推翻。",
              ].join("\n"),
    characters: [
      "请生成改写项目的主要人物小传。",
      "至少输出 6 个角色，优先覆盖男女主、核心反派、孩子/系统/家族关键角色。",
      "必须以当前故事母本为第一来源：核心梗概、故事背景、核心亮点、核心设定、projectBrief / scriptPlan 的主线信息优先；五步标签只提供方向，不得扩写成具体剧情事实。",
      "人物小传可以补充身份、关系、欲望、秘密、弱点和参与主线的方式，但不得凭空新增具体开场事件、具体场景或组织事件；不要把未出现在故事母本里的年会、公司会议、集团项目等写进背景。",
      "背景必须能直接支撑后续分集冲突与感情线，且始终服务核心梗概，不要反过来改写主线。",
    ].join("\n"),
    outlines: [
      "请基于当前改写项目，提炼短剧分集大纲。",
      "macro 输出整段粗纲；episodes 输出按单集摘要拆开的字符串数组，优先生成 10 集。",
      "stageLabels 保持\u201c起/承/转/合\u201d四段结构。",
    ].join("\n"),
    script: [
      `请生成 ${draft.script.episode || "第1集"} 的改写剧本正文。`,
      "正文要包含场次、人物、动作、对白、OS 和结尾钩子。",
      "风格要利落、情绪足、适合竖屏短剧拍摄。",
    ].join("\n"),
  };

  return {
    system,
    user: `${tasks[step]}\n\n当前改写项目上下文如下：\n${context}`,
  };
}

function getAdaptJsonRules(
  step: "chapter" | "overview" | "characters" | "outlines" | "script",
) {
  const schemas = {
    chapter:
      '{"summary":"string","entries":["string"],"stageLabels":["1","10"]}',
    overview:
      '{"audience":"string","genre":"string","coreHooks":["string"],"styleTags":["string"],"worldview":"string","highlight":"string","premise":"string"}',
    characters:
      '[{"id":"string","name":"string","role":"string","age":22,"traits":"string","background":"string"}]',
    outlines:
      '{"macro":"string","episodes":["string"],"stageLabels":["起\\n1","承\\n-","转\\n-","合\\n-"]}',
    script: '{"episode":"string","content":"string"}',
  } as const;

  return [
    "只返回 JSON，不要 Markdown，不要解释，不要额外说明。",
    "保持字段名完全一致。",
    `返回结构必须满足：${schemas[step]}`,
  ].join("\n");
}

export function buildAdaptPrompt(
  step: "chapter" | "overview" | "characters" | "outlines" | "script",
  draft: AdaptDraft,
): PromptBundle {
  const context = buildAdaptProjectContext(draft);

  const system = [
    "你是资深改编编辑、短剧策划和拆书专家。",
    "你擅长把网文章节提炼成小说章纲、故事梗概、人物小传、分集大纲和短剧正文。",
    "请保留网文原本最有吸引力的设定与情绪张力，并转成适合短剧的节奏。",
    getAdaptJsonRules(step),
  ].join("\n");

  const tasks = {
    chapter: [
      "请把当前选中的小说章节提炼成便于改编的小说章纲。",
      "summary 输出总章纲；entries 输出按章节拆开的情节提要数组。",
      "要突出主线推进、关键冲突和人物关系变化。",
    ].join("\n"),
    overview: [
      "请根据小说章纲提炼故事梗概。",
      "如果是 AI漫剧，节奏可以更夸张；如果是真人短剧，保持可拍性和情绪真实性。",
    ].join("\n"),
    characters: [
      "请生成主要人物小传。",
      "优先覆盖主角、对手、关键亲友/师门/系统角色，背景要能推动后续分集。",
    ].join("\n"),
    outlines: [
      "请输出短剧分集大纲。",
      "macro 为粗纲，episodes 为单集摘要数组，优先先给前 10 集。",
    ].join("\n"),
    script: [
      `请生成 ${draft.script.episode || "第1集"} 的剧本正文。`,
      "正文需要适合短剧拍摄，包含场次、动作、对白、OS 和钩子。",
    ].join("\n"),
  } as const;

  return {
    system,
      user: `${tasks[step]}\n\n当前改编项目上下文如下：\n${context}`,
  };
}

// 灵感策划专用 Prompt

export function buildInspirationPrompt(
  audiences: string,
  genres: string,
  coreHooks: string[],
  styleTags: string[],
  premise: string,
  singlePlan: boolean = false,
  scriptType: "short_drama" | "ai_comic" = "short_drama",
  diagnosis?: InspirationDiagnosis,
): PromptBundle {
  const system = [
    "你是资深短剧策划师和 IP 开发总监。",
    "你擅长基于用户提供的题材标签和故事想法，策划精准的短剧项目方案。",
    "只返回 JSON，不要 Markdown，不要解释。",
    "整体输出控制在 1500 字以内，保持简洁精炼。",
    singlePlan
      ? [
          '返回结构：{"title":"string","highlight":"string","worldview":"string","premise":"string","projectBrief":{"scriptType":"short_drama","audienceType":"general","genres":["string"],"coreHooks":["string"],"styleTags":["string"],"episodeCount":60,"episodeDuration":"1-2min","targetWordsPerEpisode":650,"mainCharactersLimit":6,"sceneLimitPerEpisode":3,"coreEmotion":"string","productionConstraint":"low_cost_live","complexityLevel":"beginner"},"scriptPlan":{"logline":"string","commercialHook":"string","targetAudience":"string","genrePromise":"string","mainConflict":"string","protagonistGoal":"string","antagonistPressure":"string","relationshipEngine":"string","openingThreeEpisodesHook":"string","paymentPointPlan":"string","tone":"string","productionNotes":"string","riskNotes":[]}}',
          "projectBrief 必须按样例返回完整字段，不得为空对象；字段包含：scriptType, audienceType, genres, coreHooks, styleTags, episodeCount, episodeDuration, targetWordsPerEpisode, mainCharactersLimit, sceneLimitPerEpisode, coreEmotion, productionConstraint, complexityLevel。",
          "scriptPlan 必须按样例返回完整字段，不得为空对象；字段包含：logline, commercialHook, targetAudience, genrePromise, mainConflict, protagonistGoal, antagonistPressure, relationshipEngine, openingThreeEpisodesHook, paymentPointPlan, tone, productionNotes, riskNotes。",
          "不得自创字段。scriptType 必须与用户传入的剧本类型一致。projectBrief/scriptPlan 的字符串字段必须尽量结合已生成的 title/highlight/worldview/premise 填写，不要留空。",
        ].join("\n")
      : [
          '返回结构：[{"title":"string","highlight":"string","worldview":"string","premise":"string","projectBrief":{"scriptType":"short_drama","audienceType":"general","genres":["string"],"coreHooks":["string"],"styleTags":["string"],"episodeCount":60,"episodeDuration":"1-2min","targetWordsPerEpisode":650,"mainCharactersLimit":6,"sceneLimitPerEpisode":3,"coreEmotion":"string","productionConstraint":"low_cost_live","complexityLevel":"beginner"},"scriptPlan":{"logline":"string","commercialHook":"string","targetAudience":"string","genrePromise":"string","mainConflict":"string","protagonistGoal":"string","antagonistPressure":"string","relationshipEngine":"string","openingThreeEpisodesHook":"string","paymentPointPlan":"string","tone":"string","productionNotes":"string","riskNotes":[]}}]',
          "每个方案都必须包含完整 projectBrief 和 scriptPlan，二者不得为空对象。",
          "projectBrief/scriptPlan 字段必须严格匹配类型定义，不得自创字段；字符串字段必须尽量结合 title/highlight/worldview/premise 填写，不要留空。",
        ].join("\n"),
  ].join("\n");

  const user = [
    singlePlan ? "请基于以下标签信息和用户输入，生成 1 个精准的短剧项目策划方案。" : "请基于以下标签信息和用户输入，生成 3 个差异化的短剧项目策划方案。",
    singlePlan
      ? "方案需要包含：项目名称、核心亮点、世界观、核心梗概。"
      : [
          "每个方案需要包含：",
          "1. title: 项目名称（2-8 字，吸睛、有商业辨识度）",
          "2. highlight: 核心亮点（100 字以内，一句话卖点，包含钩子和反转）",
          "3. worldview: 世界观设定（100 字以内，时代/阶层/规则/冲突底盘）",
          "4. premise: 核心梗概（500 字以内，适合项目提案，结构清楚、冲突明确、结尾带钩）",
        ].join("\n"),
    "",
    "稳定诊断标签：",
    `目标受众：${audiences}`,
    `题材类型：${genres || "未选择"}`,
    `核心设定：${coreHooks.length > 0 ? coreHooks.join(",") : "未选择"}`,
    `风格元素：${styleTags.length > 0 ? styleTags.join(",") : "未选择"}`,
    premise ? `用户输入内容：${premise}` : "",
    diagnosis
      ? [
          "",
          "稳定诊断底盘（运行时派生，不要改写成剧情事实）：",
          `- 主方向：${diagnosis.primaryBranch}`,
          diagnosis.secondaryBranch ? `- 次方向：${diagnosis.secondaryBranch}` : "",
          `- 锁定状态：${diagnosis.lockStatus}`,
          `- 主角姿态：${diagnosis.protagonistMode}`,
          `- 冲突来源：${diagnosis.conflictSource}`,
          `- 推进动力：${diagnosis.episodeDrive}`,
          diagnosis.confirmedHooks.length > 0 ? `- 已确认钩子：${diagnosis.confirmedHooks.join(" / ")}` : "",
          diagnosis.mustHave.length > 0 ? `- mustHave：${diagnosis.mustHave.join(" / ")}` : "",
          diagnosis.mustAvoid.length > 0 ? `- mustAvoid：${diagnosis.mustAvoid.join(" / ")}` : "",
          `- 诊断摘要：${diagnosis.diagnosisText}`,
        ]
          .filter(Boolean)
          .join("\n")
      : "",
    "",
    "内容生成规则：",
    diagnosis
      ? [
          "诊断约束：",
          "- 优先遵循稳定诊断底盘中的主方向、已确认钩子、mustHave 和 mustAvoid。",
          "- mustAvoid 只能作为排除项，不得改写成正向设定。",
          "- 不要把单次候选标签机械扩写成具体剧情事实。",
        ].join("\n")
      : "",
    "1. 项目名称 (title)：2-8 字，吸睛、有商业辨识度",
    "2. 世界观 (worldview)：30-50 字，交代时代背景、阶层结构、世界规则、核心冲突",
    "3. 核心亮点 (highlight)：50-80 字，突出卖点、钩子、打脸点、反转点和情绪价值",
    "4. 核心梗概 (premise)：100-150 字，完整的故事梗概，包含主角、起因、发展、高潮、结尾，结尾带钩子",
    "",
    !singlePlan && [
      "请保证 3 个方案有明显差异化，分别侧重：",
      "1. 爽感逆袭路线",
      "2. 情感成长路线",
      "3. 创新设定路线",
    ].join("\n"),
    scriptType === "short_drama"
      ? "本方案针对真人短剧，强调对白冲突、人物关系、强节奏、强反转、可拍摄性，避免高成本复杂奇观堆砌。"
      : "本方案针对 AI漫剧，强调画面感、镜头切换、场景调度、视觉化表达，可以更强幻想、奇观、风格化表达。",
  ].filter(Boolean).join("\n");

  return { system, user };
}

type InspirationScenarioPolishCard = {
  id: string;
  title: string;
  coreHighlight: string;
  storyBackground: string;
  worldview: string;
  coreSynopsis: string;
  audience?: string;
  eraOrWorldType?: string;
  scriptType: "short_drama" | "ai_comic";
  variantId?: string;
  variantIntent?: string;
  mustHave?: string[];
  mustAvoid?: string[];
  selectedHooks?: string[];
  selectedGenres?: string[];
  conciseGuidance?: string[];
};

export function buildInspirationSingleScenarioPolishPrompt(
  scenarioCard: InspirationScenarioPolishCard,
  diagnosis: InspirationDiagnosis,
  scriptType: "short_drama" | "ai_comic" = "short_drama",
  options?: {
    correction?: {
      validation: EraProseValidationResult;
      detectedConflicts: string[];
    };
  },
): PromptBundle {
  const eraLabel =
    scenarioCard.eraOrWorldType?.trim() || "";
  const eraInstruction = getScenarioEraInstruction(eraLabel);
  const hasCrossEraHook = detectCrossEraHook([
    scenarioCard.selectedHooks,
    scenarioCard.title,
    scenarioCard.coreHighlight,
    scenarioCard.storyBackground,
    scenarioCard.worldview,
    scenarioCard.coreSynopsis,
    scenarioCard.variantIntent,
    scenarioCard.conciseGuidance,
    scenarioCard.mustHave,
    scenarioCard.mustAvoid,
  ]);

  const system = [
    "你是资深短剧策划师和 IP 润色编辑。",
    "你的任务是把单套轻量前台润色输入改写成前台可直接展示的人类语言结果，不是照抄输入。",
    "只返回 JSON，不要 Markdown，不要解释，不要额外字段。",
    '返回结构：{"id":"string","title":"string","genres":["string"],"coreHighlight":"string","storyBackground":"string","worldview":"string","coreSynopsis":"string"}',
    "必须保留输入里的 id，不要新增、删除或修改方案标识。",
    "必须输出完整的 7 个字段，不能只返回局部补丁。",
    "genres 必须是字符串数组，包含 1-3 个最匹配当前方案风格的题材类型标签（如 都市、悬疑、古装、玄幻 等）。",
    "如果输入里有 selectedGenres 字段且非空，优先继承其中的标签作为 genres。",
    "如果 selectedGenres 为空或不合适，必须根据生成的标题与核心梗概自动选择合适的题材类型标签（1-3 个）。",
    "genres 只能是短剧题材类型标签，不得包含受众（男频/女频）、时代（古代/80年代）、核心设定（逆袭/反转/穿越）标签。",
    "所有字段值都必须是单行字符串，禁止在字符串值中出现真实换行。",
    "如需分句，请用空格或 \\n 表示，不要输出未经转义的换行。",
    "禁止尾逗号、禁止注释、禁止在 JSON 外输出解释文字。",
    "不得输出 audience、eraOrWorldType、scriptType、variantId、variantIntent、mustHave、mustAvoid、selectedHooks、selectedGenres、conciseGuidance、debug、warnings、qualityCheck 等输入或结构字段。",
    "不得把输入提示原样抄进前台文本。",
    "必须遵守 mustHave、mustAvoid、时代约束与轻量提示。",
    "如果某项 mustAvoid 存在，则对应文本里也不得把该项写成正向设定。",
    "时代背景是主叙事落点，不是角色来源时代的总和。",
    "如果核心设定包含穿越、重生、时空错位、前世今生，可以写角色来自现代或带有未来记忆，但 storyBackground/worldview 和 coreSynopsis 的主体场景必须服从所选时代背景。",
    "如果时代背景是年代、80年代、90年代等近现代历史阶段，故事主体不能写成现代都市、当代豪门或现代职场，必须写出明确年代质感。",
    "如果时代背景是古代，主场景必须是古代社会，不要写现代公司、手机、直播或热搜。",
    "如果时代背景是民国，主场景必须是民国社会，不要写现代互联网、短视频、直播或现代公司。",
    "如果时代背景是未来，主场景必须有未来科技、未来秩序、AI、赛博或智能城市元素。",
    "title 必须是可直接作为短剧 / 漫剧项目名的剧名，建议 2-10 个中文字符。",
    "title 必须控制在 20 个汉字以内。",
    "title 可以带《》，也可以不带；不得出现\u201c原创项目\u201d\u201c项目\u201d\u201c方案\u201d\u201c方向\u201d。",    "title 不得出现\u201c爆款稳态款\u201d\u201c强人设反差款\u201d\u201c脑洞差异化款\u201d\u201c人物反差原创项目\u201d\u201c高设定原创项目\u201d等内部方向名。",    "title 不得直接堆叠\u201c女频 / 男频 / 都市 / 短剧 / 漫剧\u201d等分类词，也不得直接用标签拼接。",    "title 要体现冲突、身份反转、悬念或爽点，但不能剧透过满。",
    "coreHighlight 控制在 80-120 字。",
    "storyBackground / worldview 控制在 120-180 字。",
    "coreSynopsis 控制在 180-260 字。",
    "coreHighlight、storyBackground/worldview、coreSynopsis 必须是自然语言，禁止出现：本变体、方案类型、方案增强、内部提示、待补强。",
    "如果基础字段缺失，只能基于当前轻量输入补齐，不能留空，不能返回占位语。",
  ].join("\n");

  const user = [
    "请基于以下当前轻量前台润色输入，生成一套完整的前台文本字段。",
    "",
    "你只负责润色自然语言字段，不负责结构字段。",
    "",
    "输出字段要求：",
    "1. title：必须是可用剧名，2-10 个中文字符左右，吸睛、有商业辨识度，不要写成项目名、方案名或方向名。",
    "2. coreHighlight：突出卖点、钩子、反转和情绪价值。",
    "3. storyBackground / worldview：交代时代背景、阶层结构、世界规则和冲突底盘。",
    "4. coreSynopsis：完整但克制的项目提案式梗概，结构清楚、冲突明确、结尾带钩。",
    "",
    "硬约束：",
    "- 不要修改 id。",
    "- 不要把输入对象直接原样拷贝成结果。",
    "- mustAvoid 是硬排除项，禁止把它们写成正向设定。",
    "- 前台可见字段必须自然、可读，不能直接出现商业稳态款、强人设反差款、脑洞差异化款等内部策略词。",
    `- ${scriptType === "short_drama" ? "真人短剧必须优先输出 storyBackground，并保证 eraOrWorldType 可用。" : "AI 漫剧必须优先输出 worldview，并保证设定规则与视觉想象一致。"}`,
    "- 只输出 7 个字段：id、title、genres、coreHighlight、storyBackground、worldview、coreSynopsis。",
    "- 不要输出任何输入结构字段。",
    "",
    `剧本类型：${scriptType}`,
    `当前时代标签：${eraInstruction.rawEra || "待确认"}`,
    `归一时代：${eraInstruction.normalizedEra || "待确认"}`,
    `时代家族：${eraInstruction.eraFamily}`,
    `跨时代设定：${hasCrossEraHook ? "是" : "否"}`,
    eraInstruction.instructionText ? `时代解释：${eraInstruction.instructionText}` : "",
    eraInstruction.mustUseHints.length > 0 ? `建议使用的时代线索：${eraInstruction.mustUseHints.join(" / ")}` : "",
    eraInstruction.forbiddenHardSignals.length > 0 ? `禁止写成主体场景的冲突词：${eraInstruction.forbiddenHardSignals.join(" / ")}` : "",
    `稳定诊断底盘：${diagnosis.diagnosisText}`,
    diagnosis.mustHave.length > 0 ? `mustHave：${diagnosis.mustHave.join(" / ")}` : "",
    diagnosis.mustAvoid.length > 0 ? `mustAvoid：${diagnosis.mustAvoid.join(" / ")}` : "",
    options?.correction
      ? `纠偏要求：你上一次输出与时代背景冲突。冲突原因：${options.correction.detectedConflicts.join(" / ") || "主叙事时代不一致"}。请保留同一方案方向，但把故事背景和核心梗概的主体场景改写到"${options.correction.validation.normalizedEra || eraInstruction.normalizedEra || "目标时代"}"之下。允许人物来源跨时代，但主叙事落点必须服从当前时代。`
      : "",
    "",
    "当前方案输入：",
    JSON.stringify(scenarioCard),
    "",
    "请只输出一个 JSON object，且 id 必须与输入一致，并补齐全部 7 个字段。",
  ].filter(Boolean).join("\n");

  return { system, user };
}

// 灵感策划 - 标签优化 Prompt
export function buildInspirationTagsPrompt(
  audiences: string,
  genres: string,
  coreHooks: string[],
  styleTags: string[],
  premise: string,
): PromptBundle {
  const system = [
    "你是资深短剧策划师和 IP 开发总监。",
    "你擅长基于用户提供的题材标签，提炼和优化出更精准的标签组合。",
    "只返回 JSON，不要 Markdown，不要解释。",
    '返回结构：{"audiences":["string"],"genres":["string"],"coreHooks":["string"],"styleTags":["string"]}',
    "数量限制：genres 不超过 3 个，coreHooks 不超过 3 个，styleTags 不超过 5 个。",
  ].join("\n");

  const user = [
    "请基于用户选择的标签，提炼优化出一组更精准的标签组合。",
    "",
    "用户选择的标签：",
    `目标受众：${audiences}`,
    `题材类型：${genres}`,
    `核心设定：${coreHooks.join("、")}`,
    `风格元素：${styleTags.join("、")}`,
    premise ? `用户补充说明：${premise}` : "",
    "",
    "请输出优化后的标签，要求：",
    "1. 目标受众 (audiences)：保留 1-2 个最匹配的（男频/女频）",
    "2. 题材类型 (genres)：不超过 3 个，选最核心的题材",
    "3. 核心设定 (coreHooks)：不超过 3 个，选最有吸引力的设定",
    "4. 风格元素 (styleTags)：不超过 5 个，选最符合的风格",
    "",
    "保持简洁精准，不要贪多。",
  ].join("\n");

  return { system, user };
}

// 灵感策划 - 单字段生成 Prompt（用于并行流式输出）
export function buildInspirationFieldPrompt(
  audiences: string,
  genres: string,
  coreHooks: string[],
  styleTags: string[],
  premise: string,
  field: 'highlight' | 'worldview' | 'premise' | 'title',
): PromptBundle {
  const fieldDescriptions: Record<string, string> = {
    title: '项目名称（2-8 字，吸睛、有商业辨识度）',
    highlight: '核心亮点（50-80 字，一句话卖点，包含钩子和反转）',
    worldview: '世界观设定（30-50 字，时代/阶层/规则/冲突底盘）',
    premise: '核心梗概（100-150 字，适合项目提案，结构清楚、冲突明确、结尾带钩）',
  };

  const system = [
    "你是资深短剧策划师和 IP 开发总监。",
    "你擅长基于用户提供的题材标签，策划有差异化的短剧项目方案。",
    "只返回 JSON，不要 Markdown，不要解释。",
    `只返回单个字段，格式：{"${field}":"string"}`,
  ].join("\n");

  const user = [
    `请基于以下标签信息，生成项目的"${field}"字段。`,
    `要求：${fieldDescriptions[field]}`,
    "",
    "用户选择的标签：",
    `目标受众：${audiences}`,
    `题材类型：${genres}`,
    `核心设定：${coreHooks.join("、")}`,
    `风格元素：${styleTags.join("、")}`,
    premise ? `用户补充说明：${premise}` : "",
  ].join("\n");

  return { system, user };
}

const EXTRACTION_SYSTEM_PREAMBLE = [
  "你是一个内容理解型结构化提炼器，不是关键词抽取器。",
  "你的任务是把不规整的大纲/剧情文本，理解后整理成可编辑、可确认、可锁定的结构化输入。",
  "",
  "核心原则：",
  "1. 先理解再提炼，不要只做关键词抓取",
  "2. 保持原文核心意思，不擅自改写故事方向",
  "3. 默认保持原文呈现顺序，不自动重排叙事顺序",
  "4. 如果是非线性叙事（倒叙、插叙、结果先行），识别但不重组",
  "5. 如果信息不足，明确标注缺失，不要硬编",
  "",
  "只返回 JSON，不要 Markdown，不要解释，不要额外说明。",
  "保持字段名完全一致。",
].join("\n");

const MACRO_EXTRACTION_SCHEMA =
  '{"meta":{"sourceType":"string","episodeDetectionMode":"explicit|heuristic|none","narrativeMode":"linear|nonlinear","completenessLevel":"high|medium|low","confidence":0,"missingFields":["string"]},"storySummary":{"mainline":"string","coreConflict":"string","keyRelationships":"string","storyDirection":"string","styleTone":"string"},"notes":{"keptOriginalNarrativeOrder":true,"warnings":["string"],"editorSuggestions":["string"]}}';

const EXTRACTION_SCHEMA =
  '{"meta":{"sourceType":"string","episodeDetectionMode":"explicit|heuristic|none","completenessLevel":"high|medium|low","confidence":0,"missingFields":["string"]},"confirmedEpisodes":[{"episode":1,"title":"string","goal":"string","coreEvent":"string","conflictProgress":"string","resultChange":"string","relationshipChange":"string","twistOrPayoff":"string","endingHook":"string","confidence":"high|medium-high|medium|low","splitBasis":{"type":"explicit_marker|scene_change|conflict_node|relationship_turn|rhythm_judgment|truncation_forced","description":"string"}}],"storyBeats":[{"id":"string","content":"string","characters":["string"],"phase":"setup|rising|climax|falling|resolution|unknown","importance":"critical|major|minor","source":"original|summarized|inferred|low_confidence_guess"}],"constraints":{"narrativeStructure":{"mode":"linear|nonlinear","subType":"flashback|in_medias_res|intercut|parallel|unknown","description":"string"},"estimatedEpisodeRange":{"min":0,"max":0,"reasoning":"string"}},"report":{"inputVisibility":{},"episodeSplitReasoning":"string","fieldSources":[{"field":"string","source":"original|summarized|inferred|low_confidence_guess","detail":"string"}],"missingItems":[{"category":"sequel_plot|episode_boundary|timeline_connection|identity_reveal_timing|key_character_absent|mainline_unexpanded","description":"string","severity":"critical|important|minor","causedByTruncation":false}],"highRiskInferences":[{"content":"string","riskLevel":"high|medium-high|medium","category":"character_stance|relationship_progression|identity_reveal_pacing|ending_hook|explanatory_phrasing|factual_error","suggestion":"string"}],"usabilityClassification":[{"content":"string","category":"A|B|C","reason":"string","refType":"episode|beat|field|constraint","refId":"string"}]},"notes":{"keptOriginalNarrativeOrder":true,"warnings":["string"],"editorSuggestions":["string"]}}';

export function buildOutlineMacroExtractionPrompt(
  sourceText: string,
  currentMacro: string,
): PromptBundle {
  const system = [
    EXTRACTION_SYSTEM_PREAMBLE,
    `返回结构必须满足：${MACRO_EXTRACTION_SCHEMA}`,
  ].join("\n");

  const user = [
    "请从以下原始文本中提炼故事总纲。",
    "",
    "提炼前，请先在内部完成识别：",
    "1. 文本类型（成型大纲 / 半成型大纲 / 剧情梗概 / 灵感草稿）",
    "2. 叙事结构（是否非线性、倒叙、插叙、结果先行）",
    "3. 信息完整度（主角、反派、主线冲突、总体目标是否明确）",
    "",
    "故事总纲提炼要求：",
    "- mainline：故事主线，要能支撑后续分集展开",
    "- coreConflict：核心冲突，不要空泛",
    "- keyRelationships：关键人物关系，说明谁与谁、什么关系、如何推动剧情",
    "- storyDirection：整体推进方向，包含起承转合的大致走向",
    "- styleTone：题材和风格核心表达",
    "",
    "meta 要求：",
    "- sourceType：判断文本类型",
    "- narrativeMode：如果是非线性叙事，标记 nonlinear",
    "- completenessLevel：信息完整度（high/medium/low）",
    "- confidence：0-100 的置信度",
    '- missingFields：用中文列出缺失项，如"主线冲突不清"',
    "",
    "notes 要求：",
    "- warnings：提炼过程中的风险提示",
    "- editorSuggestions：给编辑的建议",
    "",
    "如果文本信息不足以可靠提炼总纲，请降低 confidence 并在 missingFields 中说明。",
    "",
    currentMacro.trim()
      ? `用户当前已有的总纲（仅供参考，不要照搬）：\n${currentMacro.slice(0, 2000)}\n`
      : "",
    `原始文本：\n${sourceText}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

export function buildOutlineExtractionPrompt(
  sourceText: string,
  currentMacro: string,
  currentEpisodes: string[],
  inputVisibility: InputVisibility,
  targetEpisodeCount?: number,
  episodeGenerationSource?: string,
): PromptBundle {
  const system = [
    EXTRACTION_SYSTEM_PREAMBLE,
    `返回结构必须满足：${EXTRACTION_SCHEMA}`,
  ].join("\n");

  const visibilityNote = inputVisibility.truncationWarning
    ? `注意：${inputVisibility.truncationWarning}。你当前看到的是原文的 ${Math.round(inputVisibility.visibleRatio * 100)}%，有效故事文本约 ${inputVisibility.effectiveStoryLength} 字。因截断缺失的信息请在 report.missingItems 中标注 causedByTruncation: true。`
    : `你当前看到的是原文全文（${inputVisibility.sourceTotalLength} 字）。`;

  const user = [
    "请从以下原始文本中提炼分集大纲，并生成完整的提炼说明书。",
    "",
    `输入可见性：${visibilityNote}`,
    "",
    "提炼前，请先判断原文中是否已有明确分集标记。",
    "如果有明确分集，按原顺序提炼；如果没有，根据剧情节奏推测分集。",
    "",
    episodeGenerationSource === "macro_plan" && targetEpisodeCount
      ? `本次任务是根据故事总纲主动规划分集。请尽量生成 ${targetEpisodeCount} 集分集大纲。可以基于总纲合理补足中后段剧情，但不得改变主线设定、人物关系和核心冲突。若信息不足，请在 missingItems / warnings 中标注，不要只生成前几集。`
      : targetEpisodeCount
        ? `硬约束：分集数量由原文结构决定。如果原文没有明确分集或分集数量不足时，请尽量贴近 ${targetEpisodeCount} 集拆分；但不要为了凑数破坏剧情连续性。`
        : "硬约束：分集数量由原文结构决定。如果请求中提供了 targetEpisodeCount，仅作为参考信息记录在 constraints 中，不要为了凑目标集数而合并或拆分。",
    "",
    "=== 第一层：confirmedEpisodes（已确认单集） ===",
    "每集必填字段：",
    "- goal：本集目标",
    "- coreEvent：核心事件",
    "- conflictProgress：冲突推进",
    "- resultChange：结果变化",
    "- confidence：high / medium-high / medium / low",
    "- splitBasis：分集依据（type + description）",
    "",
    "可选字段（有则填，无则省略）：",
    "- relationshipChange / twistOrPayoff / endingHook",
    "",
    "结尾钩子硬约束：不强制生成，不擅自新增设定，不提前泄露后续信息。",
    "",
    "=== 第二层：storyBeats（剧情节点池） ===",
    "将未编入集的重要剧情节点放入 storyBeats，标注 phase / importance / source。",
    "",
    "=== 第三层：constraints（生产约束） ===",
    "- narrativeStructure：叙事结构（linear/nonlinear）",
    "- estimatedEpisodeRange：集数估算范围及理由",
    "",
    "=== 六维度说明书（report） ===",
    "D1 fieldSources：对每集的关键字段标注来源（original/summarized/inferred/low_confidence_guess）",
    "D2 missingItems：信息缺失项，区分 causedByTruncation",
    "D3 highRiskInferences：高风险推断自查",
    "D4 usabilityClassification：所有输出做 ABC 分类（A=可锁定 B=需确认 C=建议丢弃），每项带 refType + refId",
    "D5 inputVisibility：由系统自动填充，你不需要填写此字段",
    "D6 episodeSplitReasoning：分集策略总述",
    "",
    "如果原文不足以可靠提炼分集：不要硬拆，返回空 confirmedEpisodes，在 meta.missingFields 中说明。",
    "",
    currentMacro.trim()
      ? `当前故事总纲（作为分集提炼的参考）：\n${currentMacro.slice(0, 3000)}\n`
      : "",
    currentEpisodes.length > 0 && currentEpisodes.some((e) => e.trim())
      ? `用户当前已有的分集（仅供参考）：\n${currentEpisodes.map((e, i) => `第${i + 1}集：${e.slice(0, 200)}`).join("\n")}\n`
      : "",
    `原始文本：\n${sourceText}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

// ==================== 结构化总纲提炼 Prompt ====================

const STRUCTURED_SUMMARY_SCHEMA =
  '{"structuredSummary":{"oneLineSummary":"string","coreConflict":{"external":"string","internal":"string","relational":"string"},"keyRelationships":[{"personA":"string","personB":"string","relationshipType":"亲情 | 爱情 | 友情 | 敌对 | 利用 | 竞争 | 其他","description":"string","arcDirection":"恶化 | 缓和 | 破裂 | 修复 | 反转"}],"narrativeStructure":{"narrativeMode":"linear|nonlinear","nonlinearType":"flashback|in_medias_res|intercut|parallel|unknown","openingType":"conflict_first|daily_life|backstory|mystery_hook","isTimelineStart":true,"hasBackstoryToRecover":false,"backstoryHint":"string"},"longArcNodes":[{"nodeLabel":"string","placementHint":"前期 | 中前期 | 中期 | 中后期 | 后期 | 终局 | 未知","description":"string","arcType":"setup|rising|climax|falling|resolution|twist","confidence":"high|medium|low"}],"hiddenReveals":[{"revealLabel":"string","revealContent":"string","plannedPhase":"前期 | 中期 | 后期 | 终局 | 未知","spoilerRiskLevel":"high|medium|low"}]},"fieldConfidence":{"oneLineSummary":"high|medium|low","coreConflict":"high|medium|low","keyRelationships":"high|medium|low","narrativeStructure":"high|medium|low","longArcNodes":"high|medium|low","hiddenReveals":"high|medium|low"},"warnings":["string"],"missingFields":["string"]}';

export function buildStructuredSummaryExtractionPrompt(
  sourceText: string,
  currentMacro: string,
): PromptBundle {
  const system = [
    "你是一个结构化总纲提炼器。从大纲文本中提取 6 个核心字段。",
    "",
    "【必须严格遵守的输出格式】",
    "你只能返回一个 JSON 对象。顶层必须是 {{}}，绝对不能是 []。",
    "",
    `返回结构：${STRUCTURED_SUMMARY_SCHEMA}`,
    "",
    "【必填字段】必须全部 6 个字段都出现：",
    "1. oneLineSummary - 一句话主线（空字符串占位）",
    "2. coreConflict - 核心冲突 {{ external, internal, relational }}（三个子字段都为空字符串时即视为缺失）",
    "3. keyRelationships - 关键人物关系数组（空数组 [] 占位）",
    "4. narrativeStructure - 叙事结构 {{ narrativeMode, openingType, isTimelineStart, hasBackstoryToRecover }}",
    "5. longArcNodes - 长线剧情节点数组（空数组 [] 占位）",
    "6. hiddenReveals - 不可提前揭示信息数组（空数组 [] 占位）",
    "",
    "【fieldConfidence - 必填】对每个字段标注置信度（high/medium/low）：",
    "- high：原文中有明确对应内容，你只是提取，没有推断",
    "- medium：原文有隐含信息，你做了部分推断补全",
    "- low：原文信息不足，你大量推断或猜测",
    "- 信息不足时该字段填 low，不要硬编 content",
    "",
    "【占位规则】信息不足时保留键名，用空字符串或空数组占位，不要跳过任何字段。",
    "",
    "【禁止事项】",
    "❌ 禁止返回数组（顶层不能是 []）",
    "❌ 禁止只返回 keyRelationships 或部分字段（必须 6 个字段全部出现）",
    "❌ 禁止输出 Markdown、解释、额外文字",
    "",
    "如果某个字段无法提取：填空值占位 + 标注 low confidence + 在 missingFields 中列出字段名。",
  ].join("\n");

  const user = [
    "请从以下原始文本中提炼结构化总纲。",
    "",
    "=== 字段说明 ===",
    "",
    "1. oneLineSummary：40-90 字，主角 + 核心目标 + 主要障碍",
    "",
    "2. coreConflict（三分法）：",
    "   - external：外部冲突（环境/势力/任务）",
    "   - internal：内部冲突（心理/道德/身份认同）",
    "   - relational：关系冲突（亲情/爱情/友情/敌对）",
    "",
    "3. keyRelationships：3-8 条，每条：personA, personB, relationshipType（亲情/爱情/友情/敌对/利用/竞争/其他）, description, arcDirection（恶化/缓和/破裂/修复/反转，可选）",
    "",
    "4. narrativeStructure：",
    "   - narrativeMode：linear | nonlinear",
    "   - openingType：conflict_first | daily_life | backstory | mystery_hook",
    "   - isTimelineStart：true=从起点开始；false=从中段/终点回溯",
    "   - hasBackstoryToRecover：是否存在需要逐步揭示的前史",
    "   - backstoryHint：前史提示（可选）",
    "",
    "5. longArcNodes：5-10 个剧情节点，每个：nodeLabel, placementHint（前期/中前期/中期/中后期/后期/终局/未知）, description, arcType（setup/rising/climax/falling/resolution/twist）, confidence（high/medium/low）",
    "",
    "6. hiddenReveals：3-8 条不可提前揭示的信息，每个：revealLabel, revealContent, plannedPhase（前期/中期/后期/终局/未知）, spoilerRiskLevel（high/medium/low）",
    "",
    "=== 部分成功策略 ===",
    "字段无法可靠提取时：填空值占位 → 在 warnings 中说明 → 在 missingFields 中列字段名。",
    "",
    "硬约束：信息不足不要硬编。",
    "",
    currentMacro.trim()
      ? `用户当前已有的总纲（仅供参考，不要照搬）：\n${currentMacro.slice(0, 2000)}\n`
      : "",
    `原始文本：\n${sourceText}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

// ==================== 原文素材角色抽取 Prompt ====================

const SOURCE_MATERIAL_EXTRACTION_SCHEMA = `{
  "characters": [
    {
      "sourceName": "string（原著角色名）",
      "sourceAliases": ["string（别名/称号/分身名）"],
      "gender": "male | female | unknown",
      "traits": ["string（性格标签）"],
      "cleanProfileSummary": "string（清洗后的人物简介，去除冗余描述）",
      "requiredFunction": "string（角色功能：主角/反派/关系角色/助推/阻碍等）",
      "relationshipFacts": "string（与其他角色的明确关系事实）",
      "backgroundFacts": "string（身份背景事实）",
      "sourceGenderHint": "male | female | unknown",
      "genderEvidence": "string（性别判断依据）"
    }
  ],
  "roleFunctionMap": [
    {
      "sourceName": "string",
      "roleFunction": "string（角色功能描述）",
      "publicIdentity": "string（公开身份）",
      "hiddenIdentity": "string（隐藏身份，可选）"
    }
  ],
  "warnings": ["string"],
  "missingFields": ["string"]
}`;

type SourceMaterialExtractionParams = {
  characterProfileText: string;
  storySynopsisText: string;
  storyBackgroundText: string;
  worldSettingText: string;
};

export function buildSourceMaterialExtractionPrompt(params: SourceMaterialExtractionParams): PromptBundle {
  const { characterProfileText, storySynopsisText, storyBackgroundText, worldSettingText } = params;

  const system = [
    "你是一个专业的剧本结构化助手，负责从原著素材中抽取角色信息。",
    "你的任务是识别原著中的所有主要角色，提取他们的基本信息、关系和功能。",
    "",
    "【输出格式】",
    "返回 JSON，结构如下：",
    SOURCE_MATERIAL_EXTRACTION_SCHEMA,
    "",
    "【抽取规则】",
    "1. 只抽取原著明确提到的人物，不要虚构或推断不存在的人物",
    "2. sourceName 必须是原著中明确出现的人物名",
    "3. sourceAliases 包括别名、称号、分身名、伪装身份名等",
    "4. gender 优先根据原著描述判断，无明确依据时使用 unknown",
    "5. traits 只提取性格相关标签，不包含身份或关系描述",
    "6. cleanProfileSummary 是清洗后的人物简介，去除冗余描述，保留核心设定",
    "7. requiredFunction 根据角色在剧情中的作用判断",
    "8. relationshipFacts 只写明确的关系事实，不写推断或假设",
    "9. backgroundFacts 只写身份背景事实，不写完整剧情",
    "",
    "【注意事项】",
    "- 不要把组织、地点、势力名误认为角色名",
    "- 不要把关系描述当作角色名",
    "- 不要推断原著未明确说明的关系",
    "- 信息不足时在 warnings 和 missingFields 中说明",
  ].join("\n");

  const user = [
    "请从以下原著素材中抽取角色信息。",
    "",
    characterProfileText.trim() ? `【人物简介】\n${characterProfileText.slice(0, 8000)}\n` : "",
    storySynopsisText.trim() ? `【故事梗概】\n${storySynopsisText.slice(0, 8000)}\n` : "",
    storyBackgroundText.trim() ? `【背景设定】\n${storyBackgroundText.slice(0, 4000)}\n` : "",
    worldSettingText.trim() ? `【世界观】\n${worldSettingText.slice(0, 4000)}\n` : "",
    "",
    "请抽取所有主要角色，返回 JSON。",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}
