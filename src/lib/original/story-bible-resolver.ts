import type { OriginalDraft } from "@/lib/types";
import { detectGenreMechanism, type GenreMechanismConfig } from "@/lib/original/genre-mechanisms";

export type StoryBibleCompletenessLevel = "complete" | "partial" | "missing" | "fallback";

export type StoryBibleMissingField = {
  field: string;
  level: StoryBibleCompletenessLevel;
  reason: string;
  expectedSource?: string;
};

export type StoryBibleConfidence = {
  overall: "high" | "medium" | "low";
  title: StoryBibleCompletenessLevel;
  audience: StoryBibleCompletenessLevel;
  genreMechanism: StoryBibleCompletenessLevel;
  worldview: StoryBibleCompletenessLevel;
  characterFunctions: StoryBibleCompletenessLevel;
  episodeUnitModel: StoryBibleCompletenessLevel;
};

export type AudienceOrientationValue =
  | "female"
  | "female_leaning"
  | "general"
  | "male_leaning"
  | "male";

export type AudienceOrientation = {
  value: AudienceOrientationValue;
  label: "女频" | "女频倾向" | "泛短剧受众" | "男频倾向" | "男频";
  structuralAudience: "male" | "female" | "general";
  confidence: "high" | "medium" | "low";
  signals: string[];
};

export type ResolvedStoryBible = {
  title: string;
  audience: string;
  scriptType: string;
  genreFamily: string[];
  genreMechanism: GenreMechanismConfig;
  worldview: string;
  coreSynopsis: string;
  coreHook: string;
  protagonistFunction: string;
  antagonistFunction: string;
  relationshipFunction: string;
  conflictEngine: string;
  paymentEngine: string;
  episodeUnitModel: {
    unitSize: 30;
    beats: ["起", "困", "反", "升", "爽", "合"];
    anchors: string[];
  };
  sourceMap: {
    resolverDerivedFields: string[];
    legacySourceFields: string[];
    notes: string[];
  };
  storyTitleStatus?: StoryBibleCompletenessLevel;
  missingFields?: StoryBibleMissingField[];
  confidence?: StoryBibleConfidence;
  consistencyWarnings?: string[];
  audienceOrientation?: AudienceOrientation;
};

function clean(value: unknown, fallback = "未填写") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function assessTitleStatus(draft: OriginalDraft): StoryBibleCompletenessLevel {
  const overviewTitle = (draft.overview as { storyTitle?: unknown }).storyTitle;
  const draftTitle = (draft as { storyTitle?: unknown }).storyTitle;
  const title = draft.title;

  if (typeof overviewTitle === "string" && overviewTitle.trim() && !/项目$/.test(overviewTitle.trim())) {
    return "complete";
  }
  if (typeof draftTitle === "string" && draftTitle.trim() && !/项目$/.test(draftTitle.trim())) {
    return "complete";
  }
  if (typeof title === "string" && title.trim() && !/项目$/.test(title.trim())) {
    return "partial";
  }
  return "missing";
}

type AudienceSignal = {
  source: "projectBrief" | "scriptPlan" | "overview";
  value: string;
  raw: string;
};

type NormalizedAudience = "male" | "female" | "general" | "unknown";

function normalizeAudienceSignal(value: string): NormalizedAudience {
  const text = value.trim().toLowerCase();
  if (!text) return "unknown";
  if (text.includes("男频") || text.includes("男性") || text.includes("male") || text.includes("男主向")) return "male";
  if (text.includes("女频") || text.includes("女性") || text.includes("female") || text.includes("女主向")) return "female";
  if (text.includes("泛") || text.includes("通用") || text.includes("general")) return "general";
  return "unknown";
}

function collectAudienceSignals(draft: OriginalDraft): AudienceSignal[] {
  const signals: AudienceSignal[] = [];
  const brief = draft.overview.projectBrief;
  const plan = draft.overview.scriptPlan;

  if (brief?.audienceType === "male" || brief?.audienceType === "female") {
    signals.push({
      source: "projectBrief",
      value: brief.audienceType === "male" ? "男频" : "女频",
      raw: brief.audienceType,
    });
  }

  if (plan?.targetAudience && plan.targetAudience.trim()) {
    signals.push({
      source: "scriptPlan",
      value: plan.targetAudience.trim(),
      raw: plan.targetAudience.trim(),
    });
  }

  if (draft.overview.audience && draft.overview.audience.trim()) {
    signals.push({
      source: "overview",
      value: draft.overview.audience.trim(),
      raw: draft.overview.audience.trim(),
    });
  }

  return signals;
}

function hasAudienceConflict(signals: AudienceSignal[]): boolean {
  if (signals.length < 2) return false;

  const briefSignal = signals.find((s) => s.source === "projectBrief");
  if (!briefSignal) return false;

  const briefNormalized = normalizeAudienceSignal(briefSignal.value);
  if (briefNormalized !== "male" && briefNormalized !== "female") return false;

  const otherSignals = signals.filter((s) => s.source !== "projectBrief");

  for (const other of otherSignals) {
    const otherNormalized = normalizeAudienceSignal(other.value);
    if (otherNormalized === "unknown" || otherNormalized === "general") continue;
    if (otherNormalized !== briefNormalized) {
      return true;
    }
  }

  return false;
}

function assessAudienceStatus(draft: OriginalDraft): StoryBibleCompletenessLevel {
  const signals = collectAudienceSignals(draft);
  const brief = draft.overview.projectBrief;

  if (hasAudienceConflict(signals)) {
    return "partial";
  }

  if (brief?.audienceType === "male" || brief?.audienceType === "female") {
    return "complete";
  }

  if (signals.length > 0) {
    return "partial";
  }

  return "fallback";
}

function assessGenreMechanismStatus(draft: OriginalDraft, mechanism: GenreMechanismConfig): StoryBibleCompletenessLevel {
  if (mechanism.type === "rule_tale") {
    return "complete";
  }

  const plan = draft.overview.scriptPlan;
  const brief = draft.overview.projectBrief;
  const hasGenrePromise = typeof plan?.genrePromise === "string" && plan.genrePromise.trim();
  const hasBriefGenres = Array.isArray(brief?.genres) && brief.genres.length > 0;
  const hasOverviewGenres = Array.isArray(draft.overview.genres) && draft.overview.genres.length > 0;

  if (hasGenrePromise || hasBriefGenres || hasOverviewGenres) {
    return "partial";
  }

  return "fallback";
}

function assessWorldviewStatus(draft: OriginalDraft): StoryBibleCompletenessLevel {
  const worldview = clean(draft.overview.worldview, "");
  const plan = draft.overview.scriptPlan;
  const planWorldview = clean(plan?.genrePromise || plan?.logline, "");

  if (worldview) return "complete";
  if (planWorldview) return "partial";
  return "fallback";
}

function assessCharacterFunctionsStatus(draft: OriginalDraft): StoryBibleCompletenessLevel {
  const plan = draft.overview.scriptPlan;
  const hasProtagonistGoal = typeof plan?.protagonistGoal === "string" && plan.protagonistGoal.trim();
  const hasAntagonistPressure = typeof plan?.antagonistPressure === "string" && plan.antagonistPressure.trim();
  const hasRelationshipEngine = typeof plan?.relationshipEngine === "string" && plan.relationshipEngine.trim();

  if (hasProtagonistGoal && hasAntagonistPressure && hasRelationshipEngine) {
    return "complete";
  }
  if (hasProtagonistGoal || hasAntagonistPressure || hasRelationshipEngine) {
    return "partial";
  }
  return "fallback";
}

function buildMissingFields(draft: OriginalDraft): StoryBibleMissingField[] {
  const missing: StoryBibleMissingField[] = [];

  const titleStatus = assessTitleStatus(draft);
  if (titleStatus !== "complete") {
    missing.push({
      field: "storyTitle",
      level: titleStatus,
      reason: titleStatus === "missing" ? "未设置正式剧名" : "仅有项目名，缺少正式剧名",
      expectedSource: "overview.storyTitle",
    });
  }

  const audienceStatus = assessAudienceStatus(draft);
  if (audienceStatus !== "complete") {
    missing.push({
      field: "targetAudience",
      level: audienceStatus,
      reason: audienceStatus === "fallback" ? "未指定目标受众，使用默认值" : "仅有泛化受众，缺少精确标签",
      expectedSource: "projectBrief.audienceType / scriptPlan.targetAudience",
    });
  }

  const worldviewStatus = assessWorldviewStatus(draft);
  if (worldviewStatus !== "complete") {
    missing.push({
      field: "worldview",
      level: worldviewStatus,
      reason: worldviewStatus === "fallback" ? "世界观为空，由题材机制派生" : "世界观部分缺失，由策划补充",
      expectedSource: "overview.worldview",
    });
  }

  const charStatus = assessCharacterFunctionsStatus(draft);
  if (charStatus !== "complete") {
    missing.push({
      field: "characterFunctions",
      level: charStatus,
      reason: charStatus === "fallback" ? "人物功能未策划，由题材机制派生" : "人物功能部分策划",
      expectedSource: "scriptPlan.protagonistGoal / antagonistPressure / relationshipEngine",
    });
  }

  return missing;
}

function buildConfidence(draft: OriginalDraft, mechanism: GenreMechanismConfig): StoryBibleConfidence {
  const title = assessTitleStatus(draft);
  const audience = assessAudienceStatus(draft);
  const genreMechanism = assessGenreMechanismStatus(draft, mechanism);
  const worldview = assessWorldviewStatus(draft);
  const characterFunctions = assessCharacterFunctionsStatus(draft);

  const completeCount = [title, audience, genreMechanism, worldview, characterFunctions].filter(
    (s) => s === "complete"
  ).length;

  let overall: "high" | "medium" | "low";
  if (completeCount >= 4) {
    overall = "high";
  } else if (completeCount >= 2) {
    overall = "medium";
  } else {
    overall = "low";
  }

  return {
    overall,
    title,
    audience,
    genreMechanism,
    worldview,
    characterFunctions,
    episodeUnitModel: "complete",
  };
}

function buildConsistencyWarnings(draft: OriginalDraft): string[] {
  const warnings: string[] = [];
  const plan = draft.overview.scriptPlan;

  const audienceSignals = collectAudienceSignals(draft);
  if (hasAudienceConflict(audienceSignals)) {
    const briefSignal = audienceSignals.find((s) => s.source === "projectBrief");
    const conflictingSignals = audienceSignals.filter((s) => s.source !== "projectBrief");
    if (briefSignal && conflictingSignals.length > 0) {
      warnings.push(`projectBrief.audienceType (${briefSignal.value}) 与 ${conflictingSignals.map((s) => `${s.source} (${s.value})`).join(" / ")} 不一致`);
    }
  }

  if (plan?.genrePromise && draft.overview.worldview) {
    const genre = plan.genrePromise.trim();
    const worldview = draft.overview.worldview.trim();
    if (genre && worldview && !worldview.includes(genre.slice(0, 4)) && !genre.includes(worldview.slice(0, 4))) {
      warnings.push("策划题材承诺与世界观可能不匹配");
    }
  }

  return warnings;
}

const FEMALE_STRONG_SIGNALS = [
  "女频", "女性向", "女主向", "女性受众",
  "婚姻情感", "婚恋", "前任白月光", "虐恋", "情感拉扯",
  "关系牵引", "夫妻反目", "危险里互救", "情绪回弹",
  "豪门虐恋", "霸总宠妻", "甜宠", "虐妻", "追妻火葬场",
  "婆媳", "闺蜜", "绿茶", "小三", "原配",
];

const MALE_STRONG_SIGNALS = [
  "男频", "男性向", "男主向", "男性受众",
  "逆袭", "强势碾压", "隐藏大佬", "身份揭露", "马甲掉落",
  "主角对抗豪门", "主角对抗公司", "掌握证据", "专业能力",
  "权力", "财富", "打脸", "爽文", "扮猪吃虎",
];

const NEUTRAL_TYPE_SIGNALS = [
  "规则怪谈", "诡秘规则", "规则污染", "规则覆盖",
  "悬疑", "推理", "刑侦", "犯罪", "侦探",
  "都市", "职场", "商战", "行业",
  "低成本真人短剧",
];

function collectOrientationSignals(draft: OriginalDraft): {
  femaleSignals: string[];
  maleSignals: string[];
  neutralSignals: string[];
} {
  const femaleSignals: string[] = [];
  const maleSignals: string[] = [];
  const neutralSignals: string[] = [];

  const brief = draft.overview.projectBrief;
  const plan = draft.overview.scriptPlan;

  const allTexts = [
    draft.overview.audience,
    draft.overview.highlight,
    draft.overview.worldview,
    draft.overview.premise,
    draft.overview.userPremise,
    ...(Array.isArray(draft.overview.genres) ? draft.overview.genres : []),
    ...(Array.isArray(draft.overview.coreHooks) ? draft.overview.coreHooks : []),
    ...(Array.isArray(draft.overview.styleTags) ? draft.overview.styleTags : []),
    ...(Array.isArray(brief?.genres) ? brief.genres : []),
    ...(Array.isArray(brief?.coreHooks) ? brief.coreHooks : []),
    ...(Array.isArray(brief?.styleTags) ? brief.styleTags : []),
    plan?.targetAudience,
    plan?.genrePromise,
    plan?.logline,
    plan?.mainConflict,
    plan?.protagonistGoal,
    plan?.antagonistPressure,
    plan?.relationshipEngine,
    plan?.paymentPointPlan,
  ].filter((v): v is string => typeof v === "string" && v.trim() !== "");

  const combinedText = allTexts.join(" ").toLowerCase();

  for (const signal of FEMALE_STRONG_SIGNALS) {
    if (combinedText.includes(signal.toLowerCase())) {
      femaleSignals.push(signal);
    }
  }

  for (const signal of MALE_STRONG_SIGNALS) {
    if (combinedText.includes(signal.toLowerCase())) {
      maleSignals.push(signal);
    }
  }

  for (const signal of NEUTRAL_TYPE_SIGNALS) {
    if (combinedText.includes(signal.toLowerCase())) {
      neutralSignals.push(signal);
    }
  }

  return { femaleSignals: uniq(femaleSignals), maleSignals: uniq(maleSignals), neutralSignals: uniq(neutralSignals) };
}

function deriveAudienceOrientation(draft: OriginalDraft): AudienceOrientation {
  const brief = draft.overview.projectBrief;
  const structuralAudience = brief?.audienceType === "male" || brief?.audienceType === "female"
    ? brief.audienceType
    : "general";

  const { femaleSignals, maleSignals, neutralSignals } = collectOrientationSignals(draft);

  const femaleCount = femaleSignals.length;
  const maleCount = maleSignals.length;
  const neutralCount = neutralSignals.length;

  const allSignals = [...femaleSignals.slice(0, 3), ...maleSignals.slice(0, 3), ...neutralSignals.slice(0, 2)].slice(0, 5);

  const deriveResult = (): { value: AudienceOrientationValue; label: AudienceOrientation["label"]; confidence: "high" | "medium" | "low" } => {
    if (structuralAudience === "female") {
      if (femaleCount >= 2 && maleCount === 0 && neutralCount === 0) {
        return { value: "female", label: "女频", confidence: "high" };
      }
      if (femaleCount >= 1 && (neutralCount >= 1 || maleCount >= 1)) {
        return { value: "female_leaning", label: "女频倾向", confidence: "medium" };
      }
      if (femaleCount >= 1) {
        return { value: "female", label: "女频", confidence: "high" };
      }
      return { value: "female_leaning", label: "女频倾向", confidence: "medium" };
    }

    if (structuralAudience === "male") {
      if (maleCount >= 2 && femaleCount === 0 && neutralCount === 0) {
        return { value: "male", label: "男频", confidence: "high" };
      }
      if (maleCount >= 1 && (neutralCount >= 1 || femaleCount >= 1)) {
        return { value: "male_leaning", label: "男频倾向", confidence: "medium" };
      }
      if (maleCount >= 1) {
        return { value: "male", label: "男频", confidence: "high" };
      }
      return { value: "male_leaning", label: "男频倾向", confidence: "medium" };
    }

    if (femaleCount > maleCount && femaleCount >= 2) {
      return { value: "female_leaning", label: "女频倾向", confidence: "low" };
    }

    if (maleCount > femaleCount && maleCount >= 2) {
      return { value: "male_leaning", label: "男频倾向", confidence: "low" };
    }

    if (neutralCount >= 1 && femaleCount === 0 && maleCount === 0) {
      return { value: "general", label: "泛短剧受众", confidence: "medium" };
    }

    return { value: "general", label: "泛短剧受众", confidence: "low" };
  };

  const result = deriveResult();

  return {
    ...result,
    structuralAudience,
    signals: allSignals,
  };
}

export function resolveDisplayStoryTitle(draft: OriginalDraft) {
  const candidates = [
    (draft.overview as { storyTitle?: unknown }).storyTitle,
    (draft as { storyTitle?: unknown }).storyTitle,
    draft.title,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const text = candidate.trim();
    if (!text) continue;
    if (/项目$/.test(text)) {
      return `待生成（当前项目名：${text}）`;
    }
    return text;
  }

  return "待生成";
}

function normalizeAudience(draft: OriginalDraft) {
  const plan = draft.overview.scriptPlan;
  const brief = draft.overview.projectBrief;
  const overviewAudience = clean(draft.overview.audience, "");
  const planAudience = clean(plan?.targetAudience, "");
  if (brief?.audienceType === "male") return "男频";
  if (brief?.audienceType === "female") return "女频";
  if (planAudience) return planAudience;
  if (overviewAudience) return overviewAudience;
  return "泛短剧受众";
}

function normalizeScriptType(draft: OriginalDraft) {
  return draft.overview.scriptType || draft.overview.projectBrief?.scriptType || "short_drama";
}

function buildGenreFamily(draft: OriginalDraft) {
  const plan = draft.overview.scriptPlan;
  const fromBrief = Array.isArray(draft.overview.projectBrief?.genres) ? draft.overview.projectBrief?.genres : [];
  const fromOverview = Array.isArray(draft.overview.genres) ? draft.overview.genres : [];
  const fromPlan = typeof plan?.genrePromise === "string" && plan.genrePromise.trim() ? [plan.genrePromise.trim()] : [];
  const family = uniq([...fromBrief, ...fromOverview, ...fromPlan]);
  return family.length > 0 ? family : ["短剧原创"];
}

function buildWorldview(draft: OriginalDraft, mechanism: GenreMechanismConfig) {
  const overviewWorldview = clean(draft.overview.worldview, "");
  const plan = draft.overview.scriptPlan;
  const planWorldview = clean(plan?.genrePromise || plan?.logline, "");
  const base = overviewWorldview || planWorldview || mechanism.mechanismSummary;

  if (mechanism.type === "rule_tale") {
    return base.includes("规则") || base.includes("违规") || base.includes("解释权")
      ? base
      : `${base} 其中规则文本、违规代价和解释权争夺构成世界底盘。`;
  }

  return base;
}

function buildCoreSynopsis(draft: OriginalDraft, mechanism: GenreMechanismConfig) {
  const overviewSynopsis = clean(draft.overview.premise || draft.overview.userPremise, "");
  const plan = draft.overview.scriptPlan;
  const planSynopsis = clean(plan?.logline || plan?.mainConflict, "");
  const base = overviewSynopsis || planSynopsis || mechanism.mechanismSummary;

  if (mechanism.type === "rule_tale") {
    if (base.includes("规则") || base.includes("违规") || base.includes("解释权") || base.includes("漏洞")) {
      return base;
    }
    return `主角被误判为违规者，在规则限制下自证，并通过规则漏洞反向夺回解释权。`;
  }

  return base;
}

function isMarketStrategyText(value: string) {
  return /Top10|类型池|Billionaire|CEO|Werewolf|Alpha|Mafia|Romance|Revenge|Heiress|Heir|Contract Marriage|Supernatural|Royal|Nobility|北美市场|本土化|英文短剧/i.test(
    value,
  );
}

function buildCoreHook(draft: OriginalDraft, mechanism: GenreMechanismConfig) {
  const plan = draft.overview.scriptPlan;
  const candidates = [
    clean(draft.overview.highlight, ""),
    clean(plan?.mainConflict, ""),
    clean(plan?.relationshipEngine, ""),
    clean(plan?.paymentPointPlan, ""),
  ].filter((item) => item && !isMarketStrategyText(item));

  const storyHook = uniq(candidates).join(" / ");
  if (storyHook) {
    return storyHook;
  }

  const fallback = clean(draft.overview.premise || draft.overview.userPremise, "");
  if (fallback && !isMarketStrategyText(fallback)) {
    return fallback;
  }

  return mechanism.mechanismSummary || "短剧核心钩子";
}

function buildProtagonistFunction(draft: OriginalDraft, mechanism: GenreMechanismConfig) {
  const planGoal = clean(draft.overview.scriptPlan?.protagonistGoal, "");
  if (planGoal) return planGoal;

  if (mechanism.type === "rule_tale") {
    return "被误判违规者 + 识别规则漏洞 + 在规则限制下自证反击";
  }

  return "在压迫中明确目标，并通过反击或选择推动主线兑现";
}

function buildAntagonistFunction(draft: OriginalDraft, mechanism: GenreMechanismConfig) {
  const planPressure = clean(draft.overview.scriptPlan?.antagonistPressure, "");
  if (planPressure) return planPressure;

  if (mechanism.type === "rule_tale") {
    return "掌握规则/证据解释权 + 制造违规判定 + 放大违规代价";
  }

  return "制造压迫、误判或资源阻断，推动主角反击";
}

function buildRelationshipFunction(draft: OriginalDraft, mechanism: GenreMechanismConfig) {
  const planEngine = clean(draft.overview.scriptPlan?.relationshipEngine, "");
  if (planEngine) return planEngine;

  if (mechanism.type === "rule_tale") {
    return "掌握部分规则线索 + 因恐惧/利益暂不坦白 + 影响规则自证";
  }

  return "通过信任、利益、误会或情感选择改变主角行动成本";
}

function buildConflictEngine(draft: OriginalDraft, mechanism: GenreMechanismConfig) {
  const planConflict = clean(draft.overview.scriptPlan?.mainConflict, "");
  const emotion = clean(draft.overview.projectBrief?.coreEmotion, "");
  const highlight = clean(draft.overview.highlight, "");
  const combined = uniq([planConflict, emotion, highlight]).join(" / ");

  if (mechanism.type === "rule_tale") {
    if (combined.includes("规则") || combined.includes("违规") || combined.includes("解释权") || combined.includes("漏洞")) {
      return combined;
    }
    return "规则判定 / 解释权 / 违规代价 / 漏洞发现共同驱动主角自证反击";
  }

  return combined || "人物压迫 / 关系误判 / 阶段反击推动主线";
}

function buildPaymentEngine(draft: OriginalDraft, mechanism: GenreMechanismConfig) {
  const planPayment = clean(draft.overview.scriptPlan?.paymentPointPlan, "");
  if (planPayment) return planPayment;

  if (mechanism.type === "rule_tale") {
    return "规则公布、违规代价、解释权争夺、漏洞发现、自证翻盘、下一条规则";
  }

  return "压迫升级、反转承诺、爽点兑现、下一集新钩子";
}

function buildSourceMap() {
  return {
    resolverDerivedFields: [
      "genreMechanism",
      "worldview",
      "coreSynopsis",
      "coreHook",
      "protagonistFunction",
      "antagonistFunction",
      "relationshipFunction",
      "conflictEngine",
      "paymentEngine",
      "episodeUnitModel",
    ],
    legacySourceFields: [
      "draft.title",
      "overview.audience",
      "overview.scriptType",
      "overview.genres",
      "overview.coreHooks",
      "overview.styleTags",
      "overview.userPremise",
      "overview.premise",
      "overview.worldview",
      "overview.highlight",
      "overview.projectBrief",
      "overview.scriptPlan",
      "characters",
      "outlines",
    ],
    notes: [
      "运行时派生，不落库",
      "五步选择仅作为偏好和题材倾向参考，不作为剧情事实",
      "旧 context 保留用于对照",
    ],
  };
}

export function buildResolvedStoryBible(draft: OriginalDraft): ResolvedStoryBible {
  const mechanism = detectGenreMechanism({
    title: draft.title,
    audience: draft.overview.audience,
    scriptType: draft.overview.scriptType,
    genres: draft.overview.genres,
    coreHooks: draft.overview.coreHooks,
    styleTags: draft.overview.styleTags,
    worldview: draft.overview.worldview,
    highlight: draft.overview.highlight,
    premise: draft.overview.premise || draft.overview.userPremise,
    projectBriefGenres: draft.overview.projectBrief?.genres,
    projectBriefCoreHooks: draft.overview.projectBrief?.coreHooks,
    scriptPlanGenrePromise: draft.overview.scriptPlan?.genrePromise,
    scriptPlanMainConflict: draft.overview.scriptPlan?.mainConflict,
    scriptPlanAntagonistPressure: draft.overview.scriptPlan?.antagonistPressure,
    scriptPlanPaymentPointPlan: draft.overview.scriptPlan?.paymentPointPlan,
  });

  const storyTitleStatus = assessTitleStatus(draft);
  const missingFields = buildMissingFields(draft);
  const confidence = buildConfidence(draft, mechanism);
  const consistencyWarnings = buildConsistencyWarnings(draft);
  const audienceOrientation = deriveAudienceOrientation(draft);

  return {
    title: clean(draft.title),
    audience: normalizeAudience(draft),
    scriptType: normalizeScriptType(draft),
    genreFamily: buildGenreFamily(draft),
    genreMechanism: mechanism,
    worldview: buildWorldview(draft, mechanism),
    coreSynopsis: buildCoreSynopsis(draft, mechanism),
    coreHook: buildCoreHook(draft, mechanism),
    protagonistFunction: buildProtagonistFunction(draft, mechanism),
    antagonistFunction: buildAntagonistFunction(draft, mechanism),
    relationshipFunction: buildRelationshipFunction(draft, mechanism),
    conflictEngine: buildConflictEngine(draft, mechanism),
    paymentEngine: buildPaymentEngine(draft, mechanism),
    episodeUnitModel: {
      unitSize: 30,
      beats: ["起", "困", "反", "升", "爽", "合"],
      anchors: [
        "EP1 开局炸点",
        "EP3 第一留存钩",
        "EP10 一卡 / 第一强付费点",
        "EP17 二卡 / 中段强付费点",
        "EP27 三卡 / 阶段大爽点",
        "EP30 单元结尾钩",
      ],
    },
    sourceMap: buildSourceMap(),
    storyTitleStatus,
    missingFields,
    confidence,
    consistencyWarnings,
    audienceOrientation,
  };
}

export function formatResolvedStoryBibleForPrompt(storyBible: ResolvedStoryBible) {
  const mechanism = storyBible.genreMechanism;
  const displayTitle =
    storyBible.title && !/项目$/.test(storyBible.title.trim())
      ? storyBible.title.trim()
      : storyBible.title.trim()
        ? `待生成（当前项目名：${storyBible.title.trim()}）`
        : "待生成";
  const lines: string[] = [
    "【ResolvedStoryBible｜统一故事母本（运行时派生，不落库）】",
    "来源说明：运行时把五步选择、projectBrief、scriptPlan、人物小传和旧故事母本编译成统一母本；它只作为上下文对照，不写回数据库。",
    `剧名：${displayTitle}${storyBible.storyTitleStatus && storyBible.storyTitleStatus !== "complete" ? `（${storyBible.storyTitleStatus === "missing" ? "缺失" : storyBible.storyTitleStatus === "partial" ? "部分" : "fallback"}）` : ""}`,
    `剧本类型：${storyBible.scriptType}`,
    `目标受众：${storyBible.audience}`,
    `题材家族：${storyBible.genreFamily.join(" / ")}`,
    `题材机制：${mechanism.type}｜${mechanism.mechanismSummary}`,
  ];

  if (storyBible.audienceOrientation) {
    const ao = storyBible.audienceOrientation;
    const signalText = ao.signals.length > 0 ? ao.signals.join(" / ") : "无明确信号";
    lines.push(`受众倾向：${ao.label}｜结构受众=${ao.structuralAudience}｜confidence=${ao.confidence}｜signals=${signalText}`);
  }

  if (mechanism.worldRules?.length) {
    lines.push(`规则文本：${mechanism.worldRules.join(" / ")}`);
  }
  if (mechanism.tabooActions?.length) {
    lines.push(`禁忌行为：${mechanism.tabooActions.join(" / ")}`);
  }
  if (mechanism.violationCosts?.length) {
    lines.push(`违规代价：${mechanism.violationCosts.join(" / ")}`);
  }
  if (mechanism.authorityMechanism) {
    lines.push(`解释权机制：${mechanism.authorityMechanism}`);
  }
  if (mechanism.loopholeMethod) {
    lines.push(`漏洞方法：${mechanism.loopholeMethod}`);
  }

  lines.push(
    `世界观底盘：${storyBible.worldview}`,
    `核心梗概：${storyBible.coreSynopsis}`,
    `核心钩子：${storyBible.coreHook}`,
    `主角功能：${storyBible.protagonistFunction}`,
    `反派功能：${storyBible.antagonistFunction}`,
    `关系功能：${storyBible.relationshipFunction}`,
    `冲突引擎：${storyBible.conflictEngine}`,
    `付费引擎：${storyBible.paymentEngine}`,
    `30集单元模型：unitSize=${storyBible.episodeUnitModel.unitSize}｜beats=${storyBible.episodeUnitModel.beats.join("→")}｜anchors=${storyBible.episodeUnitModel.anchors.join(" / ")}`,
  );

  if (storyBible.confidence) {
    const c = storyBible.confidence;
    lines.push(`母本可信度：${c.overall === "high" ? "高" : c.overall === "medium" ? "中" : "低"}｜title=${c.title}｜audience=${c.audience}｜genreMechanism=${c.genreMechanism}｜worldview=${c.worldview}｜characterFunctions=${c.characterFunctions}`);
  }

  if (storyBible.missingFields && storyBible.missingFields.length > 0) {
    lines.push(`缺失字段：${storyBible.missingFields.map((f) => `${f.field}(${f.level})`).join(" / ")}`);
  }

  if (storyBible.consistencyWarnings && storyBible.consistencyWarnings.length > 0) {
    lines.push(`一致性警告：${storyBible.consistencyWarnings.join(" / ")}`);
  }

  lines.push(`字段来源说明：resolverDerivedFields=${storyBible.sourceMap.resolverDerivedFields.join(", ")}；legacySourceFields=${storyBible.sourceMap.legacySourceFields.join(", ")}；notes=${storyBible.sourceMap.notes.join(" / ")}`);

  return lines.join("\n");
}
