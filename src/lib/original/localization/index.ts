/**
 * 本土化库 — 统一类型定义与导出
 *
 * 用途：把原文中的身份、等级、种族、职业、道具、地名、组织、文化机制等
 * 转成海外观众更容易理解的表达。
 *
 * 这不是通用机制库的替代品：
 * - 通用机制库：负责剧情机制、爽点机制、反转机制、压力机制、职业行为约束。
 * - 本土化库：负责术语层面的海外化映射与候选素材池。
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 来源大纲标识 */
export type LocalizationSourceOutline =
  | "poor_strong_man"       // 这个男人明明超强但是是个穷鬼
  | "curse_me"              // 别求我诅咒你
  | "cant_keep_pretending"; // 装不下去就会死

/** 本土化条目 */
export type LocalizationEntry = {
  /** 原始中文术语 */
  sourceTerm: string;
  /** 中文工作台显示名 */
  chineseDisplayTerm: string;
  /** 英文 / 海外标准表达 */
  englishCanonicalTerm: string;
  /** 分类标签 */
  category: string;
  /** 适用场景 */
  usage: string[];
  /** 来自哪些上传大纲 */
  sourceOutlines: LocalizationSourceOutline[];
  /** 是否允许被泛化为候选素材（专有名不得为 true） */
  generalizable: boolean;
  /** 补充说明 */
  notes?: string;
};

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { identityLibrary, type IdentityEntry } from "./identity-library";
export { rankLibrary, type RankEntry } from "./rank-library";
export { speciesLibrary, type SpeciesEntry } from "./species-library";
export { professionLibrary, type ProfessionEntry } from "./profession-library";
export { propLibrary, type PropEntry } from "./prop-library";
export {
  cultureMechanismLibrary,
  type CultureMechanismEntry,
} from "./culture-mechanism-library";
export {
  organizationLibrary,
  type OrganizationEntry,
} from "./organization-library";
export { placeLibrary, type PlaceEntry } from "./place-library";
export {
  addressingLibrary,
  type AddressingEntry,
} from "./addressing-library";

// ---------------------------------------------------------------------------
// Aggregated lookup helpers (future use)
// ---------------------------------------------------------------------------

import { identityLibrary } from "./identity-library";
import { rankLibrary } from "./rank-library";
import { speciesLibrary } from "./species-library";
import { professionLibrary } from "./profession-library";
import { propLibrary } from "./prop-library";
import { cultureMechanismLibrary } from "./culture-mechanism-library";
import { organizationLibrary } from "./organization-library";
import { placeLibrary } from "./place-library";
import { addressingLibrary } from "./addressing-library";

/** 所有库的合并列表 */
export const allLocalizationEntries: LocalizationEntry[] = [
  ...identityLibrary,
  ...rankLibrary,
  ...speciesLibrary,
  ...professionLibrary,
  ...propLibrary,
  ...cultureMechanismLibrary,
  ...organizationLibrary,
  ...placeLibrary,
  ...addressingLibrary,
];

/** 按 sourceTerm 查找 */
export function findBySourceTerm(
  term: string,
): LocalizationEntry | undefined {
  return allLocalizationEntries.find((e) => e.sourceTerm === term);
}

/** 按分类筛选 */
export function filterByCategory(
  category: string,
): LocalizationEntry[] {
  return allLocalizationEntries.filter((e) => e.category === category);
}

/** 获取所有可泛化条目（候选素材池） */
export function getGeneralizableEntries(): LocalizationEntry[] {
  return allLocalizationEntries.filter((e) => e.generalizable);
}
