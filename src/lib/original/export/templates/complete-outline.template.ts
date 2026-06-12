import type { OriginalDraft, OriginalPhaseRange } from "@/lib/types";

// ==================== 数据 ====================

export type CompleteOutlineBeatCard = {
  episodeNumber: number;
  title: string;
  function: string;
  microBeat: string;
  cardType: string;
  expectation: string;
  breakPoint: string;
  emotion: string;
  newQuestion: string;
};

export type CompleteOutlineData = {
  /** 从 outlineBatches / originalPhaseRanges / episodes 整合的连续粗纲叙述 */
  roughNarrative: string;
  /** 单卡集纲卡片列表 */
  beatCards: CompleteOutlineBeatCard[];
};

const CARD_TYPE_CN: Record<string, string> = {
  hook: "钩子",
  pressure: "压迫",
  reversal: "反转",
  escalation: "升级",
  payoff: "爽点",
  closure: "收束",
  foreshadowing: "铺垫",
};

const MICRO_BEAT_CN: Record<string, string> = {
  "起": "起",
  "困": "困",
  "反": "反",
  "升": "升",
  "爽": "爽",
  "合": "合",
};

// ==================== 提取 ====================

export function extractCompleteOutline(draft: OriginalDraft): CompleteOutlineData {
  const ol = draft.outlines;

  // 1. 粗纲叙述：优先 outlineBatches.roughOutline → originalPhaseRanges → episodes
  const roughNarrative = buildRoughNarrative(ol);

  // 2. 单卡集纲：从 beatCards 提取，fallback 到 episodesStructured
  const beatCards = extractBeatCards(ol);

  return { roughNarrative, beatCards };
}

/**
 * 按优先级整合连续粗纲，输出前会清理生产标签：
 *   1) outlineBatches[].roughOutline —— 最接近真实"粗纲"
 *   2) originalPhaseRanges —— 用 stageTask / relationshipTask / emotionTask 整合为连续段落
 *   3) outlines.episodes —— 最后 fallback，join 为连续文本
 */
function buildRoughNarrative(ol: OriginalDraft["outlines"]): string {
  let raw = "";

  // 优先：outlineBatches 批次粗纲
  if (ol.outlineBatches && ol.outlineBatches.length > 0) {
    const batchTexts = ol.outlineBatches
      .filter((b) => b.roughOutline && b.roughOutline.trim().length > 0)
      .sort((a, b) => a.batchIndex - b.batchIndex)
      .map((b) => b.roughOutline!.trim());
    if (batchTexts.length > 0) {
      raw = batchTexts.join("\n\n");
    }
  }

  // fallback：originalPhaseRanges 整合为连续段落
  if (!raw && ol.originalPhaseRanges && ol.originalPhaseRanges.length > 0) {
    raw = buildPhaseNarrative(ol.originalPhaseRanges);
  }

  // 最后 fallback：outlines.episodes 分集粗纲文本 join
  if (!raw && ol.episodes && ol.episodes.length > 0) {
    const texts = ol.episodes.filter((t) => t && t.trim().length > 0);
    if (texts.length > 0) {
      raw = texts.join("\n\n");
    }
  }

  // 清理生产内部标签
  return cleanNarrativeLabels(raw);
}

/**
 * 清理粗纲中的内部生产标签，输出干净连续叙述。
 * 去除：第N-M集：/ 第N-M集: / EP数字+一卡二卡三卡 / 一卡二卡三卡 / 本批服务 / 为下一批
 */
function cleanNarrativeLabels(text: string): string {
  let t = text;

  // 去掉行首的 "第N-M集：" / "第N-M集:"
  t = t.replace(/^第\d+-\d+集[：:]\s*/gm, "");

  // 去掉行首的 "第N集：" / "第N集:"
  t = t.replace(/^第\d+集[：:]\s*/gm, "");

  // 去掉 EP10一卡 / EP17二卡 / EP3三卡
  t = t.replace(/EP\d+[一二三]卡/g, "");

  // 去掉孤立的 一卡 / 二卡 / 三卡（前后有空白或标点）
  t = t.replace(/[一二三]卡/g, "");

  // 去掉 本批服务 / 为下一批
  t = t.replace(/本批服务[：:]?\s*/g, "");
  t = t.replace(/为下一批[：:]?\s*/g, "");

  // 去掉多余空行（连续3个以上空行压成2个）
  t = t.replace(/\n{3,}/g, "\n\n");

  // trim
  t = t.trim();

  return t;
}

/** 从 OriginalPhaseRange[] 整合为连续自然段叙述 */
function buildPhaseNarrative(phases: OriginalPhaseRange[]): string {
  const sorted = [...phases].sort(
    (a, b) => a.startEpisode - b.startEpisode,
  );

  const paragraphs: string[] = [];

  for (const p of sorted) {
    const parts: string[] = [];
    if (p.stageTask) parts.push(p.stageTask);
    if (p.relationshipTask) parts.push(p.relationshipTask);
    if (p.emotionTask) parts.push(p.emotionTask);
    if (parts.length === 0) continue;
    paragraphs.push(parts.join("；"));
  }

  if (paragraphs.length === 0) return "";
  return paragraphs.join("\n\n");
}

/** 从 beatCards / episodesStructured 提取单卡 */
function extractBeatCards(
  ol: OriginalDraft["outlines"],
): CompleteOutlineBeatCard[] {
  // 优先：beatCards
  if (ol.beatCards && ol.beatCards.length > 0) {
    return ol.beatCards
      .map((bc) => ({
        episodeNumber: bc.episodeNumber,
        title: bc.title || "",
        function: bc.function || "",
        microBeat: bc.microBeat,
        cardType: bc.cardType,
        expectation: bc.expectation || "",
        breakPoint: bc.break || "",
        emotion: bc.emotion || "",
        newQuestion: bc.newQuestion || "",
      }))
      .sort((a, b) => a.episodeNumber - b.episodeNumber);
  }

  // fallback：episodesStructured
  if (ol.episodesStructured && ol.episodesStructured.length > 0) {
    return ol.episodesStructured
      .map((ep) => ({
        episodeNumber: ep.episodeNumber,
        title: ep.title || "",
        function: ep.plotTask || "",
        microBeat: ep.microBeat,
        cardType: "hook",
        expectation: ep.hook || "",
        breakPoint: ep.conflict || "",
        emotion: ep.emotionalPoint || "",
        newQuestion: ep.newInformation || "",
      }))
      .sort((a, b) => a.episodeNumber - b.episodeNumber);
  }

  return [];
}

// ==================== 渲染 ====================

export function renderCompleteOutline(data: CompleteOutlineData): string {
  const lines: string[] = [];
  lines.push("# 完整大纲");
  lines.push("");

  const hasNarrative = data.roughNarrative.length > 0;
  const hasBeatCards = data.beatCards.length > 0;

  if (!hasNarrative && !hasBeatCards) {
    lines.push("完整大纲尚未生成");
    lines.push("");
    return lines.join("\n");
  }

  // 连续粗纲叙述
  if (hasNarrative) {
    lines.push(data.roughNarrative);
    lines.push("");
  }

  // 单卡集纲
  if (hasBeatCards) {
    if (hasNarrative) {
      lines.push("---");
      lines.push("");
    }
    lines.push("## 单卡集纲");
    lines.push("");

    for (const bc of data.beatCards) {
      const titleSuffix = bc.title ? `：${bc.title}` : "";
      lines.push(`### 第 ${bc.episodeNumber} 集${titleSuffix}`);
      lines.push("");
      if (bc.function) lines.push(`- **功能**：${bc.function}`);
      lines.push(`- **节拍**：${MICRO_BEAT_CN[bc.microBeat] ?? bc.microBeat}`);
      lines.push(`- **卡点类型**：${CARD_TYPE_CN[bc.cardType] ?? bc.cardType}`);
      if (bc.expectation) lines.push(`- **预期效果**：${bc.expectation}`);
      if (bc.breakPoint) lines.push(`- **断点**：${bc.breakPoint}`);
      if (bc.emotion) lines.push(`- **情感基调**：${bc.emotion}`);
      if (bc.newQuestion) lines.push(`- **留下的悬念**：${bc.newQuestion}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
