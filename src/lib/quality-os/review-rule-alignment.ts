/**
 * QualityCheck dry-run 审稿规则只读对照
 *
 * 纯函数 helper：对已存在的审稿报告文本与当前 enabled Rulers 做只读文本匹配。
 * 不触发 LLM、不写 DB、不扣费、不拼接 prompt、不调用 Provider。
 *
 * 安全边界：
 * - 输入只接收已提取的审稿报告文本 + 当前 asset snapshot
 * - 不做业务评分，不做剧情好坏判断
 * - 只做关键词文本证据匹配
 * - 不返回审稿报告原文、剧本文本、prompt、用户输入
 */

import { buildQualityCheckDryRunRuntimeAssetSnapshot } from "./runtime-probe";
import type { QualityCheckDryRunRuntimeAssetSnapshot } from "./types";

// ==================== 类型 ====================

/** 单条 Ruler 对照结果 */
export type QualityCheckRuleAlignmentMatch = {
  rulerId: string;
  rulerName: string;
  status: string;
  source: string;
  priority?: number;
  matched: boolean;
  matchedTerms: string[];
  evidenceCount: number;
  note: string;
};

/** 审稿规则只读对照报告 */
export type QualityCheckRuleAlignmentReport = {
  target: "quality_check";
  readonly: true;
  source: "stored_review_report";
  sourceId: string;
  hasReviewReport: boolean;
  reviewReportLength: number;
  enabledRulerCount: number;
  excludedAssetCount: number;
  matches: QualityCheckRuleAlignmentMatch[];
  excludedAssets: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
  guarantees: string[];
};

// ==================== 常量 ====================

const MATCHED_NOTE =
  "仅表示审稿报告中出现相关术语，不代表规则已真实注入。";

const UNMATCHED_NOTE =
  "审稿报告中未发现该规则名称或关键词。当前不代表该规则无效，只表示未在已有报告文本中匹配到可见证据。";

const NO_REVIEW_NOTE = "该 Script 无已存储的审稿报告数据，无法进行文本匹配。";

// 中文停用词（从规则名提取关键词时排除）
const STOP_WORDS = new Set([
  "规则", "的", "是", "在", "和", "与", "或", "及", "了", "不", "要", "对", "等", "之", "中",
  "性", "化", "度", "量", "值", "为", "其", "有", "无", "非", "未", "已", "可", "能", "会",
]);

// ==================== 核心 helper ====================

/** 将审稿报告文本拆分为可搜索关键词 */
function extractKeywordsFromText(text: string): string[] {
  // 分割中文短语：按换行、标点、空格
  const segments = text
    .split(/[\n\r,，。；;：:！!？?\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 20);

  // 去重
  return [...new Set(segments)];
}

/** 从 Ruler 基本信息中提取对照关键词 */
function extractRulerKeywords(ruler: {
  id: string;
  name: string;
  source: string;
}): string[] {
  const raw = [ruler.name, ruler.id, ruler.source]
    .filter(Boolean)
    .flatMap((s) => {
      // 去掉常见分隔符 + 按大小写/下划线/中划线拆分
      const parts = s
        .split(/[\s_\-:：，,、/（）()【】\[\]]+/)
        .map((p) => p.trim())
        .filter((p) => p.length >= 2);
      return parts;
    });

  // 过滤常见停用词
  const filtered = raw
    .filter((w) => !STOP_WORDS.has(w))
    .filter((w) => !/^\d+$/.test(w)); // 排除纯数字

  return [...new Set(filtered)];
}

/** 计算关键词在文本中的命中次数 */
function countMatches(keywords: string[], text: string): {
  matchedTerms: string[];
  evidenceCount: number;
} {
  const lowerText = text.toLowerCase();
  const matchedTerms: string[] = [];
  let evidenceCount = 0;

  for (const kw of keywords) {
    const lowerKw = kw.toLowerCase();
    let idx = 0;
    let found = false;
    while ((idx = lowerText.indexOf(lowerKw, idx)) !== -1) {
      evidenceCount++;
      idx += lowerKw.length;
      found = true;
    }
    if (found) {
      matchedTerms.push(kw);
    }
  }

  return { matchedTerms, evidenceCount };
}

/** 匹配单条 Ruler */
function matchRuler(
  ruler: NonNullable<
    QualityCheckDryRunRuntimeAssetSnapshot["enabledAssets"]["rulers"]
  >[number],
  reviewText: string,
): QualityCheckRuleAlignmentMatch {
  const keywords = extractRulerKeywords(ruler);
  const { matchedTerms, evidenceCount } = countMatches(keywords, reviewText);

  return {
    rulerId: ruler.id,
    rulerName: ruler.name,
    status: ruler.status,
    source: ruler.source,
    priority: (ruler as { priority?: number }).priority,
    matched: matchedTerms.length > 0,
    matchedTerms,
    evidenceCount,
    note: matchedTerms.length > 0 ? MATCHED_NOTE : UNMATCHED_NOTE,
  };
}

// ==================== 公开 API ====================

/**
 * 构建 QualityCheck dry-run 审稿规则只读对照报告
 *
 * @param sourceId    来源标识（scriptId / projectId / projectDraftId，仅用于报告标识）
 * @param reviewText 已提取的审稿报告文本（来自 storage，非 LLM 输出）
 * @param assetSnapshot 可选：当前 runtime asset snapshot。不传时内部构建。
 */
export function buildQualityCheckRuleAlignment(
  sourceId: string,
  reviewText: string,
  assetSnapshot?: QualityCheckDryRunRuntimeAssetSnapshot,
): QualityCheckRuleAlignmentReport {
  const snapshot =
    assetSnapshot ?? buildQualityCheckDryRunRuntimeAssetSnapshot();
  const rulers = snapshot.enabledAssets.rulers;
  const text = reviewText.trim();

  if (!text) {
    return {
      target: "quality_check",
      readonly: true,
      source: "stored_review_report",
      sourceId,
      hasReviewReport: false,
      reviewReportLength: 0,
      enabledRulerCount: rulers.length,
      excludedAssetCount: snapshot.excludedAssets.length,
      matches: rulers.map((r) => ({
        rulerId: r.id,
        rulerName: r.name,
        status: r.status,
        source: r.source,
        priority: (r as { priority?: number }).priority,
        matched: false,
        matchedTerms: [],
        evidenceCount: 0,
        note: NO_REVIEW_NOTE,
      })),
      excludedAssets: snapshot.excludedAssets.map((e) => ({
        id: e.id,
        name: e.name,
        reason: e.reason,
      })),
      guarantees: [
        "不触发 LLM",
        "不写 DB",
        "不扣费",
        "不拼接 prompt",
        "不返回剧本文本",
        "不返回用户输入",
        "关键词匹配仅做文本证据对照",
      ],
    };
  }

  return {
    target: "quality_check",
    readonly: true,
    source: "stored_review_report",
    sourceId,
    hasReviewReport: true,
    reviewReportLength: text.length,
    enabledRulerCount: rulers.length,
    excludedAssetCount: snapshot.excludedAssets.length,
    matches: rulers.map((r) => matchRuler(r, text)),
    excludedAssets: snapshot.excludedAssets.map((e) => ({
      id: e.id,
      name: e.name,
      reason: e.reason,
    })),
    guarantees: [
      "不触发 LLM",
      "不写 DB",
      "不扣费",
      "不拼接 prompt",
      "不返回剧本文本",
      "不返回用户输入",
      "关键词匹配仅做文本证据对照",
    ],
  };
}
