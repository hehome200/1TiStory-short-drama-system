/**
 * 组织/势力/机构本土化库
 *
 * 来源：docs/localization-seed-from-three-outlines.md §1.5/2.5/3.5/4.7
 */

import type { LocalizationSourceOutline, LocalizationEntry } from "./index";

export type OrganizationEntry = LocalizationEntry & {
  /** 组织类型标签 */
  orgType?:
    | "academy"          // 学院/培养机构
    | "sect"             // 宗门/道派
    | "kingdom"          // 王国/政权
    | "clan"             // 家族/血脉势力
    | "agency"           // 官方管理机构
    | "sanctuary"        // 圣地/秘境
    | "species_faction"  // 种族政治实体
    | "rebel_group"      // 反抗/颠覆组织
    | "ancient_lineage"; // 隐世传承
};

/**
 * 组织本土化库
 *
 * 规则：
 * - 专有组织名 generalizable=false
 * - 可抽象类型（如"隐世家族""道派"）在 notes 中写明可抽象方向
 * - 种族政治实体（龙族/天蛇族等）同时出现在 species-library 中
 */
export const organizationLibrary: OrganizationEntry[] = [
  // ---------------------------------------------------------------------------
  // 大纲一: 穷鬼 — 组织
  // ---------------------------------------------------------------------------

  {
    sourceTerm: "无极仙宫",
    chineseDisplayTerm: "无极仙宫",
    englishCanonicalTerm: "Limitless Celestial Palace",
    category: "organization",
    usage: ["sect_name"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: false,
    notes:
      "专有名，不可泛化。可抽象为 immortal sect palace / celestial sect headquarters 类型。",
    orgType: "sect",
  },
  {
    sourceTerm: "人保会",
    chineseDisplayTerm: "人保会",
    englishCanonicalTerm: "Human Preservation Council",
    category: "organization",
    usage: ["faction_name"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: false,
    notes:
      "专有名，不可泛化。可抽象为 human-protection faction / species defense organization 类型。",
    orgType: "rebel_group",
  },
  {
    sourceTerm: "狐族圣地",
    chineseDisplayTerm: "狐族圣地",
    englishCanonicalTerm: "Fox Clan Sanctuary",
    category: "organization",
    usage: ["location_faction"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: false,
    notes:
      "专有名，不可泛化。可抽象为 species sanctuary / clan holy ground 类型。",
    orgType: "sanctuary",
  },
  {
    sourceTerm: "北影国",
    chineseDisplayTerm: "北影国",
    englishCanonicalTerm: "Northern Shadow Kingdom",
    category: "organization",
    usage: ["kingdom_name"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: false,
    notes: "专有国名，不可泛化。可抽象为 feudal kingdom / divided realm 类型。",
    orgType: "kingdom",
  },
  {
    sourceTerm: "南华国",
    chineseDisplayTerm: "南华国",
    englishCanonicalTerm: "Southern Blossom Kingdom",
    category: "organization",
    usage: ["kingdom_name"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: false,
    notes: "专有国名，不可泛化。",
    orgType: "kingdom",
  },
  {
    sourceTerm: "西卢国",
    chineseDisplayTerm: "西卢国",
    englishCanonicalTerm: "Western Reed Kingdom",
    category: "organization",
    usage: ["kingdom_name"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: false,
    notes: "专有国名，不可泛化。",
    orgType: "kingdom",
  },

  // ---------------------------------------------------------------------------
  // 大纲二: 诅咒 — 组织
  // ---------------------------------------------------------------------------

  {
    sourceTerm: "法道院",
    chineseDisplayTerm: "法道院",
    englishCanonicalTerm: "Arcane Regulation Bureau",
    category: "organization",
    usage: ["agency_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有名，不可泛化。可抽象为 official supernatural regulatory agency / Dao Academy Authority 类型。",
    orgType: "agency",
  },
  {
    sourceTerm: "道学院",
    chineseDisplayTerm: "道学院",
    englishCanonicalTerm: "Dao Academy",
    category: "organization",
    usage: ["academy_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有名，不可泛化。可抽象为 cultivation academy / spiritual training institution 类型。",
    orgType: "academy",
  },
  {
    sourceTerm: "天院",
    chineseDisplayTerm: "天院",
    englishCanonicalTerm: "Heaven Division",
    category: "organization",
    usage: ["sub_division"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "法道院下属三院之一（天院/地院/人院），专有名不可泛化。可抽象为 triad institutional structure。勿将三院结构默认套用到所有现代修真。",
    orgType: "agency",
  },
  {
    sourceTerm: "地院",
    chineseDisplayTerm: "地院",
    englishCanonicalTerm: "Earth Division",
    category: "organization",
    usage: ["sub_division"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes: "法道院下属三院之一，专有名不可泛化。",
    orgType: "agency",
  },
  {
    sourceTerm: "人院",
    chineseDisplayTerm: "人院",
    englishCanonicalTerm: "Human Division",
    category: "organization",
    usage: ["sub_division"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes: "法道院下属三院之一，专有名不可泛化。",
    orgType: "agency",
  },
  {
    sourceTerm: "龙虎山",
    chineseDisplayTerm: "龙虎山",
    englishCanonicalTerm: "Dragon-Tiger Mountain Sect",
    category: "organization",
    usage: ["sect_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有名（江西龙虎山），不可泛化。可抽象为 orthodox Daoist sect / mountain-based cultivation lineage 类型。",
    orgType: "sect",
  },
  {
    sourceTerm: "茅山",
    chineseDisplayTerm: "茅山",
    englishCanonicalTerm: "Maoshan Sect",
    category: "organization",
    usage: ["sect_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有名，不可泛化。可抽象为 ritualist sect / exorcism lineage 类型。",
    orgType: "sect",
  },
  {
    sourceTerm: "武当",
    chineseDisplayTerm: "武当",
    englishCanonicalTerm: "Wudang Sect",
    category: "organization",
    usage: ["sect_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有名（武当山），不可泛化。可抽象为 martial-cultivation sect / internal-alchemy lineage 类型。",
    orgType: "sect",
  },
  {
    sourceTerm: "全性",
    chineseDisplayTerm: "全性",
    englishCanonicalTerm: "Primordial Instinct Sect",
    category: "organization",
    usage: ["sect_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有名，不可泛化。可抽象为 unorthodox / rogue cultivator faction / freedom-seeking sect 类型。",
    orgType: "sect",
  },
  {
    sourceTerm: "南宗",
    chineseDisplayTerm: "南宗",
    englishCanonicalTerm: "Southern Lineage",
    category: "organization",
    usage: ["sect_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有名（南宗/北宗道统分裂），不可泛化。可抽象为 orthodox vs. schismatic lineage 类型。",
    orgType: "sect",
  },
  {
    sourceTerm: "北宗",
    chineseDisplayTerm: "北宗",
    englishCanonicalTerm: "Northern Lineage (Quanzhen Dragon Gate)",
    category: "organization",
    usage: ["sect_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有名（全真龙门派），不可泛化。可抽象为 orthodox monastic lineage 类型。",
    orgType: "sect",
  },
  {
    sourceTerm: "隐世家族",
    chineseDisplayTerm: "隐世家族",
    englishCanonicalTerm: "Hidden Bloodline Clan",
    category: "organization",
    usage: ["clan_type", "faction_type"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes:
      "类型概念，可泛化。包括隐世道门世家、世家传人等。具体家族名（如江南魏家、武威寇家等）不可泛化。",
    orgType: "ancient_lineage",
  },
  {
    sourceTerm: "江南魏家",
    chineseDisplayTerm: "江南魏家",
    englishCanonicalTerm: "Wei Clan of Jiangnan",
    category: "organization",
    usage: ["clan_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有家族名，不可泛化。可抽象为 regional cultivation clan 类型。",
    orgType: "clan",
  },
  {
    sourceTerm: "丹阳葛家",
    chineseDisplayTerm: "丹阳葛家",
    englishCanonicalTerm: "Ge Clan of Danyang",
    category: "organization",
    usage: ["clan_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有家族名，不可泛化。可抽象为 alchemy-specialized cultivation lineage 类型。",
    orgType: "clan",
  },
  {
    sourceTerm: "武威寇家",
    chineseDisplayTerm: "武威寇家",
    englishCanonicalTerm: "Kou Clan of Wuwei",
    category: "organization",
    usage: ["clan_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有家族名，不可泛化。可抽象为 thunder-law / combat lineage 类型。",
    orgType: "clan",
  },
  {
    sourceTerm: "华山陈家",
    chineseDisplayTerm: "华山陈家",
    englishCanonicalTerm: "Chen Clan of Mount Hua",
    category: "organization",
    usage: ["clan_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有家族名，不可泛化。可抽象为 mountain-based cultivation clan 类型。",
    orgType: "clan",
  },
  {
    sourceTerm: "青田刘家",
    chineseDisplayTerm: "青田刘家",
    englishCanonicalTerm: "Liu Clan of Qingtian",
    category: "organization",
    usage: ["clan_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有家族名，不可泛化。可抽象为 regional cultivation clan 类型。",
    orgType: "clan",
  },
  {
    sourceTerm: "岐山赵家",
    chineseDisplayTerm: "岐山赵家",
    englishCanonicalTerm: "Zhao Clan of Qishan",
    category: "organization",
    usage: ["clan_name"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有家族名，不可泛化。可抽象为 ancient founding lineage clan 类型。",
    orgType: "clan",
  },

  // ---------------------------------------------------------------------------
  // 大纲三: 装死 — 组织
  // ---------------------------------------------------------------------------

  {
    sourceTerm: "莽王国",
    chineseDisplayTerm: "莽王国",
    englishCanonicalTerm: "Mang Kingdom",
    category: "organization",
    usage: ["kingdom_name", "location_faction"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: false,
    notes:
      "专有国名，不可泛化。不可成为默认异世界国名。可抽象为 barbarian-style kingdom / frontier realm 类型。",
    orgType: "kingdom",
  },
  {
    sourceTerm: "灭图会",
    chineseDisplayTerm: "灭图会",
    englishCanonicalTerm: "Map-Erasure Society",
    category: "organization",
    usage: ["faction_name"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: false,
    notes:
      "专有名，不可泛化。可抽象为 world-destroying / anti-order secret society 类型。",
    orgType: "rebel_group",
  },
  {
    sourceTerm: "龙族",
    chineseDisplayTerm: "龙族（势力）",
    englishCanonicalTerm: "Dragon Clan (political faction)",
    category: "organization",
    usage: ["species_faction", "clan_name"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: false,
    notes:
      "作为政治实体出现的龙族，专有名不可泛化。作为种族类型，参见 species-library 的龙族(generalizable=true)。可抽象为 dragon-ruled faction / draconic polity 类型。",
    orgType: "species_faction",
  },
  {
    sourceTerm: "天蛇族",
    chineseDisplayTerm: "天蛇族（势力）",
    englishCanonicalTerm: "Celestial Serpent Clan (political faction)",
    category: "organization",
    usage: ["species_faction", "clan_name"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: false,
    notes:
      "作为政治实体的天蛇族，专有名不可泛化。作为种族类型参见 species-library。",
    orgType: "species_faction",
  },
  {
    sourceTerm: "地蛇族",
    chineseDisplayTerm: "地蛇族（势力）",
    englishCanonicalTerm: "Earth Serpent Clan (political faction)",
    category: "organization",
    usage: ["species_faction", "clan_name"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: false,
    notes:
      "作为政治实体的地蛇族，专有名不可泛化。作为种族类型参见 species-library。",
    orgType: "species_faction",
  },
];
