/**
 * 种族 / 异类 / 阵营本土化库
 *
 * Seed 来源：docs/localization-seed-from-three-outlines.md §4.3
 * 专有种族名不在本库范围内，仅收录可复用的类型概念。
 */

import type { LocalizationSourceOutline, LocalizationEntry } from "./index";

export type SpeciesEntry = LocalizationEntry;

// ---------------------------------------------------------------------------
// 大纲一：《这个男人明明超强但是是个穷鬼》种族
// ---------------------------------------------------------------------------

const poorStrongSpecies: SpeciesEntry[] = [
  {
    sourceTerm: "人族",
    chineseDisplayTerm: "人族",
    englishCanonicalTerm: "Humans / Human Clan",
    category: "species",
    usage: ["baseline", "protagonist race", "underdog"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "基准种族，通常被其他强族压迫/轻视",
  },
  {
    sourceTerm: "妖族",
    chineseDisplayTerm: "妖族",
    englishCanonicalTerm: "Demon Clan / Beastkin / Yaoguai",
    category: "species",
    usage: ["antagonist", "oppressed", "shape-shifting"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "可按功能拆为 Shifter（化形者）/ Beastkin（兽人）/ Supernatural Clan（超凡族）",
  },
  {
    sourceTerm: "鬼族",
    chineseDisplayTerm: "鬼族",
    englishCanonicalTerm: "Ghost Clan / Revenants / Shadowborn",
    category: "species",
    usage: ["undead", "dark realm", "sealed race"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "亡灵类种族，被封于酆都/冥界等边界体系",
  },
  {
    sourceTerm: "神族",
    chineseDisplayTerm: "神族",
    englishCanonicalTerm: "Celestials / Divine Bloodline",
    category: "species",
    usage: ["god-like", "ancient", "aloof"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "高维种族，通常已退世/封印，仅留传说或血脉后裔",
  },
  {
    sourceTerm: "狐妖",
    chineseDisplayTerm: "狐妖",
    englishCanonicalTerm: "Fox Shifter / Foxkin",
    category: "species",
    usage: ["romance", "beast clan", "shapeshifter"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "妖族分支，常见救命恩人/女主/情感线角色（如白灵）",
  },
  {
    sourceTerm: "狼族",
    chineseDisplayTerm: "狼族",
    englishCanonicalTerm: "Wolf Clan / Werewolf Clan",
    category: "species",
    usage: ["beast clan", "warrior race", "pack hierarchy"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "兽族分支，族群内有候级/王级等战力层级",
  },
  {
    sourceTerm: "修者",
    chineseDisplayTerm: "修者",
    englishCanonicalTerm: "Cultivator / Practitioner",
    category: "species",
    usage: ["power user", "human variant", "transcendence"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "人族修行者，区别于凡人，通过修炼获得超凡能力",
  },
];

// ---------------------------------------------------------------------------
// 大纲二：《别求我诅咒你》种族 / 异类
// ---------------------------------------------------------------------------

const curseMeSpecies: SpeciesEntry[] = [
  {
    sourceTerm: "白鹅化形",
    chineseDisplayTerm: "白鹅化形",
    englishCanonicalTerm: "Goose Shifter / Swanfolk",
    category: "species",
    usage: ["companion", "healer", "quirky"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "动物修行成精后化为人形，具有原型的性格/能力特征",
  },
  {
    sourceTerm: "朱雀",
    chineseDisplayTerm: "朱雀",
    englishCanonicalTerm: "Vermilion Bird / Fire Phoenix",
    category: "species",
    usage: ["mythical beast", "fire", "divine bloodline"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "四方神兽之一，朱雀化形后拥有火焰系超凡能力",
  },
  {
    sourceTerm: "火系精灵",
    chineseDisplayTerm: "火系精灵",
    englishCanonicalTerm: "Fire Elemental / Flame Sprite",
    category: "species",
    usage: ["elemental", "nature spirit", "summon"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "元素类超凡生物，由纯净元素之力凝聚而成",
  },
  {
    sourceTerm: "僵尸",
    chineseDisplayTerm: "僵尸",
    englishCanonicalTerm: "Zombie / Walking Corpse / Jiangshi",
    category: "species",
    usage: ["undead", "horror", "controlled minion"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "尸变类不死生物，修仙体系中常见被控尸术操纵",
  },
  {
    sourceTerm: "艳尸",
    chineseDisplayTerm: "艳尸",
    englishCanonicalTerm: "Enchanting Corpse / Seductive Undead",
    category: "species",
    usage: ["undead", "seduction", "cultivation horror"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "特殊僵尸分支，保留生前容貌与魅惑能力",
  },
  {
    sourceTerm: "异类",
    chineseDisplayTerm: "异类",
    englishCanonicalTerm: "Aberration / Supernatural Being / Otherkind",
    category: "species",
    usage: ["umbrella term", "non-human", "supernatural registry"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "官方分类下对非人超凡存在的统称（故事中白夫人、朱巧巧等）",
  },
];

// ---------------------------------------------------------------------------
// 大纲三：《装不下去就会死》种族
// ---------------------------------------------------------------------------

const cantPretendSpecies: SpeciesEntry[] = [
  {
    sourceTerm: "龙族",
    chineseDisplayTerm: "龙族",
    englishCanonicalTerm: "Dragon Clan / Dragonborn",
    category: "species",
    usage: ["royal", "ancient", "powerful clan"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "顶级异族，拥有龙皇/龙女/龙卫等完整王族体系",
  },
  {
    sourceTerm: "天蛇族",
    chineseDisplayTerm: "天蛇族",
    englishCanonicalTerm: "Celestial Serpent Clan",
    category: "species",
    usage: ["ancient clan", "serpent", "high-tier"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "蛇族上位分支，地位高于地蛇族，与龙族有亲缘/竞争关系",
  },
  {
    sourceTerm: "地蛇族",
    chineseDisplayTerm: "地蛇族",
    englishCanonicalTerm: "Earth Serpent Clan",
    category: "species",
    usage: ["serpent clan", "mid-tier", "tribal"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "蛇族下位分支（如满春所属），与天蛇族有层级/资源竞争",
  },
  {
    sourceTerm: "半兽人",
    chineseDisplayTerm: "半兽人",
    englishCanonicalTerm: "Half-Beast / Beastfolk / Orc-Kin",
    category: "species",
    usage: ["tribal", "warrior", "stigma"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "人类与兽族混血，通常处于种族鄙视链中下层",
  },
  {
    sourceTerm: "凤凰",
    chineseDisplayTerm: "凤凰",
    englishCanonicalTerm: "Phoenix",
    category: "species",
    usage: ["mythical", "rebirth", "final boss"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "不死鸟转世（如白浪），叙事中常为终极反派/最终形态",
  },
];

// ---------------------------------------------------------------------------
// 聚合导出
// ---------------------------------------------------------------------------

/** 种族/阵营库：合并所有大纲的 species entry */
export const speciesLibrary: SpeciesEntry[] = [
  ...poorStrongSpecies,
  ...curseMeSpecies,
  ...cantPretendSpecies,
];
