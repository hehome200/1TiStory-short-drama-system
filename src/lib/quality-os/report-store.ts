import { selectQualityAssetsForOriginal } from "@/lib/quality-os/select-assets";
import type {
  GenerationQualityReport,
  GenerationQualityStage,
  QualityAssetType,
  QualityIssue,
  QualityMetric,
  QualityRule,
  ValidationLevel,
} from "@/lib/quality-os/types";

export type BuildScriptQualityReportInput = {
  projectId?: string;
  scriptType: "short_drama" | "ai_comic";
  overview?: {
    title?: string;
    premise?: string;
    projectBrief?: unknown;
    scriptPlan?: unknown;
  };
  outlines?: {
    episodesStructured?: unknown[];
    beatCards?: unknown[];
    originalPhaseRanges?: unknown[];
  };
  script?: {
    currentText?: string;
    batches?: unknown[];
  };
  maxIssues?: number;
  now?: string;
};

const LEVEL_ORDER: ValidationLevel[] = ["L0", "L1", "L2", "L3", "L4"];
const STAGE: GenerationQualityStage = "script";
const DEFAULT_MAX_ISSUES = 8;
const DEFAULT_REFERENCE_LIMIT = 5;

function makeReportId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `quality_report_${Date.now().toString(36)}_${randomPart}`;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readGenres(projectBrief: unknown, scriptPlan: unknown): string[] {
  const fromProjectBrief = projectBrief && typeof projectBrief === "object"
    ? normalizeStringArray((projectBrief as Record<string, unknown>).genres)
    : [];
  if (fromProjectBrief.length > 0) return fromProjectBrief;

  const fromScriptPlan = scriptPlan && typeof scriptPlan === "object"
    ? normalizeStringArray((scriptPlan as Record<string, unknown>).genres)
    : [];
  return fromScriptPlan;
}

function collectEvidenceIds(sourceIds: string[], maxCount = 6): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of sourceIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= maxCount) break;
  }
  return result;
}

function issue(
  id: string,
  level: ValidationLevel,
  title: string,
  description: string,
  severity: QualityIssue["severity"],
  suggestedAction: string,
  evidenceIds: string[],
): QualityIssue {
  return {
    id,
    level,
    title,
    description,
    severity,
    evidenceIds,
    location: { stage: STAGE },
    suggestedAction,
  };
}

function metric(
  id: string,
  name: string,
  value: number,
  unit?: string,
  level?: ValidationLevel,
  evidenceIds: string[] = [],
): QualityMetric {
  return {
    id,
    name,
    value,
    unit,
    level,
    evidenceIds,
  };
}

function ruleLevels(rules: QualityRule[]): ValidationLevel[] {
  const levels = new Set<ValidationLevel>();
  for (const rule of rules) {
    levels.add(rule.level);
  }
  return Array.from(levels).sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));
}

function issueLevels(issues: QualityIssue[]): ValidationLevel[] {
  const levels = new Set<ValidationLevel>();
  for (const item of issues) {
    levels.add(item.level);
  }
  return Array.from(levels).sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));
}

function buildRecommendationText(issues: QualityIssue[]): string {
  if (issues.length === 0) {
    return "建议继续保持正文密度、结构化分集和卡点信号的稳定输出。";
  }

  const priority = issues.slice(0, 3).map((item) => item.title).join("、");
  return `建议优先处理：${priority}。`;
}

function pickSummaryTitle(title?: string, premise?: string): string {
  const cleanedTitle = typeof title === "string" ? title.trim() : "";
  if (cleanedTitle) return cleanedTitle;
  const cleanedPremise = typeof premise === "string" ? premise.trim() : "";
  return cleanedPremise ? cleanedPremise.slice(0, 24) : "未命名项目";
}

export function buildScriptQualityReport(input: BuildScriptQualityReportInput): GenerationQualityReport {
  const now = input.now ?? new Date().toISOString();
  const currentText = typeof input.script?.currentText === "string" ? input.script.currentText : "";
  const batches = Array.isArray(input.script?.batches) ? input.script!.batches! : [];
  const episodesStructured = Array.isArray(input.outlines?.episodesStructured) ? input.outlines!.episodesStructured! : [];
  const beatCards = Array.isArray(input.outlines?.beatCards) ? input.outlines!.beatCards! : [];
  const originalPhaseRanges = Array.isArray(input.outlines?.originalPhaseRanges) ? input.outlines!.originalPhaseRanges! : [];
  const scriptTextLength = currentText.trim().length;
  const batchCount = batches.length;
  const structuredEpisodeCount = episodesStructured.length;
  const beatCardCount = beatCards.length;
  const hasScriptText = scriptTextLength > 0 || batchCount > 0;

  const genres = readGenres(input.overview?.projectBrief, input.overview?.scriptPlan);
  const selectedAssets = selectQualityAssetsForOriginal({
    scriptType: input.scriptType,
    genres,
    commercialMode: "unknown",
    riskTolerance: "low",
    maxItems: DEFAULT_REFERENCE_LIMIT,
  });

  const referenceIds = new Set<string>();
  const assetRefs: Array<{ assetType: QualityAssetType; assetId: string }> = [];
  const pushAssetRef = (assetType: QualityAssetType, assetId: string) => {
    const key = `${assetType}:${assetId}`;
    if (referenceIds.has(key)) return;
    referenceIds.add(key);
    assetRefs.push({ assetType, assetId });
  };

  for (const item of selectedAssets.recommendations.slice(0, 3)) {
    pushAssetRef("recommendation", item.id);
  }
  for (const item of selectedAssets.rules.slice(0, 5)) {
    pushAssetRef("rule", item.id);
  }
  for (const item of selectedAssets.evidence.slice(0, 6)) {
    pushAssetRef("evidence", item.id);
  }

  const evidenceIds = collectEvidenceIds([
    ...selectedAssets.evidence.map((item) => item.id),
    ...selectedAssets.rules.flatMap((item) => item.evidenceIds),
    ...selectedAssets.recommendations.flatMap((item) => item.evidenceIds),
  ]);

  const issues: QualityIssue[] = [];
  const issueEvidenceIds = evidenceIds.slice(0, 3);
  if (!hasScriptText) {
    issues.push(
      issue(
        "script_empty",
        "L0",
        "正文内容缺失",
        "当前没有可分析的剧本正文或批次内容。",
        "critical",
        "先补足正文内容，再生成质量提示。",
        issueEvidenceIds,
      ),
    );
  }

  if (scriptTextLength > 0 && scriptTextLength < 300) {
    issues.push(
      issue(
        "script_too_short",
        "L1",
        "正文长度偏短",
        "当前正文文本较短，可能还不足以支撑稳定的结构与节奏判断。",
        "high",
        "优先补足正文信息增量与关键转折。",
        issueEvidenceIds,
      ),
    );
  }

  if (structuredEpisodeCount === 0) {
    issues.push(
      issue(
        "missing_structured_episodes",
        "L1",
        "缺少结构化分集",
        "当前没有结构化分集信息，后续质量判断会受限。",
        "medium",
        "补足分集结构，再做更细的节奏审阅。",
        issueEvidenceIds,
      ),
    );
  }

  if (beatCardCount === 0) {
    issues.push(
      issue(
        "missing_beat_cards",
        "L1",
        "缺少卡点信号",
        "当前没有可读的卡点信息，结尾钩子与推进节奏的审阅会偏弱。",
        "medium",
        "补足卡点信息后再评估结尾钩子与推进密度。",
        issueEvidenceIds,
      ),
    );
  }

  if (issues.length > (input.maxIssues ?? DEFAULT_MAX_ISSUES)) {
    issues.length = input.maxIssues ?? DEFAULT_MAX_ISSUES;
  }

  const metrics: QualityMetric[] = [
    metric("scriptTextLength", "scriptTextLength", scriptTextLength, "chars", scriptTextLength > 0 ? "L1" : "L0", issueEvidenceIds),
    metric("hasScriptText", "hasScriptText", hasScriptText ? 1 : 0, undefined, hasScriptText ? "L1" : "L0", issueEvidenceIds),
    metric("structuredEpisodeCount", "structuredEpisodeCount", structuredEpisodeCount, undefined, structuredEpisodeCount > 0 ? "L1" : "L0", issueEvidenceIds),
    metric("beatCardCount", "beatCardCount", beatCardCount, undefined, beatCardCount > 0 ? "L1" : "L0", issueEvidenceIds),
    metric("batchCount", "batchCount", batchCount, undefined, batchCount > 0 ? "L1" : "L0", issueEvidenceIds),
    metric("originalPhaseRangeCount", "originalPhaseRangeCount", originalPhaseRanges.length, undefined, originalPhaseRanges.length > 0 ? "L1" : "L0", issueEvidenceIds),
    metric("referenceRuleCount", "referenceRuleCount", selectedAssets.rules.length, undefined, "L1", selectedAssets.rules.flatMap((item) => item.evidenceIds).slice(0, 3)),
    metric("referenceRecommendationCount", "referenceRecommendationCount", selectedAssets.recommendations.length, undefined, "L1", selectedAssets.recommendations.flatMap((item) => item.evidenceIds).slice(0, 3)),
    metric("evidenceCount", "evidenceCount", selectedAssets.evidence.length, undefined, "L1", selectedAssets.evidence.map((item) => item.id).slice(0, 3)),
    metric("issueCount", "issueCount", issues.length, undefined, issues.length > 0 ? "L1" : "L0", issueEvidenceIds),
  ];

  const validationLevels = Array.from(new Set([
    ...ruleLevels(selectedAssets.rules),
    ...issueLevels(issues),
  ])).sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));

  return {
    id: makeReportId(),
    projectId: input.projectId,
    stage: STAGE,
    createdAt: now,
    validationLevels: validationLevels.length > 0 ? validationLevels : ["L0"],
    evidenceCards: selectedAssets.evidence,
    rules: selectedAssets.rules,
    issues,
    metrics,
    summary: `基于当前剧本正文、分集结构和静态质量规则生成的轻量质量提示（${pickSummaryTitle(input.overview?.title, input.overview?.premise)}）。`,
    recommendation: buildRecommendationText(issues),
    assetRefs,
  };
}
