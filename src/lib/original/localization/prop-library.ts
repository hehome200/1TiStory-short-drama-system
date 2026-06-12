/**
 * 道具 / 系统 / 法宝 / 信物 / 剧情开关本土化库
 *
 * Seed 来源：docs/localization-seed-from-three-outlines.md §4.5
 * 区分"道具名称"和"剧情功能"，本轮通过 notes/englishCanonicalTerm 表达。
 * 专有道具名 generalizable=false，notes 中说明可抽象方向。
 */

import type { LocalizationSourceOutline, LocalizationEntry } from "./index";

export type PropEntry = LocalizationEntry & {
  /** 剧情功能分类（用于理解道具在故事中的角色） */
  plotFunction?: string;
};

// ---------------------------------------------------------------------------
// 大纲一：《这个男人明明超强但是是个穷鬼》道具
// ---------------------------------------------------------------------------

const poorStrong: PropEntry[] = [
  {
    sourceTerm: "穷神系统",
    chineseDisplayTerm: "穷神系统",
    englishCanonicalTerm: "God of Poverty System", // 专有名，不映射为通用术语
    category: "prop",
    usage: ["system", "power gimmick", "protagonist exclusive"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: false,
    notes: "专有系统名（§1.10 明确不可泛化）。抽象方向：反向资源系统 / 代价型系统（财富越多能力越弱，财富越少能力越强）。海外化映射不应直接复用此名，但可复用其'反向资源'机制。",
    plotFunction: "主角核心能力体系，越穷越强，创建独特的资源管理冲突",
  },
  {
    sourceTerm: "妖丹",
    chineseDisplayTerm: "妖丹",
    englishCanonicalTerm: "Demon Core / Beast Core",
    category: "prop",
    usage: ["consumable", "power up", "cultivation resource"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "妖族修为结晶，可被人类修士吸收/炼化以提升功力。通用修炼资源型道具。海外映射：Monster Core / Spirit Stone equivalent",
    plotFunction: "修炼资源/硬通货，击杀妖兽的战利品，争夺目标",
  },
  {
    sourceTerm: "帝王丹",
    chineseDisplayTerm: "帝王丹",
    englishCanonicalTerm: "Emperor Pill / Sovereign Elixir",
    category: "prop",
    usage: ["consumable", "breakthrough", "rare"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "高阶突破类丹药，帮助修士跨越大境界瓶颈。海外映射：Ascension Elixir / Breakthrough Pill",
    plotFunction: "突破瓶颈的关键消耗品，常引发争夺/拍卖/比斗剧情",
  },
];

// ---------------------------------------------------------------------------
// 大纲二：《别求我诅咒你》道具
// ---------------------------------------------------------------------------

const curseMe: PropEntry[] = [
  {
    sourceTerm: "悟真篇",
    chineseDisplayTerm: "悟真篇",
    englishCanonicalTerm: "Scripture of True Awakening", // 专有名
    category: "prop",
    usage: ["ancient text", "lost knowledge", "inheritance"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes: "专有道书名（§2.11 不可泛化）。抽象方向：古代修炼原典 / 遗失道书 / 始祖级功法原本。海外化映射不应直接复用此名，但可复用其'关键原典驱动剧情'的功能。",
    plotFunction: "核心剧情道具，记载失传修炼法门，多方势力争夺的古籍",
  },
  {
    sourceTerm: "灵晶",
    chineseDisplayTerm: "灵晶",
    englishCanonicalTerm: "Mana Crystal / Spirit Crystal",
    category: "prop",
    usage: ["currency", "energy source", "cultivation resource"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "灵气结晶化产物，现代修真世界的通用能量货币与修炼资源。海外映射：Mana Crystal / Ether Shard",
    plotFunction: "通用货币与能源，衡量财富与修炼资源的基准单位",
  },
  {
    sourceTerm: "金乌草",
    chineseDisplayTerm: "金乌草",
    englishCanonicalTerm: "Sun Crow Herb / Solar Herb",
    category: "prop",
    usage: ["alchemy ingredient", "rare material", "quest item"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "稀有炼丹药材，获取过程常触发探险/采集/争夺剧情。海外映射：Phoenix Feather Herb / Sunbloom",
    plotFunction: "炼丹/炼药的关键材料，获取难度驱动支线任务",
  },
  {
    sourceTerm: "秘符",
    chineseDisplayTerm: "秘符",
    englishCanonicalTerm: "Arcane Sigil / Secret Talisman",
    category: "prop",
    usage: ["one-time use", "protection", "sealed power"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "封印特殊能力的符箓/符文，常见一次性使用或限量使用。海外映射：Sealed Scroll / Arcane Glyph",
    plotFunction: "关键场景的逆转道具，封印高级法术或保护能力",
  },
  {
    sourceTerm: "金缕玉衣",
    chineseDisplayTerm: "金缕玉衣",
    englishCanonicalTerm: "Jade-Thread Burial Armor / Golden Shroud",
    category: "prop",
    usage: ["artifact", "protection", "ancient relic"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "古代葬器型防御法宝，兼具历史文化厚度与超凡防御功能。海外映射：Relic Armor / Ancestral Warding Shroud",
    plotFunction: "防御型古物，常伴随墓葬/遗迹探索剧情出现",
  },
  {
    sourceTerm: "天遁剑法",
    chineseDisplayTerm: "天遁剑法",
    englishCanonicalTerm: "Heaven-Evading Sword Art", // 专有名的剑法
    category: "prop",
    usage: ["technique scroll", "inheritance", "signature move"],
    sourceOutlines: ["curse_me"],
    generalizable: false,
    notes: "专有剑法名称。抽象方向：失传剑法 / 顶级战斗技能。海外化映射应使用通用剑法名（如 Phantom Blade Technique）而非直接音译。",
    plotFunction: "主角/关键角色的标志性战斗技能，传承/领悟剑法场景构成战力跃升节点",
  },
  {
    sourceTerm: "道器",
    chineseDisplayTerm: "道器",
    englishCanonicalTerm: "Dao Artifact / Sacred Implement",
    category: "prop",
    usage: ["equipment", "power amplifier", "masterwork"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "蕴含大道法则的高级法器/法宝，可大幅增幅持有者能力。海外映射：Relic Weapon / Divine Artifact",
    plotFunction: "装备型战力倍增器，获取/炼化道器常为战力跃升标志",
  },
  {
    sourceTerm: "丹药",
    chineseDisplayTerm: "丹药",
    englishCanonicalTerm: "Cultivation Pill / Elixir",
    category: "prop",
    usage: ["consumable", "healing", "power up"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "修炼体系中的通用消耗品。海外映射：Potion / Elixir（通用）",
    plotFunction: "恢复/强化/突破等泛用消耗品，炼丹过程可驱动副线剧情",
  },
  {
    sourceTerm: "灵气测试装置",
    chineseDisplayTerm: "灵气测试装置",
    englishCanonicalTerm: "Mana Aptitude Tester / Spirit Gauge",
    category: "prop",
    usage: ["measurement", "aptitude test", "modern fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "现代修真科学化产物，量化检测修炼资质。海外映射：Magic Aptitude Scanner / Spiritual Energy Meter",
    plotFunction: "资质检测场景的核心道具，测试结果决定社会分层与剧情反转",
  },
];

// ---------------------------------------------------------------------------
// 大纲三：《装不下去就会死》道具
// ---------------------------------------------------------------------------

const cantPretend: PropEntry[] = [
  {
    sourceTerm: "鼻烟壶",
    chineseDisplayTerm: "鼻烟壶",
    englishCanonicalTerm: "Snuff Bottle",
    category: "prop",
    usage: ["mundane item", "hidden function", "低调道具"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "看似普通的日常物件，可能隐藏特殊功能。海外映射：保持原意，snuff bottle 在西方有一定认知度",
    plotFunction: "低调身份的道具佐证，可能隐藏储物/传讯等额外功能",
  },
  {
    sourceTerm: "货担",
    chineseDisplayTerm: "货担",
    englishCanonicalTerm: "Peddler's Pack / Wandering Trader's Load",
    category: "prop",
    usage: ["equipment", "disguise", "mobility"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "货郎身份的随身移动货架，兼具交易工具与身份伪装功能。海外映射：Traveler's pack / merchant's cart",
    plotFunction: "主角伪装货郎身份的核心装备，可在不同场景间流动",
  },
  {
    sourceTerm: "木剑",
    chineseDisplayTerm: "木剑",
    englishCanonicalTerm: "Wooden Sword",
    category: "prop",
    usage: ["weapon", "humble", "hidden potential"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "低调武器/伪装用道具，常见外表平凡但内藏玄机。海外映射：Wooden training sword（训练用木剑文化共通）",
    plotFunction: "隐藏实力的伪装武器，'木剑实为神兵'是经典反转桥段",
  },
  {
    sourceTerm: "青红宝剑",
    chineseDisplayTerm: "青红宝剑",
    englishCanonicalTerm: "Blue-Red Twin Blades",
    category: "prop",
    usage: ["weapon", "dual wield", "signature item"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "一青一红双剑组合，常见阴阳/冰火/攻防双属性。海外映射：Twin Blades of [Element]",
    plotFunction: "成对武器，双剑合璧可解锁隐藏威力",
  },
  {
    sourceTerm: "碧游珠",
    chineseDisplayTerm: "碧游珠",
    englishCanonicalTerm: "Jade Journey Pearl", // 专有名
    category: "prop",
    usage: ["key item", "power source", "clan treasure"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: false,
    notes: "专有道具名（§3.11 不可泛化）。抽象方向：异族圣地体质强化道具 / 族传宝物。海外化映射不应直接复用此名，但可复用其'圣物引发争夺/觉醒'的剧情模式。",
    plotFunction: "碧游潭核心宝物，与蛇族/龙族圣地相关，获取/使用触发剧情转折",
  },
  {
    sourceTerm: "蛇胆",
    chineseDisplayTerm: "蛇胆",
    englishCanonicalTerm: "Serpent Gall / Snake Core",
    category: "prop",
    usage: ["consumable", "cultivation", "rare material"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "蛇族/蛇类妖兽的精华凝结，炼化后可增强体质。海外映射：Wyrm Essence / Serpent Heart",
    plotFunction: "击杀蛇族妖兽的核心战利品，剧情功能类似妖丹",
  },
  {
    sourceTerm: "空间玉",
    chineseDisplayTerm: "空间玉",
    englishCanonicalTerm: "Spatial Jade / Storage Gem",
    category: "prop",
    usage: ["storage", "utility", "dimensional"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "储物类法宝的空间载体形态。海外映射：Spatial Ring / Dimensional Pouch",
    plotFunction: "随身储物空间，异世界/玄幻体系的标准配置道具",
  },
  {
    sourceTerm: "常胜金牌",
    chineseDisplayTerm: "常胜金牌",
    englishCanonicalTerm: "Changsheng's Gold Token", // 专有名关联
    category: "prop",
    usage: ["identity token", "proof", "冒名道具"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: false,
    notes: "与专有角色'常胜'绑定的身份凭证（§3.11 不可泛化）。抽象方向：冒名者的身份信物 / 关键身份证明。海外化映射可用通用 token/medallion of [fake identity]。",
    plotFunction: "冒名顶替的核心信物，持有此牌即被认可为'常胜'身份",
  },
  {
    sourceTerm: "水晶球天赋测试",
    chineseDisplayTerm: "水晶球天赋测试",
    englishCanonicalTerm: "Crystal Orb Aptitude Test",
    category: "prop",
    usage: ["measurement", "aptitude test", "public reveal"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "异世界版天赋检测道具。海外映射：Crystal Ball / Orb of Revelation",
    plotFunction: "测试天赋/血脉/潜力的关键道具，结果常引发公开羞辱或反转",
  },
];

// ---------------------------------------------------------------------------
// 跨大纲通用道具
// ---------------------------------------------------------------------------

const shared: PropEntry[] = [
  {
    sourceTerm: "朱砂",
    chineseDisplayTerm: "朱砂",
    englishCanonicalTerm: "Cinnabar / Vermilion Ink",
    category: "prop",
    usage: ["crafting", "ritual", "talisman material"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "符箓/丹青画符的基础材料。海外映射：Ritual ink / alchemical reagent",
    plotFunction: "符箓/法阵/炼丹的通用消耗材料",
  },
  {
    sourceTerm: "令牌",
    chineseDisplayTerm: "令牌",
    englishCanonicalTerm: "Authority Token / Command Medallion",
    category: "prop",
    usage: ["authority", "access", "身份信物"],
    sourceOutlines: ["poor_strong_man", "cant_keep_pretending"],
    generalizable: true,
    notes: "通用身份/权限凭证道具。可以是门派令牌、军令、通行证。海外映射：Guild Token / Authority Seal",
    plotFunction: "持有令牌可通行禁地/调动势力/证明身份，丢失/伪造令牌触发剧情",
  },
];

// ---------------------------------------------------------------------------
// 聚合导出
// ---------------------------------------------------------------------------

export const propLibrary: PropEntry[] = [
  ...poorStrong,
  ...curseMe,
  ...cantPretend,
  ...shared,
];
