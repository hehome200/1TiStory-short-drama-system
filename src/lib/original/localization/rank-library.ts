/**
 * 等级 / 战力 / 修炼阶段本土化库
 *
 * Seed 来源：docs/localization-seed-from-three-outlines.md §4.2
 * 包含三种不同的等级体系：
 * 1. 兵-将-侯-王-君-帝-圣（玄幻/仙侠通用体系）
 * 2. 屠-将-王-大地-天空-领域-时空-不朽（异世界战力体系）
 * 3. 九段北斗星官体系 + 七色资质（现代修真体系）
 */

import type { LocalizationSourceOutline, LocalizationEntry } from "./index";

export type RankEntry = LocalizationEntry;

// ---------------------------------------------------------------------------
// 体系 A：兵-将-侯-王-君-帝-圣（大纲一：玄幻仙侠）
// ---------------------------------------------------------------------------

const poorStrongRanks: RankEntry[] = [
  {
    sourceTerm: "兵",
    chineseDisplayTerm: "兵",
    englishCanonicalTerm: "Soldier / Initiate",
    category: "rank",
    usage: ["combat", "progression", "military fantasy"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "最低战力层级，对应入门/新兵级战力",
  },
  {
    sourceTerm: "将",
    chineseDisplayTerm: "将",
    englishCanonicalTerm: "General / Commander",
    category: "rank",
    usage: ["combat", "progression", "military fantasy"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "中层战力，可统领军队，开始掌握特殊能力",
  },
  {
    sourceTerm: "侯",
    chineseDisplayTerm: "侯",
    englishCanonicalTerm: "Marquis",
    category: "rank",
    usage: ["combat", "progression", "noble"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "封侯级战力，兼具战力与社会地位双重跃升",
  },
  {
    sourceTerm: "王",
    chineseDisplayTerm: "王",
    englishCanonicalTerm: "King",
    category: "rank",
    usage: ["combat", "progression", "ruler"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "王级强者，一方霸主，通常对应开国/裂土级实力",
  },
  {
    sourceTerm: "君",
    chineseDisplayTerm: "君",
    englishCanonicalTerm: "Sovereign",
    category: "rank",
    usage: ["combat", "progression", "overlord"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "超越王国层级的君主级战力，统治多国/多族",
  },
  {
    sourceTerm: "帝",
    chineseDisplayTerm: "帝",
    englishCanonicalTerm: "Emperor",
    category: "rank",
    usage: ["combat", "progression", "supreme ruler"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "大帝级战力，大陆/世界级最强存在之一",
  },
  {
    sourceTerm: "圣",
    chineseDisplayTerm: "圣",
    englishCanonicalTerm: "Saint / Sage",
    category: "rank",
    usage: ["combat", "progression", "transcendent"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "圣人级，超越凡俗战力的最高层级，接近法则/天道",
  },
];

// ---------------------------------------------------------------------------
// 体系 B：屠-将-王-大地-天空-领域-时空-不朽（大纲三：异世界）
// ---------------------------------------------------------------------------

const cantPretendRanks: RankEntry[] = [
  {
    sourceTerm: "屠",
    chineseDisplayTerm: "屠",
    englishCanonicalTerm: "Slayer",
    category: "rank",
    usage: ["combat", "progression", "isekai"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "异世界体系最低战力层级，「屠」字强调杀伐本质",
  },
  {
    sourceTerm: "将",
    chineseDisplayTerm: "将",
    englishCanonicalTerm: "General",
    category: "rank",
    usage: ["combat", "progression", "isekai"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "中层战力，统领一方",
  },
  {
    sourceTerm: "王",
    chineseDisplayTerm: "王",
    englishCanonicalTerm: "King",
    category: "rank",
    usage: ["combat", "progression", "isekai"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "王级战力（如何图：莽王国国主，时空强者）",
  },
  {
    sourceTerm: "大地",
    chineseDisplayTerm: "大地",
    englishCanonicalTerm: "Earth Realm",
    category: "rank",
    usage: ["combat", "progression", "elemental"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "超越王级，掌控大地之力 / 元素化层级起始",
  },
  {
    sourceTerm: "天空",
    chineseDisplayTerm: "天空",
    englishCanonicalTerm: "Sky Realm",
    category: "rank",
    usage: ["combat", "progression", "elemental"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "天空层级战力，可飞行/操控天象",
  },
  {
    sourceTerm: "领域",
    chineseDisplayTerm: "领域",
    englishCanonicalTerm: "Domain Realm",
    category: "rank",
    usage: ["combat", "progression", "reality warping"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "展开个人领域，领域内法则由自身掌控",
  },
  {
    sourceTerm: "时空",
    chineseDisplayTerm: "时空",
    englishCanonicalTerm: "Spacetime Realm",
    category: "rank",
    usage: ["combat", "progression", "time space"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "掌控时空法则，可影响过去/未来/平行空间",
  },
  {
    sourceTerm: "不朽",
    chineseDisplayTerm: "不朽",
    englishCanonicalTerm: "Immortal",
    category: "rank",
    usage: ["combat", "progression", "eternal"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "最高层级，不死不灭，超越时间与空间束缚",
  },
];

// ---------------------------------------------------------------------------
// 体系 C：九段北斗星官 + 七色资质（大纲二：现代修真）
// ---------------------------------------------------------------------------

const curseMeRanks: RankEntry[] = [
  {
    sourceTerm: "九段",
    chineseDisplayTerm: "九段·天枢境",
    englishCanonicalTerm: "9th Tier — Celestial Pivot",
    category: "rank",
    usage: ["cultivation", "star-based", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "北斗七星+辅弼九星体系，九段为最高",
  },
  {
    sourceTerm: "八段",
    chineseDisplayTerm: "八段·天璇境",
    englishCanonicalTerm: "8th Tier — Celestial Rotation",
    category: "rank",
    usage: ["cultivation", "star-based", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "",
  },
  {
    sourceTerm: "七段",
    chineseDisplayTerm: "七段·天玑境",
    englishCanonicalTerm: "7th Tier — Celestial Mechanism",
    category: "rank",
    usage: ["cultivation", "star-based", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "",
  },
  {
    sourceTerm: "六段",
    chineseDisplayTerm: "六段·天权境",
    englishCanonicalTerm: "6th Tier — Celestial Authority",
    category: "rank",
    usage: ["cultivation", "star-based", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "",
  },
  {
    sourceTerm: "五段",
    chineseDisplayTerm: "五段·玉衡境",
    englishCanonicalTerm: "5th Tier — Jade Balance",
    category: "rank",
    usage: ["cultivation", "star-based", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "",
  },
  {
    sourceTerm: "四段",
    chineseDisplayTerm: "四段·开阳境",
    englishCanonicalTerm: "4th Tier — Blazing Sun",
    category: "rank",
    usage: ["cultivation", "star-based", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "",
  },
  {
    sourceTerm: "三段",
    chineseDisplayTerm: "三段·瑶光境",
    englishCanonicalTerm: "3rd Tier — Radiant Light",
    category: "rank",
    usage: ["cultivation", "star-based", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "",
  },
  {
    sourceTerm: "二段",
    chineseDisplayTerm: "二段·洞明境",
    englishCanonicalTerm: "2nd Tier — Insight",
    category: "rank",
    usage: ["cultivation", "star-based", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "",
  },
  {
    sourceTerm: "一段",
    chineseDisplayTerm: "一段·隐元境",
    englishCanonicalTerm: "1st Tier — Hidden Origin",
    category: "rank",
    usage: ["cultivation", "star-based", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "最低段位，对应入门/初悟阶段",
  },
  {
    sourceTerm: "赤",
    chineseDisplayTerm: "赤（资质）",
    englishCanonicalTerm: "Crimson Aptitude",
    category: "rank",
    usage: ["cultivation", "aptitude test", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "资质检测体系：赤最低，紫最高",
  },
  {
    sourceTerm: "橙",
    chineseDisplayTerm: "橙（资质）",
    englishCanonicalTerm: "Amber Aptitude",
    category: "rank",
    usage: ["cultivation", "aptitude test", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "",
  },
  {
    sourceTerm: "黄",
    chineseDisplayTerm: "黄（资质）",
    englishCanonicalTerm: "Gold Aptitude",
    category: "rank",
    usage: ["cultivation", "aptitude test", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "",
  },
  {
    sourceTerm: "绿",
    chineseDisplayTerm: "绿（资质）",
    englishCanonicalTerm: "Emerald Aptitude",
    category: "rank",
    usage: ["cultivation", "aptitude test", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "",
  },
  {
    sourceTerm: "青",
    chineseDisplayTerm: "青（资质）",
    englishCanonicalTerm: "Azure Aptitude",
    category: "rank",
    usage: ["cultivation", "aptitude test", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "",
  },
  {
    sourceTerm: "蓝",
    chineseDisplayTerm: "蓝（资质）",
    englishCanonicalTerm: "Sapphire Aptitude",
    category: "rank",
    usage: ["cultivation", "aptitude test", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "",
  },
  {
    sourceTerm: "紫",
    chineseDisplayTerm: "紫（资质）",
    englishCanonicalTerm: "Violet Aptitude",
    category: "rank",
    usage: ["cultivation", "aptitude test", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "最高资质等级，对应绝世天才",
  },
];

// ---------------------------------------------------------------------------
// 聚合导出
// ---------------------------------------------------------------------------

/** 等级/战力库：合并三种体系的所有 rank entry */
export const rankLibrary: RankEntry[] = [
  ...poorStrongRanks,
  ...cantPretendRanks,
  ...curseMeRanks,
];
