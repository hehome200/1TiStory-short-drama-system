import type {
  AdaptDraft,
  BeatCard,
  Character,
  EpisodePlan,
  OriginalDraft,
  OriginalStep,
  RevealBeat,
  RewriteDraft,
  OutlineFactSheet,
  OutlineBatch,
  StructuredSummary,
  SourceMaterialExtraction,
  SourceMaterialExtractedCharacter,
} from "@/lib/types";
import {
  buildSafeProfileInfo,
  buildSafeStructuredSummary,
  buildUnlockedFieldsText,
  collectHiddenKeywords,
  computeUnlockedFields,
} from "@/lib/ai/prompt-safe-filter";
import {
  buildResolvedStoryBible,
  formatResolvedStoryBibleForPrompt,
  resolveDisplayStoryTitle,
} from "@/lib/original/story-bible-resolver";
import { toChinesePhoneticName, isKnownEnglishName } from "@/lib/original/name-library";

function clean(value: string) {
  return value.trim() || "未填写";
}

const PROMPT_LEAK_FALLBACK = "疑似调试 Prompt 污染，已在运行时忽略";

function looksLikePromptLeak(value: string) {
  const text = value.trim();
  if (!text) return false;
  return (
    text.includes("你是资深短剧策划师") ||
    text.includes("只返回 JSON") ||
    text.includes("返回结构必须满足") ||
    text.includes("当前项目上下文如下") ||
    text.includes("PROMPT:") ||
    text.includes("STEP:")
  );
}

function renderRuntimeText(value: unknown, fallback = "未填写", maxLen = 180) {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  if (!text) return fallback;
  if (looksLikePromptLeak(text)) return PROMPT_LEAK_FALLBACK;
  return shortenText(text, maxLen);
}

function cleanOptionalText(value: unknown, fallback = "未填写") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

// 内部功能短语列表，这些不应写入人物卡
const INTERNAL_FUNCTION_PHRASES = [
  "推动误会升级",
  "关系钩子",
  "高位背书者",
  "代表家族、组织、阶层或制度性压力",
  "制度或家族权力的承载者",
  "制度性压力",
  "与主角形成关系牵引或冲突张力",
  "资源背书者或制度压力来源",
  "关键关系人或关键协助者",
  "第二关键关系人或关键协助者",
  "关系变量或次级压力来源",
  "次级压力或次级信息来源",
];

// 检测是否为内部功能短语
function isInternalFunctionPhrase(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return INTERNAL_FUNCTION_PHRASES.some((phrase) => trimmed.includes(phrase));
}

// 清洗 prompt 展示文本中的内部功能短语，只用于 prompt 展示，不改底层数据结构
function sanitizeSlotPromptText(text: string): string {
  return text
    .replace(/代表家族、组织、阶层或制度性压力/g, "代表高位秩序压力")
    .replace(/制度或家族权力的承载者/g, "高位秩序压力来源")
    .replace(/制度性压力/g, "高位秩序压力");
}

// 清洗 relationshipToProtagonist，过滤内部功能短语
function cleanRelationshipToProtagonist(value: string, fallback = ""): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (isInternalFunctionPhrase(trimmed)) return fallback;
  return trimmed;
}

function resolveContextAudienceLabel(draft: OriginalDraft) {
  const storyBible = buildResolvedStoryBible(draft);
  const structuralAudience = storyBible.audienceOrientation?.structuralAudience;
  if (structuralAudience === "female") return "女频";
  if (structuralAudience === "male") return "男频";
  if (structuralAudience === "general") return "泛短剧受众";

  const brief = draft.overview.projectBrief;
  const plan = draft.overview.scriptPlan;
  const overviewAudience = typeof draft.overview.audience === "string" && draft.overview.audience.trim()
    ? draft.overview.audience.trim()
    : "";
  const planAudience = typeof plan?.targetAudience === "string" && plan.targetAudience.trim()
    ? plan.targetAudience.trim()
    : "";

  if (brief?.audienceType === "female") return "女频";
  if (brief?.audienceType === "male") return "男频";

  if (/女频/.test(planAudience)) return "女频";
  if (/男频/.test(planAudience)) return "男频";

  if (/女频/.test(overviewAudience)) return "女频";
  if (/男频/.test(overviewAudience)) return "男频";

  if (overviewAudience && overviewAudience !== "未填写") return overviewAudience;

  return "泛短剧受众";
}

function isMaleAudienceProject(draft: OriginalDraft) {
  return draft.overview.projectBrief?.audienceType === "male" || clean(draft.overview.audience).includes("男频");
}

function normalizeCharactersContextText(text: string, draft: OriginalDraft) {
  if (!isMaleAudienceProject(draft)) {
    return text;
  }

  return text.replace(/女频倾向/g, "男频向都市豪门语境");
}

export type CharacterGenderHint = "male" | "female" | "unknown";

export type CharacterLeadAnchors = {
  maleLeadId?: string;
  femaleLeadId?: string;
  candidateFemaleLeadIds?: string[];
};

export type CharacterRelationshipState = {
  relationToMaleLead: string;
  relationToFemaleLead: string;
  relationshipTags: string[];
};

function defaultRelationshipTags(params: {
  slotId?: string;
  roleType?: string;
  requiredFunction?: string;
  gender?: CharacterGenderHint;
  relationshipHook?: string;
  relationToMaleLead?: string;
  relationToFemaleLead?: string;
}) {
  const text = [
    params.slotId ?? "",
    params.roleType ?? "",
    params.requiredFunction ?? "",
    params.relationshipHook ?? "",
    params.relationToMaleLead ?? "",
    params.relationToFemaleLead ?? "",
  ]
    .join(" ")
    .trim();
  if (params.slotId === "protagonist") return ["被误判", "低位反控", "身份反转"];
  if (params.slotId === "antagonist") return ["男主反派", "误判制造", "终局压力"];
  if (params.slotId === "backer_or_pressure") {
    if (/(组织|制度|势力|公司|财团|集团|学院|门派|系统|规则|压迫)/.test(text) || params.roleType?.includes("组织")) {
      return ["组织施压", "规则见证"];
    }
    return ["给资源", "男主贵人", "规则见证"];
  }
  if (params.slotId === "ally_or_relationship_1") return ["喜欢男主", "关系修复", "身份反差"];
  if (params.slotId === "ally_or_relationship_2") return ["喜欢男主", "救男主", "女主候选"];
  if (params.slotId === "relationship_or_pressure") return ["婚约压力", "关系压力", "策略型情感"];
  if (params.slotId === "family_power") {
    // 根据实际证据决定标签
    const strongFamilyEvidence = /(家族|血缘|父母|长辈|婚约|青梅竹马|家族施压)/.test(text);
    const orgEvidence = /(组织|制度|势力|公司|财团|集团|学院|门派|系统|规则|组织施压)/.test(text);
    const relationshipEvidence = /(喜欢|中意|爱慕|建立感情|情感|关系|分身|伪装|误会|牵连)/.test(text);

    if (strongFamilyEvidence) return ["关系压力", "家族施压", "复杂情感"];
    if (orgEvidence) return ["关系压力", "组织施压", "复杂情感"];
    if (relationshipEvidence) return ["关系压力", "身份见证", "复杂情感"];
    // 没有明确证据时，返回中性标签
    return ["关系压力", "身份见证", "复杂情感"];
  }
  if (params.slotId?.startsWith("supporter_")) return ["信息见证", "规则见证"];
  if (params.gender === "female") return ["关系压力", "身份见证"];
  if (params.gender === "male") return ["规则见证", "低位反控"];
  return ["规则见证", "身份见证"];
}

const RELATIONSHIP_TAG_NORMALIZATION: Record<string, string> = {
  opponent: "对手 / 情敌",
  likes_male_lead: "喜欢男主",
  likes_female_lead: "喜欢女主",
  male_lead_backer: "男主贵人",
  male_lead_antagonist: "男主反派",
  female_lead_backer: "女主贵人",
  female_lead_antagonist: "女主反派",
  female_lead_rival: "女主对手",
  family_pressure: "家族压力",
  faction_pressure: "组织压力",
  relationship_pressure: "关系压力",
  misread_male_lead: "误判男主",
  rescue_male_lead: "救男主",
  resource_giver: "给资源",
  secret_reveal: "爆秘密",
  create_misunderstanding: "制造误会",
  betrayal_reversal: "背刺反转",
  identity_witness: "身份见证",
  payoff_standby: "爽点垫脚",
  rule_witness: "规则见证",
  ultimate_pressure: "终局压力",
  family_pressure_tags: "家族施压",
  faction_pressure_tags: "组织施压",
  male_character: "",
  female_character: "",
  unknown: "",
  "作用标签待补充": "",
};

function normalizeRelationshipTagLabel(tag: string) {
  const text = tag.trim();
  if (!text) return "";
  return RELATIONSHIP_TAG_NORMALIZATION[text] ?? text;
}

export const SHORT_DRAMA_CHARACTER_ROLE_OPTIONS = [
  "男主",
  "女主",
  "反派",
  "对手 / 情敌",
  "助攻",
  "贵人",
  "亲友",
  "家族压力",
  "组织压力",
  "信息角色",
  "炮灰 / 垫脚石",
  "旁白 / 叙述者",
] as const;

export type ShortDramaCharacterRole = (typeof SHORT_DRAMA_CHARACTER_ROLE_OPTIONS)[number];

function normalizeShortDramaCharacterRoleByText(text: string): ShortDramaCharacterRole | null {
  const value = text.trim();
  if (!value) return null;
  if (value.includes("男主") || value.includes("主角") || value.includes("主人公")) return "男主";
  if (value.includes("女主") || value.includes("女频")) return "女主";
  if (value.includes("反派") || value.includes("敌人") || value.includes("仇人") || value.includes("压迫") || value.includes("阻碍") || value.includes("boss")) {
    return "反派";
  }
  if (value.includes("亲友")) return "亲友";
  if (value.includes("对手") || value.includes("情敌") || value.includes("竞争") || value.includes("争夺") || value.includes("三角")) {
    return "对手 / 情敌";
  }
  if (value.includes("助攻") || value.includes("助推") || value.includes("帮助") || value.includes("扶持") || value.includes("支持") || value.includes("救") || value.includes("护") || value.includes("帮")) {
    return "助攻";
  }
  if (value.includes("贵人") || value.includes("背书") || value.includes("资源") || value.includes("提携") || value.includes("帮衬")) {
    return "贵人";
  }
  if (value.includes("家族") || value.includes("父母") || value.includes("长辈") || value.includes("哥哥") || value.includes("姐姐") || value.includes("弟弟") || value.includes("妹妹") || value.includes("叔") || value.includes("姨") || value.includes("家人")) {
    return "家族压力";
  }
  if (value.includes("组织") || value.includes("制度") || value.includes("公司") || value.includes("财团") || value.includes("集团") || value.includes("学院") || value.includes("门派") || value.includes("社团") || value.includes("势力") || value.includes("系统") || value.includes("规则")) {
    return "组织压力";
  }
  if (value.includes("信息") || value.includes("线索") || value.includes("揭示") || value.includes("见证")) return "信息角色";
  if (value.includes("炮灰") || value.includes("垫脚石") || value.includes("牺牲")) return "炮灰 / 垫脚石";
  if (value.includes("旁白") || value.includes("叙述")) return "旁白 / 叙述者";
  return null;
}

export function normalizeShortDramaCharacterRole(params: {
  slotId?: string;
  roleType?: string;
  requiredFunction?: string;
  sourceName?: string;
  gender?: CharacterGenderHint;
  relationshipTags?: string[];
  relationToMaleLead?: string;
  relationToFemaleLead?: string;
}): ShortDramaCharacterRole {
  const slotId = cleanOptionalText(params.slotId, "");
  const roleType = cleanOptionalText(params.roleType, "");
  const requiredFunction = cleanOptionalText(params.requiredFunction, "");
  const sourceName = cleanOptionalText(params.sourceName, "");
  const gender = params.gender ?? "unknown";
  const relationshipTags = Array.isArray(params.relationshipTags) ? params.relationshipTags.join("、") : "";
  const relationToMaleLead = cleanOptionalText(params.relationToMaleLead, "");
  const relationToFemaleLead = cleanOptionalText(params.relationToFemaleLead, "");
  const text = [slotId, roleType, requiredFunction, sourceName, relationshipTags, relationToMaleLead, relationToFemaleLead].filter(Boolean).join(" ");

  if (slotId === "protagonist" || relationToMaleLead === "self") return "男主";
  if (slotId === "antagonist" || relationToMaleLead === "opponent" || /(反派|敌人|仇人|压迫|阻碍|boss)/.test(text)) return "反派";
  if (slotId === "ally_or_relationship_1" || relationToFemaleLead === "self") return "女主";
  if (slotId === "ally_or_relationship_2") return "助攻";

  if (slotId === "backer_or_pressure") {
    if (/(组织|制度|势力|家族|公司|财团|集团|学院|门派|压力|压迫)/.test(text) || relationToMaleLead === "male_lead_backer") {
      return "组织压力";
    }
    return "贵人";
  }

  if (slotId === "relationship_or_pressure") {
    return "对手 / 情敌";
  }

  if (slotId === "family_power") {
    // 明确家族证据：家族、血缘、父母、长辈、婚约、青梅竹马等
    const strongFamilyEvidence = /(家族|血缘|父母|长辈|婚约|青梅竹马|家族施压|父母之命|父亲|母亲|兄长|姐姐|妹妹)/.test(text);
    // 明确组织/制度证据
    const orgEvidence = /(组织|制度|势力|公司|财团|集团|学院|门派|系统|规则|组织施压)/.test(text);
    // 情感/关系证据（非家族）
    const relationshipEvidence = /(喜欢|中意|爱慕|建立感情|情感|关系|分身|伪装|误会|牵连)/.test(text);

    if (strongFamilyEvidence) {
      return "家族压力";
    }
    if (orgEvidence) {
      return "组织压力";
    }
    // 如果只有情感/关系证据，不要强制家族压力
    if (relationshipEvidence) {
      // 根据性别推断角色
      return gender === "female" ? "对手 / 情敌" : "助攻";
    }
    // 没有明确证据时，不要默认家族压力
    return "信息角色";
  }

  if (slotId?.startsWith("ally_or_relationship")) {
    return gender === "female" ? "女主" : "助攻";
  }

  if (slotId?.startsWith("supporter_")) {
    if (/(组织|制度|势力|公司|财团|集团|学院|门派|压力|压迫|系统|规则)/.test(text)) {
      return "组织压力";
    }
    return "信息角色";
  }

  const byText = normalizeShortDramaCharacterRoleByText(text);
  if (byText) return byText;

  if (gender === "female") return "信息角色";
  if (gender === "male") return "信息角色";
  return "信息角色";
}

const LOCALIZED_NAME_POOLS: Record<CharacterGenderHint, string[]> = {
  male: ["Ethan", "Liam", "Noah", "Mason", "Owen", "Caleb", "Adrian", "Julian"],
  female: ["Emma", "Ava", "Mia", "Evelyn", "Clara", "Nora", "Grace", "Lydia"],
  unknown: ["Alex", "Riley", "Jordan", "Casey", "Morgan"],
};

const MALE_NAME_POOL = new Set(LOCALIZED_NAME_POOLS.male);
const FEMALE_NAME_POOL = new Set(LOCALIZED_NAME_POOLS.female);
const UNKNOWN_NAME_POOL = new Set(LOCALIZED_NAME_POOLS.unknown);

function containsCjkCharacters(value: string) {
  return /[\u4e00-\u9fff]/.test(value);
}

function isUsefulLocalizedName(value: string, sourceName = "") {
  const text = value.trim();
  if (!text) return false;
  if (sourceName && text === sourceName.trim()) return false;
  if (containsCjkCharacters(text)) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (/^(未填写|待补|待补充|角色|人物|原名|改名)$/i.test(text)) return false;
  return true;
}

function isLocalizedNameGenderCompatible(value: string, genderHint: CharacterGenderHint) {
  const text = value.trim();
  if (!text) return false;
  if (genderHint === "male") {
    if (FEMALE_NAME_POOL.has(text)) return false;
    return true;
  }
  if (genderHint === "female") {
    if (MALE_NAME_POOL.has(text)) return false;
    return true;
  }
  if (UNKNOWN_NAME_POOL.has(text)) return true;
  return true;
}

function hashCharacterSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function inferCharacterGenderHint(params: {
  sourceName?: string;
  adaptedName?: string;
  originalProfileSummary?: string;
  requiredFunction?: string;
  roleType?: string;
}): CharacterGenderHint {
  const text = [
    params.sourceName ?? "",
    params.adaptedName ?? "",
    params.originalProfileSummary ?? "",
    params.requiredFunction ?? "",
    params.roleType ?? "",
  ]
    .join(" ")
    .trim();

  if (!text) return "unknown";

  // 明显女性线索
  if (/(之女|次女|女频|女子|女性|公主|御姐|美人|青梅竹马|小姐|夫人|少女|师姐|姐姐|母亲|母后|女神|龙女|龙皇之女|冰山美人|婚约女子|喜欢男主的女子|女主候选|龙族之女|凤女|凤族之女|王妃|皇后|妃子|娘娘|郡主|千金|大小姐|二小姐|三小姐|千金小姐)/.test(text)) {
    return "female";
  }

  // 明显男性线索
  if (/(之子|男频|男子|男性|boss|销售员|族长|院长|少爷|总裁|老爷|先生|哥哥|师兄|大少|少主|父亲|父王|龙皇之子|国主|王|男主|龙王|龙皇|长老|宗主|门主|掌门|城主|族长|族老|家主|家父|令尊|犬子|小儿|犬儿|兄台|老夫|老朽|本座|本尊|本王|本帝|孤|寡人|朕|龙族之子|凤男|凤族之子|太子|皇子|王爷|世子|小王爷|大王|二王|三王)/.test(text)) {
    return "male";
  }

  return "unknown";
}

export function resolveCharacterRelationshipState(params: {
  gender: CharacterGenderHint;
  slotId?: string;
  characterId?: string;
  leadAnchors?: CharacterLeadAnchors;
  roleType?: string;
  sourceName?: string;
  adaptedName?: string;
  originalProfileSummary?: string;
  requiredFunction?: string;
  relationshipHook?: string;
}): CharacterRelationshipState {
  const text = [
    params.slotId ?? "",
    params.roleType ?? "",
    params.sourceName ?? "",
    params.adaptedName ?? "",
    params.originalProfileSummary ?? "",
    params.requiredFunction ?? "",
    params.relationshipHook ?? "",
  ]
    .join(" ")
    .trim();

  const tags = new Set<string>();
  let relationToMaleLead = "unknown";
  let relationToFemaleLead = "unknown";
  const isMaleLead = Boolean(params.characterId && params.leadAnchors?.maleLeadId && params.characterId === params.leadAnchors.maleLeadId);
  const isFemaleLead = Boolean(params.characterId && params.leadAnchors?.femaleLeadId && params.characterId === params.leadAnchors.femaleLeadId);
  const isBackerSlot = params.slotId === "backer_or_pressure" || params.slotId === "family_power";
  const isPressureSlot =
    params.slotId === "backer_or_pressure" ||
    params.slotId === "family_power" ||
    params.slotId === "relationship_or_pressure" ||
    params.slotId === "antagonist" ||
    params.slotId === "secondary_obstacle";
  const isRelationshipSlot = params.slotId === "relationship_or_pressure" || params.slotId?.startsWith("ally_or_relationship") || false;

  if (params.slotId === "protagonist" || isMaleLead) {
    relationToMaleLead = "self";
    tags.add("男主");
  } else if (params.slotId === "antagonist") {
    relationToMaleLead = "opponent";
    tags.add("男主反派");
  } else if (params.slotId === "family_power") {
    // 明确家族证据
    const strongFamilyEvidence = /(家族|血缘|父母|长辈|婚约|青梅竹马|家族施压|父母之命|父亲|母亲|兄长|姐姐|妹妹)/.test(text);
    // 明确组织/制度证据
    const orgEvidence = /(组织|制度|势力|公司|财团|集团|学院|门派|系统|规则|组织施压)/.test(text);
    // 情感/关系证据（非家族）
    const relationshipEvidence = /(喜欢|中意|爱慕|建立感情|情感|关系|分身|伪装|误会|牵连)/.test(text);

    if (strongFamilyEvidence) {
      tags.add("家族压力");
    } else if (orgEvidence) {
      tags.add("组织压力");
    } else if (relationshipEvidence) {
      // 情感/关系角色，不加家族/组织压力标签
      tags.add("关系压力");
    }
    // 没有明确证据时不加标签
  } else if (params.slotId === "backer_or_pressure") {
    relationToMaleLead = /(贵人|背书|助推|帮助|扶持|资源)/.test(text) ? "male_lead_backer" : "unknown";
    if (relationToMaleLead === "male_lead_backer") {
      tags.add("男主贵人");
    }
    if (/(压力|压迫|制度|组织|势力|家族)/.test(text)) {
      tags.add("组织压力");
    }
  } else if (isRelationshipSlot) {
    if (params.gender === "female" || /(女主|女子|小姐|夫人|青梅竹马|婚约|恋|爱慕|喜欢|守护)/.test(text) || isFemaleLead) {
      relationToMaleLead = "likes_male_lead";
      tags.add("喜欢男主");
    }
    if (isFemaleLead) {
      relationToFemaleLead = "self";
      tags.add("女主");
    } else if (params.gender === "female") {
      tags.add("女主候选");
    }
    if (/(压力|压迫|家族|组织|势力|关系冲突|误会)/.test(text)) {
      tags.add("关系压力");
    }
  }

  if (/(喜欢|暗恋|追求|爱慕).*(男主|主角|少爷|总裁|boss)/.test(text) || /(男主|主角).*(喜欢|暗恋|追求|爱慕)/.test(text)) {
    relationToMaleLead = relationToMaleLead === "opponent" ? relationToMaleLead : "likes_male_lead";
    tags.add("likes_male_lead");
  }
  if (/(喜欢|暗恋|追求|爱慕).*(女主|女主角|小姐|夫人|女帝|公主)/.test(text) || /(女主|女主角).*(喜欢|暗恋|追求|爱慕)/.test(text)) {
    relationToFemaleLead = "likes_female_lead";
    tags.add("likes_female_lead");
  }
  if (isBackerSlot && /(贵人|背书|助推|帮助|扶持|资源)/.test(text)) {
    relationToMaleLead = relationToMaleLead === "unknown" ? "male_lead_backer" : relationToMaleLead;
    if (!tags.has("男主贵人")) tags.add("男主贵人");
  }
  if (/(反派|对手|阻碍|压迫|竞争|敌人|仇人)/.test(text)) {
    relationToMaleLead = relationToMaleLead === "unknown" ? "male_lead_antagonist" : relationToMaleLead;
    relationToFemaleLead = relationToFemaleLead === "unknown" ? "female_lead_rival" : relationToFemaleLead;
    tags.add("male_lead_antagonist");
  }
  const familyPressureEvidence = /(家族|婚约|中意|同修|建立感情|女子|关系|情感|亲友|血缘|家人|夫人|小姐|青梅竹马|父母|长辈|族长|老爷|哥哥|姐姐|弟弟|妹妹|叔|姨)/.test(text);
  const factionPressureEvidence = /(组织|势力|院|会|派|门|帮|公司|财团|集团|学校|学院|制度|系统|规则|压迫)/.test(text);
  if (isPressureSlot && familyPressureEvidence) {
    tags.add("family_pressure");
  } else if (isPressureSlot && factionPressureEvidence) {
    tags.add("faction_pressure");
  }
  if (params.gender === "male") tags.add("male_character");
  if (params.gender === "female") tags.add("female_character");
  if (isFemaleLead) tags.add("女主");

  const normalizedTags = Array.from(tags)
    .map((tag) => normalizeRelationshipTagLabel(tag))
    .filter((tag) => tag !== "unknown" && tag !== "male_character" && tag !== "female_character" && tag !== "作用标签待补充" && Boolean(tag));
  const defaultTags = defaultRelationshipTags({
    slotId: params.slotId,
    roleType: params.roleType,
    requiredFunction: params.requiredFunction,
    gender: params.gender,
    relationshipHook: params.relationshipHook,
    relationToMaleLead,
    relationToFemaleLead,
  });
  const finalTags = Array.from(new Set(normalizedTags.length > 0 ? normalizedTags : defaultTags));

  return {
    relationToMaleLead,
    relationToFemaleLead,
    relationshipTags: finalTags.slice(0, 4),
  };
}

export function resolveCharacterIdentityState(params: {
  rawGender?: unknown;
  genderHint?: CharacterGenderHint;
  slotId?: string;
  characterId?: string;
  leadAnchors?: CharacterLeadAnchors;
  sourceName?: string;
  adaptedName?: string;
  originalProfileSummary?: string;
  requiredFunction?: string;
  roleType?: string;
  relationshipHook?: string;
}): {
  gender: CharacterGenderHint;
  sourceGenderHint: CharacterGenderHint;
  genderConfidence: number;
  relationToMaleLead: string;
  relationToFemaleLead: string;
  relationshipTags: string[];
} {
  const inferredGender =
    params.genderHint ??
    inferCharacterGenderHint({
      sourceName: params.sourceName,
      adaptedName: params.adaptedName,
      originalProfileSummary: params.originalProfileSummary,
      requiredFunction: params.requiredFunction,
      roleType: params.roleType,
    });
  const rawGender =
    params.rawGender === "male" || params.rawGender === "female" || params.rawGender === "unknown"
      ? params.rawGender
      : "unknown";
  const gender = inferredGender !== "unknown" ? inferredGender : rawGender;
  const relationshipState = resolveCharacterRelationshipState({
    gender,
    slotId: params.slotId,
    characterId: params.characterId,
    leadAnchors: params.leadAnchors,
    roleType: params.roleType,
    sourceName: params.sourceName,
    adaptedName: params.adaptedName,
    originalProfileSummary: params.originalProfileSummary,
    requiredFunction: params.requiredFunction,
    relationshipHook: params.relationshipHook,
  });

  const confidence =
    inferredGender !== "unknown"
      ? (rawGender === inferredGender ? 0.95 : 0.8)
      : rawGender !== "unknown"
        ? 0.65
        : 0.35;

  return {
    gender,
    sourceGenderHint: inferredGender,
    genderConfidence: confidence,
    ...relationshipState,
  };
}

export type CharacterNarrativeState = {
  publicIdentity: string;
  hiddenIdentity?: string;
  misreadIdentity?: string;
  trueMotivation?: string;
  reversalTags: string[];
  revealStage: "early" | "middle" | "late" | "final" | "unknown";
};

export function resolveCharacterNarrativeState(params: {
  slotId?: string;
  sourceName?: string;
  adaptedName?: string;
  gender?: CharacterGenderHint;
  roleType?: string;
  requiredFunction?: string;
  originalProfileSummary?: string;
  relationshipHook?: string;
  publicIdentity?: string;
  hiddenIdentity?: string;
}): CharacterNarrativeState {
  const text = [
    params.slotId ?? "",
    params.sourceName ?? "",
    params.adaptedName ?? "",
    params.roleType ?? "",
    params.requiredFunction ?? "",
    params.originalProfileSummary ?? "",
    params.relationshipHook ?? "",
    params.publicIdentity ?? "",
    params.hiddenIdentity ?? "",
  ]
    .join(" ")
    .trim();

  const tags = new Set<string>();
  if (/(误判|误会|错认|认错|看错)/.test(text)) tags.add("误判反转");
  if (/(隐藏|身份|伪装|假身份|真身份)/.test(text)) tags.add("身份反转");
  if (/(阵营|立场|站队|翻盘)/.test(text)) tags.add("阵营反转");
  if (/(动机|目的|试探|考验)/.test(text)) tags.add("动机反转");
  if (/(强弱|反差|弱者|强者)/.test(text)) tags.add("强弱反转");
  if (/(背刺|反咬|反水|翻脸)/.test(text)) tags.add("背刺反转");
  if (/(血缘|血脉|亲生|父子|父女|母子|母女)/.test(text)) tags.add("血缘反转");
  if (/(规则|系统|机制|漏洞)/.test(text)) tags.add("规则反转");
  if (/(救赎|救回|挽回)/.test(text)) tags.add("救赎反转");

  let revealStage: CharacterNarrativeState["revealStage"] = "unknown";
  if (/(开局|起初|一开始|初登场)/.test(text)) {
    revealStage = "early";
  } else if (/(中段|中期|逐渐|慢慢|阶段性)/.test(text)) {
    revealStage = "middle";
  } else if (/(后段|后期|临近|接近|后半)/.test(text)) {
    revealStage = "late";
  } else if (/(终局|结局|最终|最后|大结局)/.test(text)) {
    revealStage = "final";
  }

  const publicIdentity = cleanOptionalText(params.publicIdentity, "");
  const hiddenIdentity = cleanOptionalText(params.hiddenIdentity, "");

  return {
    publicIdentity: publicIdentity || cleanOptionalText(params.requiredFunction, "人物设定"),
    hiddenIdentity: hiddenIdentity || undefined,
    misreadIdentity:
      /(误判|误会|错认|认错|看错)/.test(text)
        ? "被各方误判为关键人物"
        : params.gender === "male"
          ? "被误判为关键男性角色"
          : params.gender === "female"
            ? "被误判为关键女性角色"
            : "被误判为关键角色",
    trueMotivation:
      /(试探|考验|验证|借.*身份|借.*外壳|伪装|布局)/.test(text)
        ? "借当前身份试探规则、关系与资源边界"
        : undefined,
    reversalTags: Array.from(tags),
    revealStage,
  };
}

export function resolveCharacterLeadAnchors(draft: OriginalDraft): CharacterLeadAnchors {
  const adaptation = draft.adaptation?.status === "applied" ? draft.adaptation : null;
  const existing = adaptation?.leadAnchors;
  if (existing?.maleLeadId || existing?.femaleLeadId || (existing?.candidateFemaleLeadIds?.length ?? 0) > 0) {
    const existingCandidateFemaleLeadIds = existing?.candidateFemaleLeadIds ?? [];
    return {
      maleLeadId: existing?.maleLeadId,
      femaleLeadId: existing?.femaleLeadId,
      candidateFemaleLeadIds: existingCandidateFemaleLeadIds.slice(),
    };
  }

  const candidates = draft.characters
    .map((character, index) => {
      const meta = character.adaptationMeta;
      const gender = character.gender
        || meta?.sourceGenderHint
        || inferCharacterGenderHint({
          sourceName: meta?.sourceName,
          adaptedName: meta?.adaptedName ?? character.name,
          originalProfileSummary: meta?.originalProfileSummary ?? character.background,
          requiredFunction: meta?.roleFunction ?? character.role,
          roleType: character.role,
        });
      const text = [
        character.role,
        character.traits,
        character.background,
        meta?.roleFunction ?? "",
        meta?.relationshipHook ?? "",
      ].join(" ");
      const maleScore =
        /主角|男主|男频/.test(text) ? 3 :
        /贵人|背书|助推|帮助/.test(text) ? 2 :
        /反派|对手|压迫|阻碍/.test(text) ? 1 : 0;
      const femaleScore =
        /女主|女频|青梅|小姐|夫人|美人|公主|御姐|次女/.test(text) ? 3 :
        /关系|情感|助推|帮助|贵人/.test(text) ? 2 :
        /反派|对手|压迫|阻碍/.test(text) ? 1 : 0;
      return {
        character,
        index,
        gender,
        maleScore,
        femaleScore,
      };
    })
    .filter((item) => Boolean(item.character.id));

  const maleLead = candidates
    .filter((item) => item.gender === "male" || item.maleScore > 0)
    .sort((a, b) => (b.maleScore - a.maleScore) || a.index - b.index)[0];
  const femaleLeadCandidates = candidates
    .filter((item) => item.gender === "female" || item.femaleScore > 0)
    .sort((a, b) => (b.femaleScore - a.femaleScore) || a.index - b.index);
  const femaleLead = femaleLeadCandidates[0];

  let maleLeadId = maleLead?.character.id;
  let femaleLeadId = femaleLead?.character.id;

  // 兜底：当 character 评分不足以确定男女主且 adaptation 存在时，从 slotId 补齐
  if (!maleLeadId && adaptation) {
    maleLeadId = "protagonist";
  }
  if (!femaleLeadId && adaptation) {
    femaleLeadId = "ally_or_relationship_1";
  }

  return {
    maleLeadId,
    femaleLeadId,
    candidateFemaleLeadIds: femaleLeadCandidates.slice(0, 4).map((item) => item.character.id).filter(Boolean),
  };
}

export function resolveLocalizedCharacterName(params: {
  targetMarket: string;
  sourceName?: string;
  adaptedName?: string;
  rawName?: string;
  originalProfileSummary?: string;
  requiredFunction?: string;
  roleType?: string;
  slotId?: string;
  index?: number;
  usedNames?: Set<string>;
  genderHint?: CharacterGenderHint;
}) {
  const targetMarket = params.targetMarket || "中国";
  const sourceName = cleanOptionalText(params.sourceName, "");
  const genderHint = params.genderHint ?? inferCharacterGenderHint({
    sourceName,
    adaptedName: cleanOptionalText(params.adaptedName, ""),
    originalProfileSummary: cleanOptionalText(params.originalProfileSummary, ""),
    requiredFunction: cleanOptionalText(params.requiredFunction, ""),
    roleType: cleanOptionalText(params.roleType, ""),
  });
  const candidateNames = [
    params.rawName,
    params.adaptedName,
  ]
    .map((name) => cleanOptionalText(name, ""))
    .filter((name) => isUsefulLocalizedName(name, sourceName) && isLocalizedNameGenderCompatible(name, genderHint));

  const takenNames = params.usedNames ?? new Set<string>();
  const reserveName = (name: string) => {
    if (params.usedNames && name) {
      params.usedNames.add(name);
    }
    return name;
  };
  for (const candidate of candidateNames) {
    if (!takenNames.has(candidate)) return reserveName(candidate);
  }

  const pool = LOCALIZED_NAME_POOLS[genderHint];
  const seed = [
    params.slotId ?? "",
    sourceName,
    cleanOptionalText(params.requiredFunction, ""),
    cleanOptionalText(params.originalProfileSummary, ""),
    cleanOptionalText(params.roleType, ""),
    String(params.index ?? 0),
  ].join("|");
  const hash = hashCharacterSeed(seed);
  for (let i = 0; i < pool.length; i += 1) {
    const candidate = pool[(hash + i) % pool.length];
    if (!takenNames.has(candidate)) return reserveName(candidate);
  }

  return reserveName(pool[hash % pool.length]);
}

/**
 * 将英文 adaptedName 转为中文音译显示名。
 *
 * 与 targetMarket 无关 — 中文工作台始终使用中文音译显示名。
 * 1. adaptedName 是已知英文名 → 返回中文音译（如 Ethan→伊森）
 * 2. 不在库中的英文名 → 保守返回原英文名，不做臆造音译
 * 3. sourceName 为中文本名 → 不使用（name 始终以 adaptedName 音译为准）
 *
 * adaptedName 本身不做更改；此函数只处理 name 字段的显示。
 */
export function resolveCharacterDisplayName(params: {
  adaptedName: string;
  sourceName?: string;
}): string {
  const englishName = params.adaptedName.trim();
  if (!englishName) {
    // 无 adaptedName 时回退到 sourceName
    return params.sourceName?.trim() || "";
  }
  // 已知英文名 → 中文音译
  if (isKnownEnglishName(englishName)) {
    const phonetic = toChinesePhoneticName(englishName);
    if (phonetic) return phonetic;
  }
  // 不在库中的英文名 → 保守返回原名，不做臆造音译
  return englishName;
}

const NARRATIVE_GENDER_REPLACEMENTS: Record<CharacterGenderHint, Array<[RegExp, string]>> = {
  male: [
    [/^(她的)/, "他的"],
    [/^(她并非)/, "他并非"],
    [/^(她不是)/, "他不是"],
    [/^(她是)/, "他是"],
    [/^(她表面)/, "他表面"],
    [/^(她其实)/, "他其实"],
    [/^(她在)/, "他在"],
    [/^(她被)/, "他被"],
    [/^(她曾)/, "他曾"],
    [/^(她作为)/, "他作为"],
    [/([。！？!?；;\n\r]\s*)她的/g, "$1他的"],
    [/([。！？!?；;\n\r]\s*)她并非/g, "$1他并非"],
    [/([。！？!?；;\n\r]\s*)她不是/g, "$1他不是"],
    [/([。！？!?；;\n\r]\s*)她是/g, "$1他是"],
    [/([。！？!?；;\n\r]\s*)她表面/g, "$1他表面"],
    [/([。！？!?；;\n\r]\s*)她其实/g, "$1他其实"],
    [/([。！？!?；;\n\r]\s*)她在/g, "$1他在"],
    [/([。！？!?；;\n\r]\s*)她被/g, "$1他被"],
    [/([。！？!?；;\n\r]\s*)她曾/g, "$1他曾"],
    [/([。！？!?；;\n\r]\s*)她作为/g, "$1他作为"],
  ],
  female: [
    [/^(他的)/, "她的"],
    [/^(他并非)/, "她并非"],
    [/^(他不是)/, "她不是"],
    [/^(他是)/, "她是"],
    [/^(他表面)/, "她表面"],
    [/^(他其实)/, "她其实"],
    [/^(他在)/, "她在"],
    [/^(他被)/, "她被"],
    [/^(他曾)/, "她曾"],
    [/^(他作为)/, "她作为"],
    [/([。！？!?；;\n\r]\s*)他的/g, "$1她的"],
    [/([。！？!?；;\n\r]\s*)他并非/g, "$1她并非"],
    [/([。！？!?；;\n\r]\s*)他不是/g, "$1她不是"],
    [/([。！？!?；;\n\r]\s*)他是/g, "$1她是"],
    [/([。！？!?；;\n\r]\s*)他表面/g, "$1她表面"],
    [/([。！？!?；;\n\r]\s*)他其实/g, "$1她其实"],
    [/([。！？!?；;\n\r]\s*)他在/g, "$1她在"],
    [/([。！？!?；;\n\r]\s*)他被/g, "$1她被"],
    [/([。！？!?；;\n\r]\s*)他曾/g, "$1她曾"],
    [/([。！？!?；;\n\r]\s*)他作为/g, "$1她作为"],
  ],
  unknown: [
    [/^(她的|他的)/, "该角色的"],
    [/^(她并非|他并非)/, "该角色并非"],
    [/^(她不是|他不是)/, "该角色不是"],
    [/^(她是|他是)/, "该角色是"],
    [/^(她表面|他表面)/, "该角色表面"],
    [/^(她其实|他其实)/, "该角色其实"],
    [/^(她在|他在)/, "该角色在"],
    [/^(她被|他被)/, "该角色被"],
    [/^(她曾|他曾)/, "该角色曾"],
    [/^(她作为|他作为)/, "该角色作为"],
    [/([。！？!?；;\n\r]\s*)(她的|他的)/g, "$1该角色的"],
    [/([。！？!?；;\n\r]\s*)(她并非|他并非)/g, "$1该角色并非"],
    [/([。！？!?；;\n\r]\s*)(她不是|他不是)/g, "$1该角色不是"],
    [/([。！？!?；;\n\r]\s*)(她是|他是)/g, "$1该角色是"],
    [/([。！？!?；;\n\r]\s*)(她表面|他表面)/g, "$1该角色表面"],
    [/([。！？!?；;\n\r]\s*)(她其实|他其实)/g, "$1该角色其实"],
    [/([。！？!?；;\n\r]\s*)(她在|他在)/g, "$1该角色在"],
    [/([。！？!?；;\n\r]\s*)(她被|他被)/g, "$1该角色被"],
    [/([。！？!?；;\n\r]\s*)(她曾|他曾)/g, "$1该角色曾"],
    [/([。！？!?；;\n\r]\s*)(她作为|他作为)/g, "$1该角色作为"],
  ],
};

export function normalizeCharacterNarrativeByGender(
  value: unknown,
  gender: CharacterGenderHint,
) {
  const text = cleanOptionalText(value, "");
  if (!text) return "";
  const replacements = NARRATIVE_GENDER_REPLACEMENTS[gender] ?? NARRATIVE_GENDER_REPLACEMENTS.unknown;
  return replacements.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

type CharacterNarrativeReference = {
  sourceName?: string;
  adaptedName?: string;
  roleLabel?: string;
  aliases?: string[];
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeCharacterNarrativeByMarket(params: {
  value: unknown;
  gender: CharacterGenderHint;
  targetMarket?: string;
  currentSourceName?: string;
  currentLocalizedName?: string;
  references?: CharacterNarrativeReference[];
}) {
  const text = normalizeCharacterNarrativeByGender(params.value, params.gender);
  if (!text) return "";

  const targetMarket = params.targetMarket || "中国";
  if (targetMarket === "中国") {
    return text;
  }

  let output = text;
  const pronoun = params.gender === "male" ? "他" : params.gender === "female" ? "她" : "该角色";
  output = output.replace(/常胜|卢兆天/g, "男主的隐藏身份");
  output = output.replace(/([A-Za-z\u4e00-\u9fff]{1,16})(?:分身|伪装的另一个身份|伪装身份)([A-Za-z\u4e00-\u9fff]{1,16})/g, "男主的隐藏身份");
  output = output.replace(
    /([A-Za-z\u4e00-\u9fff]{1,16})(?:分身|伪装)([A-Za-z\u4e00-\u9fff]{1,16})时(?:中意|喜欢|爱慕|倾心)的(?:女子|女孩|少女|女人|美人)/g,
    `${pronoun}曾被男主的伪装身份吸引`,
  );
  output = output.replace(
    /([A-Za-z\u4e00-\u9fff]{1,16})(?:分身|伪装)([A-Za-z\u4e00-\u9fff]{1,16})时(?:中意|喜欢|爱慕|倾心)的(?:人|角色|对象)/g,
    `${pronoun}与男主在另一重身份下建立联系`,
  );
  output = output.replace(
    /([A-Za-z\u4e00-\u9fff]{1,16})(?:分身|伪装)([A-Za-z\u4e00-\u9fff]{1,16})时/g,
    `${pronoun}与男主在另一重身份下建立联系`,
  );
  output = output.replace(/伪装的另一个身份[‘'“”"]?[^。，“”]+[‘'“”"]?/g, "男主的隐藏身份");
  output = output.replace(/分身[^。，“”]{0,12}时/g, "在男主隐藏身份阶段");
  const replacements: Array<{ from: string; to: string }> = [];

  if (params.currentSourceName && params.currentLocalizedName && params.currentSourceName !== params.currentLocalizedName) {
    replacements.push({ from: params.currentSourceName, to: params.currentLocalizedName });
  }

  for (const ref of params.references ?? []) {
    const sourceName = cleanOptionalText(ref.sourceName, "");
    if (!sourceName) continue;
    const to = cleanOptionalText(ref.adaptedName || ref.roleLabel || "", "");
    if (!to || to === sourceName) continue;
    replacements.push({ from: sourceName, to });
    for (const alias of ref.aliases ?? []) {
      const aliasText = cleanOptionalText(alias, "");
      if (!aliasText || aliasText === sourceName) continue;
      replacements.push({ from: aliasText, to: ref.roleLabel || to });
    }
  }

  replacements
    .sort((a, b) => b.from.length - a.from.length)
    .forEach(({ from, to }) => {
      output = output.replace(new RegExp(escapeRegExp(from), "g"), to);
    });

  return output;
}

function getAdaptationStrategyLabel(value: string) {
  switch (value) {
    case "auto":
      return "自动匹配";
    case "preserve_original":
      return "保留原设";
    case "market_package":
      return "市场化包装";
    case "short_drama_boost":
      return "强化短剧爽点";
    default:
      return "自动匹配";
  }
}

/**
 * 从 draft.overview.projectBrief / scriptPlan 中读取主要人物上限，
 * 返回安全的目标角色数量（3~8，fallback 5）。
 */
export function getTargetCharacterCount(draft: OriginalDraft): number {
  const raw =
    (draft.overview.projectBrief as Record<string, unknown> | undefined)?.mainCharactersLimit ??
    (draft.overview.scriptPlan as Record<string, unknown> | undefined)?.mainCharactersLimit ??
    (draft.overview as Record<string, unknown>).mainCharactersLimit ??
    undefined;

  const n = typeof raw === "number" ? raw : 0;
  if (!Number.isFinite(n) || n < 3) return 5;
  if (n > 8) return 8;
  return n;
}

export type RequiredCharacterSlot = {
  slotId: string;
  roleType: string;
  sourceName?: string;
  adaptedName?: string;
  sourceAliases?: string[];
  requiredFunction: string;
  cleanProfileSummary?: string;
  traits?: string;
  relationshipFacts?: string;
  backgroundFacts?: string;
  defaultRelationshipTags?: string[];
  relationshipToProtagonist?: string;
};

type SourceCharacterRosterEntry = {
  sourceName: string;
  sourceAliases?: string[];
  cleanProfileSummary?: string;
  traits?: string;
  relationshipFacts?: string;
  backgroundFacts?: string;
  adaptedName?: string;
  requiredFunction?: string;
  roleTypeHint?: string;
  relationshipToProtagonist?: string;
  sourceRole?: string;
  sourceGenderHint?: CharacterGenderHint;
  genderEvidence?: string;
  sourceKinds: Array<"characterProfileText" | "roleFunctionMap" | "nameMap" | "draftCharacters" | "sourceMaterialExtraction">;
};

export type CharacterRosterInfo = {
  entries: SourceCharacterRosterEntry[];
  configuredMainCharactersLimit: number;
  inferredSourceCharacterCount: number;
  requiredCharacterCount: number;
  characterCountSource: "source_material_extraction" | "source_character_roster" | "source_outline_character_slots" | "configured_main_characters_limit";
};

const REQUIRED_CHARACTER_SLOT_TEMPLATES: RequiredCharacterSlot[] = [
  {
    slotId: "protagonist",
    roleType: "主角",
    requiredFunction: "承受压迫、推动主线、做出反击并承载观众代入",
    relationshipToProtagonist: "主角本人",
    defaultRelationshipTags: ["被误判", "低位反控", "身份反转"],
  },
  {
    slotId: "antagonist",
    roleType: "核心反派 / 第一压迫者",
    requiredFunction: "制造压迫、误判、资源阻断或权力压制，推动主角反击",
    relationshipToProtagonist: "直接对立的压迫者",
    defaultRelationshipTags: ["男主反派", "误判制造", "终局压力"],
  },
  {
    slotId: "backer_or_pressure",
    roleType: "资源背书 / 制度压力角色",
    requiredFunction: "提供资源入口、制度背书或高位压力，改变主角的生存与行动成本",
    relationshipToProtagonist: "资源背书者或制度压力来源",
    defaultRelationshipTags: ["给资源", "组织施压", "规则见证"],
  },
  {
    slotId: "ally_or_relationship_1",
    roleType: "关键关系 / 助推角色",
    requiredFunction: "提供关键协助、关系牵引、情绪拉扯或阶段性助力",
    relationshipToProtagonist: "关键关系人或关键协助者",
    defaultRelationshipTags: ["喜欢男主", "关系修复", "身份反差"],
  },
  {
    slotId: "ally_or_relationship_2",
    roleType: "关键关系 / 助推角色",
    requiredFunction: "补足关系张力、信息通道或阶段性协助，形成第二层人物牵引",
    relationshipToProtagonist: "第二关键关系人或关键协助者",
    defaultRelationshipTags: ["喜欢男主", "救男主", "女主候选"],
  },
  {
    slotId: "relationship_or_pressure",
    roleType: "关系变量 / 压力角色",
    requiredFunction: "制造关系压力、立场摇摆、信息牵制或次级压迫",
    relationshipToProtagonist: "关系变量或次级压力来源",
    defaultRelationshipTags: ["婚约压力", "关系压力", "策略型情感"],
  },
  {
    slotId: "family_power",
    roleType: "家族 / 组织权力角色",
    requiredFunction: "代表家族、组织或高位秩序，给主角带来持续压力",
    relationshipToProtagonist: "高位秩序压力来源",
    defaultRelationshipTags: ["关系压力", "家族施压", "复杂情感"],
  },
  {
    slotId: "secondary_obstacle",
    roleType: "次级阻碍角色 / 信息接口",
    requiredFunction: "补足冲突网、阻碍网或信息网，不改变主线功能",
    relationshipToProtagonist: "次级压力或次级信息来源",
    defaultRelationshipTags: ["关系压力", "规则见证"],
  },
];

const CHARACTER_NAME_BLACKLIST = [
  "主要设定与内容",
  "主要设定",
  "设定与内容",
  "故事梗概",
  "核心梗概",
  "世界观",
  "角色设定",
  "人物设定",
  "其他设定",
  "修炼体系",
  "能力体系",
  "规则设定",
  "设定",
  "内容",
  "背景",
  "法道院",
  "天院",
  "地院",
  "人院",
  "蓉城道学院",
  "道学院",
  "赵家",
  "葛家",
  "全性",
  "龙虎山",
  "武当山",
  "茅山",
  "法道院总院",
  "省级道学院",
  "学院",
  "学校",
  "公司",
  "集团",
  "门派",
  "组织",
  "机构",
  "道院",
  "道场",
  "门",
  "盟",
  "会",
  "局",
  "处",
  "所",
  "社",
  "团",
  "府",
  "殿",
  "宫",
  "城",
  "镇",
  "村",
  "山",
  "寺",
  "庙",
];

const CHARACTER_PROFILE_SECTION_BREAK_LABELS = [
  "主要设定与内容",
  "主要设定",
  "设定与内容",
  "世界观",
  "故事梗概",
  "核心梗概",
  "头衔",
  "等级",
  "势力",
  "种族",
  "其他设定",
];

function looksLikeCharacterName(value: string) {
  const text = value.trim();
  if (!text) return false;
  if (text.length > 6 || text.length < 2) return false;
  if (CHARACTER_NAME_BLACKLIST.some((term) => text.includes(term))) return false;
  if (/(family|corporation|house|guild|clan|order|academy|school|company|group)/i.test(text)) return false;
  if (/^[A-Za-z]/.test(text)) return false;
  if (/[0-9]/.test(text)) return false;
  if (/(公司|学院|学校|门派|组织|机构|道院|道场|集团|公司|道院|山庄|工厂|研究所|分院|总院|本部|分部|基地|分局|总局|中心|办公室|实验室)$/.test(text)) return false;
  return true;
}

type CharacterSeedEntry = {
  name: string;
  hint: string;
  source: "explicit" | "draft" | "nameMap" | "roleFunction";
};

type CharacterProfileSummary = {
  name: string;
  summary: string;
  aliases: string[];
};

const CHARACTER_PROFILE_FIELD_LABELS = [
  "头衔",
  "等级",
  "势力",
  "种族",
  "身份",
  "设定",
  "世界观",
  "背景",
  "场景",
  "阶层",
  "组织",
  "title",
  "rank",
  "faction",
  "species",
  "family",
  "corporation",
  "house",
];

function looksLikeCharacterFieldLabel(value: string) {
  const text = value.trim();
  if (!text) return false;
  return CHARACTER_PROFILE_FIELD_LABELS.some((label) => {
    if (label.length <= 2) {
      return text === label;
    }
    return text === label || text.includes(label);
  });
}

function splitCharacterSummaryFragments(text: string) {
  return text
    .replace(/\r/g, "\n")
    .split(/[。；;\n]+/)
    .map((line) => line.trim())
    .flatMap((line) => line.split(/[、,，]+/).map((part) => part.trim()))
    .map((part) => part.replace(/^[-•\d.、\s]+/, "").trim())
    .filter(Boolean);
}

function normalizeCharacterAliasList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((item) => item.trim())
        .filter((item) => looksLikeCharacterName(item) && !looksLikeCharacterFieldLabel(item)),
    ),
  );
}

function extractCharacterAliases(name: string, summary: string, inlineAlias?: string, otherSourceNames?: string[]) {
  const aliases = new Set<string>();
  const knownOthers = new Set(otherSourceNames ?? []);
  const leadPrefixes = ["与", "和", "跟", "及", "以及"];
  const push = (value: string) => {
    const text = value.trim();
    if (!text) return;
    if (text === name) return;
    if (!looksLikeCharacterName(text)) return;
    if (looksLikeCharacterFieldLabel(text)) return;
    // 过滤脏残片：不能以 与/和/跟/及/后 开头、不能以源名加关系词
    if (/^[与和跟及以及]/.test(text) && text.length > 1) return;
    // 过滤「后/前+源名」模式
    if (text.length === name.length + 1 && (text.startsWith("后") || text.startsWith("前")) && text.includes(name)) return;
    if (/青梅竹马|喜欢|中意|爱慕|倾心/.test(text) && text !== name) return;
    // 过滤等于其他已识别角色源名的残片
    if (knownOthers.has(text)) return;
    // 过滤「后/前+其他源名」模式（如「后车小贤」）
    for (const other of knownOthers) {
      if (text.length === other.length + 1 && (text.startsWith("后") || text.startsWith("前")) && text.endsWith(other)) return;
    }
    // 过滤「与/和/跟/及/以及+其他源名」模式
    for (const other of knownOthers) {
      for (const prefix of leadPrefixes) {
        if (text.startsWith(prefix) && text.slice(prefix.length) === other) return;
      }
    }
    aliases.add(text);
  };

  if (inlineAlias) {
    inlineAlias
      .split(/[、,，/|]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach(push);
  }

  const aliasPatterns = [
    /(?:分身|伪装的另一个身份|伪装身份|伪装的)([\u4e00-\u9fff]{2,8})/g,
    /([\u4e00-\u9fff]{2,8})(?:分身|伪装的另一个身份|伪装身份|伪装的)/g,
    /【([^】]+)】/g,
  ];

  for (const pattern of aliasPatterns) {
    for (const match of summary.matchAll(pattern)) {
      const value = (match[1] ?? "").trim();
      if (value) {
        value.split(/[、,，/|]+/).map((item) => item.trim()).filter(Boolean).forEach(push);
      }
    }
  }

  return normalizeCharacterAliasList(Array.from(aliases));
}

function cleanCharacterProfileSummary(
  text: string,
  params: { sourceName: string; aliases: string[]; targetMarket?: string; gender?: CharacterGenderHint; otherSourceNames?: string[] } = { sourceName: "", aliases: [] },
) {
  const sourceName = params.sourceName.trim();
  const aliases = normalizeCharacterAliasList([sourceName, ...params.aliases]);
  const otherNames = new Set(params.otherSourceNames ?? []);
  let output = text.trim().replace(/\s+/g, " ");
  if (!output) return "";

  const genericReplacements: Array<[RegExp, string]> = [
    [/([A-Za-z\u4e00-\u9fff]{1,16})(?:分身|伪装的另一个身份|伪装身份|伪装的)([A-Za-z\u4e00-\u9fff]{1,16})/g, "男主的隐藏身份"],
    [/([A-Za-z\u4e00-\u9fff]{1,16})分身([A-Za-z\u4e00-\u9fff]{1,16})时(?:中意|喜欢|爱慕|倾心)的(?:女子|女孩|少女|女人|美人)/g, "曾被男主的伪装身份吸引"],
    [/([A-Za-z\u4e00-\u9fff]{1,16})伪装的([A-Za-z\u4e00-\u9fff]{1,16})时(?:中意|喜欢|爱慕|倾心)的(?:女子|女孩|少女|女人|美人)/g, "曾被男主的伪装身份吸引"],
    [/([A-Za-z\u4e00-\u9fff]{1,16})分身([A-Za-z\u4e00-\u9fff]{1,16})时(?:中意|喜欢|爱慕|倾心)的(?:人|角色|对象)/g, "与男主在另一重身份下建立联系"],
    [/([A-Za-z\u4e00-\u9fff]{1,16})伪装的([A-Za-z\u4e00-\u9fff]{1,16})青梅竹马/g, "与男主隐藏身份存在旧日关系"],
    [/与([A-Za-z\u4e00-\u9fff]{1,16})伪装的([A-Za-z\u4e00-\u9fff]{1,16})青梅竹马/g, "与男主隐藏身份存在旧日关系"],
    [/与([A-Za-z\u4e00-\u9fff]{1,16})分身([A-Za-z\u4e00-\u9fff]{1,16})时(?:中意|喜欢|爱慕|倾心)的女子/g, "曾被男主的伪装身份吸引"],
    [/与([A-Za-z\u4e00-\u9fff]{1,16})分身([A-Za-z\u4e00-\u9fff]{1,16})时(?:中意|喜欢|爱慕|倾心)的人/g, "与男主在另一重身份下建立联系"],
    [/([A-Za-z\u4e00-\u9fff]{1,16})分身([A-Za-z\u4e00-\u9fff]{1,16})时/g, "与男主在另一重身份下建立联系"],
    [/伪装的另一个身份[‘'“”"]?[^。，“”]+[‘'“”"]?/g, "男主的隐藏身份"],
    [/分身[^。，“”]{0,12}时/g, "在男主隐藏身份阶段"],
    [/常胜|卢兆天/g, "男主的隐藏身份"],
  ];

  for (const [pattern, replacement] of genericReplacements) {
    output = output.replace(pattern, replacement);
  }

  for (const alias of aliases) {
    const replacement = alias === sourceName ? "该角色" : "该角色";
    output = output.replace(new RegExp(escapeRegExp(alias), "g"), replacement);
  }

  output = output.replace(/\s+/g, " ").trim();
  const fragments = splitCharacterSummaryFragments(output)
    .filter((fragment) => fragment.length > 1 && fragment.length <= 48)
    .filter((fragment) => !/(角色设定|人物设定|背景设定|制度性压力|关系钩子|高位背书者|推动误会升级|代表家族、组织、阶层或制度性压力)/.test(fragment))
    // 过滤关系事实残片：不得将「男主的隐藏身份」「有婚约」等关系描述作为角色自身身份概括
    .filter((fragment) => !/(男主|女主).*(隐藏身份|伪装身份|分身|另一重身份)/.test(fragment))
    .filter((fragment) => !/^(有|存在)(婚约|青梅竹马|旧日关系|羁绊|情感纠葛)/.test(fragment))
    .filter((fragment) => !/^(喜欢|爱慕|倾心|中意)(男主|女主)/.test(fragment))
    // 过滤包含其他角色 sourceName 的关系句残片（如「喜欢车小贤」「拯救车小贤」）
    .filter((fragment) => {
      for (const other of otherNames) {
        if (!other) continue;
        if (fragment.includes(other)) return false;
        // 也过滤「后/前/与/和/跟/及/以及+其他源名」模式
        if (new RegExp(`[前后与和跟及以及]${escapeRegExp(other)}`).test(fragment)) return false;
      }
      return true;
    })
    .slice(0, 3);

  const cleaned = fragments.join("、");
  return shortenText(cleaned || output, 180);
}

function extractCharacterTraitsFromSummary(
  summary: string,
  params: { sourceName: string; aliases: string[] } = { sourceName: "", aliases: [] },
) {
  const sourceName = params.sourceName.trim();
  const aliases = normalizeCharacterAliasList([sourceName, ...params.aliases]);
  const fragments = splitCharacterSummaryFragments(summary)
    .map((fragment) => fragment.replace(new RegExp(escapeRegExp(sourceName), "g"), ""))
    .map((fragment) => {
      let text = fragment;
      for (const alias of aliases) {
        text = text.replace(new RegExp(escapeRegExp(alias), "g"), "");
      }
      return text.trim();
    })
    .filter((fragment) => fragment.length > 1 && fragment.length <= 20)
    .filter((fragment) => !/(代表|家族|组织|阶层|制度|压力|背书|关系钩子|高位|推动|误会|反转|身份|隐藏|伪装|分身|青梅|婚约|中意|喜欢|爱慕|倾心|同修|系统|规则|权力|故事|剧情|角色)/.test(fragment))
    // 身份/世界观/剧情事实不得作为 traits
    .filter((fragment) => !/(穿越|转世|世界|身份|设定|之子|之女|皇|帝|圣|尊|族|掌控|巅峰|拯救|果实|神明|神界|妖界|修行|重生|龙|凤|麒麟)/.test(fragment))
    // 事件因果句不得作为 traits（如「最初因逆天气质暴露」「因...而...」）
    .filter((fragment) => !/(最初因|因.*而|因.*导致|因为|所以|才|导致|因此|于是|从而|进而|终于|终于|暴露)/.test(fragment))
    // 正向：traits 必须包含至少一个性格/气质/行为方式特征词
    .filter((fragment) => /[胆伶俐厚决敏活泼灵动谋义牺牲强酷冷热善恶诚伪巧悍忍痴辣辣敦笃谨勤烈毅锐躁柔猛刚烈倔犟乖闷偏执骄傲谦]|性格|气质|脾气|脾性|个性|行事|为人|处事|手腕|底色|心性/.test(fragment));

  return Array.from(new Set(fragments)).slice(0, 4).join("、");
}

function extractCharacterBackgroundFactsFromSummary(
  summary: string,
  params: { sourceName: string; aliases: string[] } = { sourceName: "", aliases: [] },
) {
  const sourceName = params.sourceName.trim();
  const aliases = normalizeCharacterAliasList([sourceName, ...params.aliases]);
  const fragments = splitCharacterSummaryFragments(summary)
    .map((fragment) => fragment.replace(new RegExp(escapeRegExp(sourceName), "g"), "该角色"))
    .map((fragment) => {
      let text = fragment;
      for (const alias of aliases) {
        text = text.replace(new RegExp(escapeRegExp(alias), "g"), "该角色");
      }
      return text.trim();
    })
    .filter((fragment) => fragment.length > 2 && fragment.length <= 48)
    .filter((fragment) => /(穿越|转世|身份|设定|之子|之女|皇|帝|圣|尊|族|掌控|巅峰|世界|修行|重生|龙|凤|麒麟|妖界|神界|凤凰|逆天|神明|果实|前世|今生|现代|未来|时空|命格|血脉|天赋|来历|出身|真实身份|隐藏实力|表面|伪装成)/.test(fragment))
    .filter((fragment) => !/(喜欢|爱慕|倾心|婚约|青梅|关系|情感|旧日)/.test(fragment))
    // 不得将未来/终局结果作为背景事实（如「走上巅峰」「最终」「终局」「后来成为」「大结局」）
    .filter((fragment) => !/(走上巅峰|最终|终局|后来成为|大结局|末了|结局|归宿|登顶|称霸|统治|一统|封神|无敌于)/.test(fragment));

  return Array.from(new Set(fragments)).slice(0, 3).join("；");
}

function extractCharacterRelationshipFactsFromSummary(
  summary: string,
  params: { sourceName: string; aliases: string[] } = { sourceName: "", aliases: [] },
) {
  const sourceName = params.sourceName.trim();
  const aliases = normalizeCharacterAliasList([sourceName, ...params.aliases]);
  const normalized = summary.replace(/\s+/g, " ");
  const fragments = splitCharacterSummaryFragments(normalized)
    .map((fragment) => {
      let text = fragment;
      for (const alias of aliases) {
        text = text.replace(new RegExp(escapeRegExp(alias), "g"), "男主");
      }
      text = text.replace(new RegExp(escapeRegExp(sourceName), "g"), "该角色");
      return text.trim();
    })
    .filter((fragment) => fragment.length > 1 && fragment.length <= 42)
    .filter((fragment) => /(青梅|婚约|中意|喜欢|爱慕|倾心|同修|旧日|吸引|隐藏身份|伪装|分身|家族|组织|压力|关系|情感|误判|规则|系统)/.test(fragment));

  const cleaned = Array.from(new Set(fragments))
    .map((fragment) => {
      let text = fragment
        .replace(/([A-Za-z\u4e00-\u9fff]{1,16})(?:分身|伪装的另一个身份|伪装身份|伪装的)([A-Za-z\u4e00-\u9fff]{1,16})/g, "男主的隐藏身份")
        .replace(/([A-Za-z\u4e00-\u9fff]{1,16})分身([A-Za-z\u4e00-\u9fff]{1,16})时(?:中意|喜欢|爱慕|倾心)的(?:女子|女孩|少女|女人|美人)/g, "曾被男主的伪装身份吸引")
        .replace(/([A-Za-z\u4e00-\u9fff]{1,16})伪装的([A-Za-z\u4e00-\u9fff]{1,16})青梅竹马/g, "与男主隐藏身份存在旧日关系")
        .replace(/([A-Za-z\u4e00-\u9fff]{1,16})分身([A-Za-z\u4e00-\u9fff]{1,16})时/g, "与男主在另一重身份下建立联系");
      if (/婚约/.test(text)) return "婚约压力";
      if (/家族|血缘|亲友|夫人|小姐|父母|长辈/.test(text)) return "家族压力";
      if (/组织|制度|公司|集团|学院|门派|势力|规则|系统/.test(text)) return "组织压力";
      if (/喜欢|爱慕|倾心/.test(text) && /男主/.test(text)) return "喜欢男主";
      if (/喜欢|爱慕|倾心/.test(text) && /女主/.test(text)) return "喜欢女主";
      return text.trim();
    })
    .filter(Boolean);

  // 对映射后的结果做最终去重（多个原始 fragment 可能映射到同一个标签，如「男主的隐藏身份、男主的隐藏身份」）
  const deduped = Array.from(new Set(cleaned)).slice(0, 3);

  return deduped.join("、");
}

/**
 * 将 relationshipFacts 中的其他角色 sourceName 锚定化为「男主」/「女主」。
 * - maleLeadSourceName → 男主
 * - femaleLeadSourceName → 女主
 * 不处理自身 sourceName（已在 extractCharacterRelationshipFactsFromSummary 中替换为「该角色」）。
 */
function normalizeRelationshipFactAnchors(
  text: string,
  maleLeadSourceName?: string,
  femaleLeadSourceName?: string,
) {
  if (!text) return text;
  let result = text;
  if (maleLeadSourceName && maleLeadSourceName.trim()) {
    result = result.replace(new RegExp(escapeRegExp(maleLeadSourceName.trim()), "g"), "男主");
  }
  if (femaleLeadSourceName && femaleLeadSourceName.trim()) {
    result = result.replace(new RegExp(escapeRegExp(femaleLeadSourceName.trim()), "g"), "女主");
  }
  return result;
}

/**
 * 从 roster entries / slots 中推断男女主 sourceName（用于 relationshipFacts 锚定化）。
 * 规则：
 * - 第 0 个 slot/entry（对应 protagonist）→ 男主 sourceName
 * - slotId === "ally_or_relationship_1" 对应的 entry/slot → 女主 sourceName
 */
function inferLeadSourceNamesFromRosterOrSlots(
  rosterEntries?: Array<{ sourceName: string; slotId?: string }>,
  slots?: Array<{ sourceName?: string; slotId: string }>,
): { maleLeadSourceName?: string; femaleLeadSourceName?: string } {
  let maleLeadSourceName: string | undefined;
  let femaleLeadSourceName: string | undefined;

  if (slots?.length) {
    const protagonistSlot = slots.find((s) => s.slotId === "protagonist");
    const femaleSlot = slots.find((s) => s.slotId === "ally_or_relationship_1");
    maleLeadSourceName = protagonistSlot?.sourceName || undefined;
    femaleLeadSourceName = femaleSlot?.sourceName || undefined;
    if (maleLeadSourceName || femaleLeadSourceName) return { maleLeadSourceName, femaleLeadSourceName };
  }

  if (rosterEntries?.length) {
    maleLeadSourceName = rosterEntries[0]?.sourceName;
    // ally_or_relationship_1 is slot index 3
    femaleLeadSourceName = rosterEntries[3]?.sourceName;
    return { maleLeadSourceName, femaleLeadSourceName };
  }

  return {};
}

function isCharacterProfileSectionBreakLine(line: string) {
  const text = line.trim().replace(/^[-•\d.、\s]+/, "");
  if (!text) return false;
  return CHARACTER_PROFILE_SECTION_BREAK_LABELS.some((label) => {
    return (
      text === label ||
      text.startsWith(`${label}：`) ||
      text.startsWith(`${label}:`) ||
      text.startsWith(`${label}—`) ||
      text.startsWith(`${label}-`) ||
      text.startsWith(`${label}：`) ||
      text.startsWith(`${label}：`)
    );
  });
}

function extractCharacterProfileEntries(text: string, limit = 16): CharacterProfileSummary[] {
  if (!text.trim()) return [];

  const results: CharacterProfileSummary[] = [];
  const lines = text.replace(/\r/g, "\n").split(/\n/).map((line) => line.trim()).filter(Boolean);
  const entryPattern = /(^|[。；;\s])([一-龥]{2,6})(?:【([^】]+)】)?\s*(?:[：:—\-–~]{1,3}|——)/g;

  for (const rawLine of lines) {
    const line = rawLine.replace(/^[-•\d.、\s]+/, "");
    if (!line) continue;
    if (line.length > 220) continue;
    if (isCharacterProfileSectionBreakLine(line)) break;

    const matches = Array.from(line.matchAll(entryPattern));
    if (!matches.length) continue;

    const entries = matches
      .map((match) => {
        const name = (match[2] ?? "").trim();
        const index = match.index ?? -1;
        if (!name || index < 0) return null;
        if (!looksLikeCharacterName(name) || looksLikeCharacterFieldLabel(name)) return null;
        return {
          name,
          start: index + match[0].length,
        };
      })
      .filter((item): item is { name: string; start: number } => Boolean(item));

    if (!entries.length) continue;

    for (let index = 0; index < entries.length; index++) {
      const current = entries[index];
      const next = entries[index + 1];
      const rawSummary = line
        .slice(current.start, next?.start ?? line.length)
        .replace(/^[\s：:，,。；;、—\-–~]+/, "")
        .replace(/\s+/g, " ")
        .trim();
      const summary = shortenText(rawSummary.replace(new RegExp(`^${current.name}[：:，,———\\-\\s]*`), ""), 180);
      if (summary && summary !== "未填写") {
        results.push({ name: current.name, summary, aliases: [] });
      }
      if (results.length >= limit) break;
    }
    if (results.length >= limit) break;
  }

  return results;
}

function extractCharacterSeedEntriesFromText(text: string, limit = 8): CharacterSeedEntry[] {
  return extractCharacterProfileEntries(text, limit).map((item) => ({
    name: item.name,
    hint: item.summary,
    source: "explicit" as const,
  }));
}

function extractCharacterProfileSummaries(text: string, limit = 16): CharacterProfileSummary[] {
  return extractCharacterProfileEntries(text, limit);
}

function mergeRosterEntry(
  map: Map<string, SourceCharacterRosterEntry>,
  sourceName: string,
  patch: Partial<Omit<SourceCharacterRosterEntry, "sourceName" | "sourceKinds">> & {
    sourceKinds: SourceCharacterRosterEntry["sourceKinds"];
  },
) {
  const key = sourceName.trim();
  if (!looksLikeCharacterName(key)) return;

  const existing = map.get(key);
  if (!existing) {
    map.set(key, {
      sourceName: key,
      sourceAliases: patch.sourceAliases?.length ? normalizeCharacterAliasList(patch.sourceAliases) : undefined,
      cleanProfileSummary: patch.cleanProfileSummary?.trim() || undefined,
      traits: patch.traits?.trim() || undefined,
      relationshipFacts: patch.relationshipFacts?.trim() || undefined,
      backgroundFacts: patch.backgroundFacts?.trim() || undefined,
      adaptedName: patch.adaptedName?.trim() || undefined,
      requiredFunction: patch.requiredFunction?.trim() || undefined,
      roleTypeHint: patch.roleTypeHint?.trim() || undefined,
      relationshipToProtagonist: patch.relationshipToProtagonist?.trim() || undefined,
      sourceKinds: Array.from(new Set(patch.sourceKinds)),
    });
    return;
  }

  if (!existing.sourceAliases?.length && patch.sourceAliases?.length) {
    existing.sourceAliases = normalizeCharacterAliasList(patch.sourceAliases);
  }
  if (!existing.cleanProfileSummary && patch.cleanProfileSummary?.trim()) {
    existing.cleanProfileSummary = patch.cleanProfileSummary.trim();
  }
  if (!existing.traits && patch.traits?.trim()) {
    existing.traits = patch.traits.trim();
  }
  if (!existing.relationshipFacts && patch.relationshipFacts?.trim()) {
    existing.relationshipFacts = patch.relationshipFacts.trim();
  }
  if (!existing.backgroundFacts && patch.backgroundFacts?.trim()) {
    existing.backgroundFacts = patch.backgroundFacts.trim();
  }
  if (!existing.adaptedName && patch.adaptedName?.trim()) {
    existing.adaptedName = patch.adaptedName.trim();
  }
  if (!existing.requiredFunction && patch.requiredFunction?.trim()) {
    existing.requiredFunction = patch.requiredFunction.trim();
  }
  if (!existing.roleTypeHint && patch.roleTypeHint?.trim()) {
    existing.roleTypeHint = patch.roleTypeHint.trim();
  }
  if (!existing.relationshipToProtagonist && patch.relationshipToProtagonist?.trim()) {
    existing.relationshipToProtagonist = patch.relationshipToProtagonist.trim();
  }
  existing.sourceKinds = Array.from(new Set([...existing.sourceKinds, ...patch.sourceKinds]));
}

/**
 * 校验模型抽取结果是否合格。
 * 不合格时返回 false，调用方应回退到现有规则 parser。
 */
function validateSourceMaterialExtraction(extraction: SourceMaterialExtraction | undefined | null): extraction is SourceMaterialExtraction {
  if (!extraction) return false;
  if (!Array.isArray(extraction.characters) || extraction.characters.length === 0) return false;

  const identityWords = /(穿越|转世|之女|之子|族长|皇|帝|圣|尊|系统|世界|神界|妖界|修行|重生)/;

  // 收集 top-level aliases 中的别名，用于交叉校验 characters 不包含别名
  const topAliases = (extraction.aliases ?? []).map((a) => a.alias.trim()).filter(Boolean);

  for (const char of extraction.characters) {
    if (!char.sourceName || typeof char.sourceName !== "string" || !char.sourceName.trim()) return false;

    // sourceAliases 不能包含 sourceName 或关系短语
    const aliases = Array.isArray(char.sourceAliases) ? char.sourceAliases : [];
    for (const a of aliases) {
      if (typeof a !== "string" || a.trim() === char.sourceName.trim()) return false;
      if (/(喜欢|爱慕|倾心|婚约|与|和|跟|及)/.test(a)) return false;
    }

    // traits 不能包含身份词
    const traits = Array.isArray(char.traits) ? char.traits : [];
    for (const t of traits) {
      if (typeof t === "string" && identityWords.test(t)) return false;
    }

    // aliases 中声明的别名不得作为独立人物进入 characters
    if (topAliases.includes(char.sourceName.trim())) return false;
  }

  // supportingCharacters 基本格式校验（可选字段）
  if (extraction.supportingCharacters) {
    for (const sc of extraction.supportingCharacters) {
      if (!sc.sourceName || typeof sc.sourceName !== "string" || !sc.sourceName.trim()) return false;
      // supportingCharacters 中的人物名不得与 characters 重复
      const scName = sc.sourceName.trim();
      if (extraction.characters.some((c) => c.sourceName.trim() === scName)) return false;
    }
  }

  // aliases 基本格式校验（可选字段）
  if (extraction.aliases) {
    for (const a of extraction.aliases) {
      if (!a.alias || typeof a.alias !== "string" || !a.alias.trim()) return false;
    }
  }

  return true;
}

/**
 * 从 sourceMaterialExtraction 构建 SourceCharacterRosterEntry 列表。
 * 所有字段直接来自模型抽取结果，不再走 regex parser。
 */
function buildSourceCharacterRosterFromExtraction(
  draft: OriginalDraft,
  extraction: SourceMaterialExtraction,
): SourceCharacterRosterEntry[] {
  const targetMarket = draft.adaptation?.targetMarket ?? "中国";
  const allSourceNames = extraction.characters.map((c) => c.sourceName.trim()).filter(Boolean);

  return extraction.characters.map((char) => {
    const sourceName = char.sourceName.trim();
    const otherNames = allSourceNames.filter((n) => n !== sourceName);

    // traits: 直接取模型输出的 traits 数组，用 、 拼接
    const traits = Array.isArray(char.traits) && char.traits.length > 0
      ? char.traits.filter((t: unknown) => typeof t === "string" && t.trim()).map((t: string) => t.trim()).join("、")
      : undefined;

    // identityFacts + backgroundFacts 合并为 backgroundFacts（模型已分离）
    const bgFacts = [
      ...(Array.isArray(char.identityFacts) ? char.identityFacts.filter((f: unknown) => typeof f === "string" && f.trim()).map((f: string) => f.trim()) : []),
      ...(Array.isArray(char.backgroundFacts) ? char.backgroundFacts.filter((f: unknown) => typeof f === "string" && f.trim()).map((f: string) => f.trim()) : []),
    ];
    const backgroundFacts = bgFacts.length > 0 ? bgFacts.join("、") : undefined;

    // relationshipFacts: 直接取模型输出，去重后用 、 拼接
    const relFacts = Array.isArray(char.relationshipFacts)
      ? Array.from(new Set(char.relationshipFacts.filter((f: unknown) => typeof f === "string" && f.trim()).map((f: string) => f.trim())))
      : [];
    const relationshipFacts = relFacts.length > 0 ? relFacts.join("、") : undefined;

    // cleanProfileSummary: publicIdentity + hiddenIdentity 拼接
    const idParts = [char.publicIdentity, char.hiddenIdentity].filter((s) => typeof s === "string" && s.trim());
    const cleanProfileSummary = idParts.length > 0
      ? idParts.map((s) => s.trim()).filter(Boolean).join("，")
      : undefined;

    // sourceGenderHint: 优先使用模型输出的 gender
    const modelGender = char.gender;
    const genderEvidence = typeof char.genderEvidence === "string" ? char.genderEvidence.trim() : undefined;
    // 如果模型已经明确标注 male/female，直接使用；否则通过上下文推断
    const sourceGenderHint: CharacterGenderHint =
      modelGender === "male" || modelGender === "female" ? modelGender
      : inferCharacterGenderHint({
          sourceName,
          adaptedName: "",
          originalProfileSummary: cleanProfileSummary,
          requiredFunction: char.sourceRole,
          roleType: char.shortDramaRoleHint,
        });

    const entry: SourceCharacterRosterEntry = {
      sourceName,
      sourceAliases: Array.isArray(char.sourceAliases)
        ? char.sourceAliases.filter((a: unknown) => typeof a === "string" && a.trim()).map((a: string) => a.trim())
        : undefined,
      cleanProfileSummary: cleanProfileSummary || undefined,
      traits: traits || undefined,
      relationshipFacts: relationshipFacts || undefined,
      backgroundFacts: backgroundFacts || undefined,
      sourceRole: typeof char.sourceRole === "string" ? char.sourceRole.trim() : undefined,
      sourceGenderHint,
      genderEvidence,
      sourceKinds: ["sourceMaterialExtraction"],
    };

    return entry;
  });
}

/** normalize sourceKind 枚举值，兼容旧数据 */
type SourceKind = "characterProfileText" | "roleFunctionMap" | "nameMap" | "draftCharacters" | "sourceMaterialExtraction";

function buildSourceCharacterRoster(draft: OriginalDraft) {
  const adaptation = draft.adaptation?.status === "applied" ? draft.adaptation : null;
  if (!adaptation) {
    return [] as SourceCharacterRosterEntry[];
  }

  // 【优先路径】如果有已校验通过的 sourceMaterialExtraction，直接使用模型抽取结果
  if (validateSourceMaterialExtraction(adaptation.sourceMaterialExtraction)) {
    return buildSourceCharacterRosterFromExtraction(draft, adaptation.sourceMaterialExtraction);
  }

  // 【回退路径】现有规则 parser 链路
  const sourceSections = draft.outlines.sourceSections;
  const targetMarket = adaptation.targetMarket ?? "中国";
  const profileSummaries = extractCharacterProfileSummaries(sourceSections?.characterProfileText ?? "", 32);
  const roster = new Map<string, SourceCharacterRosterEntry>();
  const hasStrongProfileRoster = profileSummaries.length >= 3;
  // 收集所有已知 sourceName，避免被误提取为其他角色的 alias
  const allProfileSourceNames = profileSummaries.map((s) => s.name);

  for (const item of profileSummaries) {
    const otherNames = allProfileSourceNames.filter((n) => n !== item.name);
    const sourceAliases = extractCharacterAliases(item.name, item.summary, "", otherNames);
    const cleanProfileSummary = cleanCharacterProfileSummary(item.summary, {
      sourceName: item.name,
      aliases: sourceAliases,
      targetMarket,
      otherSourceNames: otherNames,
    });
    const traits = extractCharacterTraitsFromSummary(item.summary, {
      sourceName: item.name,
      aliases: sourceAliases,
    });
    const relationshipFacts = extractCharacterRelationshipFactsFromSummary(item.summary, {
      sourceName: item.name,
      aliases: sourceAliases,
    });
    const backgroundFacts = extractCharacterBackgroundFactsFromSummary(item.summary, {
      sourceName: item.name,
      aliases: sourceAliases,
    });
    mergeRosterEntry(roster, item.name, {
      sourceAliases,
      cleanProfileSummary,
      traits,
      relationshipFacts,
      backgroundFacts,
      sourceKinds: ["characterProfileText"],
    });
  }

  for (const item of adaptation.extraction?.roleFunctionMap ?? []) {
    const sourceName = cleanOptionalText(item.sourceName, "");
    if (!looksLikeCharacterName(sourceName)) continue;
    if (hasStrongProfileRoster && !roster.has(sourceName)) continue;
    mergeRosterEntry(roster, sourceName, {
      requiredFunction: cleanOptionalText(item.roleFunction, ""),
      roleTypeHint: cleanOptionalText(item.publicIdentity, ""),
      relationshipToProtagonist: cleanOptionalText(item.relationshipHook, ""),
      sourceKinds: ["roleFunctionMap"],
    });
  }

  for (const item of adaptation.overseasMapping?.nameMap ?? []) {
    const sourceName = cleanOptionalText(item.sourceName, "");
    if (!looksLikeCharacterName(sourceName)) continue;
    if (hasStrongProfileRoster && !roster.has(sourceName)) continue;
    mergeRosterEntry(roster, sourceName, {
      adaptedName: cleanOptionalText(item.adaptedName, ""),
      sourceKinds: ["nameMap"],
    });
  }

  for (const item of draft.characters ?? []) {
    const sourceName = cleanOptionalText(item.name, "");
    if (!looksLikeCharacterName(sourceName)) continue;
    if (hasStrongProfileRoster && !roster.has(sourceName)) continue;
    mergeRosterEntry(roster, sourceName, {
      cleanProfileSummary: cleanCharacterProfileSummary(cleanOptionalText(item.background, ""), {
        sourceName,
        aliases: [],
        targetMarket,
        otherSourceNames: allProfileSourceNames.filter((n) => n !== sourceName),
      }),
      traits: extractCharacterTraitsFromSummary(cleanOptionalText(item.traits, ""), {
        sourceName,
        aliases: [],
      }),
      relationshipFacts: extractCharacterRelationshipFactsFromSummary(cleanOptionalText(item.background, ""), {
        sourceName,
        aliases: [],
      }),
      adaptedName: cleanOptionalText(item.adaptationMeta?.adaptedName, ""),
      requiredFunction: cleanOptionalText(item.adaptationMeta?.roleFunction, ""),
      roleTypeHint: cleanOptionalText(item.role, ""),
      relationshipToProtagonist: cleanOptionalText(item.adaptationMeta?.relationshipHook, ""),
      sourceKinds: ["draftCharacters"],
    });
  }

  // 对已建立的 roster 统一做 relationshipFacts 锚定化（sourceName → 男主/女主）
  const rosterEntriesForAnchors = Array.from(roster.values());
  const { maleLeadSourceName, femaleLeadSourceName } = inferLeadSourceNamesFromRosterOrSlots(
    rosterEntriesForAnchors.map((e) => ({ sourceName: e.sourceName })),
  );
  if (maleLeadSourceName || femaleLeadSourceName) {
    for (const [, entry] of roster) {
      if (entry.relationshipFacts) {
        entry.relationshipFacts = normalizeRelationshipFactAnchors(
          entry.relationshipFacts,
          maleLeadSourceName,
          femaleLeadSourceName,
        );
      }
    }
  }

  const usedLocalizedNames = new Set<string>();
  return Array.from(roster.values()).map((entry, index) => {
    const cleanProfileSummary = entry.cleanProfileSummary || undefined;
    // genderHint: 优先使用 entry.sourceGenderHint（来自 sourceMaterialExtraction）
    const genderHint: CharacterGenderHint = entry.sourceGenderHint ?? inferCharacterGenderHint({
      sourceName: entry.sourceName,
      adaptedName: entry.adaptedName,
      originalProfileSummary: cleanProfileSummary,
      requiredFunction: entry.requiredFunction,
      roleType: entry.roleTypeHint ?? "",
    });
    const normalizedAdaptedName = targetMarket === "中国"
      ? entry.adaptedName || undefined
      : resolveLocalizedCharacterName({
          targetMarket,
          sourceName: entry.sourceName,
          adaptedName: entry.adaptedName,
          originalProfileSummary: cleanProfileSummary,
          requiredFunction: entry.requiredFunction,
          roleType: entry.roleTypeHint ?? "",
          slotId: entry.sourceName,
          index,
          usedNames: usedLocalizedNames,
          genderHint,
        }) || undefined;
    return {
      ...entry,
      cleanProfileSummary,
      adaptedName: normalizedAdaptedName,
    };
  });
}

export function resolveGenerationConstraints(draft: OriginalDraft) {
  const brief = draft.overview.projectBrief;
  return {
    targetWordsPerEpisode: brief?.targetWordsPerEpisode ?? 500,
    sceneLimitPerEpisode: brief?.sceneLimitPerEpisode ?? 3,
    mainCharactersLimit: brief?.mainCharactersLimit ?? 6,
    episodeDuration: brief?.episodeDuration ?? "1-2min",
    scriptType: brief?.scriptType ?? ("short_drama" as "ai_comic" | "short_drama"),
  };
}

export function resolveCharacterRosterInfo(draft: OriginalDraft): CharacterRosterInfo {
  const configuredMainCharactersLimit = getTargetCharacterCount(draft);
  const adaptation = draft.adaptation?.status === "applied" ? draft.adaptation : null;
  if (!adaptation) {
    return {
      entries: [],
      configuredMainCharactersLimit,
      inferredSourceCharacterCount: configuredMainCharactersLimit,
      requiredCharacterCount: configuredMainCharactersLimit,
      characterCountSource: "configured_main_characters_limit",
    };
  }

  const entries = buildSourceCharacterRoster(draft);
  const explicitCount = entries.length;
  const draftCount = draft.characters.filter((item) => looksLikeCharacterName(cleanOptionalText(item.name, ""))).length;
  const extractedCount = draft.outlines.sourceSections?.characterProfileText?.trim()
    ? extractCharacterProfileSummaries(draft.outlines.sourceSections.characterProfileText, 32).length
    : 0;
  // 模型抽取层角色数（sourceMaterialExtraction）
  const extractionCharCount = adaptation.sourceMaterialExtraction?.characters?.length ?? 0;
  const roleCount = adaptation.extraction?.roleFunctionMap?.filter((item) => looksLikeCharacterName(cleanOptionalText(item.sourceName, ""))).length ?? 0;
  const nameMapCount = adaptation.overseasMapping?.nameMap?.filter((item) => looksLikeCharacterName(cleanOptionalText(item.sourceName, ""))).length ?? 0;
  const inferredSourceCharacterCount = Math.max(extractedCount, extractionCharCount, roleCount, nameMapCount, draftCount, configuredMainCharactersLimit);
  const effectiveExtractedCount = Math.max(extractedCount, extractionCharCount);
  const requiredCharacterCount = effectiveExtractedCount >= 3 ? effectiveExtractedCount : Math.max(draftCount, configuredMainCharactersLimit);
  const characterCountSource: CharacterRosterInfo["characterCountSource"] =
    extractionCharCount >= 3 ? "source_material_extraction"
    : extractedCount >= 3 ? "source_outline_character_slots"
    : "configured_main_characters_limit";

  return {
    entries,
    configuredMainCharactersLimit,
    inferredSourceCharacterCount,
    requiredCharacterCount,
    characterCountSource,
  };
}

export function buildRequiredCharacterSlots(draft: OriginalDraft): RequiredCharacterSlot[] {
  const adaptation = draft.adaptation?.status === "applied" ? draft.adaptation : null;
  const rosterInfo = resolveCharacterRosterInfo(draft);
  const targetCount = adaptation ? rosterInfo.requiredCharacterCount : getTargetCharacterCount(draft);
  if (adaptation) {
    if (rosterInfo.entries.length >= 3) {
      // 创建全局 usedLocalizedNames Set，确保 adaptedName 全局唯一
      const usedLocalizedNames = new Set<string>();
      return rosterInfo.entries.slice(0, targetCount).map((entry, index) => {
        const template = REQUIRED_CHARACTER_SLOT_TEMPLATES[index] ?? {
          slotId: `supporter_${index + 1}`,
          roleType: index % 2 === 0 ? "次级助推角色" : "次级阻碍角色",
          requiredFunction: "补足冲突网、关系网或信息网，不改变主线功能",
          relationshipToProtagonist: "次级压力或次级协助者",
        };

        const roleFunctionEntry = adaptation.extraction?.roleFunctionMap?.find(
          (item) => cleanOptionalText(item.sourceName, "") === entry.sourceName,
        );
        const nameMapEntry = adaptation.overseasMapping?.nameMap?.find(
          (item) => cleanOptionalText(item.sourceName, "") === entry.sourceName,
        );

        // genderHint: 优先使用 sourceMaterialExtraction 的 sourceGenderHint
        const genderHint: CharacterGenderHint = entry.sourceGenderHint ?? inferCharacterGenderHint({
          sourceName: entry.sourceName,
          adaptedName: entry.adaptedName,
          originalProfileSummary: entry.cleanProfileSummary,
          requiredFunction: entry.requiredFunction,
          roleType: template.roleType,
        });

        return {
          slotId: template.slotId,
          roleType: template.roleType,
          sourceName: entry.sourceName,
          sourceAliases: entry.sourceAliases?.length ? entry.sourceAliases : undefined,
          adaptedName: resolveLocalizedCharacterName({
            targetMarket: adaptation.targetMarket,
            sourceName: entry.sourceName,
            adaptedName: cleanOptionalText(entry.adaptedName ?? nameMapEntry?.adaptedName, ""),
            originalProfileSummary: entry.cleanProfileSummary,
            requiredFunction: entry.requiredFunction,
            roleType: template.roleType,
            slotId: template.slotId,
            index,
            usedNames: usedLocalizedNames,
            genderHint,
          }) || undefined,
          requiredFunction: cleanOptionalText(entry.requiredFunction ?? roleFunctionEntry?.roleFunction ?? template.requiredFunction, template.requiredFunction),
          cleanProfileSummary: cleanOptionalText(entry.cleanProfileSummary ?? "", "") || undefined,
          traits: cleanOptionalText(entry.traits ?? "", "") || undefined,
          relationshipFacts: cleanOptionalText(entry.relationshipFacts ?? "", "") || undefined,
          backgroundFacts: cleanOptionalText(entry.backgroundFacts ?? "", "") || undefined,
          defaultRelationshipTags: template.defaultRelationshipTags ?? defaultRelationshipTags({
            slotId: template.slotId,
            roleType: template.roleType,
            requiredFunction: cleanOptionalText(entry.requiredFunction ?? roleFunctionEntry?.roleFunction ?? template.requiredFunction, template.requiredFunction),
            gender: genderHint,
            relationshipHook: cleanRelationshipToProtagonist(entry.relationshipToProtagonist ?? ""),
          }),
          relationshipToProtagonist: cleanRelationshipToProtagonist(
            entry.relationshipToProtagonist ?? roleFunctionEntry?.relationshipHook ?? template.relationshipToProtagonist ?? ""
          ) || entry.relationshipFacts || undefined,
        };
      });
    }
  }

  const roleFunctionMap = adaptation?.extraction?.roleFunctionMap ?? [];
  const nameMap = adaptation?.overseasMapping?.nameMap ?? [];
  const sourceSections = draft.outlines.sourceSections;
  const explicitSeeds = extractCharacterSeedEntriesFromText(sourceSections?.characterProfileText ?? "", targetCount * 2);
  const draftSeeds = draft.characters
    .map((item) => ({
      name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "",
      hint: `${item.role ?? ""} ${item.background ?? ""}`,
      source: "draft" as const,
    }))
    .filter((item) => looksLikeCharacterName(item.name));
  const mappedSeeds = nameMap
    .flatMap((item) => [
      {
        name: cleanOptionalText(item.sourceName, ""),
        hint: `${item.sourceName ?? ""} ${item.reason ?? ""}`,
        source: "nameMap" as const,
      },
      {
        name: cleanOptionalText(item.adaptedName, ""),
        hint: `${item.adaptedName ?? ""} ${item.reason ?? ""}`,
        source: "nameMap" as const,
      },
    ])
    .filter((item) => looksLikeCharacterName(item.name));

  const profileSummaries = extractCharacterProfileSummaries(sourceSections?.characterProfileText ?? "", targetCount * 3);
  const profileSummaryMap = new Map(profileSummaries.map((item) => [item.name, item.summary]));

  const slots: RequiredCharacterSlot[] = [];
  const usedNames = new Set<string>();
  const slotCount = Math.max(targetCount, 0);
  const orderedRoleNames = roleFunctionMap
    .map((item) => cleanOptionalText(item.sourceName, ""))
    .filter((name) => looksLikeCharacterName(name))
    .slice(0, slotCount);
  const orderedNameMapNames = nameMap
    .map((item) => cleanOptionalText(item.sourceName, ""))
    .filter((name) => looksLikeCharacterName(name));
  const orderedFallbackNames = [
    ...explicitSeeds.map((item) => item.name),
    ...draftSeeds.map((item) => item.name),
    ...mappedSeeds.map((item) => item.name),
  ].filter((name, index, arr) => arr.indexOf(name) === index);

  const findNameMapEntry = (sourceName: string, index: number) =>
    nameMap.find((item) => cleanOptionalText(item.sourceName, "") === sourceName) ?? nameMap[index];
  const findRoleFunctionEntry = (sourceName: string, index: number) =>
    roleFunctionMap.find((item) => cleanOptionalText(item.sourceName, "") === sourceName) ?? roleFunctionMap[index];

  const pickOrderedSourceName = (index: number) => {
    const preferredRoleName = orderedRoleNames[index];
    if (preferredRoleName && !usedNames.has(preferredRoleName)) return preferredRoleName;

    const preferredMappedName = orderedNameMapNames.find((name) => !usedNames.has(name));
    if (preferredMappedName && orderedRoleNames.length < slotCount) return preferredMappedName;

    const fallbackName = orderedFallbackNames.find((name) => !usedNames.has(name));
    return fallbackName ?? "";
  };

  for (let index = 0; index < targetCount; index++) {
    const template = REQUIRED_CHARACTER_SLOT_TEMPLATES[index] ?? {
      slotId: `supporter_${index + 1}`,
      roleType: index % 2 === 0 ? "次级助推角色" : "次级阻碍角色",
      requiredFunction: "补足冲突网、关系网或信息网，不改变主线功能",
      relationshipToProtagonist: "次级压力或次级协助者",
      defaultRelationshipTags: ["关系压力", "规则见证"],
    };
    const sourceName = cleanOptionalText(pickOrderedSourceName(index), "");
    if (sourceName) {
      usedNames.add(sourceName);
    }
    const roleFunctionEntry = findRoleFunctionEntry(sourceName, index);
    const nameMapEntry = findNameMapEntry(sourceName, index);
    const requiredFunction = cleanOptionalText(roleFunctionEntry?.roleFunction ?? template.requiredFunction, template.requiredFunction);
    // 过滤内部功能短语，优先使用 relationshipFacts
    const relationshipToProtagonist = cleanRelationshipToProtagonist(
      roleFunctionEntry?.relationshipHook ?? template.relationshipToProtagonist ?? ""
    );
    const adaptedName = cleanOptionalText(nameMapEntry?.adaptedName, "");
    const originalProfileSummary = sourceName ? cleanOptionalText(profileSummaryMap.get(sourceName), "") : "";
    const otherSlotNames = sourceName ? Array.from(usedNames).filter((n) => n !== sourceName) : [];
    const sourceAliases = sourceName ? extractCharacterAliases(sourceName, originalProfileSummary, "", otherSlotNames) : [];
    const cleanProfileSummary = sourceName
      ? cleanCharacterProfileSummary(originalProfileSummary || "", {
          sourceName,
          aliases: sourceAliases,
          targetMarket: adaptation?.targetMarket,
          otherSourceNames: Array.from(usedNames).filter((n) => n !== sourceName),
        }) || undefined
      : undefined;
    const traits = sourceName
      ? extractCharacterTraitsFromSummary(originalProfileSummary || "", {
          sourceName,
          aliases: sourceAliases,
        }) || undefined
      : undefined;
    const relationshipFacts = sourceName
      ? extractCharacterRelationshipFactsFromSummary(originalProfileSummary || "", {
          sourceName,
          aliases: sourceAliases,
        }) || undefined
      : undefined;
    const backgroundFacts = sourceName
      ? extractCharacterBackgroundFactsFromSummary(originalProfileSummary || "", {
          sourceName,
          aliases: sourceAliases,
        }) || undefined
      : undefined;

    slots.push({
      slotId: template.slotId,
      roleType: template.roleType,
      sourceName: sourceName || undefined,
      adaptedName: adaptedName || undefined,
      requiredFunction,
      sourceAliases: sourceAliases.length > 0 ? sourceAliases : undefined,
      cleanProfileSummary,
      traits,
      relationshipFacts,
      backgroundFacts,
      defaultRelationshipTags: template.defaultRelationshipTags ?? defaultRelationshipTags({
        slotId: template.slotId,
        roleType: template.roleType,
        requiredFunction,
        gender: inferCharacterGenderHint({
          sourceName,
          adaptedName,
          originalProfileSummary,
          requiredFunction,
          roleType: template.roleType,
        }),
        relationshipHook: relationshipToProtagonist,
      }),
      // 过滤内部功能短语后，优先使用 relationshipFacts 作为具体关系描述
      relationshipToProtagonist: relationshipToProtagonist || relationshipFacts || undefined,
    });
  }

  // 对已建立的 slots 统一做 relationshipFacts 锚定化（sourceName → 男主/女主）
  const { maleLeadSourceName: slMale, femaleLeadSourceName: slFemale } = inferLeadSourceNamesFromRosterOrSlots(
    undefined,
    slots,
  );
  if (slMale || slFemale) {
    for (const slot of slots) {
      if (slot.relationshipFacts) {
        slot.relationshipFacts = normalizeRelationshipFactAnchors(slot.relationshipFacts, slMale, slFemale);
      }
    }
  }

  return slots;
}

export function formatRequiredCharacterSlots(slots: RequiredCharacterSlot[]) {
  if (!slots.length) {
    return "未生成角色槽位";
  }

  return slots
    .map((slot, index) => {
      const shortRole = normalizeShortDramaCharacterRole({
        slotId: slot.slotId,
        roleType: slot.roleType,
        requiredFunction: slot.requiredFunction,
        sourceName: slot.sourceName,
      });
      const parts = [
        `${index + 1}. slotId=${slot.slotId}`,
        `人物位=${shortRole}`,
        `requiredFunction=${sanitizeSlotPromptText(slot.requiredFunction)}`,
      ];
      if (slot.sourceName) parts.push(`sourceName=${slot.sourceName}`);
      if (slot.adaptedName) parts.push(`adaptedName=${slot.adaptedName}`);
      if (slot.sourceAliases?.length) parts.push(`sourceAliases=${slot.sourceAliases.join("、")}`);
      if (slot.cleanProfileSummary) parts.push(`cleanProfileSummary=${slot.cleanProfileSummary}`);
      if (slot.traits) parts.push(`traits=${slot.traits}`);
      if (slot.relationshipFacts) parts.push(`relationshipFacts=${slot.relationshipFacts}`);
      if (slot.backgroundFacts) parts.push(`backgroundFacts=${slot.backgroundFacts}`);
      if (slot.defaultRelationshipTags?.length) parts.push(`defaultRelationshipTags=${slot.defaultRelationshipTags.join("、")}`);
      // relationshipToProtagonist 只有在非内部功能短语时才输出
      if (slot.relationshipToProtagonist && !isInternalFunctionPhrase(slot.relationshipToProtagonist)) {
        parts.push(`relationshipToProtagonist=${slot.relationshipToProtagonist}`);
      }
      return parts.join("｜");
    })
    .join("\n");
}

function summarizeCharacters(characters: Character[]) {
  if (!characters.length) {
    return "暂无角色卡，请先根据已有信息自动补全角色。";
  }

  return characters
    .map(
      (item, index) =>
        `${index + 1}. ${item.name}｜${item.role}｜${item.age}岁｜性格：${clean(item.traits)}｜背景：${clean(item.background)}`,
    )
    .join("\n");
}

function shortenText(value: string, maxLen: number) {
  const text = value.trim();
  if (!text) {
    return "未填写";
  }
  if (text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen)}…`;
}

/**
 * 从前集已生成正文中提取压缩摘要，注入 script prompt 以保持剧情连续性。
 * 仅在 currentEpisode > 1 且存在前集正文时产出摘要。
 * 每集最多截取 250 字，总摘要控制在 2000 字以内。
 * 不修改 draft，仅返回 prompt 文本片段。
 */
function buildPreviousEpisodeScriptsSummary(
  draft: { episodeScripts?: Record<string, { content: string }> },
  currentEpisode: number,
): string {
  if (currentEpisode <= 1 || !draft.episodeScripts) return "";

  const summaries: string[] = [];
  for (let i = 1; i < currentEpisode; i++) {
    const key = String(i);
    const script = draft.episodeScripts[key];
    if (script?.content?.trim()) {
      const snippet = shortenText(script.content.trim(), 250);
      summaries.push(`第${i}集：${snippet}`);
    }
  }

  if (summaries.length === 0) return "";

  let body = summaries.join("\n");
  if (body.length > 2000) {
    body = body.slice(0, 2000) + "…";
  }

  return `【前情正文摘要】\n${body}\n\n`;
}

function summarizeCharactersCompact(characters: Character[], limit = 6, priorityNames?: string[]) {
  let sorted = characters;
  // 如果提供了优先人物名列表，把大纲中出现的人物排到前面
  if (priorityNames?.length) {
    const nameSet = new Set(priorityNames.map((n) => n.trim()));
    const matched: Character[] = [];
    const rest: Character[] = [];
    for (const c of characters) {
      if (nameSet.has(clean(c.name))) {
        matched.push(c);
      } else {
        rest.push(c);
      }
    }
    // 大纲命中人物优先；命中人物内部主角/反派/重要角色前置，再用主角/反派/重要角色补位
    const isKey = (c: Character) => {
      const r = clean(c.role);
      return r.includes("主角") || r.includes("反派") || r.includes("重要");
    };
    const keyMatched = matched.filter(isKey);
    const normalMatched = matched.filter((c) => !isKey(c));
    const keyRest = rest.filter(isKey);
    const normalRest = rest.filter((c) => !isKey(c));
    sorted = [...keyMatched, ...normalMatched, ...keyRest, ...normalRest];
  }
  const items = sorted.slice(0, limit);
  if (!items.length) {
    return "暂无人物小传";
  }

  return items
    .map((item, index) => {
      const age = Number.isFinite(item.age) && item.age > 0 ? `${item.age}岁` : "年龄未填";
      const role = clean(item.role);
      const background = shortenText(item.background, 90);
      return `${index + 1}. ${clean(item.name)}｜${role}｜${age}｜背景：${background}`;
    })
    .join("\n");
}

function summarizeCharactersForOverview(characters: Character[], limit = 8) {
  const items = characters.slice(0, limit);
  if (items.length === 0) {
    return "";
  }

  return items
    .map(
      (item, index) =>
        `${index + 1}. ${clean(item.name)}｜${clean(item.role)}｜${Number.isFinite(item.age) && item.age > 0 ? `${item.age}岁` : "年龄未填"}｜性格：${shortenText(item.traits, 24)}｜背景：${shortenText(item.background, 160)}`,
    )
    .join("\n");
}

function summarizeCharactersForBatch(characters: Character[], limit = 8) {
  const items = characters.slice(0, limit);
  if (items.length === 0) {
    return "";
  }

  return items
    .map((item, index) => {
      const age = Number.isFinite(item.age) && item.age > 0 ? `${item.age}岁` : "年龄未填";
      const role = clean(item.role);
      const traits = shortenText(item.traits, 32);
      const functionText = role.includes("主角")
        ? "低位身份 + 隐藏专业能力 + 被误判后反击"
        : role.includes("反派") || role.includes("对手")
          ? "资源压迫 + 制造误判 + 持续阻碍主角"
          : role.includes("关系") || role.includes("情感")
            ? "掌握部分线索 + 立场暧昧 + 影响信任选择"
            : "关系张力 + 线索张力 + 推动主线";
      return `${index + 1}. ${clean(item.name)}｜${role}｜${age}｜${traits}｜功能：${functionText}`;
    })
    .join("\n");
}

function summarizeCharacterAdaptationMeta(characters: Character[], limit = 8) {
  const items = characters.slice(0, limit).filter((item) => Boolean(item.adaptationMeta));
  if (items.length === 0) {
    return "";
  }

  return items
    .map((item, index) => {
      const meta = item.adaptationMeta;
      if (!meta) return "";

      const parts = [`${index + 1}. ${clean(item.name)}`];
      const sourceName = cleanOptionalText(meta.sourceName, "");
      const slotId = cleanOptionalText(meta.slotId, "");
      if (sourceName) {
        if (slotId) parts.push(`槽位：${slotId}`);
        parts.push(`原文对照：${sourceName}`);
      }
      if (item.gender) parts.push(`性别：${item.gender}`);
      if (item.relationToMaleLead) parts.push(`男主关系：${item.relationToMaleLead}`);
      if (item.relationToFemaleLead) parts.push(`女主关系：${item.relationToFemaleLead}`);
      if (item.relationshipTags?.length) parts.push(`关系标签：${item.relationshipTags.slice(0, 4).join("、")}`);
      if (meta.targetMarket) parts.push(`目标市场：${meta.targetMarket}`);
      if (meta.sourceGenderHint) parts.push(`性别提示：${meta.sourceGenderHint}`);
      if (typeof meta.genderConfidence === "number") parts.push(`性别置信度：${meta.genderConfidence.toFixed(2)}`);
      if (meta.roleFunction) parts.push(`功能：${shortenText(meta.roleFunction, 80)}`);
      if (meta.publicIdentity) parts.push(`表面身份：${shortenText(meta.publicIdentity, 60)}`);
      if (meta.hiddenIdentity) parts.push(`隐藏身份：${shortenText(meta.hiddenIdentity, 60)}`);
      if (meta.factionOrSpecies) parts.push(`阵营/物种：${shortenText(meta.factionOrSpecies, 60)}`);
      if (meta.relationshipHook) parts.push(`关系钩子：${shortenText(meta.relationshipHook, 80)}`);
      if (meta.localizationNote) parts.push(`本土化备注：${shortenText(meta.localizationNote, 80)}`);
      return parts.join("｜");
    })
    .filter(Boolean)
    .join("\n");
}

function getAdaptationMarketRuleText(targetMarket: string) {
  switch (targetMarket) {
    case "中国":
      return "中国短剧正常改编：默认保留原大纲设定、人物功能、世界观和事件推进，只增强短剧表达，不强制海外化命名或替换原设定。";
    case "北美":
      return "北美市场本土化：保留原大纲事件推进，优先从公开高频类型池选择合适外壳，不机械套用狼人或吸血鬼；输出仍以中文为主，仅保留必要专有名词。";
    case "日本":
      return "日本市场本土化：命名倾向日文名，复杂设定优先转成家系、神社、学院、财团或异能等更容易理解的表达。";
    case "韩国":
      return "韩国市场本土化：命名倾向韩文名，强化阶层压迫、家族关系、财阀压力、情绪拉扯与复仇爽点。";
    case "印度":
      return "印度市场本土化：命名倾向印度名，强化家族冲突、婚约、名誉、阶层翻盘和复仇动力。";
    case "东南亚":
      return "东南亚区域本土化：保留一定东方情绪结构，但降低复杂设定门槛，优先用豪门、校园、家族、轻奇幻和身份差承接原剧情。";
    default:
      return "目标市场本土化：优先保留原剧情功能，再根据市场语义调整命名、身份、阵营和关系钩子。";
  }
}

function summarizeAdaptationMapping(
  items: Array<Record<string, unknown>> | undefined,
  limit = 6,
) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .slice(0, limit)
    .map((item, index) => {
      const sourceTerm = cleanOptionalText(
        item.sourceTerm ?? item.sourceRank ?? item.sourceSetting ?? item.sourceName,
        "",
      );
      const adaptedTerm = cleanOptionalText(
        item.adaptedTerm ?? item.adaptedRank ?? item.adaptedSetting ?? item.adaptedName,
        "",
      );
      const reason = cleanOptionalText(item.reason, "");
      const parts = [`${index + 1}. ${sourceTerm || "未命名"}→${adaptedTerm || "未映射"}`];
      if (reason && reason !== "未填写") {
        parts.push(`原因：${shortenText(reason, 80)}`);
      }
      return parts.join("｜");
    })
    .join("\n");
}

function buildAdaptationCharacterContextSection(draft: OriginalDraft) {
  const adaptation = draft.adaptation?.status === "applied" ? draft.adaptation : null;
  if (!adaptation) {
    return null;
  }
  const rosterInfo = resolveCharacterRosterInfo(draft);
  const leadAnchors = resolveCharacterLeadAnchors(draft);

  const lines: string[] = [
    `项目来源：上传大纲改编`,
    `目标市场：${adaptation.targetMarket}`,
    `改编方式：${getAdaptationStrategyLabel(adaptation.preferredGenre)}`,
    `关系锚点：maleLeadId=${leadAnchors.maleLeadId || "未定"}；femaleLeadId=${leadAnchors.femaleLeadId || "未定"}；candidateFemaleLeadIds=${leadAnchors.candidateFemaleLeadIds?.join(",") || "未定"}`,
    "中文大纲正文的人物称呼必须使用中文显示名；地名、组织名、等级名等可保留必要目标市场专有名词。",
    adaptation.targetMarket === "中国"
      ? "中国市场：name 使用改编后的中文角色名，不得直接沿用 sourceName；sourceName 保留原著中文名。"
      : "海外市场：adaptedName 使用目标市场标准英文名；name 使用 adaptedName 的中文音译显示名；sourceName 保留原大纲中文名。targetMarket 只影响身份、阵营、等级、组织、地名和文化表达本土化，不强制 name 直接使用英文。",
    "nameMap 只负责提供本土化命名参考，不负责决定中文 sourceName；如果 nameMap 与人物说明冲突，以人物说明为准重新命名。",
    "roleFunctionMap / 清洗后人物表 / 本土化命名参考共同决定角色补写，但优先以原文人物表为准，不再从长篇梗概、世界观或市场规则里重新猜角色。",
    "关系字段不得直接依赖角色显示名；关系只允许锚定到男主/女主与稳定关系标签。",
    ...(adaptation.sourceMaterialExtraction?.characters?.length
      ? [`sourceMaterialExtraction：${adaptation.sourceMaterialExtraction.characters.length} 人`]
      : [`sourceMaterialExtractionMissing：true`]),
  ];

  if (rosterInfo.entries.length > 0) {
    const requiredSlots = buildRequiredCharacterSlots(draft);
    const slotCount = requiredSlots.length > 0 ? requiredSlots.length : rosterInfo.requiredCharacterCount;
    lines.push(
      `原文识别人物：${rosterInfo.requiredCharacterCount} 人；本轮固定槽位输出：${slotCount} 人。本轮只生成 fixed-slot 中列出的 ${slotCount} 个角色，不补齐原文全部人物。`,
    );
  }

  return createProjectContextSection(
    "上传大纲改编上下文",
    "draft.adaptation",
    lines.join("\n"),
  );
}

function buildAdaptationOutlineContextSection(draft: OriginalDraft, totalEpisodeCount?: number) {
  const adaptation = draft.adaptation?.status === "applied" ? draft.adaptation : null;
  if (!adaptation) {
    return null;
  }
  const isAiComic = draft.overview.scriptType === "ai_comic";

  const extraction = adaptation.extraction;
  const mapping = adaptation.overseasMapping;
  const rawTargetEpisodeCount =
    totalEpisodeCount ??
    draft.overview.projectBrief?.episodeCount ??
    adaptation.targetEpisodeCount ??
    60;
  const targetEpisodeCount =
    typeof rawTargetEpisodeCount === "number" && Number.isFinite(rawTargetEpisodeCount)
      ? Math.max(1, Math.trunc(rawTargetEpisodeCount))
      : 60;

  const lines: string[] = [
    "项目来源：上传大纲改编",
    `目标市场：${adaptation.targetMarket}`,
    `改编方式：${getAdaptationStrategyLabel(adaptation.preferredGenre)}`,
    `市场规则：${getAdaptationMarketRuleText(adaptation.targetMarket)}`,
    "中文大纲正文的人物称呼必须使用中文显示名；地名、组织名、等级名等可保留必要目标市场专有名词。",
    `总集数约束：${targetEpisodeCount}`,
    `终局规则：用户选择多少集，终局就落在多少集；30 集只是内部剧情单元尺寸，不是固定大结局点。`,
    "分集生成原则：优先保留原大纲事件推进，再做表达层本土化，不改故事骨架、不改角色功能。",
  ];

  if (extraction) {
    const roleFunctionMap = extraction.roleFunctionMap
      .slice(0, 8)
      .map((item, index) => {
        const parts = [
          `${index + 1}. ${cleanOptionalText(item.sourceName, "未识别")}`,
          `功能：${cleanOptionalText(item.roleFunction, "未填写")}`,
          `表面身份：${cleanOptionalText(item.publicIdentity, "未填写")}`,
        ];
        if (item.hiddenIdentity) parts.push(`隐藏身份：${shortenText(item.hiddenIdentity, 80)}`);
        if (item.relationshipHook) parts.push(`关系钩子：${shortenText(item.relationshipHook, 80)}`);
        return parts.join("｜");
      })
      .join("\n");

    lines.push(`原大纲角色功能：\n${roleFunctionMap}`);
    lines.push("原大纲故事拆解：");
    lines.push(`- 核心规则：${shortenText(extraction.coreRule, 220)}`);
    lines.push(`- 主角功能：${shortenText(extraction.protagonistFunction, 160)}`);
    lines.push(`- 压迫链：${shortenText(extraction.pressureChain.join(" / "), 220)}`);
    lines.push(`- 误判机制：${shortenText(extraction.misreadMechanism, 180)}`);
    lines.push(`- 爽点节点：${shortenText(extraction.reversalNodes.join(" / "), 180)}`);
  }

  const rosterInfo = resolveCharacterRosterInfo(draft);
  if (rosterInfo.entries.length > 0) {
    const rosterLines = rosterInfo.entries
      .slice(0, 8)
      .map((entry, index) => {
        const parts = [
          `${index + 1}. sourceName=${entry.sourceName}`,
        ];
        if (entry.sourceAliases?.length) parts.push(`sourceAliases=${entry.sourceAliases.join("、")}`);
        if (entry.cleanProfileSummary) parts.push(`cleanProfileSummary=${shortenText(entry.cleanProfileSummary, 120)}`);
        if (entry.traits) parts.push(`traits=${shortenText(entry.traits, 60)}`);
        if (entry.relationshipFacts) parts.push(`relationshipFacts=${shortenText(entry.relationshipFacts, 120)}`);
        if (entry.backgroundFacts) parts.push(`backgroundFacts=${shortenText(entry.backgroundFacts, 120)}`);
        const defaultTags = defaultRelationshipTags({
          slotId: index < REQUIRED_CHARACTER_SLOT_TEMPLATES.length ? REQUIRED_CHARACTER_SLOT_TEMPLATES[index]?.slotId : `supporter_${index + 1}`,
          roleType: index < REQUIRED_CHARACTER_SLOT_TEMPLATES.length ? REQUIRED_CHARACTER_SLOT_TEMPLATES[index]?.roleType : undefined,
          requiredFunction: entry.requiredFunction,
          gender: inferCharacterGenderHint({
            sourceName: entry.sourceName,
            adaptedName: entry.adaptedName,
            originalProfileSummary: entry.cleanProfileSummary,
            requiredFunction: entry.requiredFunction,
            roleType: entry.roleTypeHint ?? "",
          }),
          relationshipHook: entry.relationshipToProtagonist,
        });
        if (defaultTags.length) parts.push(`defaultRelationshipTags=${defaultTags.join("、")}`);
        if (entry.requiredFunction) parts.push(`roleFunction=${shortenText(entry.requiredFunction, 80)}`);
        return parts.join("｜");
      })
      .join("\n");
    lines.push(`原文人物表（结构化清洗）：\n${rosterLines}`);
  }

  if (mapping) {
    lines.push("市场改写建议：");
    const hasNameAuthority = rosterInfo.entries.length > 0 || draft.characters.length > 0;
    if (!hasNameAuthority) {
      lines.push(`- 名字映射：\n${summarizeAdaptationMapping(mapping.nameMap) || "未填写"}`);
    }
    lines.push(`- 势力映射：\n${summarizeAdaptationMapping(mapping.factionMap) || "未填写"}`);
    lines.push(`- 等级映射：\n${summarizeAdaptationMapping(mapping.rankMap) || "未填写"}`);
    lines.push(`- 场景承接：\n${summarizeAdaptationMapping(mapping.settingMap) || "未填写"}`);
    if (mapping.replacementRules?.length) {
      lines.push(
        adaptation.targetMarket === "中国"
          ? `- 可选改写建议：${shortenText(mapping.replacementRules.join(" / "), 220)}`
          : `- 避免直译词建议：${shortenText(mapping.replacementRules.join(" / "), 220)}`,
      );
    }
    if (mapping.forbiddenTerms?.length) {
      lines.push(
        adaptation.targetMarket === "中国"
          ? `- 可选表达参考：${shortenText(mapping.forbiddenTerms.join(" / "), 220)}`
          : `- 避免直译词：${shortenText(mapping.forbiddenTerms.join(" / "), 220)}`,
      );
    }
  }

  const sourceSections = draft.outlines.sourceSections;
  const episodeOutlineText = sourceSections?.episodeOutlineText?.length
    ? shortenText(sourceSections.episodeOutlineText.join("\n"), 5000)
    : "";
  const storySynopsisText = sourceSections?.storySynopsisText?.trim()
    ? shortenText(sourceSections.storySynopsisText, 5000)
    : "";
  const worldSettingText = sourceSections?.worldSettingText?.trim()
    ? shortenText(sourceSections.worldSettingText, 2000)
    : "";
  const storyBackgroundText = sourceSections?.storyBackgroundText?.trim()
    ? shortenText(sourceSections.storyBackgroundText, 2000)
    : "";

  // characterProfileText 不再以 raw 形式送入 prompt；rosterInfo.entries 已在上面输出「原文人物表（结构化清洗）」。
  // 仅当 roster 为空时才清理降级输出清洗版文本，避免原文别名/分身/伪装身份进入大纲上下文。
  const rawCharacterText = sourceSections?.characterProfileText?.trim();
  if (rosterInfo.entries.length === 0 && rawCharacterText) {
    const cleaned = cleanCharacterProfileSummary(shortenText(rawCharacterText, 3000), { sourceName: "", aliases: [] });
    if (cleaned && cleaned !== rawCharacterText) {
      lines.push(`原文人物素材（清洗版）：${cleaned}`);
    }
  }

  if (storySynopsisText) lines.push(`原文事件锚点（仅用于事件顺序与因果，不用于最终人物命名、人物背景直写或台词称呼）：${storySynopsisText}`);
  if (episodeOutlineText) lines.push(`原文分集大纲（仅用于事件推进，角色信息以人物表为准）：${episodeOutlineText}`);
  if (worldSettingText) lines.push(`原文世界观：${worldSettingText}`);
  if (storyBackgroundText) lines.push(`原文故事背景：${storyBackgroundText}`);

  if (draft.characters.length > 0) {
    lines.push(`人物小传摘要：\n${summarizeCharactersForBatch(draft.characters, 8)}`);
    const adaptationMetaText = summarizeCharacterAdaptationMeta(draft.characters, 8);
    if (adaptationMetaText) {
      lines.push(`人物改编摘要：\n${adaptationMetaText}`);
    }
  }

  const brief = draft.overview.projectBrief;
  if (brief) {
    const briefParts = [
      brief.genres?.length ? `题材：${brief.genres.join("、")}` : "",
      brief.coreHooks?.length ? `核心设定：${brief.coreHooks.join("、")}` : "",
      ...(isAiComic && brief.styleTags?.length ? [`风格：${brief.styleTags.join("、")}`] : []),
      brief.coreEmotion ? `核心情绪：${brief.coreEmotion}` : "",
      brief.audienceType ? `受众：${brief.audienceType}` : "",
      typeof brief.episodeCount === "number" ? `总集数：${brief.episodeCount}` : "",
      typeof brief.mainCharactersLimit === "number" ? `主要人物上限：${brief.mainCharactersLimit}` : "",
      typeof brief.sceneLimitPerEpisode === "number" ? `单集场景上限：${brief.sceneLimitPerEpisode}` : "",
    ].filter(Boolean);
    if (briefParts.length > 0) {
      lines.push(`projectBrief：${briefParts.join(" / ")}`);
    }
  }

  const plan = draft.overview.scriptPlan;
  if (plan) {
    const planParts = [
      plan.mainConflict ? `主线冲突：${shortenText(plan.mainConflict, 120)}` : "",
      plan.protagonistGoal ? `主角目标：${shortenText(plan.protagonistGoal, 120)}` : "",
      plan.antagonistPressure ? `反派压力：${shortenText(plan.antagonistPressure, 120)}` : "",
      plan.relationshipEngine ? `关系引擎：${shortenText(plan.relationshipEngine, 120)}` : "",
      plan.openingThreeEpisodesHook ? `前三集钩子：${shortenText(plan.openingThreeEpisodesHook, 120)}` : "",
      plan.paymentPointPlan ? `付费点策略：${shortenText(plan.paymentPointPlan, 120)}` : "",
      plan.productionNotes ? `制作备注：${shortenText(plan.productionNotes, 120)}` : "",
      plan.riskNotes?.length ? `风险备注：${shortenText(plan.riskNotes.join(" / "), 120)}` : "",
    ].filter(Boolean);
    if (planParts.length > 0) {
      lines.push(`scriptPlan：${planParts.join(" / ")}`);
    }
  }

  return createProjectContextSection(
    "上传大纲改编上下文",
    "draft.adaptation / draft.outlines.sourceSections / draft.characters / overview.projectBrief / overview.scriptPlan / outlineConstraints.targetEpisodeCount",
    lines.join("\n"),
  );
}

function resolveScriptEpisodeNumber(draft: OriginalDraft, currentEpisode?: number) {
  if (typeof currentEpisode === "number" && Number.isFinite(currentEpisode) && currentEpisode > 0) {
    return Math.max(1, Math.trunc(currentEpisode));
  }

  const match = draft.script.episode?.match(/(\d+)/);
  if (match) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) {
      return Math.max(1, Math.trunc(value));
    }
  }

  return undefined;
}

function summarizeEpisodePlanForPrompt(epPlan: EpisodePlan | undefined) {
  if (!epPlan) return "";

  const lines: string[] = [];
  if (epPlan.title) lines.push(`标题：${epPlan.title}`);
  if (epPlan.plotTask) lines.push(`剧情功能：${shortenText(epPlan.plotTask, 180)}`);
  if (epPlan.conflict) lines.push(`核心冲突：${shortenText(epPlan.conflict, 180)}`);
  if (epPlan.newInformation) lines.push(`新信息：${shortenText(epPlan.newInformation, 160)}`);
  if (epPlan.emotionalPoint) lines.push(`情绪转折：${shortenText(epPlan.emotionalPoint, 160)}`);
  if (epPlan.hook) lines.push(`结尾钩子：${shortenText(epPlan.hook, 160)}`);
  if (epPlan.characterFocus?.length) lines.push(`人物焦点：${epPlan.characterFocus.join("、")}`);
  if (epPlan.macroStage) lines.push(`宏观阶段：${epPlan.macroStage}`);
  if (epPlan.microBeat) lines.push(`微观节拍：${epPlan.microBeat}`);

  return lines.join("\n");
}

function summarizeBeatCardsForPrompt(beatCards: BeatCard[] | undefined, episodeNumber: number) {
  if (!Array.isArray(beatCards) || beatCards.length === 0) return "";

  const items = beatCards
    .filter((beat) => beat.episodeNumber === episodeNumber)
    .slice(0, 4);

  if (items.length === 0) return "";

  return items
    .map((beat, index) => {
      const parts = [
        `${index + 1}. ${beat.title || beat.cardType}`,
        `功能：${shortenText(beat.function, 80)}`,
        `期待：${shortenText(beat.expectation, 60)}`,
        `打破：${shortenText(beat.break, 60)}`,
        `新问题：${shortenText(beat.newQuestion, 60)}`,
        `情绪：${shortenText(beat.emotion, 40)}`,
      ];
      return parts.join("｜");
    })
    .join("\n");
}

function buildAdaptationScriptContextSection(
  draft: OriginalDraft,
  options?: {
    currentEpisode?: number;
    totalEpisodeCount?: number;
  },
) {
  const adaptation = draft.adaptation?.status === "applied" ? draft.adaptation : null;
  if (!adaptation) {
    return null;
  }
  const isAiComic = draft.overview.scriptType === "ai_comic";

  const sourceSections = draft.outlines.sourceSections;
  const currentEpisode = resolveScriptEpisodeNumber(draft, options?.currentEpisode);
  const totalEpisodeCount = options?.totalEpisodeCount ?? draft.overview.projectBrief?.episodeCount ?? adaptation.targetEpisodeCount ?? 60;
  const currentEpisodeIndex = typeof currentEpisode === "number" ? Math.max(1, currentEpisode) - 1 : -1;
  const currentEpisodePlan = typeof currentEpisode === "number"
    ? draft.outlines.episodesStructured?.find((item) => item.episodeNumber === currentEpisode)
    : undefined;
  const previousEpisodePlan = typeof currentEpisode === "number" && currentEpisode > 1
    ? draft.outlines.episodesStructured?.find((item) => item.episodeNumber === currentEpisode - 1)
    : undefined;
  const nextEpisodePlan = typeof currentEpisode === "number"
    ? draft.outlines.episodesStructured?.find((item) => item.episodeNumber === currentEpisode + 1)
    : undefined;
  const currentEpisodeOutline = currentEpisodeIndex >= 0
    ? draft.outlines.episodes[currentEpisodeIndex]?.trim() || ""
    : "";
  const previousEpisodeOutline = currentEpisodeIndex > 0
    ? draft.outlines.episodes[currentEpisodeIndex - 1]?.trim() || ""
    : "";
  const nextEpisodeOutline = currentEpisodeIndex >= 0
    ? draft.outlines.episodes[currentEpisodeIndex + 1]?.trim() || ""
    : "";
  const currentBeatCards = typeof currentEpisode === "number"
    ? summarizeBeatCardsForPrompt(draft.outlines.beatCards, currentEpisode)
    : "";

  const lines: string[] = [
    "项目来源：上传大纲改编",
    `目标市场：${adaptation.targetMarket}`,
    `改编方式：${getAdaptationStrategyLabel(adaptation.preferredGenre)}`,
    "改编方式只决定是否保留原设、是否做市场化包装、是否强化短剧爽点；不决定最终正文文风。",
    "如后续提供样本文风，只用于正文表达层，如台词密度、镜头感、节奏、旁白比例和句式习惯；不得覆盖原大纲事件推进、人物功能和分集结构。",
    "中文大纲正文的人物称呼必须使用中文显示名；地名、组织名、等级名等可保留必要目标市场专有名词。",
    `总集数约束：${totalEpisodeCount}`,
    `终局规则：用户选择多少集，终局就落在多少集；30 集只是内部剧情单元，不是固定大结局点。`,
    "正文必须承接人物小传与分集大纲，只写当前集，不提前写后续集，不改故事骨架，不改角色功能。",
  ];

  if (sourceSections?.storySynopsisText?.trim()) {
    lines.push(`原文事件锚点（仅用于事件顺序与因果，不用于最终人物命名、人物背景直写或台词称呼）：${shortenText(sourceSections.storySynopsisText, 3000)}`);
  }
  if (sourceSections?.episodeOutlineText?.length) {
    lines.push(`原文分集大纲（仅用于事件推进，角色信息以人物表为准）：${shortenText(sourceSections.episodeOutlineText.join("\n"), 5000)}`);
  }
  // characterProfileText 不再以 raw 形式送入正文 prompt；改用 roster 清洗版人物素材。
  const rosterInfo = resolveCharacterRosterInfo(draft);
  if (rosterInfo.entries.length > 0) {
    const rosterLines = rosterInfo.entries
      .slice(0, 8)
      .map((entry, index) => {
        const parts = [
          `${index + 1}. sourceName=${entry.sourceName}`,
        ];
        if (entry.sourceAliases?.length) parts.push(`sourceAliases=${entry.sourceAliases.join("、")}`);
        if (entry.cleanProfileSummary) parts.push(`cleanProfileSummary=${shortenText(entry.cleanProfileSummary, 120)}`);
        if (entry.traits) parts.push(`traits=${shortenText(entry.traits, 60)}`);
        if (entry.relationshipFacts) parts.push(`relationshipFacts=${shortenText(entry.relationshipFacts, 120)}`);
        if (entry.backgroundFacts) parts.push(`backgroundFacts=${shortenText(entry.backgroundFacts, 120)}`);
        const defaultTags = defaultRelationshipTags({
          slotId: index < REQUIRED_CHARACTER_SLOT_TEMPLATES.length ? REQUIRED_CHARACTER_SLOT_TEMPLATES[index]?.slotId : `supporter_${index + 1}`,
          roleType: index < REQUIRED_CHARACTER_SLOT_TEMPLATES.length ? REQUIRED_CHARACTER_SLOT_TEMPLATES[index]?.roleType : undefined,
          requiredFunction: entry.requiredFunction,
          gender: inferCharacterGenderHint({
            sourceName: entry.sourceName,
            adaptedName: entry.adaptedName,
            originalProfileSummary: entry.cleanProfileSummary,
            requiredFunction: entry.requiredFunction,
            roleType: entry.roleTypeHint ?? "",
          }),
          relationshipHook: entry.relationshipToProtagonist,
        });
        if (defaultTags.length) parts.push(`defaultRelationshipTags=${defaultTags.join("、")}`);
        if (entry.requiredFunction) parts.push(`roleFunction=${shortenText(entry.requiredFunction, 80)}`);
        return parts.join("｜");
      })
      .join("\n");
    lines.push(`结构化人物素材（清洗版）：\n${rosterLines}`);
  } else if (sourceSections?.characterProfileText?.trim()) {
    const cleaned = cleanCharacterProfileSummary(shortenText(sourceSections.characterProfileText, 3000), { sourceName: "", aliases: [] });
    if (cleaned && cleaned !== sourceSections.characterProfileText) {
      lines.push(`原文人物素材（清洗版）：${cleaned}`);
    }
  }

  if (sourceSections?.worldSettingText?.trim()) {
    lines.push(`原文世界观：${shortenText(sourceSections.worldSettingText, 1500)}`);
  }
  if (sourceSections?.storyBackgroundText?.trim()) {
    lines.push(`原文故事背景：${shortenText(sourceSections.storyBackgroundText, 1500)}`);
  }

  if (adaptation.extraction) {
    const extraction = adaptation.extraction;
    lines.push(`改编抽取核心规则：${shortenText(extraction.coreRule, 220)}`);
    lines.push(`改编抽取主角功能：${shortenText(extraction.protagonistFunction, 160)}`);
    lines.push(`改编抽取压迫链：${shortenText(extraction.pressureChain.join(" / "), 220)}`);
    lines.push(`改编抽取误判机制：${shortenText(extraction.misreadMechanism, 180)}`);
    lines.push(`改编抽取爽点节点：${shortenText(extraction.reversalNodes.join(" / "), 180)}`);
    if (extraction.roleFunctionMap?.length) {
      const roleLines = extraction.roleFunctionMap.slice(0, 8).map((item, index) => {
        const parts = [
          `${index + 1}. ${cleanOptionalText(item.sourceName, "未识别")}`,
          `功能：${cleanOptionalText(item.roleFunction, "未填写")}`,
          `表面身份：${cleanOptionalText(item.publicIdentity, "未填写")}`,
        ];
        if (item.hiddenIdentity) parts.push(`隐藏身份：${shortenText(item.hiddenIdentity, 80)}`);
        if (item.relationshipHook) parts.push(`关系钩子：${shortenText(item.relationshipHook, 80)}`);
        return parts.join("｜");
      }).join("\n");
      lines.push(`改编角色映射：\n${roleLines}`);
    }
  }

  if (adaptation.overseasMapping) {
    const mapping = adaptation.overseasMapping;
    lines.push(`市场改写建议（表达层参考）：`);
    lines.push(`- 名字映射：\n${summarizeAdaptationMapping(mapping.nameMap) || "未填写"}`);
    lines.push(`- 势力映射：\n${summarizeAdaptationMapping(mapping.factionMap) || "未填写"}`);
    lines.push(`- 等级映射：\n${summarizeAdaptationMapping(mapping.rankMap) || "未填写"}`);
    lines.push(`- 场景承接：\n${summarizeAdaptationMapping(mapping.settingMap) || "未填写"}`);
    if (mapping.replacementRules?.length) {
      lines.push(`- 补充规则：${shortenText(mapping.replacementRules.join(" / "), 220)}`);
    }
  }

  const brief = draft.overview.projectBrief;
  if (brief) {
    const briefParts = [
      brief.genres?.length ? `题材：${brief.genres.join("、")}` : "",
      brief.coreHooks?.length ? `核心设定：${brief.coreHooks.join("、")}` : "",
      ...(isAiComic && brief.styleTags?.length ? [`风格：${brief.styleTags.join("、")}`] : []),
      brief.coreEmotion ? `核心情绪：${brief.coreEmotion}` : "",
      brief.audienceType ? `受众：${brief.audienceType}` : "",
      typeof brief.episodeCount === "number" ? `总集数：${brief.episodeCount}` : "",
      typeof brief.targetWordsPerEpisode === "number" ? `单集目标字数：${brief.targetWordsPerEpisode}` : "",
      typeof brief.sceneLimitPerEpisode === "number" ? `单集场景上限：${brief.sceneLimitPerEpisode}` : "",
      typeof brief.mainCharactersLimit === "number" ? `主要人物上限：${brief.mainCharactersLimit}` : "",
      brief.episodeDuration ? `单集时长：${brief.episodeDuration}` : "",
      brief.scriptType ? `剧本类型：${brief.scriptType}` : "",
    ].filter(Boolean);
    if (briefParts.length > 0) {
      lines.push(`projectBrief：${briefParts.join(" / ")}`);
    }
  }

  const plan = draft.overview.scriptPlan;
  if (plan) {
    const planParts = [
      plan.targetAudience ? `目标受众：${plan.targetAudience}` : "",
      plan.genrePromise ? `题材承接：${shortenText(plan.genrePromise, 140)}` : "",
      plan.mainConflict ? `主线冲突：${shortenText(plan.mainConflict, 140)}` : "",
      plan.protagonistGoal ? `主角目标：${shortenText(plan.protagonistGoal, 120)}` : "",
      plan.antagonistPressure ? `反派压力：${shortenText(plan.antagonistPressure, 120)}` : "",
      plan.relationshipEngine ? `关系引擎：${shortenText(plan.relationshipEngine, 120)}` : "",
      plan.openingThreeEpisodesHook ? `前三集钩子：${shortenText(plan.openingThreeEpisodesHook, 120)}` : "",
      plan.paymentPointPlan ? `付费点策略：${shortenText(plan.paymentPointPlan, 120)}` : "",
      plan.tone ? `基调：${shortenText(plan.tone, 120)}` : "",
      plan.productionNotes ? `制作备注：${shortenText(plan.productionNotes, 120)}` : "",
    ].filter(Boolean);
    if (planParts.length > 0) {
      lines.push(`scriptPlan：${planParts.join(" / ")}`);
    }
  }

  if (draft.characters.length > 0) {
    lines.push(`人物小传摘要：\n${summarizeCharactersForBatch(draft.characters, 8)}`);
    const adaptationMetaText = summarizeCharacterAdaptationMeta(draft.characters, 8);
    if (adaptationMetaText) {
      lines.push(`人物改编摘要：\n${adaptationMetaText}`);
    }
  }

  if (typeof currentEpisode === "number") {
    lines.push(`当前集：第${currentEpisode}集`);
    if (currentEpisode === totalEpisodeCount) {
      lines.push("当前集为终局集，可以完成收束；若不是终局集，不得写成大结局。");
    } else {
      lines.push(`当前集不是终局集（总集数 ${totalEpisodeCount}），不得提前写大结局。`);
    }
    if (currentEpisodeOutline) {
      lines.push(`当前集文本大纲：${shortenText(currentEpisodeOutline, 1500)}`);
    }
    if (currentEpisodePlan) {
      lines.push(`当前集结构化任务：\n${summarizeEpisodePlanForPrompt(currentEpisodePlan)}`);
    }
    if (previousEpisodePlan) {
      lines.push(`前一集摘要：\n${summarizeEpisodePlanForPrompt(previousEpisodePlan)}`);
    }
    if (nextEpisodePlan) {
      lines.push(`后一集摘要：\n${summarizeEpisodePlanForPrompt(nextEpisodePlan)}`);
    }
    if (currentBeatCards) {
      lines.push(`当前集卡点：\n${currentBeatCards}`);
    }
    if (previousEpisodeOutline) {
      lines.push(`前一集文本：${shortenText(previousEpisodeOutline, 800)}`);
    }
    if (nextEpisodeOutline) {
      lines.push(`后一集文本：${shortenText(nextEpisodeOutline, 800)}`);
    }
  }

  return createProjectContextSection(
    "上传大纲改编正文上下文",
    "draft.adaptation / draft.outlines.sourceSections / draft.characters / draft.outlines.episodesStructured / draft.outlines.beatCards / overview.projectBrief / overview.scriptPlan / currentEpisode / outlineConstraints.targetEpisodeCount",
    lines.join("\n"),
  );
}

function pickFirstText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      const parts: string[] = value
        .map((item) => pickFirstText(item))
        .filter((item): item is string => Boolean(item));
      if (parts.length > 0) {
        return parts.join("、");
      }
    }
  }

  return "";
}

function getBatchOutlineContextLine(
  draft: OriginalDraft,
  options?: {
    batchIndex?: number;
    startEpisode?: number;
    endEpisode?: number;
    roughOutline?: string;
  },
) {
  const startEpisode = options?.startEpisode ?? 1;
  const endEpisode = options?.endEpisode ?? 10;
  const roughOutline = clean(
    options?.roughOutline ||
      draft.outlines.outlineBatches?.find(
        (batch) =>
          batch.batchIndex === options?.batchIndex ||
          (batch.startEpisode === startEpisode && batch.endEpisode === endEpisode),
      )?.roughOutline ||
      "",
  );

  const safeRoughOutline = looksLikePromptLeak(roughOutline)
    ? PROMPT_LEAK_FALLBACK
    : cleanOptionalText(roughOutline, "未填写");

  return `当前批次粗纲：${safeRoughOutline}`;
}

function getCompactOutlineOverviewLines(draft: OriginalDraft) {
  const brief = draft.overview.projectBrief;
  const plan = draft.overview.scriptPlan;
  const totalEpisodeCount = brief?.episodeCount ?? 60;
  const audienceText = resolveContextAudienceLabel(draft);
  const isAiComic = draft.overview.scriptType === "ai_comic";

  const compactLines: string[] = [
    `目标受众：${audienceText}`,
    `题材类型：${draft.overview.genres.length > 0 ? draft.overview.genres.join("、") : "未填写"}`,
    `核心设定：${draft.overview.coreHooks.length > 0 ? draft.overview.coreHooks.join("、") : "未填写"}`,
    ...(isAiComic ? [`风格元素：${draft.overview.styleTags.length > 0 ? draft.overview.styleTags.join("、") : "未填写"}`] : []),
    `总集数：${totalEpisodeCount}`,
    `核心亮点：${shortenText(plan?.commercialHook || draft.overview.highlight, 120)}`,
    `故事背景：${shortenText(plan?.logline || draft.overview.worldview, 120)}`,
    `核心梗概：${shortenText(plan?.mainConflict || draft.overview.premise || draft.overview.userPremise || "", 120)}`,
  ];

  return compactLines.filter((line) => !line.endsWith("：未填写")).join("\n");
}

function isOutlineBatchMode(options?: {
  outlineGenerationMode?: "batch_rough_outlines" | "batch_episodes";
  step?: OriginalStep;
}) {
  return (
    options?.step === "outlines" &&
    (options?.outlineGenerationMode === "batch_rough_outlines" ||
      options?.outlineGenerationMode === "batch_episodes")
  );
}

function buildProjectBriefCompactLines(draft: OriginalDraft) {
  const brief = draft.overview.projectBrief;
  if (!brief) return "";
  const isAiComic = draft.overview.scriptType === "ai_comic";

  const lines: string[] = [];
  const safeStr = (v: unknown): string => (typeof v === "string" && v.trim() ? v.trim() : "");
  const safeArr = (v: unknown): string[] =>
    Array.isArray(v) && v.length > 0 ? v.filter((x): x is string => typeof x === "string") : [];

  const genres = safeArr(brief.genres);
  if (genres.length) lines.push(`题材：${genres.join("、")}`);
  const coreHooks = safeArr(brief.coreHooks);
  if (coreHooks.length) lines.push(`核心卖点：${coreHooks.join("、")}`);
  if (isAiComic) {
    const styleTags = safeArr(brief.styleTags);
    if (styleTags.length) lines.push(`风格：${styleTags.join("、")}`);
  }
  const emotion = safeStr(brief.coreEmotion);
  if (emotion) lines.push(`核心情绪：${emotion}`);
  const audience = safeStr(brief.audienceType);
  if (audience) lines.push(`受众定位：${audience}`);
  const constraint = safeStr(brief.productionConstraint);
  if (constraint) lines.push(`制作约束：${constraint}`);
  const episodeCount = typeof brief.episodeCount === "number" ? brief.episodeCount : 0;
  if (episodeCount > 0) lines.push(`总集数：${episodeCount}`);
  const wordsPerEp = typeof brief.targetWordsPerEpisode === "number" ? brief.targetWordsPerEpisode : 0;
  if (wordsPerEp > 0) lines.push(`每集目标字数：${wordsPerEp}`);
  const scenesPerEp = typeof brief.sceneLimitPerEpisode === "number" ? brief.sceneLimitPerEpisode : 0;
  if (scenesPerEp > 0) lines.push(`每集场景上限：${scenesPerEp}`);
  const charLimit = typeof brief.mainCharactersLimit === "number" ? brief.mainCharactersLimit : 0;
  if (charLimit > 0) lines.push(`主要人物上限：${charLimit}`);

  return lines.join("\n");
}

function buildScriptPlanCompactLines(draft: OriginalDraft) {
  const plan = draft.overview.scriptPlan;
  if (!plan) return "";

  const lines: string[] = [];
  const safeStr = (v: unknown): string => (typeof v === "string" && v.trim() ? v.trim() : "");

  const conflict = safeStr(plan.mainConflict);
  if (conflict) lines.push(`主线冲突：${conflict}`);
  const goal = safeStr(plan.protagonistGoal);
  if (goal) lines.push(`主角目标：${goal}`);
  const pressure = safeStr(plan.antagonistPressure);
  if (pressure) lines.push(`反派压力：${pressure}`);
  const engine = safeStr(plan.relationshipEngine);
  if (engine) lines.push(`关系引擎：${engine}`);
  const hook = safeStr(plan.openingThreeEpisodesHook);
  if (hook) lines.push(`前三集钩子策略：${hook}`);
  const payment = safeStr(plan.paymentPointPlan);
  if (payment) lines.push(`付费点策略：${payment}`);

  return lines.join("\n");
}

function buildStoryMotherCompactLines(draft: OriginalDraft) {
  const lines: string[] = [];
  const push = (label: string, value: string, maxLen: number) => {
    const text = shortenText(value, maxLen);
    if (text && text !== "未填写") {
      lines.push(`- ${label}：${text}`);
    }
  };

  push("核心梗概", draft.overview.premise || draft.overview.userPremise || "", 180);
  push("世界观", draft.overview.worldview || "", 160);
  push("核心亮点", draft.overview.highlight || "", 120);

  const scriptPlan = draft.overview.scriptPlan;
  if (scriptPlan) {
    push("主线冲突", scriptPlan.mainConflict || "", 140);
    push("主角目标", scriptPlan.protagonistGoal || "", 120);
    push("反派压力", scriptPlan.antagonistPressure || "", 120);
  }

  return lines.join("\n");
}

function buildResolvedStoryBibleSection(draft: OriginalDraft) {
  return createProjectContextSection(
    "ResolvedStoryBible",
    "runtime resolver / buildResolvedStoryBible(draft)",
    formatResolvedStoryBibleForPrompt(buildResolvedStoryBible(draft)),
  );
}

function buildStoryTitleLine(draft: OriginalDraft) {
  return `剧名：${resolveDisplayStoryTitle(draft)}`;
}

function buildOutlineBatchProjectContextSections(
  draft: OriginalDraft,
  options?: {
    step?: OriginalStep;
    outlineGenerationMode?: "batch_rough_outlines" | "batch_episodes";
    batchPlan?: OutlineBatch[];
    batchIndex?: number;
    startEpisode?: number;
    endEpisode?: number;
    roughOutline?: string;
    totalEpisodeCount?: number;
  },
) {
  const isAiComic = draft.overview.scriptType === "ai_comic";
  const sections: ProjectContextSection[] = [];
  const append = (section: ProjectContextSection | null) => {
    if (section) sections.push(section);
  };

  append(
    createProjectContextSection(
      "基础项目信息",
      "draft.title / overview.audience / overview.scriptType",
      [
        buildStoryTitleLine(draft),
        `目标受众：${resolveContextAudienceLabel(draft)}`,
        `剧本类型：${draft.overview.scriptType === "ai_comic" ? "AI漫剧" : "真人短剧"}`,
      ].join("\n"),
    ),
  );

  append(buildResolvedStoryBibleSection(draft));

  append(
    createProjectContextSection(
      "projectBrief 硬约束",
      "overview.projectBrief.*",
      buildProjectBriefCompactLines(draft),
    ),
  );

  append(
    createProjectContextSection(
      "scriptPlan 核心短版",
      "overview.scriptPlan.*",
      buildScriptPlanCompactLines(draft),
    ),
  );

  append(
    createProjectContextSection(
      "故事母本短版",
      "overview.premise / overview.worldview / overview.highlight / overview.scriptPlan",
      buildStoryMotherCompactLines(draft),
    ),
  );

  append(
    createProjectContextSection(
      "人物轻量摘要",
      "characters[].name / characters[].role / characters[].age / characters[].traits",
      summarizeCharactersForBatch(draft.characters, 8),
    ),
  );

  append(buildAdaptationOutlineContextSection(draft, options?.totalEpisodeCount));

  const totalEpisodeCount = options?.totalEpisodeCount ?? draft.overview.projectBrief?.episodeCount ?? 60;
  if (options?.outlineGenerationMode === "batch_episodes") {
    append(
      createProjectContextSection(
        "当前批次 roughOutline",
        "outlineGenerationMode / batchIndex / startEpisode / endEpisode / totalEpisodeCount / roughOutline",
        [
          `总集数：${totalEpisodeCount}`,
          `当前批次：第${options?.startEpisode ?? 1}-${options?.endEpisode ?? 10}集`,
          `批次编号：${options?.batchIndex ?? 1}`,
          `当前批次粗纲：${cleanOptionalText(options?.roughOutline, "未填写")}`,
        ].join("\n"),
      ),
    );
  } else {
    append(
      createProjectContextSection(
        "总集数 / 批次范围",
        "outlineGenerationMode / batchIndex / startEpisode / endEpisode / totalEpisodeCount",
        [
          `总集数：${totalEpisodeCount}`,
          `批次数量：${options?.batchPlan?.length ?? 0}`,
          `生成目标：先产出所有批次粗纲，再进入逐批分集生成。`,
        ].join("\n"),
      ),
    );

    if (options?.outlineGenerationMode === "batch_rough_outlines" && options?.batchPlan?.length) {
      append(
        createProjectContextSection(
          "batchPlan",
          "batchPlan[].batchIndex / startEpisode / endEpisode",
          options.batchPlan
            .map((batch) => `- 第${batch.batchIndex}批：第${batch.startEpisode}-${batch.endEpisode}集`)
            .join("\n"),
        ),
      );
    }
  }

  return sections;
}

function buildOutlineBatchProjectContext(
  draft: OriginalDraft,
  options?: {
    step?: OriginalStep;
    outlineGenerationMode?: "batch_rough_outlines" | "batch_episodes";
    batchPlan?: OutlineBatch[];
    batchIndex?: number;
    startEpisode?: number;
    endEpisode?: number;
    roughOutline?: string;
    totalEpisodeCount?: number;
  },
) {
  return buildOutlineBatchProjectContextSections(draft, options)
    .map((section) => section.content)
    .join("\n\n");
}

export type ProjectContextSection = {
  title: string;
  source: string;
  chars: number;
  content: string;
};

function createProjectContextSection(
  title: string,
  source: string,
  content: string,
): ProjectContextSection | null {
  const trimmed = content.trim();
  if (!trimmed) return null;
  return {
    title,
    source,
    chars: trimmed.length,
    content: trimmed,
  };
}

function buildCharactersProjectContext(
  draft: OriginalDraft,
) {
  return buildCharactersProjectContextSections(draft)
    .map((section) => section.content)
    .join("\n\n");
}

function buildProjectContextSections(
  draft: OriginalDraft,
  options?: {
    factSheet?: OutlineFactSheet;
    structuredSummary?: StructuredSummary;
    factSheetStale?: boolean;
    structuredSummaryStale?: boolean;
    revealBeats?: RevealBeat[];
    currentEpisode?: number;
    step?: OriginalStep;
    outlineGenerationMode?: "batch_rough_outlines" | "batch_episodes";
    batchPlan?: OutlineBatch[];
    batchIndex?: number;
    startEpisode?: number;
    endEpisode?: number;
    roughOutline?: string;
    totalEpisodeCount?: number;
  },
) {
  const step = options?.step as OriginalStep | undefined;
  if (isOutlineBatchMode(options)) {
    return buildOutlineBatchProjectContextSections(draft, options);
  }
  if (step === "characters") {
    return buildCharactersProjectContextSections(draft, options);
  }

  const isAiComic = draft.overview.scriptType === "ai_comic";
  const sections: ProjectContextSection[] = [];
  const append = (section: ProjectContextSection | null) => {
    if (section) sections.push(section);
  };

  // ── script step 白名单 Inspector：只展示真实 prompt 中的内容 ──
  if (step === "script") {
    append(
      createProjectContextSection(
        "script 白名单（仅真实 prompt 内容）",
        "draft.title / outlines.range / 当前集大纲 / 前后集大纲 / projectBrief 数字约束 / 人物摘要 / 阶段任务 / 结构化任务 / 改编声明",
        [
          buildStoryTitleLine(draft),
          `分集范围：${clean(draft.outlines.range)}`,
          `集纲：已在当前集上下文中提供，此处省略。`,
          typeof options?.currentEpisode === "number"
            ? `当前正文集数：第${options.currentEpisode}集\n当前正文内容：未生成（以当前集纯文本大纲为唯一执行目标）`
            : `当前正文集数：${clean(draft.script.episode)}\n当前正文内容：未生成`,
          "",
          "--- 以下为 script step 专属注入 ---",
          typeof options?.currentEpisode === "number" && draft.outlines.episodes[options.currentEpisode - 1]
            ? `当前集纯文本大纲（唯一剧情执行依据）：第${options.currentEpisode}集：${draft.outlines.episodes[options.currentEpisode - 1]}`
            : "",
          typeof options?.currentEpisode === "number" && options.currentEpisode > 1 && draft.outlines.episodes[options.currentEpisode - 2]?.trim()
            ? `前一集大纲：第${options.currentEpisode - 1}集：${shortenText(draft.outlines.episodes[options.currentEpisode - 2], 400)}`
            : "",
          typeof options?.currentEpisode === "number" && options.currentEpisode < draft.outlines.episodes.length && draft.outlines.episodes[options.currentEpisode]?.trim()
            ? `后一集大纲：第${options.currentEpisode + 1}集：${shortenText(draft.outlines.episodes[options.currentEpisode], 400)}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    );

    // script step: projectBrief 仅展示数字约束
    const brief = draft.overview.projectBrief;
    if (brief) {
      const numLines: string[] = [];
      if (typeof brief.targetWordsPerEpisode === "number" && brief.targetWordsPerEpisode > 0) numLines.push(`单集目标字数：${brief.targetWordsPerEpisode}`);
      if (typeof brief.sceneLimitPerEpisode === "number" && brief.sceneLimitPerEpisode > 0) numLines.push(`单集场景上限：${brief.sceneLimitPerEpisode}`);
      if (typeof brief.mainCharactersLimit === "number" && brief.mainCharactersLimit > 0) numLines.push(`主要人物上限：${brief.mainCharactersLimit}`);
      if (typeof brief.episodeCount === "number" && brief.episodeCount > 0) numLines.push(`总集数：${brief.episodeCount}`);
      if (brief.scriptType) numLines.push(`剧本类型：${brief.scriptType === "ai_comic" ? "AI漫剧" : "真人短剧"}`);
      if (brief.episodeDuration) numLines.push(`单集时长：${brief.episodeDuration}`);
      if (numLines.length > 0) {
        append(createProjectContextSection("projectBrief 硬约束（仅数字）", "overview.projectBrief 数字字段", numLines.join("\n")));
      }
    }

    // 人物摘要
    if (draft.characters.length > 0) {
      const charSummary = summarizeCharactersCompact(draft.characters, 6);
      if (charSummary) {
        append(createProjectContextSection("人物小传摘要", "draft.characters (compact)", charSummary));
      }
    }

    // 改编策略声明
    const adaptation = draft.adaptation?.status === "applied" ? draft.adaptation : null;
    if (adaptation) {
      append(createProjectContextSection(
        "改编策略声明",
        "draft.adaptation",
        [
          `项目来源：上传大纲改编`,
          `目标市场：${adaptation.targetMarket}`,
          `改编方式：${getAdaptationStrategyLabel(adaptation.preferredGenre)}`,
          "正文只做表达层本土化，不改故事骨架和角色功能。",
        ].join("\n"),
      ));
    }

    return sections;
  }

  // ── 非 script step：保持原有全量展示 ──

  append(
    createProjectContextSection(
      "基础项目信息",
      "draft.title / overview.audience / overview.genres / overview.coreHooks / overview.styleTags / outlines.range",
      [
        buildStoryTitleLine(draft),
        `目标受众：${resolveContextAudienceLabel(draft)}`,
        `题材类型：${draft.overview.genres.length > 0 ? draft.overview.genres.join("、") : "未填写"}`,
        `核心设定：${draft.overview.coreHooks.length > 0 ? draft.overview.coreHooks.join("、") : "未填写"}`,
        ...(isAiComic ? [`风格元素：${draft.overview.styleTags.length > 0 ? draft.overview.styleTags.join("、") : "未填写"}`] : []),
        `分集范围：${clean(draft.outlines.range)}`,
      ].join("\n"),
    ),
  );

  append(
    createProjectContextSection(
      "五步标签 / 题材风格",
      "overview.audience / overview.genres / overview.coreHooks / overview.styleTags",
      [
        `目标受众：${resolveContextAudienceLabel(draft)}`,
        `题材类型：${draft.overview.genres.length > 0 ? draft.overview.genres.join("、") : "未填写"}`,
        `核心设定：${draft.overview.coreHooks.length > 0 ? draft.overview.coreHooks.join("、") : "未填写"}`,
        ...(isAiComic ? [`风格元素：${draft.overview.styleTags.length > 0 ? draft.overview.styleTags.join("、") : "未填写"}`] : []),
      ].join("\n"),
    ),
  );

  const isAdaptation = draft.adaptation?.status === "applied";
  append(
    createProjectContextSection(
      "故事母本 / 核心梗概 / 世界观 / 核心亮点",
      "overview.userPremise / overview.premise / overview.worldview / overview.highlight / scriptPlan",
      [
        isAdaptation
          ? `原文事件锚点（仅用于事件顺序与因果，不用于最终人物命名、人物背景直写或台词称呼）：${clean(draft.overview.userPremise || draft.overview.premise)}`
          : `用户原文灵感（最高优先级）：${clean(draft.overview.userPremise || draft.overview.premise)}`,
        `世界观：${clean(draft.overview.worldview)}`,
        `核心亮点：${clean(draft.overview.highlight)}`,
        `核心梗概：${clean(draft.overview.premise)}`,
      ].join("\n"),
    ),
  );

  const brief = draft.overview.projectBrief;
  if (brief) {
    const briefLines: string[] = [];
    const safeStr = (v: unknown): string => (typeof v === "string" && v.trim() ? v.trim() : "");
    const safeArr = (v: unknown): string[] =>
      Array.isArray(v) && v.length > 0 ? v.filter((x): x is string => typeof x === "string") : [];

    const genres = safeArr(brief.genres);
    if (genres.length) briefLines.push(`题材：${genres.join("、")}`);
    const coreHooks = safeArr(brief.coreHooks);
    if (coreHooks.length) briefLines.push(`核心卖点：${coreHooks.join("、")}`);
    if (isAiComic) {
      const styleTags = safeArr(brief.styleTags);
      if (styleTags.length) briefLines.push(`风格：${styleTags.join("、")}`);
    }
    const emotion = safeStr(brief.coreEmotion);
    if (emotion) briefLines.push(`核心情绪：${emotion}`);
    const audience = safeStr(brief.audienceType);
    if (audience) briefLines.push(`受众定位：${audience}`);
    const constraint = safeStr(brief.productionConstraint);
    if (constraint) briefLines.push(`制作约束：${constraint}`);
    const episodeCount = typeof brief.episodeCount === "number" ? brief.episodeCount : 0;
    if (episodeCount > 0) briefLines.push(`总集数：${episodeCount}`);
    const wordsPerEp = typeof brief.targetWordsPerEpisode === "number" ? brief.targetWordsPerEpisode : 0;
    if (wordsPerEp > 0) briefLines.push(`每集目标字数：${wordsPerEp}`);
    const scenesPerEp = typeof brief.sceneLimitPerEpisode === "number" ? brief.sceneLimitPerEpisode : 0;
    if (scenesPerEp > 0) briefLines.push(`每集场景上限：${scenesPerEp}`);
    const charLimit = typeof brief.mainCharactersLimit === "number" ? brief.mainCharactersLimit : 0;
    if (charLimit > 0) briefLines.push(`主要人物上限：${charLimit}`);

    append(createProjectContextSection("projectBrief 硬约束", "overview.projectBrief.*", briefLines.join("\n")));
  }

  const plan = draft.overview.scriptPlan;
  if (plan) {
    const planLines: string[] = [];
    const safeStr = (v: unknown): string => (typeof v === "string" && v.trim() ? v.trim() : "");

    const logline = safeStr(plan.logline);
    if (logline) planLines.push(`故事方向：${logline}`);
    const conflict = safeStr(plan.mainConflict);
    if (conflict) planLines.push(`主线冲突：${conflict}`);
    const goal = safeStr(plan.protagonistGoal);
    if (goal) planLines.push(`主角目标：${goal}`);
    const pressure = safeStr(plan.antagonistPressure);
    if (pressure) planLines.push(`反派压力：${pressure}`);
    const engine = safeStr(plan.relationshipEngine);
    if (engine) planLines.push(`关系引擎：${engine}`);
    const hook = safeStr(plan.openingThreeEpisodesHook);
    if (hook) planLines.push(`前三集钩子策略：${hook}`);
    const payment = safeStr(plan.paymentPointPlan);
    if (payment) planLines.push(`付费点策略：${payment}`);
    const tone = safeStr(plan.tone);
    if (tone) planLines.push(`基调：${tone}`);
    const notes = safeStr(plan.productionNotes);
    if (notes) planLines.push(`制作备注：${notes}`);

    append(createProjectContextSection("scriptPlan 创作锚点", "overview.scriptPlan.*", planLines.join("\n")));
  }

  if (step === "outlines") {
    append(buildAdaptationOutlineContextSection(draft, options?.totalEpisodeCount));
  }

  if (step === "outlines" && (options?.outlineGenerationMode === "batch_rough_outlines" || options?.outlineGenerationMode === "batch_episodes")) {
    const batchRangeContent =
      options?.outlineGenerationMode === "batch_episodes"
        ? getBatchOutlineContextLine(draft, {
            batchIndex: options?.batchIndex,
            startEpisode: options?.startEpisode,
            endEpisode: options?.endEpisode,
            roughOutline: options?.roughOutline,
          })
        : [
            `总集数：${draft.overview.projectBrief?.episodeCount ?? 60}`,
            `当前粗纲：${renderRuntimeText(draft.outlines.macro, "未生成", 180)}`,
            `当前批次粗纲：${draft.outlines.outlineBatches?.length ? "已有批次粗纲" : "未生成"}`,
          ].join("\n");

    append(
      createProjectContextSection(
        "batch 范围",
        "outlineGenerationMode / batchIndex / startEpisode / endEpisode / totalEpisodeCount",
        [
          `当前批次：第${options?.startEpisode ?? 1}-${options?.endEpisode ?? 10}集`,
          `批次编号：${options?.batchIndex ?? 1}`,
          `总集数：${draft.overview.projectBrief?.episodeCount ?? 60}`,
        ].join("\n"),
      ),
    );
    append(
      createProjectContextSection(
        "当前批次 roughOutline",
        "draft.outlines.outlineBatches / roughOutline / batchIndex / startEpisode / endEpisode",
        batchRangeContent,
      ),
    );
  }

  return sections;
}

function buildCharactersProjectContextSections(
  draft: OriginalDraft,
  options?: {
    factSheet?: OutlineFactSheet;
    structuredSummary?: StructuredSummary;
    factSheetStale?: boolean;
    structuredSummaryStale?: boolean;
    revealBeats?: RevealBeat[];
    currentEpisode?: number;
    step?: OriginalStep;
    outlineGenerationMode?: "batch_rough_outlines" | "batch_episodes";
    batchPlan?: OutlineBatch[];
    batchIndex?: number;
    startEpisode?: number;
    endEpisode?: number;
    roughOutline?: string;
  },
) {
  const sections: ProjectContextSection[] = [];
  const append = (section: ProjectContextSection | null) => {
    if (section) sections.push(section);
  };
  const rosterInfo = resolveCharacterRosterInfo(draft);

  append(
    createProjectContextSection(
      "基础项目信息",
      "draft.title / overview.audience / overview.scriptType / projectBrief",
      [
        buildStoryTitleLine(draft),
        `目标受众：${resolveContextAudienceLabel(draft)}`,
        `剧本类型：${draft.overview.scriptType === "ai_comic" ? "AI漫剧" : "真人短剧"}`,
        draft.adaptation?.status === "applied"
          ? ""
          : `人物数量目标：${getTargetCharacterCount(draft)} 个`,
        `总集数：${draft.overview.projectBrief?.episodeCount ?? draft.adaptation?.targetEpisodeCount ?? 60}`,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  );

  const directionText = [
    draft.overview.scriptPlan?.logline,
    draft.overview.scriptPlan?.mainConflict,
    draft.overview.premise,
    draft.overview.userPremise,
  ]
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .find(Boolean);
  if (directionText) {
    append(
      createProjectContextSection(
        "故事方向摘要",
        "scriptPlan.logline / scriptPlan.mainConflict / overview.premise",
        shortenText(directionText, 400),
      ),
    );
  }

  append(buildAdaptationCharacterContextSection(draft));
  const hardConstraintLines = [
    `剧本类型：${draft.overview.scriptType === "ai_comic" ? "AI漫剧" : "真人短剧"}`,
    `受众：${resolveContextAudienceLabel(draft)}`,
    draft.adaptation?.status === "applied"
      ? ""
      : `人物数量：${getTargetCharacterCount(draft)}`,
    `总集数：${draft.overview.projectBrief?.episodeCount ?? draft.adaptation?.targetEpisodeCount ?? 60}`,
    draft.adaptation?.status === "applied" ? `目标市场：${draft.adaptation.targetMarket}` : "",
  ].filter(Boolean);
  append(createProjectContextSection("人物生成硬约束", "projectBrief / adaptation", hardConstraintLines.join("\n")));

  return sections;
}

export function buildProjectContextDebug(
  draft: OriginalDraft,
  options?: {
    factSheet?: OutlineFactSheet;
    structuredSummary?: StructuredSummary;
    factSheetStale?: boolean;
    structuredSummaryStale?: boolean;
    revealBeats?: RevealBeat[];
    currentEpisode?: number;
    step?: OriginalStep;
    outlineGenerationMode?: "batch_rough_outlines" | "batch_episodes";
    batchPlan?: OutlineBatch[];
    batchIndex?: number;
    startEpisode?: number;
    endEpisode?: number;
    roughOutline?: string;
    totalEpisodeCount?: number;
  },
) {
  if (isOutlineBatchMode(options)) {
    return {
      context: buildOutlineBatchProjectContext(draft, options),
      sections: buildOutlineBatchProjectContextSections(draft, options),
    };
  }

  const context =
    String(options?.step ?? "") === "characters"
      ? buildCharactersProjectContext(draft)
      : buildProjectContext(draft, options);
  const sections = buildProjectContextSections(draft, options);
  return { context, sections };
}

export function buildProjectContext(
  draft: OriginalDraft,
  options?: {
    factSheet?: OutlineFactSheet;
    structuredSummary?: StructuredSummary;
    factSheetStale?: boolean;
    structuredSummaryStale?: boolean;
    revealBeats?: RevealBeat[];
    currentEpisode?: number;
    step?: OriginalStep;
    outlineGenerationMode?: "batch_rough_outlines" | "batch_episodes";
    batchPlan?: OutlineBatch[];
    batchIndex?: number;
    startEpisode?: number;
    endEpisode?: number;
    roughOutline?: string;
    totalEpisodeCount?: number;
  },
) {
  const step = String(options?.step ?? "");
  if (isOutlineBatchMode(options)) {
    return buildOutlineBatchProjectContext(draft, options);
  }

  if (step === "characters") {
    return buildCharactersProjectContext(draft);
  }

  const outlineBatchMode =
    step === "outlines" &&
    (options?.outlineGenerationMode === "batch_rough_outlines" ||
      options?.outlineGenerationMode === "batch_episodes");

  const isAdaptation = draft.adaptation?.status === "applied";
  const isAiComic = draft.overview.scriptType === "ai_comic";
  const userPremiseLabel = isAdaptation
    ? "原文事件锚点（仅用于事件顺序与因果，不用于最终人物命名、人物背景直写或台词称呼）"
    : "用户原文灵感（最高优先级）";

  const baseLines = outlineBatchMode
    ? [
        buildStoryTitleLine(draft),
        `目标受众：${resolveContextAudienceLabel(draft)}`,
        `题材类型：${draft.overview.genres.length > 0 ? draft.overview.genres.join("、") : "未填写"}`,
        `核心设定：${draft.overview.coreHooks.length > 0 ? draft.overview.coreHooks.join("、") : "未填写"}`,
        ...(isAiComic ? [`风格元素：${draft.overview.styleTags.length > 0 ? draft.overview.styleTags.join("、") : "未填写"}`] : []),
        `${userPremiseLabel}：${shortenText(draft.overview.userPremise || draft.overview.premise, 180)}`,
        `世界观：${shortenText(draft.overview.worldview, 160)}`,
        `核心亮点：${shortenText(draft.overview.highlight, 160)}`,
        `核心梗概：${shortenText(draft.overview.premise, 180)}`,
        `人物卡：\n${summarizeCharactersCompact(draft.characters, 6)}`,
        `分集范围：${clean(draft.outlines.range)}`,
        options?.outlineGenerationMode === "batch_rough_outlines"
          ? `【批次粗纲生成模式】\n总集数：${draft.overview.projectBrief?.episodeCount ?? 60}\n生成目标：先产出所有 10 集批次粗纲，再逐批生成分集。\n当前粗纲：${renderRuntimeText(draft.outlines.macro, "未生成", 180)}\n当前批次粗纲：${draft.outlines.outlineBatches?.length ? "已有批次粗纲" : "未生成"}`
          : options?.outlineGenerationMode === "batch_episodes"
            ? "当前批次分集生成模式：只生成当前批次分集，不要改动其他批次。"
            : `粗纲：${renderRuntimeText(draft.outlines.macro, "未填写", 180)}`,
        options?.outlineGenerationMode === "batch_rough_outlines"
          ? "集纲：当前模式不直接生成逐集集纲"
          : options?.outlineGenerationMode === "batch_episodes"
            ? "集纲：当前批次粗纲已在上下文中提供，只围绕当前批次补齐分集。"
            : "集纲：当前模式只围绕当前批次粗纲补齐当前批次分集",
      ]
      // ── script step 白名单：不注入故事梗概/核心梗概/题材/世界观/亮点/原文锚点 ──
      : step === "script"
        ? (() => {
            const currentEp = options?.currentEpisode ?? 1;
            const prevSummary = buildPreviousEpisodeScriptsSummary(draft, currentEp);
            const currentInfo = prevSummary
              ? `${prevSummary}当前正文生成目标：第${currentEp}集。必须以当前集大纲为执行目标，并承接前情正文摘要，不得重写前集正文。`
              : `当前正文生成目标：第${currentEp}集。必须以当前集大纲为唯一执行目标。`;
            return [
              buildStoryTitleLine(draft),
              `分集范围：${clean(draft.outlines.range)}`,
              "集纲：已在当前集上下文中提供，此处省略。",
              currentInfo,
              `【前情事实守恒】
前情正文摘要只代表前面已经明确发生的事实。你必须承接这些事实，但不得增生事实。

禁止：
1. 不得把前集的钩子、怀疑、伏笔，改写成已经发生的动作或证据。
2. 不得新增前文没有明确出现的物件状态、损毁痕迹、证据碎片、录音、照片、文件副本。
3. 不得擅自改变角色身份、职位、关系、阵营。
4. 不得把"看见 / 怀疑 / 听到 / 发现线索"升级成"掌握实证 / 截获原件 / 撕下证据 / 已经报警"。
5. 如果本集需要出现新证据，必须通过本集当前场景动作现场产生，不能伪装成前集已经发生。

写作时必须区分：
- 已发生事实：只能来自前情正文摘要或当前集大纲明确写出的内容。
- 本集新发展：必须在当前集场景中通过动作、对话或事件触发。`,
              `【本项目续写硬禁例】
以下是本项目已发现的错误倾向，必须强制避免：

1. 如果前文只写"赵强看到信封上的绝密字样 / 抢信未成功 / 李默夺回信件"，后文不得写成：
   - 赵强撕下信封边角
   - 赵强扯下信封边角
   - 赵强截获半张信封
   - 赵强掌握信件实物
   - 赵强已经拿到信件内容
   除非这些动作在当前集场景中重新、明确、现场发生。

2. 赵强的身份必须保持为"车间组长 / 技术骨干 / 情敌压力源 / 反派压力源"之一。
   不得改写为：
   - 厂办干事
   - 厂办副主任
   - 厂领导
   - 厂部负责人
   - 有正式厂办处分权限的人

3. 王芳可以是厂办会计，但不能因此把赵强也自动改成厂办系统人员。

4. 赵强可以施压、威胁、造谣、找厂办举报，但不能天然拥有厂办核查、开除、处分权限。
   如果需要处分压力，必须写成"赵强威胁要去厂办举报 / 找领导施压"，不能写成"赵强直接代表厂办处理"。

5. 所有角色身份以人物小传、前情正文摘要和当前集大纲中明确写出的身份为准。
   续写不得为了制造冲突临时升级角色职务。`,
            ];
          })()
        : [
          buildStoryTitleLine(draft),
          `目标受众：${resolveContextAudienceLabel(draft)}`,
          `题材类型：${draft.overview.genres.length > 0 ? draft.overview.genres.join("、") : "未填写"}`,
          `核心设定：${draft.overview.coreHooks.length > 0 ? draft.overview.coreHooks.join("、") : "未填写"}`,
          ...(isAiComic ? [`风格元素：${draft.overview.styleTags.length > 0 ? draft.overview.styleTags.join("、") : "未填写"}`] : []),
          `${userPremiseLabel}：${clean(draft.overview.userPremise || draft.overview.premise)}`,
          `世界观：${clean(draft.overview.worldview)}`,
          `核心亮点：${clean(draft.overview.highlight)}`,
          `核心梗概：${clean(draft.overview.premise)}`,
          `人物卡：\n${summarizeCharacters(draft.characters)}`,
          `分集范围：${clean(draft.outlines.range)}`,
          step === "characters"
            ? "粗纲：当前人物小传只参考故事母本，不读取旧粗纲或旧分集。"
            : step === "outlines" && options?.outlineGenerationMode === "batch_rough_outlines"
              ? `【批次粗纲生成模式】\n总集数：${draft.overview.projectBrief?.episodeCount ?? 60}\n生成目标：先产出所有 10 集批次粗纲，再逐批生成分集。\n当前粗纲：${renderRuntimeText(draft.outlines.macro, "未生成", 180)}\n当前批次粗纲：${draft.outlines.outlineBatches?.length ? "已有批次粗纲" : "未生成"}`
              : step === "outlines" && options?.outlineGenerationMode === "batch_episodes"
                ? "当前批次分集生成模式：只生成当前批次分集，不要改动其他批次。"
                : `粗纲：${renderRuntimeText(draft.outlines.macro, "未填写", 180)}`,
          step === "characters"
            ? "集纲：当前人物小传只参考故事母本，不读取旧集纲。"
            : step === "outlines" && (options?.outlineGenerationMode === "batch_rough_outlines" || options?.outlineGenerationMode === "batch_episodes")
              ? step === "outlines" && options?.outlineGenerationMode === "batch_episodes"
                ? "集纲：当前批次粗纲已在上下文中提供，只围绕当前批次补齐分集。"
                : "集纲：当前模式不直接生成逐集集纲"
              : `集纲：${draft.outlines.episodes.length > 0 ? renderRuntimeText(draft.outlines.episodes.join("\n"), "未填写", 260) : "未填写"}`,
          `当前正文集数：${clean(draft.script.episode)}\n当前正文内容：${renderRuntimeText(draft.script.content, "未填写", 260)}`,
        ];

  // script step 不注入完整 adaptation context（原文锚点全文/改编角色映射/市场改写建议等），
  // 只保留当前集大纲 + projectBrief 硬约束，见下方 script step 专属注入。

  if (step === "outlines") {
    const adaptationOutlineSection = buildAdaptationOutlineContextSection(draft, options?.totalEpisodeCount);
    if (adaptationOutlineSection) {
      baseLines.push(adaptationOutlineSection.content);
    }
  }

  if (step === "overview") {
    const brief = draft.overview.projectBrief;
    const plan = draft.overview.scriptPlan;
    const overviewBriefLines: string[] = [];
    const overviewCharacterLines = summarizeCharactersForOverview(draft.characters, 8);

    const pushLine = (label: string, value: unknown) => {
      const text = pickFirstText(value);
      if (text) {
        overviewBriefLines.push(`- ${label}：${text}`);
      }
    };

    if (overviewCharacterLines) {
      baseLines.push(
        `【已有人物小传】\n以下人物是当前项目已经生成的人物化设定。重新生成故事梗概时，必须优先吸收这些人物名、身份关系、主角目标和反派压力，把抽象设定重写成统一的人物化主线；不得另起一套人物或关系。\n${overviewCharacterLines}`,
      );
    }

    const audienceText =
      pickFirstText(plan?.targetAudience, draft.overview.audience) ||
      (brief?.audienceType === "male"
        ? "男频"
        : brief?.audienceType === "female"
          ? "女频"
          : "泛短剧受众");
    pushLine("目标受众", audienceText);
    pushLine("题材方向", [brief?.genres, draft.overview.genres, plan?.genrePromise]);
    pushLine("核心设定", [brief?.coreHooks, draft.overview.coreHooks]);
    pushLine("核心亮点", [plan?.commercialHook, draft.overview.highlight]);
    pushLine("故事背景", [plan?.logline, draft.overview.worldview]);
    pushLine("核心梗概", [plan?.mainConflict, draft.overview.premise, draft.overview.userPremise]);
    pushLine("主线锚点", [
      plan?.mainConflict,
      plan?.protagonistGoal,
      plan?.antagonistPressure,
      plan?.relationshipEngine,
    ]);
    pushLine("起承转合", [
      plan?.openingThreeEpisodesHook,
      plan?.productionNotes,
    ]);
    pushLine("卡点池", [plan?.paymentPointPlan]);

    if (overviewBriefLines.length > 0) {
      baseLines.push(`【采用方案策划结构】\n${overviewBriefLines.join("\n")}`);
      baseLines.push("故事梗概要承接上述策划结构，但不要机械复述字段名；需转写为自然语言故事梗概。");
    }
  }

  // Phase 8a: 安全注入 characterProfiles（仅公开字段，script step 跳过）
  if (step !== "script" && options?.factSheet && !options.factSheetStale) {
    const profiles = options.factSheet.characterProfiles;
    if (profiles && profiles.length > 0) {
      const hiddenKeywords = collectHiddenKeywords(options.factSheet, options.structuredSummary);
      const safeLines = profiles
        .map((p) => {
          let text = buildSafeProfileInfo(p, hiddenKeywords);
          if (!text) return null;

          // Phase 8c: 注入已授权的隐藏字段
          if (options.revealBeats?.length && typeof options.currentEpisode === "number") {
            const unlocked = computeUnlockedFields(p, options.revealBeats, options.currentEpisode);
            if (unlocked.hiddenAliases?.length || unlocked.hiddenIdentity || unlocked.spoilerTags?.length) {
              // Use currentEpisode as label — unlocked beats are verified to match this profile
              const unlockedText = buildUnlockedFieldsText(p, unlocked, options.currentEpisode);
              if (unlockedText) text += `\n${unlockedText}`;
            }
          }

          return text;
        })
        .filter(Boolean) as string[];

      if (safeLines.length > 0) {
        baseLines.splice(
          baseLines.findIndex((l) => l.startsWith("集纲：")),
          0,
          `【AI 人物卡参考（仅公开信息）】\n${safeLines.join("\n\n")}`,
        );
      }
    }
  }

  // Phase 8a: 安全注入 structuredSummary（不含 hiddenReveals / backstoryHint，script step 跳过）
  if (step !== "script" && options?.structuredSummary && !options.structuredSummaryStale) {
    const safeSummary = buildSafeStructuredSummary(options.structuredSummary);
    if (safeSummary) {
      baseLines.splice(
        baseLines.findIndex((l) => l.startsWith("集纲：")),
        0,
        `【故事骨架参考】\n${safeSummary}`,
      );
    }
  }

  // ── 以下补强在 characters / outlines step 注入（script step 单独走最小上下文） ──
  if (step === "characters" || step === "outlines") {
    // 注入剧本类型
    const scriptTypeLabel =
      draft.overview.scriptType === "ai_comic" ? "AI漫剧" : "真人短剧";
    baseLines.push(`剧本类型：${scriptTypeLabel}`);

    const userPremise = draft.overview.userPremise?.trim();
    if (userPremise) {
      baseLines.push(isAdaptation
        ? `【原文事件锚点（仅用于事件顺序与因果，不用于最终人物命名、人物背景直写或台词称呼）】\n${userPremise}`
        : `【用户原文灵感（最高优先级）】\n${userPremise}`);
    }

    if (step === "characters") {
      const motherBaseLines: string[] = [];
      const pushMotherLine = (label: string, value: unknown, maxLen = 180) => {
        const text = pickFirstText(value);
        if (text) {
          motherBaseLines.push(`- ${label}：${shortenText(text, maxLen)}`);
        }
      };

      pushMotherLine("核心梗概", [draft.overview.premise, draft.overview.userPremise], 180);
      pushMotherLine("故事背景", draft.overview.worldview, 160);
      pushMotherLine("核心亮点", draft.overview.highlight, 120);
      pushMotherLine("核心设定", draft.overview.coreHooks, 120);
      pushMotherLine("目标受众", resolveContextAudienceLabel(draft), 60);
      pushMotherLine("项目主线", draft.overview.scriptPlan?.mainConflict, 120);
      pushMotherLine("主角目标", draft.overview.scriptPlan?.protagonistGoal, 120);
      pushMotherLine("反派压力", draft.overview.scriptPlan?.antagonistPressure, 120);

      if (motherBaseLines.length > 0) {
        baseLines.push(
          `【人物小传母本】\n人物小传必须以以下故事母本为第一来源：\n${motherBaseLines.join("\n")}\n人物只能补充身份、关系、欲望、秘密、弱点和参与主线的方式，不要凭空新增具体开场事件、具体场景或组织事件。`,
        );
      }
    }

    // 注入 Planning 约束（projectBrief / scriptPlan 关键字段）
    const brief = draft.overview.projectBrief;
    if (brief) {
      const briefLines: string[] = [];
      const safeStr = (v: unknown): string =>
        typeof v === "string" && v.trim() ? v.trim() : "";
      const safeArr = (v: unknown): string[] =>
        Array.isArray(v) && v.length > 0 ? v.filter((x): x is string => typeof x === "string") : [];

      const genres = safeArr(brief.genres);
      if (genres.length) briefLines.push(`题材：${genres.join("、")}`);
      const coreHooks = safeArr(brief.coreHooks);
      if (coreHooks.length) briefLines.push(`核心卖点：${coreHooks.join("、")}`);
      if (isAiComic) {
        const styleTags = safeArr(brief.styleTags);
        if (styleTags.length) briefLines.push(`风格：${styleTags.join("、")}`);
      }
      const emotion = safeStr(brief.coreEmotion);
      if (emotion) briefLines.push(`核心情绪：${emotion}`);
      const audience = safeStr(brief.audienceType);
      if (audience) briefLines.push(`受众定位：${audience}`);
      const constraint = safeStr(brief.productionConstraint);
      if (constraint) briefLines.push(`制作约束：${constraint}`);
      const episodeCount = typeof brief.episodeCount === "number" ? brief.episodeCount : 0;
      if (episodeCount > 0) briefLines.push(`总集数：${episodeCount}`);
      const wordsPerEp = typeof brief.targetWordsPerEpisode === "number" ? brief.targetWordsPerEpisode : 0;
      if (wordsPerEp > 0) briefLines.push(`每集目标字数：${wordsPerEp}`);
      const scenesPerEp = typeof brief.sceneLimitPerEpisode === "number" ? brief.sceneLimitPerEpisode : 0;
      if (scenesPerEp > 0) briefLines.push(`每集场景上限：${scenesPerEp}`);
      const charLimit = typeof brief.mainCharactersLimit === "number" ? brief.mainCharactersLimit : 0;
      if (charLimit > 0) briefLines.push(`主要人物上限：${charLimit}`);

      if (briefLines.length > 0) {
        baseLines.push(`【策划约束（projectBrief）】\n${briefLines.join("\n")}`);
      }
    }

    // 注入角色数量目标（characters step 专用）
    if (step === "characters") {
      const targetCount = getTargetCharacterCount(draft);
      baseLines.push(`角色数量目标：${targetCount} 个`);
      baseLines.push(`人物小传必须严格生成 ${targetCount} 个角色，不多不少。`);
    }

    // outlines step：提升世界设定为高优先级约束
    if (step === "outlines") {
      const wv = draft.overview.worldview?.trim();
      if (wv) {
        baseLines.push(`【世界设定 / 高概念规则（优先于旧梗概和旧大纲）】\n${wv}`);
      }
    }

    const plan = draft.overview.scriptPlan;
    if (plan) {
      const planLines: string[] = [];
      const safeStr = (v: unknown): string =>
        typeof v === "string" && v.trim() ? v.trim() : "";

      const logline = safeStr(plan.logline);
      if (logline) planLines.push(`故事方向：${logline}`);
      const conflict = safeStr(plan.mainConflict);
      if (conflict) planLines.push(`主线冲突：${conflict}`);
      const goal = safeStr(plan.protagonistGoal);
      if (goal) planLines.push(`主角目标：${goal}`);
      const pressure = safeStr(plan.antagonistPressure);
      if (pressure) planLines.push(`反派压力：${pressure}`);
      const engine = safeStr(plan.relationshipEngine);
      if (engine) planLines.push(`关系引擎：${engine}`);
      const hook = safeStr(plan.openingThreeEpisodesHook);
      if (hook) planLines.push(`前三集钩子策略：${hook}`);
      const payment = safeStr(plan.paymentPointPlan);
      if (payment) planLines.push(`付费点策略：${payment}`);
      const tone = safeStr(plan.tone);
      if (tone) planLines.push(`基调：${tone}`);
      const notes = safeStr(plan.productionNotes);
      if (notes) planLines.push(`制作备注：${notes}`);

      if (planLines.length > 0) {
        baseLines.push(`【策划约束（scriptPlan）】\n${planLines.join("\n")}`);
      }
    }
  }

  // ── script step 最小上下文模式：只注入大纲 + 硬约束 + 人物摘要 ──
  if (options?.step === "script") {
    const ep = options?.currentEpisode;
    if (typeof ep === "number" && ep >= 1) {
      // 1. 当前集纯文本大纲（最高优先级，唯一剧情执行依据）
      const episodeText = draft.outlines.episodes[ep - 1];
      if (episodeText) {
        baseLines.push(`当前集纯文本大纲（唯一剧情执行依据）：\n第${ep}集：${episodeText}`);
      }

      // 2. 前一集大纲（承接上文）
      if (ep > 1) {
        const prevText = draft.outlines.episodes[ep - 2]?.trim();
        if (prevText) {
          baseLines.push(`前一集大纲（承接上文）：\n第${ep - 1}集：${shortenText(prevText, 400)}`);
        }
      }

      // 3. 后一集大纲（留钩子参考）
      if (ep < draft.outlines.episodes.length) {
        const nextText = draft.outlines.episodes[ep]?.trim();
        if (nextText) {
          baseLines.push(`后一集大纲（留钩子参考，不得提前写）：\n第${ep + 1}集：${shortenText(nextText, 400)}`);
        }
      }
    }

    // 4. projectBrief 硬约束（仅数字约束，不含题材/卖点/风格/情绪/受众等叙事标签）
    const brief = draft.overview.projectBrief;
    if (brief) {
      const constraintLines: string[] = [];
      const wordsPerEp = typeof brief.targetWordsPerEpisode === "number" ? brief.targetWordsPerEpisode : 0;
      if (wordsPerEp > 0) constraintLines.push(`单集目标字数：${wordsPerEp} 中文字`);
      const scenesPerEp = typeof brief.sceneLimitPerEpisode === "number" ? brief.sceneLimitPerEpisode : 0;
      if (scenesPerEp > 0) constraintLines.push(`单集场景上限：${scenesPerEp} 场`);
      const charLimit = typeof brief.mainCharactersLimit === "number" ? brief.mainCharactersLimit : 0;
      if (charLimit > 0) constraintLines.push(`主要人物上限：${charLimit}`);
      const epCount = typeof brief.episodeCount === "number" ? brief.episodeCount : 0;
      if (epCount > 0) constraintLines.push(`总集数：${epCount}`);
      const scriptType = brief.scriptType;
      if (scriptType) constraintLines.push(`剧本类型：${scriptType === "ai_comic" ? "AI漫剧" : "真人短剧"}`);
      if (brief.episodeDuration) constraintLines.push(`单集时长：${brief.episodeDuration}`);
      if (constraintLines.length > 0) {
        baseLines.push(`【硬约束（projectBrief，仅数字/类型约束，不得自创第二套）】\n${constraintLines.join("\n")}`);
      }
    }

    // 5. 人物小传摘要（优先当前集/前后集大纲人物 + 主角/反派/重要角色，补足到6-8人）
    if (draft.characters.length > 0) {
      // 从当前集+前后集大纲中提取出现的人物名，优先展示
      const relevantNames: string[] = [];
      if (typeof ep === "number" && ep >= 1) {
        const curText = draft.outlines.episodes[ep - 1] ?? "";
        const prevText = ep > 1 ? (draft.outlines.episodes[ep - 2] ?? "") : "";
        const nextText = ep < draft.outlines.episodes.length ? (draft.outlines.episodes[ep] ?? "") : "";
        const merged = `${curText} ${prevText} ${nextText}`;
        for (const c of draft.characters) {
          const cn = clean(c.name);
          if (cn && merged.includes(cn)) {
            relevantNames.push(cn);
          }
        }
      }
      const charSummary = summarizeCharactersCompact(draft.characters, 8, relevantNames.length > 0 ? relevantNames : undefined);
      if (charSummary) {
        baseLines.push(`人物小传摘要（仅用于已有角色行为一致，不得引入新角色或新关系）：\n${charSummary}`);
        // 最小规则：若大纲中出现人物但无角色卡，正文必须以大纲原文身份描述为准
        baseLines.push(`【人物身份规则】若当前集/前一集/后一集大纲中出现人物但人物小传摘要没有该人物，正文必须以大纲原文对该人物的身份描述为准，不得自行补写新身份。例如大纲写"蛇人常魁/常胜之兄"，不得写成"龙族长老"。`);
      }
    }

    // 6. 当前集 originalPhaseRanges 阶段任务
    if (typeof ep === "number" && ep >= 1 && draft.outlines.originalPhaseRanges?.length) {
      const phase = draft.outlines.originalPhaseRanges.find(
        (r) => ep >= r.startEpisode && ep <= r.endEpisode,
      );
      if (phase) {
        const phaseLines: string[] = [];
        phaseLines.push(`阶段：${phase.phase}`);
        phaseLines.push(`覆盖集数：第${phase.startEpisode}-${phase.endEpisode}集`);
        if (phase.stageTask) phaseLines.push(`剧情任务：${phase.stageTask}`);
        if (phase.relationshipTask) phaseLines.push(`关系任务：${phase.relationshipTask}`);
        if (phase.emotionTask) phaseLines.push(`情绪任务：${phase.emotionTask}`);
        baseLines.push(`【当前阶段任务（originalPhaseRanges）】\n${phaseLines.join("\n")}`);
      }
    }

    // 7. 当前集 episodesStructured 结构化任务
    if (typeof ep === "number" && ep >= 1 && draft.outlines.episodesStructured?.length) {
      const epPlan = draft.outlines.episodesStructured.find(
        (e) => e.episodeNumber === ep,
      );
      if (epPlan) {
        const structLines: string[] = [];
        if (epPlan.title) structLines.push(`标题：${epPlan.title}`);
        if (epPlan.plotTask) structLines.push(`剧情任务：${epPlan.plotTask}`);
        if (epPlan.conflict) structLines.push(`核心冲突：${epPlan.conflict}`);
        if (epPlan.newInformation) structLines.push(`新信息：${epPlan.newInformation}`);
        if (epPlan.emotionalPoint) structLines.push(`情绪点：${epPlan.emotionalPoint}`);
        if (epPlan.hook) structLines.push(`钩子：${epPlan.hook}`);
        if (epPlan.characterFocus?.length) structLines.push(`人物焦点：${epPlan.characterFocus.join("、")}`);
        if (epPlan.macroStage) structLines.push(`宏观阶段：${epPlan.macroStage}`);
        if (epPlan.microBeat) structLines.push(`微观节拍：${epPlan.microBeat}`);
        if (structLines.length > 0) {
          baseLines.push(`【当前集结构化任务（episodesStructured）】\n${structLines.join("\n")}`);
        }
      }
    }

    // 8. 改编项目：仅注入改编策略声明，不注入原文锚点全文
    const adaptation = draft.adaptation?.status === "applied" ? draft.adaptation : null;
    if (adaptation) {
      const adLines: string[] = [
        "项目来源：上传大纲改编",
        `目标市场：${adaptation.targetMarket}`,
        `改编方式：${getAdaptationStrategyLabel(adaptation.preferredGenre)}`,
        "改编方式只决定是否保留原设、是否做市场化包装、是否强化短剧爽点；不决定最终正文文风。",
        `总集数约束：${adaptation.targetEpisodeCount ?? draft.overview.projectBrief?.episodeCount ?? 60}`,
        "正文必须承接人物小传与分集大纲，只写当前集，不提前写后续集，不改故事骨架，不改角色功能。",
      ];
      baseLines.push(`【改编策略声明】\n${adLines.join("\n")}`);
    }
  }

  return baseLines.join("\n\n");
}

export function buildRewriteProjectContext(draft: RewriteDraft) {
  const isAiComic = draft.infoFlow.format === "ai_short";
  return [
    `改写项目标题：${clean(draft.title)}`,
    `源文件名：${clean(draft.infoFlow.sourceFileName)}`,
    `是否已导入剧本：${draft.infoFlow.uploaded ? "是" : "否"}`,
    `改写类型：${clean(draft.infoFlow.format === "ai_short" ? "AI漫剧" : draft.infoFlow.format === "live_action" ? "真人短剧" : "")}`,
    `原素材标题：${clean(draft.infoFlow.sourceTitle)}`,
    `原素材梗概：${clean(draft.infoFlow.sourceSynopsis)}`,
    `关键信息点：${clean(draft.infoFlow.keyNodes)}`,
    `原始剧本文本：${clean(draft.infoFlow.sourceText).slice(0, 4000)}`,
    `目标受众：${clean(draft.overview.audience)}`,
    `题材类型：${clean(draft.overview.genre)}`,
    `核心设定：${clean(draft.overview.coreHooks.join("、"))}`,
    ...(isAiComic ? [`风格元素：${clean(draft.overview.styleTags.join("、"))}`] : []),
    `世界观：${clean(draft.overview.worldview)}`,
    `核心亮点：${clean(draft.overview.highlight)}`,
    `核心梗概：${clean(draft.overview.premise)}`,
    `人物卡：\n${summarizeCharacters(draft.characters)}`,
    `粗纲：${clean(draft.outlines.macro)}`,
    `集纲：${clean(draft.outlines.episodes.join("\n"))}`,
    `当前正文集数：${clean(draft.script.episode)}`,
    `当前正文内容：${clean(draft.script.content)}`,
  ].join("\n\n");
}

export function buildAdaptProjectContext(draft: AdaptDraft) {
  return [
    `改编项目标题：${clean(draft.title)}`,
    `源文件名：${clean(draft.sourceFileName)}`,
    `改编类型：${clean(draft.format === "ai_short" ? "AI漫剧" : draft.format === "live_action" ? "真人短剧" : "")}`,
    `拆解范围：${clean(draft.selectedRangeLabel)}`,
    `小说章节数：${draft.chapters.length || 0}`,
    `已选章节：${draft.chapters.filter((item) => item.selected).map((item) => item.title).join("、") || "未选择"}`,
    `小说章纲：${clean(draft.chapter.summary)}`,
    `故事梗概：${clean(draft.overview.premise)}`,
    `人物卡：\n${summarizeCharacters(draft.characters)}`,
    `分集粗纲：${clean(draft.outlines.macro)}`,
    `分集集纲：${clean(draft.outlines.episodes.join("\n"))}`,
    `当前正文集数：${clean(draft.script.episode)}`,
    `当前正文内容：${clean(draft.script.content)}`,
  ].join("\n\n");
}
