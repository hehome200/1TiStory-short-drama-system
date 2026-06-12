/**
 * 本土化 Prompt 提示注入 Helper
 *
 * 第一刀接入：仅 identity-library + species-library。
 * 只在 fixed-slot characters Prompt 中注入术语映射参考。
 *
 * 第二刀接入：rank-library + prop-library + culture-mechanism-library。
 * 只在 original outlines step Prompt 中注入剧情术语映射参考。
 *
 * 匹配逻辑：
 *   - 对每个 requiredCharacterSlot 提取多个字段的文本
 *   - 在 identity/species 库中查找 sourceTerm 的子串匹配
 *   - 去重后生成简短的术语映射参考
 *   - 中国市场不注入（targetMarket === "中国" 时返回空字符串）
 *   - 无命中时返回空字符串
 */

import type { RequiredCharacterSlot } from "@/lib/ai/context";
import { identityLibrary } from "./identity-library";
import { speciesLibrary } from "./species-library";
import { rankLibrary } from "./rank-library";
import { propLibrary } from "./prop-library";
import { cultureMechanismLibrary } from "./culture-mechanism-library";


/** 单条命中的术语映射 */
type HitEntry = {
  sourceTerm: string;
  englishCanonicalTerm: string;
  category: string;
  chineseDisplayTerm: string;
  notes?: string;
};

// ---------------------------------------------------------------------------
// 第一刀：fixed-slot characters Prompt 本土化
// ---------------------------------------------------------------------------

/**
 * 从 requiredCharacterSlots 中提取可匹配术语并生成本土化提示。
 *
 * @param requiredCharacterSlots - fixed-slot 人物槽位列表
 * @param targetMarket - 目标市场（如 "中国" / "北美" / "日本" 等）
 * @returns 本土化术语映射参考文本；无命中或中国市场时返回 ""
 */
export function buildLocalizationHints(
  requiredCharacterSlots: RequiredCharacterSlot[],
  targetMarket: string,
): string {
  // 中国市场不注入本土化术语提示
  if (targetMarket === "中国") return "";

  const hits = collectHits(requiredCharacterSlots);
  if (hits.length === 0) return "";

  return formatHints(hits);
}

/** 在所有 slot 中收集命中的 entry（去重） */
function collectHits(
  slots: RequiredCharacterSlot[],
): HitEntry[] {
  const libraries = [...identityLibrary, ...speciesLibrary];
  const matched = new Set<string>();
  const hits: HitEntry[] = [];

  for (const slot of slots) {
    const fields: string[] = [];

    // 优先字段
    if (slot.sourceName) fields.push(slot.sourceName);
    if (slot.roleType) fields.push(slot.roleType);
    if (slot.requiredFunction) fields.push(slot.requiredFunction);

    // 扩展字段：人物画像、关系、别名等
    if (slot.cleanProfileSummary) fields.push(slot.cleanProfileSummary);
    if (slot.traits) fields.push(slot.traits);
    if (slot.relationshipFacts) fields.push(slot.relationshipFacts);
    if (slot.backgroundFacts) fields.push(slot.backgroundFacts);
    if (slot.relationshipToProtagonist) fields.push(slot.relationshipToProtagonist);
    if (slot.sourceAliases && slot.sourceAliases.length > 0) {
      fields.push(slot.sourceAliases.join(" "));
    }
    if (slot.defaultRelationshipTags && slot.defaultRelationshipTags.length > 0) {
      fields.push(slot.defaultRelationshipTags.join(" "));
    }

    const combinedText = fields.join(" ");

    for (const entry of libraries) {
      if (matched.has(entry.sourceTerm)) continue;
      if (combinedText.includes(entry.sourceTerm)) {
        matched.add(entry.sourceTerm);
        hits.push({
          sourceTerm: entry.sourceTerm,
          englishCanonicalTerm: entry.englishCanonicalTerm,
          category: entry.category,
          chineseDisplayTerm: entry.chineseDisplayTerm,
          notes: entry.notes,
        });
      }
    }
  }

  return hits;
}

/** 将命中列表格式化为 Prompt 注入文本 */
function formatHints(hits: HitEntry[]): string {
  const lines = hits.map((h) => {
    const catLabel = h.category === "identity" ? "身份表达" : "种族/阵营表达";
    const displayPart =
      h.chineseDisplayTerm && h.chineseDisplayTerm !== h.sourceTerm
        ? "，中文工作台可显示为" + h.chineseDisplayTerm
        : "";
    const notePart = h.notes ? "。" + h.notes : "";
    return "- " + h.sourceTerm + " → " + h.englishCanonicalTerm + "：用于" + catLabel + displayPart + notePart;
  });

  return "【本土化术语映射参考】\n" + lines.join("\n");
}

// ---------------------------------------------------------------------------
// 第二刀：original outlines step Prompt 本土化
// ---------------------------------------------------------------------------

/**
 * 从大纲相关上下文中提取剧情术语并生成本土化提示。
 *
 * 接入库：rank-library / prop-library / culture-mechanism-library
 * 不接入：identity-library / species-library（已在第一刀用于 characters）
 *
 * 匹配逻辑：
 *   - 将传入的文本字段合并为单一字符串
 *   - 对每个 entry 的 sourceTerm 做子串匹配
 *   - 去重，最多输出 12 条
 *   - 中国市场不注入
 *   - 无命中时返回空字符串
 *
 * @param params - 上下文字段
 * @returns 本土化剧情术语映射参考文本
 */
export function buildOutlineLocalizationHints(params: {
  projectBrief?: string;
  scriptPlan?: string;
  overview?: string;
  characters?: string;
  outlines?: string;
  roughOutlines?: string;
  batchRoughOutlines?: string;
  sourceOutline?: string;
  sourceSections?: string;
  sourceMaterialExtraction?: string;
  targetMarket: string;
}): string {
  // 中国市场不注入本土化术语提示
  if (params.targetMarket === "中国") return "";

  // 收集所有文本字段
  const textFields: string[] = [
    params.projectBrief,
    params.scriptPlan,
    params.overview,
    params.characters,
    params.outlines,
    params.roughOutlines,
    params.batchRoughOutlines,
    params.sourceOutline,
    params.sourceSections,
    params.sourceMaterialExtraction,
  ].filter((t): t is string => typeof t === "string" && t.trim().length > 0);

  if (textFields.length === 0) return "";

  const combinedText = textFields.join(" ");

  // 在三个库中查找匹配
  const libraries = [...rankLibrary, ...propLibrary, ...cultureMechanismLibrary];
  const matched = new Set<string>();
  const hits: HitEntry[] = [];

  for (const entry of libraries) {
    if (matched.has(entry.sourceTerm)) continue;
    if (combinedText.includes(entry.sourceTerm)) {
      matched.add(entry.sourceTerm);
      hits.push({
        sourceTerm: entry.sourceTerm,
        englishCanonicalTerm: entry.englishCanonicalTerm,
        category: entry.category,
        chineseDisplayTerm: entry.chineseDisplayTerm,
        notes: entry.notes,
      });
    }
    // 最多 12 条
    if (hits.length >= 12) break;
  }

  if (hits.length === 0) return "";

  return formatOutlineHints(hits);
}

/** 将大纲命中列表格式化为 Prompt 注入文本 */
function formatOutlineHints(hits: HitEntry[]): string {
  const lines = hits.map((h) => {
    const catLabel = getOutlineCategoryLabel(h.category);
    const notePart = h.notes ? "。" + h.notes : "";
    return "- " + h.sourceTerm + " → " + h.englishCanonicalTerm + "：用于" + catLabel + notePart;
  });

  return "【本土化剧情术语映射参考】\n" + lines.join("\n");
}

/** 获取大纲相关的分类标签 */
function getOutlineCategoryLabel(category: string): string {
  switch (category) {
    case "rank":
      return "等级/战力体系";
    case "prop":
      return "道具/资源";
    case "culture-mechanism":
      return "剧情机制";
    default:
      return category;
  }
}