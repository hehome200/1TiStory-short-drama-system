/**
 * 身份 / 头衔 / 人物功能位本土化库
 *
 * Seed 来源：docs/localization-seed-from-three-outlines.md §4.1
 * 专有角色名不在本库范围内，仅收录可复用的身份类型。
 */

import type { LocalizationSourceOutline, LocalizationEntry } from "./index";

export type IdentityEntry = LocalizationEntry;

// ---------------------------------------------------------------------------
// 大纲一：《这个男人明明超强但是是个穷鬼》身份
// ---------------------------------------------------------------------------

const poorStrong: IdentityEntry[] = [
  {
    sourceTerm: "女帝",
    chineseDisplayTerm: "女帝",
    englishCanonicalTerm: "Empress / Female Sovereign",
    category: "identity",
    usage: ["ruler", "romance", "power fantasy"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "女性最高统治者，兼具权力与感情线（如南宫晴）",
  },
  {
    sourceTerm: "国主",
    chineseDisplayTerm: "国主",
    englishCanonicalTerm: "Kingdom Ruler / Monarch",
    category: "identity",
    usage: ["ruler", "political", "war"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "一国之主，统治层级低于女帝，高于诸侯",
  },
  {
    sourceTerm: "公主",
    chineseDisplayTerm: "公主",
    englishCanonicalTerm: "Princess",
    category: "identity",
    usage: ["romance", "political", "royal intrigue"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "王族女性成员，常见婚约/联姻/政治筹码",
  },
  {
    sourceTerm: "三皇子",
    chineseDisplayTerm: "三皇子",
    englishCanonicalTerm: "Third Prince",
    category: "identity",
    usage: ["royal", "underdog", "power struggle"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "低位皇子，通常不继承大统，适合主角起点身份",
  },
  {
    sourceTerm: "皇族后裔",
    chineseDisplayTerm: "皇族后裔",
    englishCanonicalTerm: "Royal Heir / Imperial Descendant",
    category: "identity",
    usage: ["royal", "hidden identity", "power revival"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "可叠加穿越/失忆身份，形成多层身份反转",
  },
  {
    sourceTerm: "族长之女",
    chineseDisplayTerm: "族长之女",
    englishCanonicalTerm: "Clan Chief's Daughter",
    category: "identity",
    usage: ["romance", "clan politics", "forbidden love"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "异族/隐世家族族长之女，常见救主角/婚约剧情",
  },
  {
    sourceTerm: "隐藏传承者",
    chineseDisplayTerm: "隐藏传承者",
    englishCanonicalTerm: "Hidden Inheritor / Secret Successor",
    category: "identity",
    usage: ["underdog", "power awakening", "revenge"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "表面平凡，实则持有古老传承/血脉/系统",
  },
  {
    sourceTerm: "救世者",
    chineseDisplayTerm: "救世者",
    englishCanonicalTerm: "World Savior / Salvation Bearer",
    category: "identity",
    usage: ["epic", "chosen one", "world crisis"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "预言中的救世之人，承担守护人族/封印边界等使命",
  },
];

// ---------------------------------------------------------------------------
// 大纲二：《别求我诅咒你》身份
// ---------------------------------------------------------------------------

const curseMe: IdentityEntry[] = [
  {
    sourceTerm: "道门高真",
    chineseDisplayTerm: "道门高真",
    englishCanonicalTerm: "Dao Sect Elder / High Adept",
    category: "identity",
    usage: ["master", "authority", "cultivation"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "传统修炼界权威人物，掌握道统资源与话语权",
  },
  {
    sourceTerm: "道学院学生",
    chineseDisplayTerm: "道学院学生",
    englishCanonicalTerm: "Dao Academy Student",
    category: "identity",
    usage: ["school", "coming of age", "competition"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "现代修真教育体系下的学生身份",
  },
  {
    sourceTerm: "世家爱女",
    chineseDisplayTerm: "世家爱女",
    englishCanonicalTerm: "Beloved Daughter of a Noble House",
    category: "identity",
    usage: ["romance", "family honor", "cultivation noble"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "隐世道门世家的女性传人，背负家族荣誉与联姻压力",
  },
  {
    sourceTerm: "入赘者",
    chineseDisplayTerm: "入赘者",
    englishCanonicalTerm: "Matrilocal Spouse / Live-in Son-in-Law",
    category: "identity",
    usage: ["underdog", "family drama", "face-slapping"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "入赘女方家族，低位开局，常见受辱→反杀弧线",
  },
];

// ---------------------------------------------------------------------------
// 大纲三：《装不下去就会死》身份
// ---------------------------------------------------------------------------

const cantPretend: IdentityEntry[] = [
  {
    sourceTerm: "逆天之子",
    chineseDisplayTerm: "逆天之子",
    englishCanonicalTerm: "Fatebreaker / Heaven-Defying Heir",
    category: "identity",
    usage: ["chosen one", "misidentification", "pressure"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "被各势力误认为天命所归，实际主角在伪装",
  },
  {
    sourceTerm: "龙女之婿",
    chineseDisplayTerm: "龙女之婿",
    englishCanonicalTerm: "Dragon Princess's Husband",
    category: "identity",
    usage: ["romance", "clan entry", "fish out of water"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "通过婚约/联姻进入龙族/异族权力圈的低位主角",
  },
  {
    sourceTerm: "剑圣真传",
    chineseDisplayTerm: "剑圣真传",
    englishCanonicalTerm: "Sword Saint's True Disciple",
    category: "identity",
    usage: ["master disciple", "power inheritance", "hidden identity"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "获得顶级强者传承，但有可能是冒名顶替（参考车小贤）",
  },
  {
    sourceTerm: "半兽人祭祀",
    chineseDisplayTerm: "半兽人祭祀",
    englishCanonicalTerm: "Beastfolk Shaman / Half-Beast Ritualist",
    category: "identity",
    usage: ["tribal", "ritual", "spiritual authority"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "部落/种族内部的精神权威与仪式主持者",
  },
  {
    sourceTerm: "冒名者",
    chineseDisplayTerm: "冒名者",
    englishCanonicalTerm: "Impostor / Identity Thief",
    category: "identity",
    usage: ["deception", "survival", "undercover"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "冒用他人身份求生的主角（如车小贤冒名常胜），核心机制：装不下去就会死",
  },
  {
    sourceTerm: "国主",
    chineseDisplayTerm: "国主",
    englishCanonicalTerm: "Kingdom Ruler / Monarch",
    category: "identity",
    usage: ["ruler", "political", "war"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "异世界王国统治者（如何图：莽王国国主，时空强者）",
  },
  {
    sourceTerm: "公主",
    chineseDisplayTerm: "公主",
    englishCanonicalTerm: "Princess",
    category: "identity",
    usage: ["romance", "political", "royal intrigue"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "龙皇之女（敖澜/敖姣），异族公主身份叠加婚约/情敌剧情",
  },
  {
    sourceTerm: "族长之女",
    chineseDisplayTerm: "族长之女",
    englishCanonicalTerm: "Clan Chief's Daughter",
    category: "identity",
    usage: ["romance", "clan politics", "forbidden love"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "异族族长之女（如满春：地蛇族族长之女，青梅竹马婚约）",
  },
];

// ---------------------------------------------------------------------------
// 聚合导出
// ---------------------------------------------------------------------------

/** 身份库：合并所有大纲的 identity entry */
export const identityLibrary: IdentityEntry[] = [
  ...poorStrong,
  ...curseMe,
  ...cantPretend,
];
