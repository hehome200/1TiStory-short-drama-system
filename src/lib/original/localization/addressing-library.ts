/**
 * 称谓/关系称呼/社会称呼本土化库
 *
 * 来源：docs/localization-seed-from-three-outlines.md §4.9
 *
 * 本土化方向：
 * - 保留称呼背后的社会关系和权力距离
 * - 不直接音译
 * - 替代为英文语境中功能等价的称谓 / 关系表达
 */

import type { LocalizationSourceOutline, LocalizationEntry } from "./index";

export type AddressingEntry = LocalizationEntry & {
  /** 称谓类型标签 */
  addressType?:
    | "royal_title"         // 皇室/贵族头衔
    | "clan_title"          // 族群/家族头衔
    | "familial_address"    // 亲属称呼
    | "master_disciple"     // 师徒关系
    | "peer_address"        // 平辈/道友称呼
    | "romantic_relation"   // 情感关系称呼
    | "lineage_title"       // 传承/血统头衔
    | "rival_title"         // 竞争/敌对关系
    | "institutional_title"; // 机构/职位头衔
  /** 称呼方向（说话者与被称呼者的关系） */
  direction?:
    | "junior_to_senior"    // 晚辈→长辈
    | "senior_to_junior"    // 长辈→晚辈
    | "peer"                // 平辈
    | "subordinate_to_superior" // 下级→上级
    | "superior_to_subordinate" // 上级→下级
    | "third_person";       // 第三人称提及时
};

/**
 * 称谓本土化库
 *
 * 规则：
 * - 称谓类型全部可泛化 (generalizable=true)
 * - 中文称谓映射到英文语境中等价功能表达
 * - 需要保留权力距离、亲密度、形式感三层信息
 * - 同一称谓在不同场景可能有不同映射（通过 usage 区分）
 */
export const addressingLibrary: AddressingEntry[] = [
  // ---------------------------------------------------------------------------
  // 皇室 / 贵族头衔
  // ---------------------------------------------------------------------------

  {
    sourceTerm: "女帝",
    chineseDisplayTerm: "女帝",
    englishCanonicalTerm: "Empress",
    category: "addressing",
    usage: ["royal_title", "direct_address", "third_person"],
    sourceOutlines: ["poor_strong_man"],
    generalizable: true,
    notes:
      "女性最高统治者。可映射为 Empress / Sovereign Queen / Celestial Empress。需保留'至高权力+女性'双重要素。",
    addressType: "royal_title",
    direction: "subordinate_to_superior",
  },
  {
    sourceTerm: "公主",
    chineseDisplayTerm: "公主",
    englishCanonicalTerm: "Princess",
    category: "addressing",
    usage: ["royal_title", "direct_address", "third_person"],
    sourceOutlines: ["poor_strong_man", "cant_keep_pretending"],
    generalizable: true,
    notes:
      "王族女性直系后裔。可映射为 Princess / Royal Daughter。需区分'在室公主'与'出嫁公主'的身份变化。",
    addressType: "royal_title",
    direction: "subordinate_to_superior",
  },
  {
    sourceTerm: "国主",
    chineseDisplayTerm: "国主",
    englishCanonicalTerm: "Sovereign / King",
    category: "addressing",
    usage: ["royal_title", "direct_address", "third_person"],
    sourceOutlines: ["poor_strong_man", "cant_keep_pretending"],
    generalizable: true,
    notes:
      "一国/一域的统治者。可映射为 King / Sovereign / Realm Lord。需区别于 Emperor（帝），国主一般在帝之下。",
    addressType: "royal_title",
    direction: "subordinate_to_superior",
  },
  {
    sourceTerm: "族长",
    chineseDisplayTerm: "族长",
    englishCanonicalTerm: "Clan Head / Patriarch",
    category: "addressing",
    usage: ["clan_title", "direct_address", "third_person"],
    sourceOutlines: ["poor_strong_man", "cant_keep_pretending"],
    generalizable: true,
    notes:
      "家族/种族的最高领导者。可映射为 Clan Head / Patriarch / Matriarch / Chieftain（视性别与族群文化）。",
    addressType: "clan_title",
    direction: "subordinate_to_superior",
  },

  // ---------------------------------------------------------------------------
  // 亲属称呼
  // ---------------------------------------------------------------------------

  {
    sourceTerm: "爹爹",
    chineseDisplayTerm: "爹爹",
    englishCanonicalTerm: "Father (informal / affectionate)",
    category: "addressing",
    usage: ["familial_address", "direct_address"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes:
      "中文'爹爹'比'父亲'更亲昵、更口语。可映射为 Father / Dad / Papa，需根据场景选择口语/书面层级。",
    addressType: "familial_address",
    direction: "junior_to_senior",
  },
  {
    sourceTerm: "奶奶",
    chineseDisplayTerm: "奶奶",
    englishCanonicalTerm: "Grandmother (paternal, informal)",
    category: "addressing",
    usage: ["familial_address", "direct_address"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes:
      "父系祖母称呼。英文无严格的父系/母系区分，可映射为 Grandmother / Granny。在家族权力结构中可能带有权威色彩。",
    addressType: "familial_address",
    direction: "junior_to_senior",
  },

  // ---------------------------------------------------------------------------
  // 师徒关系
  // ---------------------------------------------------------------------------

  {
    sourceTerm: "师父",
    chineseDisplayTerm: "师父",
    englishCanonicalTerm: "Master / Teacher",
    category: "addressing",
    usage: ["master_disciple", "direct_address", "third_person"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes:
      "'师父'比'老师'更重师承/门派/终身关系。可映射为 Master / Teacher / Mentor。在修炼题材中推荐 Master，在学院题材中可考虑 Instructor。",
    addressType: "master_disciple",
    direction: "junior_to_senior",
  },
  {
    sourceTerm: "徒弟",
    chineseDisplayTerm: "徒弟",
    englishCanonicalTerm: "Disciple / Apprentice",
    category: "addressing",
    usage: ["master_disciple", "direct_address", "third_person"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes:
      "'徒弟'暗含师徒传承关系。可映射为 Disciple / Apprentice / Student。需保留'师徒关系'中的忠诚与传承功能。",
    addressType: "master_disciple",
    direction: "senior_to_junior",
  },

  // ---------------------------------------------------------------------------
  // 平辈 / 道友称呼
  // ---------------------------------------------------------------------------

  {
    sourceTerm: "道友",
    chineseDisplayTerm: "道友",
    englishCanonicalTerm: "Fellow Cultivator / Dao Companion",
    category: "addressing",
    usage: ["peer_address", "direct_address"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes:
      "修炼者之间的平辈互称。可映射为 Fellow Cultivator / Dao Companion / Brother Cultivator / Sister Cultivator。保留'同道+平等'的核心含义。",
    addressType: "peer_address",
    direction: "peer",
  },

  // ---------------------------------------------------------------------------
  // 情感关系称呼
  // ---------------------------------------------------------------------------

  {
    sourceTerm: "夫婿",
    chineseDisplayTerm: "夫婿",
    englishCanonicalTerm: "Husband / Betrothed Husband",
    category: "addressing",
    usage: ["romantic_relation", "third_person"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes:
      "'夫婿'更侧重婚约/匹配关系，略带正式感。可映射为 Husband / Betrothed / Consort，根据婚约阶段和身份高低选择。",
    addressType: "romantic_relation",
    direction: "third_person",
  },
  {
    sourceTerm: "青梅竹马",
    chineseDisplayTerm: "青梅竹马",
    englishCanonicalTerm: "Childhood Sweetheart",
    category: "addressing",
    usage: ["romantic_relation", "narrative_trope"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes:
      "叙事关系类型。可映射为 Childhood Sweetheart / Childhood Friend with Promise / Betrothed from Youth。需区分'两小无猜'与'已有婚约'两种强度。",
    addressType: "romantic_relation",
    direction: "third_person",
  },
  {
    sourceTerm: "情敌",
    chineseDisplayTerm: "情敌",
    englishCanonicalTerm: "Romantic Rival",
    category: "addressing",
    usage: ["rival_title", "narrative_trope"],
    sourceOutlines: ["cant_keep_pretending"],
    generalizable: true,
    notes:
      "叙事关系类型。可映射为 Romantic Rival / Love Rival / Suitor Opponent。需保留竞争张力和潜在盟友转换的可能。",
    addressType: "rival_title",
    direction: "third_person",
  },

  // ---------------------------------------------------------------------------
  // 传承 / 血统头衔
  // ---------------------------------------------------------------------------

  {
    sourceTerm: "老祖",
    chineseDisplayTerm: "老祖",
    englishCanonicalTerm: "Ancestral Elder / Founding Ancestor",
    category: "addressing",
    usage: ["lineage_title", "direct_address", "third_person"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes:
      "家族/门派中的最高辈分尊者，常带有神秘感和幕后操控色彩。可映射为 Ancestral Elder / Founding Ancestor / Old Patriarch / Prime Elder。需保留'辈分至高+潜在操控性'。",
    addressType: "lineage_title",
    direction: "subordinate_to_superior",
  },
  {
    sourceTerm: "传人",
    chineseDisplayTerm: "传人",
    englishCanonicalTerm: "Heir / Inheritor",
    category: "addressing",
    usage: ["lineage_title", "third_person"],
    sourceOutlines: ["curse_me", "cant_keep_pretending"],
    generalizable: true,
    notes:
      "道统/剑法/传承的继承人。可映射为 Heir / Inheritor / True Successor / Legacy Bearer。需区分'嫡传'与'普通弟子'的等级差异。",
    addressType: "lineage_title",
    direction: "third_person",
  },
  {
    sourceTerm: "后裔",
    chineseDisplayTerm: "后裔",
    englishCanonicalTerm: "Descendant",
    category: "addressing",
    usage: ["lineage_title", "third_person"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes:
      "血脉/血统的直系后代。可映射为 Descendant / Bloodline Heir / Offspring of [ancestor]。在修炼题材中常带有血脉觉醒/诅咒传承功能。",
    addressType: "lineage_title",
    direction: "third_person",
  },

  // ---------------------------------------------------------------------------
  // 机构 / 职位头衔
  // ---------------------------------------------------------------------------

  {
    sourceTerm: "院长",
    chineseDisplayTerm: "院长",
    englishCanonicalTerm: "Dean / Academy Head",
    category: "addressing",
    usage: ["institutional_title", "direct_address"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes:
      "道学院/法道院的最高管理者。可映射为 Dean / Academy Head / Chancellor。需保留'学术+管理'双重权威。",
    addressType: "institutional_title",
    direction: "subordinate_to_superior",
  },
  {
    sourceTerm: "教导主任",
    chineseDisplayTerm: "教导主任",
    englishCanonicalTerm: "Dean of Discipline / Head Instructor",
    category: "addressing",
    usage: ["institutional_title", "direct_address"],
    sourceOutlines: ["curse_me"],
    generalizable: true,
    notes:
      "学院中层管理+纪律执行者。可映射为 Dean of Discipline / Head Instructor / Disciplinary Master。需保留'教学+纪律'双重职能。",
    addressType: "institutional_title",
    direction: "subordinate_to_superior",
  },
];
