import {
  breakdownCards,
  editorRecommendations,
  evidenceCards,
  qualityRules,
} from "./assets";
import type { BreakdownCard, EditorRecommendation, EvidenceCard, QualityRule } from "./types";

export type QualityAssetRiskTolerance = "low" | "medium" | "high" | "compliance_only";

export type SelectQualityAssetsOptions = {
  scriptType?: "short_drama" | "ai_comic";
  genres?: string[];
  commercialMode?: string;
  intent?: string;
  sourceType?: string;
  riskTolerance?: QualityAssetRiskTolerance;
  maxItems?: number;
};

const HIGH_RISK_TAGS = new Set([
  "copyright_risk",
  "ip_similarity_risk",
  "compliance_risk",
  "ai_visual_risk",
  "religious_or_mythic_ip_risk",
]);

function qualityRuleRiskTags(item: QualityRule): string[] {
  const tags: string[] = [];
  if ((item.complianceRisk ?? 0) >= 3) tags.push("compliance_risk");
  if ((item.antiTemplateRisk ?? 0) >= 3) tags.push("ip_similarity_risk");
  if ((item.wateringRisk ?? 0) >= 3) tags.push("over_template_risk");
  return tags;
}

function normalizeStringArray(value: string[] | undefined): string[] {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function genreOverlapScore(genres: string[] | undefined, candidates: string[] | undefined): number {
  if (!genres?.length || !candidates?.length) return 0;
  const set = new Set(genres);
  return candidates.reduce((score, genre) => score + (set.has(genre) ? 1 : 0), 0);
}

function hasRiskTags(riskTags: string[] | undefined, wanted: Set<string> = HIGH_RISK_TAGS): boolean {
  return (riskTags ?? []).some((tag) => wanted.has(tag));
}

function isComplianceOnlyAsset(riskTags: string[] | undefined): boolean {
  return hasRiskTags(riskTags);
}

function isAllowedByRiskTolerance(riskTags: string[] | undefined, riskTolerance: QualityAssetRiskTolerance): boolean {
  if (riskTolerance === "compliance_only") {
    return isComplianceOnlyAsset(riskTags);
  }

  if (riskTolerance === "high") {
    return true;
  }

  if (riskTolerance === "medium") {
    return !hasRiskTags(riskTags);
  }

  return !hasRiskTags(riskTags);
}

function scoreEditorRecommendation(item: EditorRecommendation, options: SelectQualityAssetsOptions): number {
  const genres = normalizeStringArray(options.genres);
  let score = 0;

  if (options.scriptType && item.scriptType === options.scriptType) score += 3;
  score += genreOverlapScore(genres, item.applicableGenres);
  if (options.commercialMode && item.commercialModes.includes(options.commercialMode)) score += 1;
  if (!hasRiskTags(item.riskTags)) score += 1;
  if (hasRiskTags(item.riskTags) && options.riskTolerance === "high") score += 0;
  if (options.riskTolerance === "compliance_only") score += item.riskTags.some((tag) => HIGH_RISK_TAGS.has(tag)) ? 2 : -10;

  return score;
}

function scoreQualityRule(item: QualityRule, options: SelectQualityAssetsOptions): number {
  const genres = normalizeStringArray(options.genres);
  const riskTags = qualityRuleRiskTags(item);
  let score = 0;

  score += genreOverlapScore(genres, item.applicableGenres);
  if (options.commercialMode && item.commercialModes?.includes(options.commercialMode)) score += 1;
  if (item.level === "L0") score += 1;
  if (item.level === "L1") score += 2;
  if (item.level === "L2") score += 1;
  if (item.recommendationStrength === "high") score += 1;
  if (item.recommendationStrength === "critical") score += 2;
  if (!isAllowedByRiskTolerance(riskTags, options.riskTolerance ?? "low")) score -= 20;
  if (options.riskTolerance === "compliance_only") {
    score += hasRiskTags(riskTags) ? 2 : -10;
  }

  return score;
}

function scoreBreakdownCard(item: BreakdownCard, options: SelectQualityAssetsOptions): number {
  const genres = normalizeStringArray(options.genres);
  let score = 0;

  if (options.scriptType && item.scriptType === options.scriptType) score += 3;
  score += genreOverlapScore(genres, item.applicableGenres);
  if (hasRiskTags(item.riskTags)) score -= 1;
  if (options.riskTolerance === "compliance_only") {
    score += hasRiskTags(item.riskTags) ? 2 : -10;
  }

  return score;
}

function scoreEvidenceCard(item: EvidenceCard, options: SelectQualityAssetsOptions): number {
  const genres = normalizeStringArray(options.genres);
  let score = 0;

  score += genreOverlapScore(genres, item.supportedGenres);
  if (options.riskTolerance === "compliance_only") {
    score += isComplianceOnlyAsset(item.riskTags) ? 2 : -10;
  } else if (!isAllowedByRiskTolerance(item.riskTags, options.riskTolerance ?? "low")) {
    score -= 20;
  }

  return score;
}

function sortAndLimit<T>(items: Array<{ item: T; score: number }>, maxItems?: number): T[] {
  const sorted = items
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
  return typeof maxItems === "number" && maxItems >= 0 ? sorted.slice(0, maxItems) : sorted;
}

export function selectEditorRecommendations(options: SelectQualityAssetsOptions = {}): EditorRecommendation[] {
  return sortAndLimit(
    editorRecommendations
      .filter((item) => isAllowedByRiskTolerance(item.riskTags, options.riskTolerance ?? "low"))
      .map((item) => ({ item, score: scoreEditorRecommendation(item, options) })),
    options.maxItems,
  );
}

export function selectQualityRules(options: SelectQualityAssetsOptions = {}): QualityRule[] {
  return sortAndLimit(
    qualityRules
      .filter((item) => isAllowedByRiskTolerance(
        qualityRuleRiskTags(item),
        options.riskTolerance ?? "low",
      ))
      .map((item) => ({ item, score: scoreQualityRule(item, options) })),
    options.maxItems,
  );
}

export function selectBreakdownCards(options: SelectQualityAssetsOptions = {}): BreakdownCard[] {
  return sortAndLimit(
    breakdownCards
      .filter((item) => isAllowedByRiskTolerance(item.riskTags, options.riskTolerance ?? "low"))
      .map((item) => ({ item, score: scoreBreakdownCard(item, options) })),
    options.maxItems,
  );
}

export function selectEvidenceCardsByIds(ids: string[]): EvidenceCard[] {
  const idSet = new Set(ids);
  return evidenceCards.filter((item) => idSet.has(item.id));
}

export function selectQualityAssetsForOriginal(options: SelectQualityAssetsOptions = {}): {
  recommendations: EditorRecommendation[];
  rules: QualityRule[];
  breakdowns: BreakdownCard[];
  evidence: EvidenceCard[];
} {
  const recommendations = selectEditorRecommendations(options);
  const rules = selectQualityRules(options);
  const breakdowns = selectBreakdownCards(options);

  const evidenceIdOrder: string[] = [];
  const evidenceSeen = new Set<string>();
  const pushEvidenceIds = (ids: string[] | undefined) => {
    for (const id of ids ?? []) {
      if (!evidenceSeen.has(id)) {
        evidenceSeen.add(id);
        evidenceIdOrder.push(id);
      }
    }
  };

  for (const item of recommendations) pushEvidenceIds(item.evidenceIds);
  for (const item of rules) pushEvidenceIds(item.evidenceIds);
  for (const item of breakdowns) pushEvidenceIds(item.evidenceIds);

  const evidence = selectEvidenceCardsByIds(evidenceIdOrder);

  return { recommendations, rules, breakdowns, evidence };
}
