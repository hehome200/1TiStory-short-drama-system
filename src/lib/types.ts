import type { GenerationQualityReport } from "@/lib/quality-os/types";
import type { ScenarioDisplayTagGroups, ScenarioGenerationHints } from "@/lib/original/scenario-variant-overlays";
export type OriginalStep = "overview" | "characters" | "outlines" | "script";

export type VersionSource = "manual" | "mock" | "aliyun" | "local";

export type ProviderType = "openai" | "aliyun";
export type RewriteStep = "infoflow" | "overview" | "characters" | "outlines" | "script";
export type RewriteOverviewField = "worldview" | "highlight" | "premise";
export type AdaptStep = "chapter" | "overview" | "characters" | "outlines" | "script";
export type AdaptFormat = "ai_short" | "live_action";

export type AdaptationStrategy =
  | "auto"
  | "preserve_original"
  | "market_package"
  | "short_drama_boost";

// ==================== 阶段类型（起承转合） ====================
export type Phase = "qi" | "cheng" | "zhuan" | "he";

// 旧版阶段范围（分集大纲兼容）
export type PhaseRange = {
  phase: Phase;
  startEpisode: number;
  endEpisode: number;
};

// ==================== 原创阶段类型（P0 创作任务） ====================
export type MacroStage = "起" | "承" | "转" | "合";

export type MicroBeat = "起" | "困" | "反" | "升" | "爽" | "合";

export type ProjectBrief = {
  scriptType: "short_drama" | "ai_comic";
  audienceType: "male" | "female" | "general";
  genres: string[];
  coreHooks: string[];
  styleTags: string[];
  userPremise?: string;
  episodeCount: number;
  episodeDuration: "1min" | "1-2min" | "2-3min" | "3-5min" | "2min" | "3min" | "4min" | "5min";
  targetWordsPerEpisode: number;
  mainCharactersLimit: number;
  sceneLimitPerEpisode: number;
  coreEmotion: string;
  productionConstraint: "low_cost_live" | "visual_ai_comic" | "realistic_aigc";
  complexityLevel: "beginner" | "standard" | "advanced";
};

export type ScriptPlan = {
  scriptType?: "short_drama" | "ai_comic";
  logline: string;
  commercialHook: string;
  targetAudience: string;
  genrePromise: string;
  mainConflict: string;
  protagonistGoal: string;
  antagonistPressure: string;
  relationshipEngine: string;
  openingThreeEpisodesHook: string;
  paymentPointPlan: string;
  tone: string;
  productionNotes: string;
  riskNotes: string[];
};

export type OriginalPhaseRange = {
  phase: MacroStage;
  startEpisode: number;
  endEpisode: number;
  stageTask: string;
  relationshipTask: string;
  emotionTask: string;
  mustHaveCardTypes: string[];
};

export type EpisodePlan = {
  episodeNumber: number;
  title: string;
  macroStage: MacroStage;
  microBeat: MicroBeat;
  plotTask: string;
  conflict: string;
  newInformation: string;
  emotionalPoint: string;
  hook: string;
  characterFocus: string[];
  sceneLimit: number;
  productionNote: string;
  cardPointIds: string[];
};

export type BeatCard = {
  id: string;
  episodeNumber: number;
  macroStage: MacroStage;
  microBeat: MicroBeat;
  cardType: "hook" | "pressure" | "reversal" | "escalation" | "payoff" | "closure" | "foreshadowing";
  title: string;
  function: string;
  expectation: string;
  break: string;
  newQuestion: string;
  emotion: string;
  dependency?: string;
  payoffEpisode?: number;
  intensity: 1 | 2 | 3 | 4 | 5;
};

export type OutlineBatch = {
  batchIndex: number;
  startEpisode: number;
  endEpisode: number;
  episodeNumbers: number[];
  generatedEpisodeCount: number;
  roughOutline: string;
  summary: string;
  status?: "empty" | "rough_ready" | "episodes_ready";
  arcIndex?: number;
  majorBeatAnchor?: string;
};

export type BatchSummary = {
  episodeRange: string;
  happenedEvents: string[];
  relationshipChanges: string[];
  openForeshadowing: string[];
  unresolvedConflicts: string[];
  usedCardTypes: string[];
  nextBatchRequirements: string[];
  forbiddenRepeats: string[];
  characterStates: Record<string, string>;
};

export type QualityCheck = {
  score: number;
  warnings: string[];
  failedRules: string[];
  rewriteSuggestions: string[];
  checks: {
    hasHook: boolean;
    hasConflict: boolean;
    hasNewInformation: boolean;
    protagonistHasAction: boolean;
    followsEpisodePlan: boolean;
    dialogueTooExplanatory: boolean;
    characterNameConsistent: boolean;
    sceneCountWithinLimit: boolean;
  };
};

export type DraftBatch = {
  id: string;
  episodeStart: number;
  episodeEnd: number;
  episodes: {
    episodeNumber: number;
    title: string;
    content: string;
    qualityCheck?: QualityCheck;
  }[];
  batchSummary: BatchSummary;
  createdAt: string;
};

// ==================== 文本清洗 & 人物抓取类型 ====================

export type CleaningReport = {
  removedPageMarkers: string[];
  removedHeaderFooterLines: string[];
  removedRepeatedTitleLines: string[];
  collapsedBlankLines: number;
  highRiskDeletionWarning: string[];
};

export type CharacterHitType =
  | "direct_profile"
  | "identity_line"
  | "relationship_line"
  | "high_risk_inference"
  | "ignore_as_plot";

export type CharacterLine = {
  text: string;
  hitType: CharacterHitType;
  lineIndex: number;
};

// ==================== 统一数据结构（P0） ====================

// 四种输入模式
export type SourceMode = "idea" | "outline" | "script" | "article";

export type OverseasAdaptationGenre = AdaptationStrategy;

export type OverseasTargetMarket =
  | "中国"
  | "北美"
  | "日本"
  | "韩国"
  | "印度"
  | "东南亚";

export type AdaptationMode =
  | "中文海外化"
  | "英文剧本";

export type AdaptationStatus =
  | "empty"
  | "uploaded"
  | "extracted"
  | "mapped"
  | "applied";

export type AdaptationExtraction = {
  coreRule: string;
  protagonistFunction: string;
  pressureChain: string[];
  misreadMechanism: string;
  reversalNodes: string[];
  roleFunctionMap: Array<{
    sourceName: string;
    roleFunction: string;
    publicIdentity: string;
    hiddenIdentity?: string;
    relationshipHook?: string;
  }>;
  sampleStyleProfile: string;
};

// ==================== 源材料模型抽取层 ====================
// 让模型从原文中干净抽取结构化人物/设定数据，不创作、不改名、不本土化
export type SourceMaterialExtractedCharacter = {
  sourceName: string;
  sourceAliases: string[];
  gender: "male" | "female" | "unknown";
  genderEvidence: string;

  sourceRole: string;
  shortDramaRoleHint: string;

  traits: string[];
  identityFacts: string[];
  backgroundFacts: string[];
  relationshipFacts: string[];

  publicIdentity: string;
  hiddenIdentity: string;
  misreadIdentity: string;
  trueMotivation: string;
  reversalTags: string[];

  sourceEvidence: string[];
};

export type SourceMaterialExtraction = {
  sourceTitle: string;
  sourceSynopsis: string;
  characters: SourceMaterialExtractedCharacter[];
  /** 正文剧情出场但不在主人物章节的次要人物，不参与 requiredCharacterCount */
  supportingCharacters?: SourceMaterialExtractedCharacter[];
  /** 伪装名、分身名、身份牌名、称号等别名，不在 characters 中 */
  aliases?: Array<{
    alias: string;
    ownerSourceName?: string;
    usage: "伪装身份" | "分身身份" | "误认身份" | "称号" | "其他";
    evidence?: string;
  }>;
  factions: string[];
  powerSystem: string[];
  keyEvents: string[];
  relationshipSummary: string[];
};

export type OverseasMapping = {
  nameMap: Array<{
    sourceName: string;
    adaptedName: string;
    reason: string;
  }>;
  factionMap: Array<{
    sourceTerm: string;
    adaptedTerm: string;
    reason: string;
  }>;
  rankMap: Array<{
    sourceRank: string;
    adaptedRank: string;
    system: string;
  }>;
  settingMap: Array<{
    sourceSetting: string;
    adaptedSetting: string;
    reason: string;
  }>;
  forbiddenTerms: string[];
  replacementRules: string[];
};

export type OriginalAdaptationDraft = {
  sourceFileName?: string;
  sourceTitle?: string;
  sourceText?: string;
  sampleText?: string;
  targetEpisodeCount: number;
  targetMarket: OverseasTargetMarket;
  adaptationMode: AdaptationMode;
  preferredGenre: AdaptationStrategy;
  extraction?: AdaptationExtraction;
  sourceMaterialExtraction?: SourceMaterialExtraction;
  overseasMapping?: OverseasMapping;
  leadAnchors?: {
    maleLeadId?: string;
    femaleLeadId?: string;
    candidateFemaleLeadIds?: string[];
  };
  status: AdaptationStatus;
};

// 项目状态
export type ProjectStatus = "draft" | "generating" | "locked" | "published";

// 大纲约束项（按大纲写剧本模式专用）
export type OutlineConstraints = {
  strictlyFollowOutline: boolean;   // 严格遵循大纲
  allowNewCharacters: boolean;       // 允许新增角色
  allowAddDetails: boolean;          // 允许补充细节
  allowReorder: boolean;             // 允许调整顺序
  targetWordsPerEpisode: number;     // 每集目标字数
  outputFormat: "standard" | "custom";
  targetEpisodeCount?: number;       // 目标分集数
  episodeReorganize?: "keep" | "reorganize"; // 保持原分集 / 按目标集数重组
};

// 粗筛输出：文本分区（材料归类层）
// 只负责识别和拆分材料区块，不负责最终总结
export type SourceSections = {
  characterProfileText?: string;   // 人物小传（来自 parseOutlineText.characters）
  storyBackgroundText?: string;    // 故事背景（有明确标题时才提取，否则为空）
  storySynopsisText?: string;      // 故事大纲/梗概（parseOutlineText.macro 全文，不切分）
  episodeOutlineText?: string[];   // 分集大纲（来自 parseOutlineText.episodes）
  worldSettingText?: string;       // 世界观/设定（有明确标题时才提取，否则为空）
  backstoryText?: string;          // 前史信息（有明确标题时才提取，否则为空）
  unknownText?: string;            // 无法归类的独立 section（Phase 5 新增）
};

// 原文/总纲粗拆段（确定性算法切分，用于分集生成前的范围选择）
// 注意：与 SourceSections（材料分类）正交，不要混用
// 阶段 C 调整后：startChar/endChar 对应故事总纲 macro 文本
export type RoughSourceSection = {
  id: string;                    // 段标识，如 "RS001"
  order: number;                 // 排序序号（1-based）
  title: string;                 // 段标题（段首20-30字或自动生成）
  summary: string;               // 段摘要（段首100-160字）
  startChar: number;             // 在 sourceText 中的起始字符位置
  endChar: number;               // 在 sourceText 中的结束字符位置
  charCount: number;             // 字符数（endChar - startChar）
  selected: boolean;             // 是否被选中（默认 true）
  sourceType: "deterministic";   // 标识来源为确定性算法
  sourceTextKind: "storySynopsisText" | "macro";  // 明确标识 startChar/endChar 对应哪个文本源
};

// 来源区块标签（用于 factSheet 中标注事实来源）
export type SourceSectionTag =
  | "characterProfile"
  | "storyBackground"
  | "storySynopsis"
  | "episodeOutline"
  | "worldSetting"
  | "backstory"
  | "unknown";

// 事实元信息（所有 Fact 共享）
export type FactBase = {
  content: string;                          // 事实内容描述
  description?: string;                     // 更详细的说明（可选）
  sourceSection: SourceSectionTag;          // 来自哪个区块
  sourceType: "direct" | "summarized" | "inferred";
  confidence: "high" | "medium" | "low";
  spoilerRisk: "high" | "medium" | "low" | "none";
  sourceVisibility: "explicit_in_source" | "implicit_in_source" | "not_in_source";
  audienceRevealState: "revealed_at_start" | "not_yet_revealed" | "gradual_reveal" | "unknown";
};

// 人物事实
export type CharacterFact = FactBase & {
  factType: "character";
  characterName: string;                    // 涉及的人物名
  factCategory: "identity" | "personality" | "background" | "hidden_identity" | "motive" | "other";
};

// 事件事实
export type EventFact = FactBase & {
  factType: "event";
  eventCategory: "incident" | "turning_point" | "climax" | "setup" | "backstory" | "other";
};

// 关系事实
export type RelationshipFact = FactBase & {
  factType: "relationship";
  personA: string;
  personB: string;
  relationshipType: "亲情" | "爱情" | "友情" | "敌对" | "利用" | "竞争" | "其他";
  arcDirection?: "恶化" | "缓和" | "破裂" | "修复" | "反转" | "unknown";
};

// 揭示事实（不可提前泄露的信息）
export type RevealFact = FactBase & {
  factType: "reveal";
  revealLabel: string;                      // 简要标签
  plannedRevealPhase?: "前期" | "中期" | "后期" | "终局" | "unknown";
};

// 时间线笔记
export type TimelineNote = {
  note: string;                             // 时间线描述
  sourceSection: SourceSectionTag;
  sourceType: "direct" | "summarized" | "inferred";
  confidence: "high" | "medium" | "low";
  isTimelineStart: boolean;                 // 是否从故事起点开始
  hasBackstory: boolean;                    // 是否存在前史
  backstoryHint?: string;                   // 前史提示
  nonlinearHint?: string;                   // 非线性叙事提示（倒叙/插叙等）
};

// 人物卡来源追踪
export type ProfileFieldTracking = {
  sourceType: "direct" | "summarized" | "inferred";
  confidence: "high" | "medium" | "low";
  sourceFactIndices?: number[];
  sourceFactIds?: string[];
  evidence?: string;
};

// 人物卡（Phase 6.5a）
export type CharacterProfileCard = {
  // ── 身份层 ──
  canonicalName: string;
  displayName: string;
  publicAliases: string[];
  hiddenAliases: string[];
  publicIdentity: string;
  hiddenIdentity: string;

  // ── 职业层 ──
  occupationTags: string[];
  professionalDomainTags: string[];
  professionalSkillTags: string[];
  professionalBehaviorTags: string[];
  professionalEthicTags: string[];

  // ── 性格层 ──
  personalityTags: string[];
  temperamentTags: string[];
  moralTraitTags: string[];
  flawTags: string[];
  villainyTags: string[];

  // ── 语言层 ──
  dialogueStyleTags: string[];
  dialogueMemoryTags: string[];

  // ── 动机层 ──
  desireTags: string[];
  fearTags: string[];
  woundTags: string[];
  beliefTags: string[];
  bottomLineTags: string[];

  // ── 冲突层 ──
  contradictionTags: string[];
  relationshipHookTags: string[];

  // ── 记忆点层 ──
  memoryPointTags: string[];
  behaviorMemoryTags: string[];

  // ── 剧透层 ──
  spoilerTags: string[];

  // ── 角色定位层 ──
  rolePositionTags: string[];
  narrativeFunctionTags: string[];
  rolePositionSummary: string;
  narrativeFunctionSummary: string;
  dialogueStyleSummary: string;

  // ── 分类与元信息 ──
  importance: "core" | "major" | "supporting" | "minor";
  appearancePhase: "early" | "middle" | "late" | "full" | "unknown";
  sourceVisibility: "explicit_in_source" | "implicit_in_source" | "not_in_source";
  audienceRevealState: "revealed_at_start" | "not_yet_revealed" | "gradual_reveal" | "unknown";
  spoilerRisk: "high" | "medium" | "low" | "none";

  // ── 来源追踪 ──
  sourceTracking: { [field: string]: ProfileFieldTracking };

  // ── 校验 ──
  warnings: string[];
  generatedAt?: string;
  version: 1;
};

// 事实库
export type OutlineFactSheet = {
  characterFacts: CharacterFact[];
  eventFacts: EventFact[];
  relationshipFacts: RelationshipFact[];
  revealFacts: RevealFact[];
  timelineNotes: TimelineNote[];
  warnings: string[];
  characterProfiles?: CharacterProfileCard[];
};

// 原始素材 - 根据模式不同结构不同
export type SourceMaterial = {
  // idea 模式
  idea?: {
    audiences: string[];
    genres: string[];
    coreHooks: string[];
    styleTags: string[];
    userPremise: string;  // 用户输入的灵感
  };

  // outline 模式
  outline?: {
    rawText: string;
    cleanedText: string;
    sourceFileName: string;
    importMethod: "paste" | "file";
    macro: string;
    episodes: string[];
    characters?: Character[];
    constraints: OutlineConstraints;
    sourceSections?: SourceSections; // 粗筛文本分区（Phase 1 新增）
  };

  // script 模式（剧本改写）
  script?: {
    sourceFileName: string;
    sourceText: string;
    format: AdaptFormat | "";
  };

  // article 模式（改编场景）
  article?: {
    sourceFileName: string;
    sourceText: string;
    chapters: AdaptSourceChapter[];
    selectedChapterIds: string[];
  };
};

// 故事提取结果（信息流）
export type StoryExtraction = {
  overview: {
    audience: string;
    genre: string;
    coreHooks: string[];
    styleTags: string[];
    worldview: string;
    highlight: string;
    premise: string;
  };
  macro: string;      // 粗纲
  episodes: string[]; // 集纲数组
};

// 统一的大纲结构
export type UnifiedOutline = {
  range: string;              // "1-10"
  macro: string;              // 粗纲
  episodes: string[];         // 分集数组
  stageLabels: string[];      // ["起\n1", "承\n-", ...]
  lockLevel?: 0 | 1 | 2;
  lockedAt?: string;
};

// 统一版本历史
export type UnifiedVersionHistory = {
  extraction?: StepVersion<any>[];   // 信息流版本
  characters?: StepVersion<"characters">[];
  outlines?: StepVersion<"outlines">[];
  scripts?: StepVersion<any>[];
};

// ==================== 现有类型保持兼容 ====================

export type ModelProviderConfig = {
  provider: ProviderType;
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type RouteKey =
  | "SCRIPT_GENERATION_DEFAULT"
  | "OUTLINE_ANALYSIS_DEFAULT"
  | "EPISODE_SPLIT_DEFAULT"
  | "REWRITE_DEFAULT"
  | "ADAPT_DEFAULT"
  | "TITLE_OPTIMIZE_DEFAULT"
  | "CHARACTER_POLISH_DEFAULT";

export const ROUTE_KEYS: Record<RouteKey, RouteKey> = {
  SCRIPT_GENERATION_DEFAULT: "SCRIPT_GENERATION_DEFAULT",
  OUTLINE_ANALYSIS_DEFAULT: "OUTLINE_ANALYSIS_DEFAULT",
  EPISODE_SPLIT_DEFAULT: "EPISODE_SPLIT_DEFAULT",
  REWRITE_DEFAULT: "REWRITE_DEFAULT",
  ADAPT_DEFAULT: "ADAPT_DEFAULT",
  TITLE_OPTIMIZE_DEFAULT: "TITLE_OPTIMIZE_DEFAULT",
  CHARACTER_POLISH_DEFAULT: "CHARACTER_POLISH_DEFAULT",
};

export type OverviewDraft = {
  audience: string;
  audiences: string[];
  genres: string[];
  coreHooks: string[];
  styleTags: string[];
  userPremise?: string;
  worldview: string;
  storyBackground?: string;
  highlight: string;
  coreHighlight?: string;
  premise: string;
  coreSynopsis?: string;
  scriptType?: "ai_comic" | "short_drama";
  projectBrief?: ProjectBrief;
  scriptPlan?: ScriptPlan;
  variantId?: string;
  variantName?: string;
  variantTags?: string[];
  variantSignals?: string[];
  scenarioTagBundle?: string[];
  displayTagGroups?: ScenarioDisplayTagGroups;
  generationHints?: ScenarioGenerationHints;
  baseStepTags?: {
    audiences: string[];
    genres: string[];
    coreHooks: string[];
    styleTags: string[];
  };
  eraOrWorldType?: string;
  sourceScenarioId?: string;
  sourcePlanName?: string;
  /** AI 生成后的候选标签（待标签治理工作台处理） */
  candidateTags?: {
    genres: string[];
    coreHooks: string[];
    styleTags: string[];
  };
};

export type Character = {
  id: string;
  name: string;
  role: string;
  gender: "male" | "female" | "unknown";
  age: number;
  traits: string;
  background: string;
  relationToMaleLead?: string;
  relationToFemaleLead?: string;
  relationshipTags?: string[];
  adaptationMeta?: {
    slotId?: string;
    sourceName?: string;
    adaptedName?: string;
    sourceAliases?: string[];
    originalProfileSummary?: string;
    targetMarket?: OverseasTargetMarket;
    roleFunction?: string;
    publicIdentity?: string;
    hiddenIdentity?: string;
    misreadIdentity?: string;
    trueMotivation?: string;
    reversalTags?: string[];
    revealStage?: "early" | "middle" | "late" | "final" | "unknown";
    factionOrSpecies?: string;
    relationshipHook?: string;
    sourceGenderHint?: "male" | "female" | "unknown";
    genderConfidence?: number;
    localizationNote?: string;
    needsRefine?: boolean;
    generatedBy?: "model" | "scaffold";
  };
};

// ==================== 提炼系统：三层结构 + 六维度说明书 ====================

// ---- 输入可见性（后端最终计算，前端可预估） ----
export type InputVisibility = {
  sourceTotalLength: number;
  aiVisibleLength: number;
  visibleRatio: number;
  characterSectionLength: number;
  effectiveStoryLength: number;
  truncationWarning?: string;
};

// ---- 来源标注 ----
export type SourceTag = "original" | "summarized" | "inferred" | "low_confidence_guess";

// ---- 第一层：已确认单集 ----
export type EpisodeSplitBasis = {
  type: "explicit_marker" | "scene_change" | "conflict_node"
      | "relationship_turn" | "rhythm_judgment" | "truncation_forced";
  description: string;
};

export type ConfirmedEpisode = {
  episode: number;
  title?: string;
  goal: string;
  coreEvent: string;
  conflictProgress: string;
  resultChange: string;
  relationshipChange?: string;
  twistOrPayoff?: string;
  endingHook?: string;
  confidence: "high" | "medium-high" | "medium" | "low";
  splitBasis: EpisodeSplitBasis;
};

// ---- 结构化卡点（P0-A 预留类型）----
export type TurningPoint = {
  id: string;
  episodeNumber: number;
  section: "qi" | "cheng" | "zhuan" | "he";  // 起/承/转/合
  title?: string;
  reversalType: "plot" | "relationship" | "stance" | "cognition" | "identity" | "emotion";
  beforeExpectation?: string;
  afterReveal?: string;
  involvedCharacters: string[];
  narrativeFunction?: "establish" | "escalate" | "subvert" | "emotion" | "suspense" | "climax";
  intensity: "small" | "medium" | "big" | "cliffhanger";
  mustKeep: boolean;
  locked: boolean;
  source?: string;
  createdAt: string;
  updatedAt: string;
};

// ---- 生成自由度（P0-A 新增）----
export type GenerationFreedom = 1 | 2 | 3 | 4 | 5;  // 1:严格大纲 2:允许调整顺序 3:允许补充细节 4:允许新增角色 5:创新发挥

// ---- 第二层：剧情节点池 ----
export type StoryBeat = {
  id: string;
  content: string;
  characters: string[];
  phase: "setup" | "rising" | "climax" | "falling" | "resolution" | "unknown";
  dependencies?: string[];
  timelineHint?: string;
  importance: "critical" | "major" | "minor";
  source: SourceTag;
};

// ---- 第三层：生产约束 ----
// targetEpisodeCount 仅作为后续 drama-system 的生产规划参考，
// 提炼层分集逻辑只依据原文结构，不以此为目标强行拆合。
export type ProductionConstraints = {
  narrativeStructure: {
    mode: "linear" | "nonlinear";
    subType?: "flashback" | "in_medias_res" | "intercut" | "parallel" | "unknown";
    description?: string;
  };
  targetEpisodeCount?: number;
  estimatedEpisodeRange?: {
    min: number;
    max: number;
    reasoning: string;
  };
  toneTags?: string[];
  timeSpan?: string;
  settingScope?: string;
};

// ---- 六维度说明书 ----

export type FieldSource = {
  field: string;
  source: SourceTag;
  detail?: string;
};

export type MissingItem = {
  category: "sequel_plot" | "episode_boundary" | "timeline_connection"
          | "identity_reveal_timing" | "key_character_absent" | "mainline_unexpanded";
  description: string;
  severity: "critical" | "important" | "minor";
  causedByTruncation: boolean;
};

export type HighRiskInference = {
  content: string;
  riskLevel: "high" | "medium-high" | "medium";
  category: "character_stance" | "relationship_progression" | "identity_reveal_pacing"
          | "ending_hook" | "explanatory_phrasing" | "factual_error";
  suggestion: string;
};

export type UsabilityItem = {
  content: string;
  category: "A" | "B" | "C";
  reason: string;
  refType: "episode" | "beat" | "field" | "constraint";
  refId: string;
};

export type ExtractionReport = {
  inputVisibility: InputVisibility;
  episodeSplitReasoning: string;
  fieldSources: FieldSource[];
  missingItems: MissingItem[];
  highRiskInferences: HighRiskInference[];
  usabilityClassification: UsabilityItem[];
};

// ---- 提炼元信息 ----
export type ExtractionMeta = {
  sourceType: string;
  episodeDetectionMode: "explicit" | "heuristic" | "none";
  completenessLevel: "high" | "medium" | "low";
  confidence: number;
  missingFields: string[];
};

// ==================== 结构化总纲类型（Phase 1） ====================

// 字段置信度（逐字段标注 AI 对每个字段的自信程度）
export type FieldConfidence = {
  oneLineSummary: "high" | "medium" | "low";
  coreConflict: "high" | "medium" | "low";
  keyRelationships: "high" | "medium" | "low";
  narrativeStructure: "high" | "medium" | "low";
  longArcNodes: "high" | "medium" | "low";
  hiddenReveals: "high" | "medium" | "low";
};

// 核心冲突（三分法）
export type CoreConflict = {
  external: string;      // 20-60 字
  internal: string;      // 20-60 字
  relational: string;    // 20-60 字
};

// 人物关系
export type KeyRelationship = {
  personA: string;
  personB: string;
  relationshipType: "亲情" | "爱情" | "友情" | "敌对" | "利用" | "竞争" | "其他";
  description: string;   // 20-50 字
  arcDirection?: "恶化" | "缓和" | "破裂" | "修复" | "反转";
};

// 叙事结构
export type NarrativeStructure = {
  narrativeMode: "linear" | "nonlinear";
  nonlinearType?: "flashback" | "in_medias_res" | "intercut" | "parallel" | "unknown";
  openingType: "conflict_first" | "daily_life" | "backstory" | "mystery_hook";
  isTimelineStart: boolean;
  hasBackstoryToRecover: boolean;
  backstoryHint?: string;  // 50 字内
};

// 长线剧情节点
export type LongArcNode = {
  nodeLabel: string;
  placementHint: "前期" | "中前期" | "中期" | "中后期" | "后期" | "终局" | "未知";
  description: string;     // 30-80 字
  arcType: "setup" | "rising" | "climax" | "falling" | "resolution" | "twist";
  confidence: "high" | "medium" | "low";
};

// 不可提前揭示信息
export type HiddenReveal = {
  revealLabel: string;
  revealContent: string;   // 20-50 字
  plannedPhase: "前期" | "中期" | "后期" | "终局" | "未知";
  spoilerRiskLevel: "high" | "medium" | "low";
};

// 揭示节拍（Phase 8c：用户主动授权的隐藏信息释放）
export type RevealBeat = {
  id: string;
  sourceLabel: string;            // HiddenReveal.revealLabel（只读快照）
  sourceContent: string;          // HiddenReveal.revealContent（只读快照）
  sourceRiskLevel: "high" | "medium" | "low";  // HiddenReveal.spoilerRiskLevel
  suggestedPhase: string;         // HiddenReveal.plannedPhase（仅 UI 提示）
  episodeNumber: number | null;   // 第几集首次揭示（用户填写）
  revealFields: string[];         // 授权释放哪些隐藏字段（白名单）
  revealLabel: string;            // 用户可改写的揭示标签
  characterDisplayName?: string;  // 关联角色
  createdAt: string;
  updatedAt: string;
};

// 结构化总纲
export type StructuredSummary = {
  oneLineSummary: string;      // 40-90 字
  coreConflict: CoreConflict;
  keyRelationships: KeyRelationship[];  // 3-8 条
  narrativeStructure: NarrativeStructure;
  longArcNodes: LongArcNode[];          // 5-10 个
  hiddenReveals: HiddenReveal[];        // 3-8 条
};

// ---- 提炼完整返回 ----
export type OutlineExtractionResult = {
  meta: ExtractionMeta;
  confirmedEpisodes: ConfirmedEpisode[];
  storyBeats: StoryBeat[];
  constraints: ProductionConstraints;
  report: ExtractionReport;
  turningPoints?: TurningPoint[];
  notes: {
    keptOriginalNarrativeOrder: boolean;
    warnings: string[];
    editorSuggestions: string[];
  };
};

// AI 提炼元信息（旧版，渐进迁移保留）
export type OutlineExtractionMeta = {
  sourceType: string;
  episodeDetectionMode: "explicit" | "heuristic" | "none";
  narrativeMode: "linear" | "nonlinear";
  nonlinearType?: "flashback" | "in_medias_res" | "intercut" | "unknown";
  completenessLevel: "high" | "medium" | "low";
  confidence: number;
  missingFields: string[];
};

// AI 提炼的分集结构
export type ExtractedEpisode = {
  episode: number;
  goal: string;
  coreEvent: string;
  conflictProgress: string;
  resultChange: string;
  relationshipChange?: string;
  twistOrPayoff?: string;
  endingHook?: string;
};

// AI 提炼总纲结构
export type ExtractedSummary = {
  mainline: string;
  coreConflict: string;
  keyRelationships: string;
  storyDirection: string;
  styleTone: string;
};

// AI 提炼总纲完整返回
export type OutlineMacroExtraction = {
  meta: OutlineExtractionMeta;
  storySummary: ExtractedSummary;
  notes: {
    keptOriginalNarrativeOrder: boolean;
    warnings: string[];
    editorSuggestions: string[];
  };
};

// AI 提炼分集完整返回
export type OutlineEpisodesExtraction = {
  meta: OutlineExtractionMeta;
  episodes: ExtractedEpisode[];
  notes: {
    keptOriginalNarrativeOrder: boolean;
    warnings: string[];
    editorSuggestions: string[];
  };
};

export type OutlineDraft = {
  range: string;
  macro: string;
  characterText: string;
  scenesText?: string;
  episodes: string[];
  stageLabels: string[];
  outlineBatches?: OutlineBatch[];
  lockLevel?: 0 | 1 | 2;
  lockedAt?: string;
  extractionMeta?: OutlineExtractionMeta;
  extractionResult?: OutlineExtractionResult;
  sourceSections?: SourceSections; // 粗筛文本分区（Phase 1 新增）
  factSheet?: OutlineFactSheet; // 事实库（Phase 2 新增）
  structuredSummary?: StructuredSummary;
  structuredSummaryWarnings?: string[];
  structuredSummaryMissingFields?: string[];
  structuredSummaryFieldConfidence?: {
    oneLineSummary: "high" | "medium" | "low";
    coreConflict: "high" | "medium" | "low";
    keyRelationships: "high" | "medium" | "low";
    narrativeStructure: "high" | "medium" | "low";
    longArcNodes: "high" | "medium" | "low";
    hiddenReveals: "high" | "medium" | "low";
  };
  structuredSummarySourceMode?: "factSheet" | "directTextFallback";
  factSheetStale?: boolean;
  structuredSummaryStale?: boolean;
  revealBeats?: RevealBeat[]; // Phase 8c：揭示节奏授权
roughSourceSections?: RoughSourceSection[]; // 原文粗拆段（Phase A 新增，确定性算法切分）
phaseRanges?: PhaseRange[]; // 起承转合阶段划分
originalPhaseRanges?: OriginalPhaseRange[];
episodesStructured?: EpisodePlan[];
beatCards?: BeatCard[];
};

export type ScriptDraft = {
  episode: string;
  content: string;
  batches?: DraftBatch[];
  currentBatchId?: string;
  qualityCheck?: QualityCheck;
};

export type OriginalDraft = {
  title: string;
  overview: OverviewDraft;
  characters: Character[];
  outlines: OutlineDraft;
  script: ScriptDraft;
  adaptation?: OriginalAdaptationDraft;
  episodeScripts?: Record<string, ScriptDraft>;
  qualityReports?: GenerationQualityReport[];
  /** 生成轨迹相关增量数据（不覆写旧字段） */
  generationTrace?: {
    /** 每集 thinking 原文（key = episodeNumber） */
    episodeThinking?: Record<string, string>;
  };
};

export type StepPayloadMap = {
  overview: OverviewDraft;
  characters: Character[];
  outlines: OutlineDraft;
  script: ScriptDraft;
};

export type StepVersion<TStep extends OriginalStep = OriginalStep> = {
  id: string;
  step: TStep;
  createdAt: string;
  source: VersionSource;
  summary: string;
  payload: StepPayloadMap[TStep];
};

export type StepVersionHistory = {
  [K in OriginalStep]: StepVersion<K>[];
};

export type ExtractionSnapshot = {
  rawTextHash: string;
  cleanedTextHash: string;
  cleanedTextLength: number;
  inputVisibility: InputVisibility;
  cleaningReport?: CleaningReport;
  snapshotAt: string;
};

export type ProjectRecord = {
  id: string;
  title: string;
  sourceMode?: SourceMode;
  outlineConstraints?: OutlineConstraints;
  sourceMaterial?: SourceMaterial;
  extractionSnapshot?: ExtractionSnapshot;
  draft: OriginalDraft;
  versionHistory: StepVersionHistory;
  providerConfig: ModelProviderConfig;
  updatedAt: string;
};

// 信息流 - 故事梗概部分
export type RewriteInfoFlowOverview = {
  audience: string;          // 目标受众
  genres: string;            // 题材类型（逗号分隔）
  coreHooks: string;         // 核心设定（逗号分隔）
  styleTags: string;         // 风格元素（逗号分隔）
  worldview: string;         // 世界观
  highlight: string;         // 核心亮点
  premise: string;           // 核心梗概
};

// 信息流 - 人物设定
export type RewriteInfoFlowCharacter = {
  id: string;
  name: string;
  age: number;
  traits: string;            // 性格特点
  background: string;        // 角色背景
};

// 信息流 - 粗纲
export type RewriteInfoFlowMacro = {
  content: string;
};

// 信息流 - 集纲
export type RewriteInfoFlowEpisodes = {
  episodes: string[];
};

export type RewriteInfoFlow = {
  sourceFileName: string;
  sourceText: string;
  uploaded: boolean;
  format: AdaptFormat | "";
  sourceTitle: string;
  sourceSynopsis: string;
  keyNodes: string;
  // AI 生成的内容
  overview: RewriteInfoFlowOverview;
  characters: RewriteInfoFlowCharacter[];
  macro: RewriteInfoFlowMacro;
  episodes: RewriteInfoFlowEpisodes;
};

export type RewriteOverviewDraft = {
  audience: string;
  genre: string;
  coreHooks: string[];
  styleTags: string[];
  worldview: string;
  highlight: string;
  premise: string;
  scriptType?: "ai_comic" | "short_drama";
};

export type RewriteOutlineDraft = {
  macro: string;
  episodes: string[];
  stageLabels: string[];
};

export type RewriteScriptDraft = {
  episode: string;
  content: string;
};

export type RewriteDraft = {
  title: string;
  infoFlow: RewriteInfoFlow;
  overview: RewriteOverviewDraft;
  characters: Character[];
  outlines: RewriteOutlineDraft;
  script: RewriteScriptDraft;
};

export type RewriteProjectRecord = {
  id: string;
  title: string;
  draft: RewriteDraft;
  providerConfig: ModelProviderConfig;
  updatedAt: string;
};

export type AdaptSourceChapter = {
  id: string;
  title: string;
  content: string;
  words: number;
  selected: boolean;
};

export type AdaptChapterDraft = {
  summary: string;
  entries: string[];
  stageLabels: string[];
};

export type AdaptDraft = {
  title: string;
  sourceFileName: string;
  sourceText: string;
  uploaded: boolean;
  format: AdaptFormat | "";
  selectedRangeLabel: string;
  chapters: AdaptSourceChapter[];
  chapter: AdaptChapterDraft;
  overview: RewriteOverviewDraft;
  characters: Character[];
  outlines: RewriteOutlineDraft;
  script: RewriteScriptDraft;
};

export type AdaptProjectRecord = {
  id: string;
  title: string;
  draft: AdaptDraft;
  providerConfig: ModelProviderConfig;
  updatedAt: string;
};

// ==================== 统一的项目结构（P0） ====================

// 统一的剧本草稿结构（用于共享工作台）
export type UnifiedScriptDraft = {
  episode: string;
  content: string;
  locked?: boolean;
};

// 统一项目记录结构
export type UnifiedProjectRecord = {
  id: string;
  title: string;
  sourceMode: SourceMode;        // 来源模式
  status: ProjectStatus;         // 项目状态
  createdAt: string;
  updatedAt: string;

  // 前置处理层数据（根据 sourceMode 选择使用）
  sourceMaterial: SourceMaterial;  // 原始素材

  // 共享工作台数据
  extraction?: StoryExtraction;    // 故事提取（信息流）
  characters: Character[];         // 人物设定
  outlines: UnifiedOutline;        // 统一大纲结构
  scripts: UnifiedScriptDraft[];   // 多集剧本（数组）

  // 配置和历史
  providerConfig: ModelProviderConfig;
  versionHistory: UnifiedVersionHistory;
};

// ==================== 正文引擎类型（P2） ====================

// 生成状态
export type GenerationState =
  | "idle"              // 空闲
  | "generating"        // 生成中
  | "reviewing"         // 审稿中
  | "revising"          // 改写中
  | "completed"         // 完成
  | "failed";           // 失败

// 生成状态详情
export type GenerationStatus = {
  state: GenerationState;
  currentEpisode: number;
  progress: number;      // 0-100
  currentStage: "generating" | "reviewing" | "revising";
  issues?: ReviewIssue[];
  score?: number;
  error?: string;
};

// 审稿问题类型
export type ReviewIssueType = "continuity" | "character" | "pacing" | "hook" | "format" | "structure";
export type ReviewIssueSeverity = "high" | "medium" | "low";

// 审稿问题
export type ReviewIssue = {
  type: ReviewIssueType;
  severity: ReviewIssueSeverity;
  position: { line: number; start: number; end: number };
  description: string;
  suggestion: string;
};

// 审稿标准
export type ReviewCriteria = {
  checkContinuity: boolean;    // 检查连贯性
  checkCharacterConsistency: boolean;  // 检查人物一致性
  checkPacing: boolean;        // 检查节奏
  checkHook: boolean;          // 检查钩子
};

// 生成上下文
export type GenerationContext = {
  extraction?: StoryExtraction;
  characters: Character[];
  outline: string;           // 当前集大纲
  previousEpisode?: string;  // 上一集内容（用于连贯性）
  constraints?: OutlineConstraints;
};
