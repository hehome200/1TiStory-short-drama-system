/**
 * 文化机制 / 剧情机制本土化库
 *
 * Seed 来源：docs/localization-seed-from-three-outlines.md §4.6
 * 表达"剧情功能海外化"，不是简单翻译表。
 * 每条机制描述东方叙事模式如何映射为海外短剧观众能理解的故事节拍。
 */

import type { LocalizationSourceOutline, LocalizationEntry } from "./index";

export type CultureMechanismEntry = LocalizationEntry & {
  /** 海外叙事等价物（该机制在海外短剧/网文中的对应 tropes） */
  overseasTropeEquivalent?: string;
};

// ---------------------------------------------------------------------------
// 大纲一：《这个男人明明超强但是是个穷鬼》机制
// ---------------------------------------------------------------------------

const poorStrong: CultureMechanismEntry[] = [
  {
    sourceTerm: "越穷越强",
    chineseDisplayTerm: "越穷越强",
    englishCanonicalTerm: "The Poorer, The Stronger — Poverty-Fueled Power Scaling",
    category: "culture-mechanism",
    usage: ["power system", "underdog", "resource management", "irony"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "核心能力与财富成反比的系统机制。不是简单的'穷小子变强'，而是动态的反向资源管理：每获得财富就面临战力下降的即时惩罚。创造持续的内外部冲突：主角需要在'变富'和'变强'之间做痛苦选择。",
    overseasTropeEquivalent: "Reverse Wealth Power Fantasy / Cost-of-Power tradeoff（类似《一拳超人》的无敌代价或《死亡笔记》的规则约束）",
  },
  {
    sourceTerm: "低位反控",
    chineseDisplayTerm: "低位反控",
    englishCanonicalTerm: "Underdog Table-Turn — Bottom Rung Reversal",
    category: "culture-mechanism",
    usage: ["face-slapping", "underdog", "social hierarchy", "revenge"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "被社会/战力体系判定为低微的一方，在关键时刻以碾压性实力反转局面。与简单'扮猪吃虎'的区别：低位反控强调社会身份的系统性压制与爆发性颠覆。海外短剧中极受欢迎的 trope。",
    overseasTropeEquivalent: "Underdog Comeback / Public Humiliation Reversal（ReelShort 平台核心爽点模式）",
  },
  {
    sourceTerm: "妖族压迫",
    chineseDisplayTerm: "妖族压迫",
    englishCanonicalTerm: "Beast Clan Oppression — Systemic Species Hierarchy",
    category: "culture-mechanism",
    usage: ["worldbuilding", "social commentary", "resistance"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "一个种族/阵营对其他种族的系统性压迫与歧视。构建'种族/阶级战争'的世界底盘。海外映射：物种歧视 / 阶级压迫 / 殖民叙事。在西方受众中，这映射到种族/阶级/殖民历史等多层解读空间。",
    overseasTropeEquivalent: "Species Apartheid / Oppressed Clan Rebellion（类似《X-Men》的变种人压迫或《饥饿游戏》的阶级压迫）",
  },
  {
    sourceTerm: "圣地权力斗争",
    chineseDisplayTerm: "圣地权力斗争",
    englishCanonicalTerm: "Sanctuary Power Struggle — Sacred Clan Politics",
    category: "culture-mechanism",
    usage: ["politics", "faction", "betrayal", "succession"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "封闭族群/组织内部的权力斗争（如狐族圣地）。类似宫廷政治但缩小到种族/门派/宗族尺度。海外映射：House politics / Clan succession war。",
    overseasTropeEquivalent: "House Civil War / Clan Succession Crisis（类似《权力的游戏》家族内斗或《沙丘》的家族政治）",
  },
  {
    sourceTerm: "救世组织建立",
    chineseDisplayTerm: "救世组织建立",
    englishCanonicalTerm: "World-Saving Order Founding — Savior's Faction Building",
    category: "culture-mechanism",
    usage: ["epic", "organization", "leadership", "legacy"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "主角从个人英雄到建立救世组织的跃迁（如人保会）。体现'英雄→领袖'的叙事弧线。海外映射：Resistance movement founding / Hero-to-leader arc。",
    overseasTropeEquivalent: "Resistance Movement Origin Story / Founding of the Order（类似《复仇者联盟》组建或《星球大战》义军建立）",
  },
  {
    sourceTerm: "封印世界边界",
    chineseDisplayTerm: "封印世界边界",
    englishCanonicalTerm: "Sealed World Boundary — Forbidden Realm Partition",
    category: "culture-mechanism",
    usage: ["worldbuilding", "mystery", "sealed evil", "border conflict"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes: "世界被封印分割为多个互不往来的区域（断天路、封酆都等）。'仙不入世，魔不扰人'构成世界秩序的基础规则。打破封印=世界级危机。海外映射：Veil between worlds / dimensional barrier。",
    overseasTropeEquivalent: "Dimensional Seal / World Partition（类似《进击的巨人》的城墙或《黑暗物质》的平行世界）",
  },
];

// ---------------------------------------------------------------------------
// 大纲二：《别求我诅咒你》机制
// ---------------------------------------------------------------------------

const curseMe: CultureMechanismEntry[] = [
  {
    sourceTerm: "言出法逆",
    chineseDisplayTerm: "言出法逆",
    englishCanonicalTerm: "Reverse-Wish Reality — Blessing Read as Curse",
    category: "culture-mechanism",
    usage: ["power gimmick", "irony", "social dynamics", "comedy"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "核心独特机制：对某人说衰事/诅咒，结果反而变成好事。导致人人主动求主角'诅咒'自己。这不是简单的'乌鸦嘴'或'反向预言'，而是建立了独特的社会动力学：主角从被排斥的诅咒者变成被追捧的'反向祝福者'，但主角本人可能并不想扮演这个角色。",
    overseasTropeEquivalent: "Reverse Jinx / Anti-Blessing（类似《Final Destination》的死亡规律但方向相反，或《The Good Place》的道德反转幽默）",
  },
  {
    sourceTerm: "灵气复苏",
    chineseDisplayTerm: "灵气复苏",
    englishCanonicalTerm: "Mana Revival — Return of Supernatural Energy",
    category: "culture-mechanism",
    usage: ["worldbuilding", "modern fantasy", "power awakening", "status quo disruption"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "末法时代结束，超凡力量重新回归现代世界。引发旧秩序崩溃与新秩序建立。海外映射：The Awakening / The Return（类似超级英雄起源故事中的大规模超能力觉醒事件）。",
    overseasTropeEquivalent: "The Great Awakening / Supernatural Renaissance（类似《X-Men》的突变基因觉醒或《暗物质》三部曲的魔法回归）",
  },
  {
    sourceTerm: "官方修行管理",
    chineseDisplayTerm: "官方修行管理",
    englishCanonicalTerm: "State-Regulated Supernatural Governance — Bureaucratic Cultivation",
    category: "culture-mechanism",
    usage: ["worldbuilding", "bureaucracy", "modern fantasy", "regulation"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "国家力量建立系统的超凡管理机构（法道院/道学院）。不是简单的'超自然警察'，而是包含：修炼者注册、资质检测标准、教育资源分配、三院等级管理、研究与执法分离。海外映射：Supernatural Regulatory Agency / Arcane Bureaucracy。这是中国网文特有的'体制化管理修真'叙事，在海外短剧中可映射为'超级英雄注册法案'类冲突。",
    overseasTropeEquivalent: "Supernatural Registration Act / Arcane Bureaucracy（类似《美国队长3：内战》的索科维亚协议或《哈利波特》的魔法部）",
  },
  {
    sourceTerm: "隐世家族下山历练",
    chineseDisplayTerm: "隐世家族下山历练",
    englishCanonicalTerm: "Hidden House Coming-of-Age — Scion's Worldly Trial",
    category: "culture-mechanism",
    usage: ["family", "tradition", "fish out of water", "coming of age"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "隐世修炼家族派遣年轻一代进入现代社会/修炼界进行历练。传统vs现代、家族使命vs个人意志的经典冲突。海外映射：Noble trial / Heir's journey into the world。",
    overseasTropeEquivalent: "Heir's Worldly Trial / Scion's Rite of Passage（类似《雷神》中 Thor 被放逐到地球或《沙丘》中 Paul 的沙漠试炼）",
  },
  {
    sourceTerm: "退婚/婚约/联姻",
    chineseDisplayTerm: "退婚/婚约/联姻",
    englishCanonicalTerm: "Broken Engagement / Marriage Alliance — Contractual Romance Conflict",
    category: "culture-mechanism",
    usage: ["romance", "family honor", "face-slapping", "revenge"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "家族/势力通过婚约进行政治联盟，退婚=公开羞辱=叙事引爆点。这是中国网文最经典的'废柴逆袭'触发器，但在海外短剧中需调整为：公开羞辱→能力觉醒→打脸复仇的完整节拍。海外映射：Betrothal betrayal / Marriage contract drama。",
    overseasTropeEquivalent: "Broken Betrothal / Forced Marriage Alliance（类似 Bridgerton 的婚约政治或《灰姑娘》的社会地位反转）",
  },
  {
    sourceTerm: "血脉诅咒",
    chineseDisplayTerm: "血脉诅咒",
    englishCanonicalTerm: "Bloodline Curse — Ancestral Hex Burden",
    category: "culture-mechanism",
    usage: ["inheritance", "mystery", "curse breaking", "destiny"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "祖辈/血脉传承下来的诅咒（如紫阳真人血脉诅咒）。主角既继承力量也继承诅咒，必须揭开家族秘密才能解除。海外映射：Family curse / Generational hex。",
    overseasTropeEquivalent: "Generational Curse / Bloodline Hex（类似《吸血鬼日记》的始祖诅咒或《哈利波特》的血缘保护）",
  },
  {
    sourceTerm: "气运反扑",
    chineseDisplayTerm: "气运反扑",
    englishCanonicalTerm: "Fortune Backlash — Karmic Spring-Loaded Reversal",
    category: "culture-mechanism",
    usage: ["karma", "irony", "delayed justice", "fate"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "强行改变他人/世界运势会引发反噬。'越是逆天改命，代价越大'的因果律机制。海外映射：Karmic backlash / Fate's recoil。",
    overseasTropeEquivalent: "Karmic Rebound / Fate's Price（类似《死神来了》的死亡序列或因改变时间线引发的连锁反应）",
  },
  {
    sourceTerm: "道统正统之争",
    chineseDisplayTerm: "道统正统之争",
    englishCanonicalTerm: "Orthodox vs Unorthodox — Sectarian Legitimacy War",
    category: "culture-mechanism",
    usage: ["politics", "religion", "sect", "ideology"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "不同修炼传承之间（南宗/北宗/全真/正一等）对'谁才是正统'的争论与斗争。不是简单的派系冲突，而是对修炼真理话语权的争夺。海外映射：Denominational schism / Mage guild civil war。",
    overseasTropeEquivalent: "Sect Civil War / Mage Orthodoxy Schism（类似《哈利波特》的血统纯正派vs包容派或《指环王》中的巫师派系）",
  },
  {
    sourceTerm: "科学修真",
    chineseDisplayTerm: "科学修真",
    englishCanonicalTerm: "Scientific Cultivation — Empirical Approach to Magic",
    category: "culture-mechanism",
    usage: ["modern", "research", "rational", "genre fusion"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes: "用现代科学方法论研究修炼/灵气/法术，建立量化测试体系。不是简单的'魔法+科技'，而是将修炼本身视为可研究、可优化、可标准化的自然现象。海外映射：Rational magic / Systematic supernatural research。中国网文独有trope，在海外短剧中有新鲜感。",
    overseasTropeEquivalent: "Rational Magic / Empirical Supernatural Studies（类似《钢之炼金术师》的等价交换原理或 The Martian 的工程化思维应用于魔法）",
  },
];

// ---------------------------------------------------------------------------
// 大纲三：《装不下去就会死》机制
// ---------------------------------------------------------------------------

const cantPretend: CultureMechanismEntry[] = [
  {
    sourceTerm: "装不下去就会死",
    chineseDisplayTerm: "装不下去就会死",
    englishCanonicalTerm: "Pretend or Perish — Forced Identity Survival Gambit",
    category: "culture-mechanism",
    usage: ["survival", "deception", "tension", "high stakes"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "核心高压机制：主角被误认为强者/天命之子，一旦身份暴露就会死。这创造持续紧张的叙事状态，每场对话都是生死博弈。与普通'卧底'或'伪装'的区别：伪装不是主动选择而是被迫，没有任何退路。海外短剧中极适合的'每集一个小危机'结构。",
    overseasTropeEquivalent: "Mortal Deception Gambit / Identity Death Trap（类似《猫鼠游戏》的身份伪造 + 《鱿鱼游戏》的输=死）",
  },
  {
    sourceTerm: "误认逆天之子",
    chineseDisplayTerm: "误认逆天之子",
    englishCanonicalTerm: "Mistaken Chosen One — Accidental Fatebreaker",
    category: "culture-mechanism",
    usage: ["misidentification", "pressure", "irony", "power fantasy"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "各势力将主角错误认定为预言中的天命之人/逆天之子，从而倾注资源、给予厚望、授予婚约。主角被迫接受这些馈赠与责任，但内心知道一切都是误会。创造了'受之有愧→假戏真做'的角色弧线。海外映射：Mistaken identity + Chosen One trope 的组合。",
    overseasTropeEquivalent: "Accidental Chosen One / Unwitting Prophecy Fulfillment（类似《沙丘》中 Paul 被弗莱曼人误认为救世主或《哈利波特》中纳威也可能是预言之子的设定反转）",
  },
  {
    sourceTerm: "假身份续命",
    chineseDisplayTerm: "假身份续命",
    englishCanonicalTerm: "False Identity Survival — Living on Borrowed Name",
    category: "culture-mechanism",
    usage: ["survival", "deception", "identity crisis", "thriller"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "主角使用/冒用他人身份作为唯一的生存手段。不是短期伪装，而是必须长期以假身份生活，逐渐面临'原身份的人回来怎么办'/'假身份比真身份更有存在价值'等深层矛盾。",
    overseasTropeEquivalent: "Borrowed Identity Thriller / Living Under Another's Name（类似《天才雷普利》或《猫鼠游戏》的身份盗窃）",
  },
  {
    sourceTerm: "冒名顶替",
    chineseDisplayTerm: "冒名顶替",
    englishCanonicalTerm: "Identity Hijack — Stolen Life Stakes",
    category: "culture-mechanism",
    usage: ["deception", "social climbing", "thriller", "consequences"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "主动冒用他人身份进入异族/权力圈层（车小贤冒名常胜）。与原主的亲友/敌人/婚约对象产生真实的感情和利益纠葛。核心冲突：'他们对我的好是因为常胜，如果没有常胜的身份我什么都不是'。",
    overseasTropeEquivalent: "Stolen Identity Drama / Impostor in the Elite Circle（类似《寄生虫》的阶级伪装或 The Talented Mr. Ripley 的身份寄生）",
  },
  {
    sourceTerm: "祸水东引",
    chineseDisplayTerm: "祸水东引",
    englishCanonicalTerm: "Deflected Misfortune — Misdirection Gambit",
    category: "culture-mechanism",
    usage: ["strategy", "deception", "politics", "survival"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes: "主角将自身面临的危机/追查/敌意转移到其他目标上。不是简单的'甩锅'，而是利用口才和信息差设计精巧的误导方案。体现角色'用智力而非武力解决问题'的特质。海外映射：Misdirection gambit / Strategic deflection。",
    overseasTropeEquivalent: "Strategic Misdirection / Blame-Shift Mastery（类似《骗子》类电影中的骗术或《死亡笔记》中的多层误导）",
  },
  {
    sourceTerm: "低位职业靠口才反控",
    chineseDisplayTerm: "低位职业靠口才反控",
    englishCanonicalTerm: "Talker's Comeback — Verbal Jiu-Jitsu from the Bottom",
    category: "culture-mechanism",
    usage: ["underdog", "wit over strength", "survival", "reversal"],
    sourceOutlines: ["cant_keep_pretending", "poor_strong_man"],
    generalizable: true,
    notes: "无武力/外挂的低位主角（如地产销售/货郎），纯靠口才、情商、临场反应在强者林立的世界中生存并反控局面。与常规'龙傲天'的根本区别：主角的力量来源不是系统/外挂/血脉，而是语言能力与心理博弈。海外短剧中非常稀缺但需求旺盛的主角类型。",
    overseasTropeEquivalent: "Silver-Tongued Survivor / Wit Over Power Fantasy（类似《JOJO的奇妙冒险》中策略型主角或《死亡笔记》中的智力博弈）",
  },
];

// ---------------------------------------------------------------------------
// 跨大纲通用机制
// ---------------------------------------------------------------------------

const shared: CultureMechanismEntry[] = [
  {
    sourceTerm: "公开羞辱",
    chineseDisplayTerm: "公开羞辱",
    englishCanonicalTerm: "Public Humiliation — Shame-to-Glory Beat Cycle",
    category: "culture-mechanism",
    usage: ["face-slapping", "setup", "payback", "emotional rollercoaster"],
    sourceOutlines: ["poor_strong_man", "curse_me", "cant_keep_pretending"],
    generalizable: true,
    notes: "角色在公开场合被系统性羞辱，构成'羞辱→低谷→觉醒→反击→公开打脸'的标准爽文节拍。在海外短剧中，公开羞辱场景需要强化视觉呈现与群体反应镜头。海外映射：Public shaming + redemption arc 的组合。",
    overseasTropeEquivalent: "Humiliation Beat / Revenge of the Underdog（ReelShort/DramaBox 平台已验证的核心付费转化节拍）",
  },
];

// ---------------------------------------------------------------------------
// 聚合导出
// ---------------------------------------------------------------------------

export const cultureMechanismLibrary: CultureMechanismEntry[] = [
  ...poorStrong,
  ...curseMe,
  ...cantPretend,
  ...shared,
];
