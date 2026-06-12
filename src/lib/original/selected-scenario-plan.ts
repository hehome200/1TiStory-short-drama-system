import type { ProjectBrief, ScriptPlan } from "@/lib/types";
import type { StoryScenarioCard } from "@/lib/original/story-intent-summary";
import { normalizeScenarioEraLabel } from "@/lib/original/scenario-era-consistency";
import type {
  ScenarioDisplayTagGroups,
  ScenarioGenerationHints,
  ScenarioVariantId,
} from "@/lib/original/scenario-variant-overlays";

export type ScenarioPolishPatch = {
  title?: string;
  highlight?: string;
  worldview?: string;
  premise?: string;
};

export type SelectedScenarioPlan = {
  scriptType: "short_drama" | "ai_comic";
  title: string;
  audience: string;
  genres: string[];
  eraOrWorldType: string;
  coreSettings: string[];
  baseStepTags?: {
    audiences: string[];
    genres: string[];
    coreHooks: string[];
    styleTags: string[];
  };
  variantId?: ScenarioVariantId;
  variantName?: string;
  variantTags?: string[];
  variantSignals?: string[];
  scenarioTagBundle?: string[];
  generationHints?: ScenarioGenerationHints;
  displayTagGroups?: ScenarioDisplayTagGroups;
  storyBackground: string;
  coreHighlight: string;
  coreSynopsis: string;
  userSupplement?: string;
  mustHave: string[];
  mustAvoid: string[];
  projectBrief: ProjectBrief;
  scriptPlan: ScriptPlan;
  mainlineAnchors?: StoryScenarioCard["plan"]["mainlineAnchors"];
  phaseStrategy?: StoryScenarioCard["plan"]["phaseStrategy"];
  beatPool?: StoryScenarioCard["plan"]["beatPool"];
  audiences?: string[];
  coreHooks?: string[];
  styleTags?: string[];
  highlight?: string;
  worldview?: string;
  premise?: string;
  userPremise?: string;
  oneLineStory?: string;
  storyTitle?: string;
  sourceScenarioId?: string;
  sourcePlanName?: string;
  isComplete?: boolean;
};

export type VisibleScenarioCard = {
  id: string;
  planName: string;
  title: string;
  audience?: string;
  audiences?: string[];
  genres?: string[];
  coreHooks?: string[];
  styleTags?: string[];
  eraOrWorldType?: string;
  displayTagGroups?: ScenarioDisplayTagGroups;
  storyBackground?: string;
  worldview?: string;
  coreHighlight?: string;
  highlight?: string;
  coreSynopsis?: string;
  premise?: string;
};

type SelectedScenarioStage = "idle" | "generating" | "completed";

const POLLUTED_TITLE_KEYWORDS = [
  "原创项目",
  "项目",
  "方案",
  "方向",
  "爆款稳态款",
  "强人设反差款",
  "脑洞差异化款",
  "人物反差原创项目",
  "高设定原创项目",
  "女频都市原创项目",
  "男频都市原创项目",
  "都市原创项目",
  "短剧原创项目",
  "漫剧原创项目",
  "AI漫剧原创项目",
];

export function normalizeScenarioTitle(title: string | undefined) {
  return typeof title === "string" ? title.replace(/[《》“”"']/g, "").trim() : "";
}

export function isPollutedScenarioTitle(title: string) {
  const normalized = normalizeScenarioTitle(title);
  if (!normalized) return true;
  return POLLUTED_TITLE_KEYWORDS.some((keyword) => normalized === keyword || normalized.includes(keyword));
}

export function resolveSelectedScenarioTitle(
  titleCandidates: (string | undefined)[],
  fallbackTitle: string,
) {
  for (const candidate of titleCandidates) {
    const normalized = normalizeScenarioTitle(candidate);
    if (normalized && !isPollutedScenarioTitle(normalized)) {
      return normalized;
    }
  }

  return normalizeScenarioTitle(fallbackTitle) || "未命名剧本";
}

function normalizeUniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).map((item) => item.trim()).filter(Boolean)));
}

function pickNonEmptyStrings(...groups: Array<string[] | undefined>) {
  for (const group of groups) {
    const normalized = normalizeUniqueStrings(group);
    if (normalized.length > 0) return normalized;
  }
  return [];
}

export function normalizeShortDramaEraDisplay(value: string | undefined) {
  return normalizeScenarioEraLabel(value);
}

function resolveAudienceLabel(card: StoryScenarioCard) {
  const projectBriefAudienceType = card.plan.projectBrief?.audienceType;
  const audienceFromProjectBrief =
    projectBriefAudienceType === "male"
      ? "男频"
      : projectBriefAudienceType === "female"
        ? "女频"
        : undefined;
  const targetAudience = card.plan.targetAudience?.trim();
  const audienceFromTags = card.plan.audiences?.find((label) => /男频|女频|银发/.test(label.trim()));
  return (
    (targetAudience && !/泛短剧受众|短剧受众|AI漫剧受众/.test(targetAudience) ? targetAudience : undefined) ||
    audienceFromTags ||
    card.plan.audiences?.[0]?.trim() ||
    audienceFromProjectBrief ||
    "短剧受众"
  );
}

function resolveEraOrWorldType(card: StoryScenarioCard) {
  return (
    card.plan.eraBackground?.trim() ||
    card.plan.genreTypes?.trim() ||
    card.plan.coreSetting?.trim() ||
    "未填写"
  );
}

function resolveVisibleAudience(card: VisibleScenarioCard) {
  const explicitAudience = card.audience?.trim();
  if (explicitAudience) return explicitAudience;

  const tagAudience = card.displayTagGroups?.audience?.find((label) => label.trim().length > 0);
  if (tagAudience) return tagAudience.trim();

  return card.audiences?.find((label) => label.trim().length > 0)?.trim() || "短剧受众";
}

export function buildVisibleSelectedScenarioPlan(
  card: VisibleScenarioCard,
  options: {
    scriptType: "short_drama" | "ai_comic";
    mustHave: string[];
    mustAvoid: string[];
    fallbackProjectBrief: ProjectBrief;
    fallbackScriptPlan: ScriptPlan;
    completed?: boolean;
  },
): SelectedScenarioPlan {
  const title = resolveSelectedScenarioTitle([card.title], card.title || "未命名剧本");
  const audiences = pickNonEmptyStrings(card.audiences, card.displayTagGroups?.audience);
  const genres = pickNonEmptyStrings(card.genres, card.displayTagGroups?.genres);
  const coreSettings = pickNonEmptyStrings(card.coreHooks, card.displayTagGroups?.coreSettings);
  const styleTags = pickNonEmptyStrings(card.styleTags, card.displayTagGroups?.styleElements);
  const storyBackground = card.storyBackground || card.worldview || "";
  const coreHighlight = card.coreHighlight || card.highlight || "";
  const coreSynopsis = card.coreSynopsis || card.premise || "";

  return {
    scriptType: options.scriptType,
    title,
    audience: resolveVisibleAudience(card),
    genres,
    eraOrWorldType: options.scriptType === "short_drama"
      ? normalizeShortDramaEraDisplay(card.eraOrWorldType?.trim() || card.displayTagGroups?.era?.[0]?.trim() || "")
      : card.eraOrWorldType?.trim() || card.displayTagGroups?.era?.[0]?.trim() || "",
    coreSettings,
    baseStepTags: {
      audiences,
      genres,
      coreHooks: coreSettings,
      styleTags,
    },
    displayTagGroups: card.displayTagGroups,
    storyBackground,
    coreHighlight,
    coreSynopsis,
    mustHave: normalizeUniqueStrings(options.mustHave),
    mustAvoid: normalizeUniqueStrings(options.mustAvoid),
    projectBrief: options.fallbackProjectBrief,
    scriptPlan: options.fallbackScriptPlan,
    audiences,
    coreHooks: coreSettings,
    styleTags,
    highlight: coreHighlight,
    worldview: storyBackground,
    premise: coreSynopsis,
    userPremise: "",
    oneLineStory: "",
    storyTitle: title,
    sourceScenarioId: card.id,
    sourcePlanName: card.planName,
    isComplete: options.completed ?? true,
  };
}

export function buildSelectedScenarioPlan(
  card: StoryScenarioCard,
  patch: ScenarioPolishPatch,
  options: {
    fallbackTitle: string;
    scriptType: "short_drama" | "ai_comic";
    mustHave: string[];
    mustAvoid: string[];
    stage: SelectedScenarioStage;
    completed?: boolean;
  },
): SelectedScenarioPlan {
  const basePlan = card.plan;
  const baseStoryBackground = basePlan.storyBackground || basePlan.worldview || "";
  const baseCoreHighlight = basePlan.coreHighlight || basePlan.highlight || "";
  const baseCoreSynopsis = basePlan.coreSynopsis || card.coreSynopsis || basePlan.premise || "";
  const coreSynopsis = patch.premise || baseCoreSynopsis;

  const audience = resolveAudienceLabel(card);
  const audiences = normalizeUniqueStrings(basePlan.audiences);
  const genres = normalizeUniqueStrings(basePlan.genres);
  const coreSettings = normalizeUniqueStrings(basePlan.coreHooks);
  const styleTags = normalizeUniqueStrings(basePlan.styleTags);
  const eraOrWorldType = resolveEraOrWorldType(card);
  const baseStepTags = {
    audiences,
    genres,
    coreHooks: coreSettings,
    styleTags,
  };
  const variantTags = normalizeUniqueStrings(basePlan.variantTags);
  const variantSignals = normalizeUniqueStrings(basePlan.generationHints?.requiredSignals);
  const scenarioTagBundle = normalizeUniqueStrings([
    ...baseStepTags.audiences,
    ...baseStepTags.genres,
    ...baseStepTags.coreHooks,
    ...baseStepTags.styleTags,
    ...variantTags,
  ]);
  const displayTagGroups = basePlan.displayTagGroups;
  const generationHints = basePlan.generationHints;
  const title = resolveSelectedScenarioTitle(
    [patch.title, basePlan.title, card.storyTitle],
    options.fallbackTitle,
  );

  return {
    scriptType: options.scriptType,
    title,
    audience,
    genres,
    eraOrWorldType,
    coreSettings,
    baseStepTags,
    variantId: basePlan.variantId,
    variantName: basePlan.variantName,
    variantTags,
    variantSignals,
    scenarioTagBundle,
    generationHints,
    displayTagGroups,
    storyBackground: options.stage === "generating"
      ? patch.worldview || baseStoryBackground
      : patch.worldview || baseStoryBackground,
    coreHighlight: options.stage === "generating"
      ? patch.highlight || baseCoreHighlight
      : patch.highlight || baseCoreHighlight,
    coreSynopsis,
    userSupplement: basePlan.userPremise || "",
    mustHave: normalizeUniqueStrings(options.mustHave),
    mustAvoid: normalizeUniqueStrings(options.mustAvoid),
    projectBrief: basePlan.projectBrief as ProjectBrief,
    scriptPlan: basePlan.scriptPlan as ScriptPlan,
    mainlineAnchors: basePlan.mainlineAnchors,
    phaseStrategy: basePlan.phaseStrategy,
    beatPool: basePlan.beatPool,
    audiences,
    coreHooks: coreSettings,
    styleTags,
    highlight: patch.highlight || baseCoreHighlight,
    worldview: patch.worldview || baseStoryBackground,
    premise: coreSynopsis,
    userPremise: basePlan.userPremise || "",
    oneLineStory: basePlan.oneLineStory || "",
    storyTitle: card.storyTitle,
    sourceScenarioId: card.planName,
    sourcePlanName: card.planName,
    isComplete: options.completed ?? options.stage === "completed",
  };
}
