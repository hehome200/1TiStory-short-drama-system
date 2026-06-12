/**
 * 职业 / 功能身份本土化库
 *
 * Seed 来源：docs/localization-seed-from-three-outlines.md §4.4
 * 区分"职业名称映射"和"职业行为约束"，本轮通过 notes/usage 表达。
 * 与 identity-library 的区别：identity 侧重"社会身份/地位"，profession 侧重"职业职能/行为约束"。
 */

import type { LocalizationSourceOutline, LocalizationEntry } from "./index";

export type ProfessionEntry = LocalizationEntry & {
  /** 职业行为约束提示（用于 Prompt 注入，本轮仅 seed 数据） */
  behaviorHint?: string;
};

// ---------------------------------------------------------------------------
// 大纲一：《这个男人明明超强但是是个穷鬼》职业
// ---------------------------------------------------------------------------

const poorStrong: ProfessionEntry[] = [
  {
    sourceTerm: "雇佣兵",
    chineseDisplayTerm: "雇佣兵",
    englishCanonicalTerm: "Mercenary / Sellsword",
    category: "profession",
    usage: ["combat", "underdog", "survival"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "底层战力职业，为钱/资源而战（如林亚男：女修，雇佣兵出身）",
    behaviorHint: "务实、为生存不择手段、对忠诚有严格标价",
  },
  {
    sourceTerm: "修道者",
    chineseDisplayTerm: "修道者",
    englishCanonicalTerm: "Cultivator / Dao Practitioner",
    category: "profession",
    usage: ["cultivation", "power progression", "transcendence"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "修真世界通用职业身份，通过修炼突破生命层级",
    behaviorHint: "追求力量与长生，受资源/功法/机缘三重约束",
  },
];

// ---------------------------------------------------------------------------
// 大纲二：《别求我诅咒你》职业
// ---------------------------------------------------------------------------

const curseMe: ProfessionEntry[] = [
  {
    sourceTerm: "996打工人",
    chineseDisplayTerm: "996打工人",
    englishCanonicalTerm: "Overworked Grinder / 9-to-9 Wage Slave",
    category: "profession",
    usage: ["modern", "underdog", "urban fantasy", "system awakening"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "低位开局职业标识。被系统性压榨、想摆脱大势碾压，为灵气复苏/系统觉醒提供最大反差基线。海外映射：corporate drone / gig economy survivor",
    behaviorHint: "被压榨至极限后觉醒，对权威体系本能不信任，擅长忍辱与伺机反击",
  },
  {
    sourceTerm: "HR",
    chineseDisplayTerm: "HR",
    englishCanonicalTerm: "HR / Corporate Enforcer",
    category: "profession",
    usage: ["modern", "antagonist tool", "urban fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "现代公司体系中执行裁员/压榨的一线角色，象征系统暴力。张伯阳被裁员/毕业即由此触发。海外映射：HR termination specialist / layoff executor",
    behaviorHint: "执行公司在裁员/管理层面的冷酷规则，不一定是反派但代表压迫体系",
  },
  {
    sourceTerm: "道门高真",
    chineseDisplayTerm: "道门高真",
    englishCanonicalTerm: "Dao Sect Elder / High Adept",
    category: "profession",
    usage: ["authority", "master", "cultivation politics"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "传统修炼界权威职业（如周玉树：南宗修士）。掌握道统资源、传承话语权，涉及资源争夺与传承压力。海外映射：Archmage / Order Grandmaster",
    behaviorHint: "维护道统正统，对资源分配敏感，对后辈有考核与扶持双重态度",
  },
  {
    sourceTerm: "法道院研究员",
    chineseDisplayTerm: "法道院研究员",
    englishCanonicalTerm: "Arcane Regulation Researcher / Supernatural Scientist",
    category: "profession",
    usage: ["modern", "government", "research", "science fantasy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "官方超凡管理机构的研究岗位（如李道隆：地院首席研究员）。科学修真思维：实验癖、好奇心强、可能越界。海外映射：SCP researcher / Bureau of Supernatural Affairs analyst",
    behaviorHint: "用科学方法论研究修真，对未知有强烈好奇心，可能因实验越界触发危机",
  },
  {
    sourceTerm: "道学院院长",
    chineseDisplayTerm: "道学院院长",
    englishCanonicalTerm: "Dao Academy Dean / Academy Headmaster",
    category: "profession",
    usage: ["school", "authority", "cultivation education"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "现代修真教育机构管理者。管理学生、分配资源、处理学院政治。海外映射：Academy Headmaster / Chancellor",
    behaviorHint: "在学院政治与教育使命间平衡，对天才/废材学生有不同态度",
  },
  {
    sourceTerm: "道学院学生",
    chineseDisplayTerm: "道学院学生",
    englishCanonicalTerm: "Dao Academy Student / Cultivation Academy Cadet",
    category: "profession",
    usage: ["school", "coming of age", "competition", "underdog"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "现代修真教育体系下的学生职业身份。资质检测、课程竞争、学院排名。海外映射：Academy student / House member",
    behaviorHint: "在学院竞争体系中生存，资质检测结果决定社会地位起点",
  },
  {
    sourceTerm: "教导主任",
    chineseDisplayTerm: "教导主任",
    englishCanonicalTerm: "Dean of Students / Disciplinary Head",
    category: "profession",
    usage: ["school", "discipline", "bureaucracy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "道学院管理纪律的中层角色，常见对学生主角的压制/刁难/考验",
    behaviorHint: "执行学院规章，对违规学生施以纪律处分，可能成为初期小反派",
  },
  {
    sourceTerm: "炼丹者",
    chineseDisplayTerm: "炼丹者",
    englishCanonicalTerm: "Alchemist / Pill Refiner",
    category: "profession",
    usage: ["crafting", "support", "cultivation economy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "制作丹药/灵药的专业修士（如白夫人：擅长炼丹救人）。丹药是修炼经济的核心通货。海外映射：Alchemist / Potion Master",
    behaviorHint: "掌握稀有丹方与药材渠道，在修炼经济中地位特殊，常用丹药作为人情/契约媒介",
  },
  {
    sourceTerm: "符箓修士",
    chineseDisplayTerm: "符箓修士",
    englishCanonicalTerm: "Talisman Scribe / Rune Caster",
    category: "profession",
    usage: ["crafting", "combat support", "talisman economy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "制作符箓/符文/护身符的专业修士。海外映射：Runecrafter / Sigil Mage",
    behaviorHint: "将法术封印于载体，可批量制作与交易，战前准备决定战力上限",
  },
  {
    sourceTerm: "阵法师",
    chineseDisplayTerm: "阵法师",
    englishCanonicalTerm: "Formation Master / Array Specialist",
    category: "profession",
    usage: ["crafting", "defense", "large-scale combat"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "布置阵法/结界/陷阱的专业修士。海外映射：Ward Crafter / Formation Expert",
    behaviorHint: "擅长以地形/灵脉/法器构建范围性攻防体系，准备时间越长威力越大",
  },
];

// ---------------------------------------------------------------------------
// 大纲三：《装不下去就会死》职业
// ---------------------------------------------------------------------------

const cantPretend: ProfessionEntry[] = [
  {
    sourceTerm: "地产销售",
    chineseDisplayTerm: "地产销售",
    englishCanonicalTerm: "Real Estate Salesman / Hustler",
    category: "profession",
    usage: ["modern isekai", "underdog", "talker protagonist"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "低位职业主角跨界起点（车小贤）。核心能力：能言善辩、砍价、谈判、临场编故事、低位反控。这是口才型主角的原型职业。海外映射：Used car salesman archetype / silver-tongued hustler",
    behaviorHint: "靠口才而非武力生存，擅长察言观色、投其所好、临场编造身份与说辞",
  },
  {
    sourceTerm: "货郎",
    chineseDisplayTerm: "货郎",
    englishCanonicalTerm: "Peddler / Wandering Trader",
    category: "profession",
    usage: ["isekai", "information gatherer", "low key"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "底层流动职业身份。接触面广、便于误入各方势力、信息流通节点。海外映射：Traveling merchant / tinker",
    behaviorHint: "流动性强、身份不起眼、通过交易建立人脉网络，是收集情报的天然掩护",
  },
  {
    sourceTerm: "龙卫",
    chineseDisplayTerm: "龙卫",
    englishCanonicalTerm: "Dragon Guard / Royal Protector",
    category: "profession",
    usage: ["elite guard", "royal service", "absolute loyalty"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "龙族王族直属护卫（高压护卫体系，服务王族秩序）。海外映射：Kingsguard / elite royal knight order",
    behaviorHint: "绝对忠诚于龙皇/龙族王族，等级森严，违反命令=死罪",
  },
  {
    sourceTerm: "祭祀",
    chineseDisplayTerm: "祭祀",
    englishCanonicalTerm: "Shaman / Ritual Priest",
    category: "profession",
    usage: ["tribal", "spiritual", "ritual authority"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "部落/种族内部的仪式权威与精神领袖。海外映射：Tribal shaman / Oracle",
    behaviorHint: "掌握种族/部落的神谕解读与祭祀仪式，在族群内拥有超越武力的精神权威",
  },
];

// ---------------------------------------------------------------------------
// 跨大纲通用职业（补从 section 4.4 seed 中已列出的）
// ---------------------------------------------------------------------------

const shared: ProfessionEntry[] = [
  {
    sourceTerm: "商人",
    chineseDisplayTerm: "商人",
    englishCanonicalTerm: "Merchant / Trader",
    category: "profession",
    usage: ["economy", "information", "neutral faction"],
    sourceOutlines: ["poor_strong_man", "cant_keep_pretending"],
    generalizable: true,
    notes: "跨体系通用经济角色，交易丹药/法宝/情报",
    behaviorHint: "以利益为导向，在各方势力间保持灵活中立",
  },
  {
    sourceTerm: "国主",
    chineseDisplayTerm: "国主",
    englishCanonicalTerm: "Kingdom Ruler / Monarch",
    category: "profession",
    usage: ["ruler", "political", "war"],
    sourceOutlines: ["poor_strong_man", "cant_keep_pretending"],
    generalizable: true,
    notes: "统治一个国家/王国的最高职业（如何图/李宪）。与 identity-library 中的 '国主' 互补：identity 侧重权力身份，profession 侧重统治行为约束",
    behaviorHint: "维护国土与权力，通过联姻/战争/外交三种手段扩张或防守",
  },
  {
    sourceTerm: "公主",
    chineseDisplayTerm: "公主",
    englishCanonicalTerm: "Princess",
    category: "profession",
    usage: ["royal", "romance", "political marriage"],
    sourceOutlines: ["poor_strong_man", "cant_keep_pretending"],
    generalizable: true,
    notes: "王族女性成员的职业化角色（如琼花公主/敖澜/敖姣）。与 identity-library 中的 '公主' 互补：identity 侧重身份地位，profession 侧重职责与行为约束",
    behaviorHint: "婚姻/联姻是核心政治工具，个人意愿常与家族利益冲突",
  },
];

// ---------------------------------------------------------------------------
// 聚合导出
// ---------------------------------------------------------------------------

export const professionLibrary: ProfessionEntry[] = [
  ...poorStrong,
  ...curseMe,
  ...cantPretend,
  ...shared,
];
