/**
 * 地名/场景/地域本土化库
 *
 * 来源：docs/localization-seed-from-three-outlines.md §1.6/2.6/3.6/4.8
 */

import type { LocalizationSourceOutline, LocalizationEntry } from "./index";

export type PlaceEntry = LocalizationEntry & {
  /** 场景/地域类型标签 */
  placeType?:
    | "kingdom"              // 王国/国度
    | "forest"               // 森林/禁地
    | "underworld_gate"      // 冥界/酆都类入口
    | "sanctuary"            // 圣地
    | "lake_pond"            // 湖/潭
    | "mountain"             // 山/山脉
    | "modern_city"          // 现代城市
    | "temple"               // 寺庙/道观
    | "academy_campus"       // 学院/校区
    | "canyon"               // 峡谷
    | "ancestral_ground"     // 祖地/发源地
    | "small_village"         // 小村庄
    | "river_stream"          // 溪流
    | "species_territory";    // 种族地盘
};

/**
 * 地名本土化库
 *
 * 规则：
 * - 专有地名 generalizable=false
 * - 可抽象类型（如"禁地森林""祖地"）在 notes 中写明可抽象方向
 * - 现代真实地名（如成都/武当山）标记为不可泛化，但可在 notes 说明 scene-type 可复用
 */
export const placeLibrary: PlaceEntry[] = [
  // ---------------------------------------------------------------------------
  // 大纲一: 穷鬼 — 地名
  // ---------------------------------------------------------------------------

  {
    sourceTerm: "黑御森林",
    chineseDisplayTerm: "黑御森林",
    englishCanonicalTerm: "Black Warden Forest",
    category: "place",
    usage: ["forbidden_zone", "wilderness"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: false,
    notes:
      "专有地名，不可泛化。可抽象为 forbidden monster forest / dangerous wilderness zone 类型。",
    placeType: "forest",
  },
  {
    sourceTerm: "酆都",
    chineseDisplayTerm: "酆都",
    englishCanonicalTerm: "Fengdu — The Underworld Gate",
    category: "place",
    usage: ["underworld", "mythical_city"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: false,
    notes:
      "专有冥界地名，不可泛化。可抽象为 underworld gateway city / ghost capital / realm-of-the-dead entrance 类型，保留'封印边界'叙事功能。",
    placeType: "underworld_gate",
  },
  {
    sourceTerm: "狐族圣地",
    chineseDisplayTerm: "狐族圣地",
    englishCanonicalTerm: "Fox Clan Sanctuary",
    category: "place",
    usage: ["location_faction"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: false,
    notes:
      "专有地名，不可泛化。可抽象为 species-sanctuary / clan-holy-ground 类型。与 organization-library 的狐族圣地为同一实体。",
    placeType: "sanctuary",
  },
  {
    sourceTerm: "北影国",
    chineseDisplayTerm: "北影国",
    englishCanonicalTerm: "Northern Shadow Kingdom",
    category: "place",
    usage: ["kingdom_name", "region"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: false,
    notes:
      "专有国名，不可泛化。可抽象为 northern feudal kingdom 类型。",
    placeType: "kingdom",
  },
  {
    sourceTerm: "南华国",
    chineseDisplayTerm: "南华国",
    englishCanonicalTerm: "Southern Blossom Kingdom",
    category: "place",
    usage: ["kingdom_name", "region"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: false,
    notes: "专有国名，不可泛化。",
    placeType: "kingdom",
  },
  {
    sourceTerm: "西卢国",
    chineseDisplayTerm: "西卢国",
    englishCanonicalTerm: "Western Reed Kingdom",
    category: "place",
    usage: ["kingdom_name", "region"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: false,
    notes: "专有国名，不可泛化。",
    placeType: "kingdom",
  },

  // ---------------------------------------------------------------------------
  // 大纲二: 诅咒 — 地名
  // ---------------------------------------------------------------------------

  {
    sourceTerm: "成都",
    chineseDisplayTerm: "成都",
    englishCanonicalTerm: "Chengdu (modern city setting)",
    category: "place",
    usage: ["modern_city", "urban"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "真实中国城市名，不可泛化。可抽象为 modern Chinese metropolis / central-western urban hub / 蓉城 类型场景。",
    placeType: "modern_city",
  },
  {
    sourceTerm: "天回寺",
    chineseDisplayTerm: "天回寺",
    englishCanonicalTerm: "Tianhui Temple",
    category: "place",
    usage: ["temple", "urban_location"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有寺名，不可泛化。可抽象为 urban temple / concealed cultivation site 类型。",
    placeType: "temple",
  },
  {
    sourceTerm: "金华寺",
    chineseDisplayTerm: "金华寺",
    englishCanonicalTerm: "Jinhua Temple",
    category: "place",
    usage: ["temple", "urban_location"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有寺名，不可泛化。可抽象为 urban temple / cultivation gathering point 类型。",
    placeType: "temple",
  },
  {
    sourceTerm: "蓉城道学院",
    chineseDisplayTerm: "蓉城道学院",
    englishCanonicalTerm: "Rongcheng Dao Academy Campus",
    category: "place",
    usage: ["academy_campus", "urban_location"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有名，不可泛化。可抽象为 cultivation academy campus / urban training institution 类型。",
    placeType: "academy_campus",
  },
  {
    sourceTerm: "重庆老君山",
    chineseDisplayTerm: "重庆老君山",
    englishCanonicalTerm: "Mount Laojun, Chongqing",
    category: "place",
    usage: ["mountain", "sacred_site"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有山名，不可泛化。可抽象为 sacred cultivation mountain / high-altitude trial ground 类型。",
    placeType: "mountain",
  },
  {
    sourceTerm: "张家界大峡谷",
    chineseDisplayTerm: "张家界大峡谷",
    englishCanonicalTerm: "Zhangjiajie Grand Canyon",
    category: "place",
    usage: ["wilderness", "trial_ground"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有地名，不可泛化。可抽象为 mystical canyon wilderness / pillar-peak trial ground 类型。",
    placeType: "canyon",
  },
  {
    sourceTerm: "武当山",
    chineseDisplayTerm: "武当山",
    englishCanonicalTerm: "Mount Wudang",
    category: "place",
    usage: ["mountain", "sacred_site"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "真实山名+道派所在地，不可泛化。可抽象为 sacred martial-cultivation mountain 类型。",
    placeType: "mountain",
  },
  {
    sourceTerm: "浙江天台",
    chineseDisplayTerm: "浙江天台",
    englishCanonicalTerm: "Tiantai, Zhejiang",
    category: "place",
    usage: ["sacred_site", "coastal"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有地名，不可泛化。可抽象为 coastal sacred mountain / Southern lineage headquarters 类型。",
    placeType: "mountain",
  },
  {
    sourceTerm: "百步溪",
    chineseDisplayTerm: "百步溪",
    englishCanonicalTerm: "Hundred-Step Stream",
    category: "place",
    usage: ["wilderness", "narrow_pass"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有地名，不可泛化。可抽象为 narrow wilderness gorge / strategic chokepoint 类型。",
    placeType: "river_stream",
  },
  {
    sourceTerm: "岐山赵家祖地",
    chineseDisplayTerm: "岐山赵家祖地",
    englishCanonicalTerm: "Zhao Clan Ancestral Ground, Mount Qi",
    category: "place",
    usage: ["ancestral_ground", "clan_territory"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes:
      "专有地名，不可泛化。可抽象为 clan ancestral ground / founding lineage birthplace 类型。",
    placeType: "ancestral_ground",
  },

  // ---------------------------------------------------------------------------
  // 大纲三: 装死 — 地名
  // ---------------------------------------------------------------------------

  {
    sourceTerm: "莽王国",
    chineseDisplayTerm: "莽王国",
    englishCanonicalTerm: "Mang Kingdom",
    category: "place",
    usage: ["kingdom_name", "region"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: false,
    notes:
      "专有国名，不可泛化。不可成为默认异世界国名。可抽象为 frontier barbarian kingdom 类型。",
    placeType: "kingdom",
  },
  {
    sourceTerm: "碧游潭",
    chineseDisplayTerm: "碧游潭",
    englishCanonicalTerm: "Jade Wander Pond",
    category: "place",
    usage: ["sacred_pond", "trial_site"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: false,
    notes:
      "专有地名，不可泛化。可抽象为 mystical spirit pond / species trial site 类型。",
    placeType: "lake_pond",
  },
  {
    sourceTerm: "九支山寒冰潭",
    chineseDisplayTerm: "九支山寒冰潭",
    englishCanonicalTerm: "Frozen Pool of Mount Jiuzhi",
    category: "place",
    usage: ["extreme_environment", "trial_site"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: false,
    notes:
      "专有地名，不可泛化。可抽象为 extreme-environment trial ground / frozen cultivation pool 类型。",
    placeType: "lake_pond",
  },
  {
    sourceTerm: "小山村",
    chineseDisplayTerm: "小山村",
    englishCanonicalTerm: "Small Mountain Village",
    category: "place",
    usage: ["starting_location", "humble_origin"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes:
      "通用场景类型，可泛化。作为低位开局/穿越初始点的典型场景。",
    placeType: "small_village",
  },
  {
    sourceTerm: "龙族地盘",
    chineseDisplayTerm: "龙族地盘",
    englishCanonicalTerm: "Dragon Clan Territory",
    category: "place",
    usage: ["species_territory", "domain"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: false,
    notes:
      "专有势力范围，不可泛化。可抽象为 draconic domain / species-ruled territory 类型。",
    placeType: "species_territory",
  },
];
