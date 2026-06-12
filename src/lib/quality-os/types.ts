export type EvidenceSourceType =
  | "project_brief"
  | "script_plan"
  | "source_material"
  | "outline"
  | "episode_plan"
  | "beat_card"
  | "script_batch"
  | "user_feedback"
  | "reference_note"
  | "manual_note"
  | "public_hit_case";

export type EvidenceStrength = "weak" | "medium" | "strong" | "verified";

export type EvidenceFreshness = "fresh" | "recent" | "stale" | "unknown";

export type ValidationLevel = "L0" | "L1" | "L2" | "L3" | "L4";

export type QualityRuleStatus =
  | "candidate"
  | "active"
  | "watching"
  | "frozen"
  | "deprecated"
  | "archived";

export type QualityRuleUseMode =
  | "reference_only"
  | "audit_hint"
  | "rewrite_suggestion"
  | "soft_constraint"
  | "hard_constraint";

export type RecommendationStrength = "low" | "medium" | "high" | "critical";

export type QualityAssetType =
  | "rule"
  | "evidence"
  | "metric"
  | "issue"
  | "recommendation"
  | "report";

export type GenerationQualityStage =
  | "inspiration"
  | "project_brief"
  | "script_plan"
  | "outline"
  | "episode"
  | "script"
  | "polish"
  | "compliance";

export type ScriptType = "short_drama" | "ai_comic";

export type EditorRecommendation = {
  id: string;
  title: string;
  category: string;
  scriptType: ScriptType;
  tags: string[];
  applicableGenres: string[];
  commercialModes: string[];
  summary: string;
  whyRecommended: string;
  premisePattern?: string;
  characterPattern?: string;
  structurePattern?: string;
  cliffhangerPattern?: string;
  riskTags: string[];
  complianceNotes?: string[];
  evidenceIds: string[];
};

export type BreakdownCard = {
  id: string;
  sourceRecommendationId?: string;
  title: string;
  scriptType: ScriptType;
  tags: string[];
  breakdownType:
    | "premise"
    | "character"
    | "structure"
    | "cliffhanger"
    | "dialogue"
    | "commercial"
    | "compliance";
  reusablePattern: string;
  avoidCopying: string;
  applicableGenres: string[];
  evidenceIds: string[];
  riskTags: string[];
};

export type EvidenceCard = {
  id: string;
  sourceType: EvidenceSourceType;
  sourceId?: string;
  title?: string;
  claim?: string;
  summary: string;
  evidenceSummary?: string;
  strength: EvidenceStrength;
  freshness: EvidenceFreshness;
  supportedGenres?: string[];
  contradictedGenres?: string[];
  tags?: string[];
  riskTags?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type QualityRule = {
  id: string;
  title: string;
  description: string;
  level: ValidationLevel;
  status: QualityRuleStatus;
  useMode: QualityRuleUseMode;
  recommendationStrength?: RecommendationStrength;
  evidenceIds: string[];
  counterEvidenceIds: string[];
  applicableGenres?: string[];
  notApplicableGenres?: string[];
  commercialModes?: string[];
  antiTemplateRisk?: number;
  wateringRisk?: number;
  complianceRisk?: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type QualityIssue = {
  id: string;
  ruleId?: string;
  level: ValidationLevel;
  title: string;
  description: string;
  severity: RecommendationStrength;
  evidenceIds: string[];
  counterEvidenceIds?: string[];
  location?: {
    stage?: GenerationQualityStage;
    episodeNumber?: number;
    batchId?: string;
    field?: string;
  };
  suggestedAction?: string;
};

export type QualityMetric = {
  id: string;
  name: string;
  value: number;
  unit?: string;
  level?: ValidationLevel;
  evidenceIds?: string[];
  metadata?: Record<string, unknown>;
};

export type GenerationQualityReport = {
  id: string;
  projectId?: string;
  generationId?: string;
  stage: GenerationQualityStage;
  episodeNumber?: number;
  batchId?: string;
  createdAt: string;
  overallScore?: number;
  validationLevels: ValidationLevel[];
  evidenceCards: EvidenceCard[];
  rules: QualityRule[];
  issues: QualityIssue[];
  metrics: QualityMetric[];
  summary?: string;
  recommendation?: string;
  assetRefs?: Array<{
    assetType: QualityAssetType;
    assetId: string;
  }>;
  source?: "dev_manual" | "manual" | "auto" | "server" | "local_static";
  mode?: "local_static_rules" | "model_assisted" | "server_audit" | "local_static_audit";
  /** P0-Rule-6: 基于已启用 PromptSkill 的只读 QualityCheck 提示（旁路保留，不判断命中） */
  qualityHints?: QualityCheckHint[];
};

// ==================== Prompt Skill 冷启动类型（P0-Rule-1） ====================
// ⚠️ 与上方 QualityRule / EvidenceCard / QualityRuleStatus 属于不同语义层：
//    - 上方面向「输出质量检查」（生成后的校验/审计）
//    - 下方面向「提示词技能冷启动」（生成前/生成中的约束注入）
//    两类类型可共存于同一文件，但不可混用。

/** 提示词技能的证据来源（Claude改稿 / OpenClaw遗留 / 编辑审稿 / 拆解 / 用户反馈） */
export type SkillSourceType =
  | "claude_revision"
  | "openclaw_legacy"
  | "editor_review"
  | "breakdown"
  | "user_feedback";

/** 规则分类 */
export type RuleCategory =
  | "hook"
  | "character_agency"
  | "dialogue"
  | "outline_structure"
  | "revision"
  | "aether";

/** 规则应用目标（生成阶段） */
export type RuleApplyTarget =
  | "inspiration"
  | "overview"
  | "characters"
  | "outline"
  | "episode_script"
  | "quality_check";

/** 规则状态 */
export type RuleStatus =
  | "candidate"
  | "enabled"
  | "frozen"
  | "deprecated"
  | "archived";

/** 规则强度 */
export type RuleStrength = "weak" | "medium" | "strong";

/** 规则风险等级 */
export type RuleRiskLevel = "low" | "medium" | "high";

/**
 * 技能证据卡（Prompt Skill 冷启动用，与上方 EvidenceCard 语义不同）
 * - 上方 EvidenceCard：面向输出质量检查，含 freshness / supportedGenres / contradictedGenres
 * - 本类型 SkillEvidence：面向生成前约束注入，含 appliesTo / strength / riskTags
 */
export type SkillEvidence = {
  id: string;
  sourceType: SkillSourceType;
  claim: string;
  evidenceSummary: string;
  appliesTo: RuleApplyTarget[];
  strength: RuleStrength;
  riskTags: string[];
  createdAt: string;
};

/**
 * 候选规则（冷启动种子 / 人工审核反馈）
 * - category: 规则所属分类（hook / character_agency / dialogue / outline_structure / revision / aether）
 * - appliesTo: 数组，支持一条规则同时服务多个生成阶段
 * - problemPattern: 可被 AI 搜索的问题模式描述
 * - generationRule: 生成端的正向约束
 * - reviewRule: 审稿端的检查规则
 * - failureMessage: 违反时的提示文案
 */
export type RuleCandidate = {
  id: string;
  evidenceIds: string[];
  name: string;
  category: RuleCategory;
  appliesTo: RuleApplyTarget[];
  problemPattern: string;
  generationRule: string;
  reviewRule: string;
  failureMessage: string;
  status: RuleStatus;
  riskLevel: RuleRiskLevel;
};

/**
 * 已启用的提示词技能
 * - 必须是 enabled 或 frozen 状态的 RuleCandidate
 * - frozen 状态的规则仍可作为注入约束，但不可修改
 */
export type PromptSkill = RuleCandidate & {
  status: "enabled" | "frozen";
};

// ==================== Claude 改稿反馈提炼模板类型（P0-Rule-2） ====================
// 用于结构化接收 Claude 改稿后的反馈，提炼为 RuleCandidate。

/** Claude 改稿中发现的单个问题 */
export type ClaudeRevisionProblem = {
  originalIssue: string;
  affectedStage: RuleApplyTarget;
  observedSymptom: string;
  userFeedback?: string;
};

/** Claude 改稿中的单个修改动作 */
export type ClaudeRevisionAction = {
  changedWhat: string;
  changedWhy: string;
  reusablePattern: string;
};

/** Claude 改稿后的规则建议（每个建议可转为一条 RuleCandidate） */
export type ClaudeRevisionRuleSuggestion = {
  name: string;
  category: RuleCategory;
  appliesTo: RuleApplyTarget[];
  problemPattern: string;
  generationRule: string;
  reviewRule: string;
  failureMessage: string;
  riskLevel: RuleRiskLevel;
};

/** Claude 改稿反馈的结构化摘要 */
export type ClaudeRevisionDigest = {
  id: string;
  sourceType: "claude_revision";
  title: string;
  projectContext?: string;
  problems: ClaudeRevisionProblem[];
  actions: ClaudeRevisionAction[];
  ruleSuggestions: ClaudeRevisionRuleSuggestion[];
  createdAt: string;
};

// ==================== QualityCheck 轻量风险提示类型（P0-Rule-5） ====================
// 基于已启用 PromptSkill 的 reviewRule / failureMessage 生成"生成后检查提示"。
// 不解析真实生成文本、不调用 LLM、不自动改稿、不写入 GenerationQualityReport。
// 仅作为未来 QualityCheck prompt 构造的纯函数底座。

/** QualityCheck 提示严重程度 */
export type QualityCheckHintSeverity = "info" | "warning" | "error";

/** 审稿规则只读对照 - 输入类型（P1-QualityCheck-DryRun-ReviewRuleAlignmentInputUpgrade） */
export type QualityCheckRuleAlignmentInputType =
  | "scriptId"
  | "projectId"
  | "projectDraftId";

/** 审稿规则只读对照 - 单条 Ruler 匹配结果（P1-QualityCheck-DryRun-ReviewRuleAlignment） */
export type QualityCheckRuleAlignmentMatch = {
  rulerId: string;
  rulerName: string;
  status: string;
  source: string;
  priority?: number;
  matched: boolean;
  matchedTerms: string[];
  evidenceCount: number;
  note: string;
};

/** 单条 QualityCheck 风险提示 */
export type QualityCheckHint = {
  id: string;
  sourceRuleId: string;
  target: RuleApplyTarget;
  category: RuleCategory;
  severity: QualityCheckHintSeverity;
  title: string;
  reviewRule: string;
  failureMessage: string;
  suggestedAction: string;
};

// ==================== Rulers / Skills 产品资产层类型（P0-Asset-1） ====================

/** 资产作用域 */
export type AssetScope = "global" | "project" | "task" | "prompt";

/** 资产目标载体 */
export type AssetTarget =
  | "any"
  | "screenplay"
  | "novel"
  | "short_drama"
  | "ai_comic";

/** 资产注入位置 */
export type AssetPlacement = "system" | "user";

/** 资产来源 */
export type AssetSource =
  | "sboard_native"
  | "openclaw_legacy"
  | "claude_skill"
  | "user_created"
  | "reference_site";

/** 资产状态 */
export type AssetStatus =
  | "draft"
  | "candidate"
  | "enabled"
  | "frozen"
  | "deprecated"
  | "archived";

/** Skill 产品资产 */
export type SkillAsset = {
  id: string;
  name: string;
  description: string;
  scope: AssetScope;
  target: AssetTarget;
  placement: AssetPlacement;
  priority: number;
  content: string;
  example?: string;
  status: AssetStatus;
  source: AssetSource;
  tags: string[];
  appliesTo: RuleApplyTarget[];
  evidenceIds: string[];
  riskLevel: RuleRiskLevel;
};

/** Ruler 产品卡片（view model，从 RuleCandidate 映射） */
export type RulerAssetCard = {
  id: string;
  name: string;
  description: string;
  scope: AssetScope;
  target: AssetTarget;
  placement: AssetPlacement;
  priority: number;
  status: AssetStatus;
  source: AssetSource;
  category: RuleCategory;
  appliesTo: RuleApplyTarget[];
  riskLevel: RuleRiskLevel;
  tags: string[];
  problemPattern: string;
  generationRule: string;
  reviewRule: string;
  failureMessage: string;
  evidenceIds: string[];
};

/** 资产类型标识 */
export type RulersSkillsAssetKind = "ruler" | "skill";

/** 联合资产卡片 */
export type RulersSkillsAssetCard =
  | ({ kind: "ruler" } & RulerAssetCard)
  | ({ kind: "skill" } & SkillAsset);

// ==================== 注入预览类型（P0-Governance-2） ====================

/** 注入预览 - Agent 摘要 */
export type InjectionPreviewAgent = {
  id: string;
  name: string;
  role: string;
  stage: RuleApplyTarget;
  status: AssetStatus;
  source: AssetSource;
  riskLevel: RuleRiskLevel;
  boundRulerIds: string[];
  boundSkillIds: string[];
};

/** 注入预览 - Ruler/Skill 资产摘要 */
export type InjectionPreviewAsset = {
  id: string;
  name: string;
  status: AssetStatus;
  source: AssetSource;
  placement: AssetPlacement;
  priority: number;
  riskLevel: RuleRiskLevel;
  kind: "ruler" | "skill";
};

/** 注入预览 - 风险提示 */
export type InjectionPreviewWarning = {
  severity: "info" | "warning" | "error";
  title: string;
  description: string;
  relatedIds: string[];
};

/** 注入预览 - 单 Target 注入视图 */
export type InjectionPreviewTarget = {
  target: RuleApplyTarget;
  label: string;
  agents: InjectionPreviewAgent[];
  skills: InjectionPreviewAsset[];
  rulers: InjectionPreviewAsset[];
  warnings: InjectionPreviewWarning[];
  /** 注入顺序：Agent → Skills → Rulers → Source Contract → User Input */
  order: string[];
};

// ==================== quality_check dry-run 只读旁路探针（P0-Governance-7） ====================

export type QualityCheckDryRunAsset = {
  id: string;
  name: string;
  status: string;
  source: string;
  priority?: number;
};

export type QualityCheckDryRunExcludedAsset = {
  id: string;
  name: string;
  reason: "candidate" | "draft" | "deprecated" | "archived" | "openclaw_legacy" | "wrong_placement";
  /** 资产来源，仅用于信息标注，不用于注入 */
  source?: string;
};

export type QualityCheckDryRunWarning = {
  severity: "info" | "warning" | "error";
  title: string;
  description: string;
};

/**
 * quality_check dry-run 只读旁路探针（P0-Governance-7）
 *
 * 约束：
 * - 仅读取已有 buildInjectionPreview() 数据，不访问 DB/LLM/Provider
 * - 只筛选 target === "quality_check" 的资产
 * - 只将 enabled/frozen 纳入 enabledAssets
 * - candidate/draft/deprecated/archived 必须进入 excludedAssets
 * - 不拼 prompt，不触发模型，不写 DB，不扣费
 * - 不改变原有 quality_check 判断结果
 */
export type QualityCheckDryRunProbe = {
  /** 探针目标，当前固定为 quality_check */
  target: "quality_check";
  /** 标志为只读探针 */
  readonly: true;
  /** enabled/frozen 资产 */
  enabledAssets: {
    agents: QualityCheckDryRunAsset[];
    skills: QualityCheckDryRunAsset[];
    rulers: QualityCheckDryRunAsset[];
  };
  /** 被排除的资产及排除原因 */
  excludedAssets: QualityCheckDryRunExcludedAsset[];
  /** 探针警告信息 */
  warnings: QualityCheckDryRunWarning[];
  /** 本探针的确定性保证 */
  guarantees: string[];
};

/**
 * QualityCheck dry-run 运行时资产快照
 * 由 runtime-probe.ts 构建，包含完整资产明细（Agent/Skill/Ruler/排除项）
 * 不包含剧本文本、prompt、用户输入，仅含治理资产 metadata
 */
export type QualityCheckDryRunRuntimeAssetSnapshot = {
  target: "quality_check";
  readonly: true;
  enabledAssets: {
    agents: QualityCheckDryRunAsset[];
    skills: QualityCheckDryRunAsset[];
    rulers: QualityCheckDryRunAsset[];
  };
  excludedAssets: QualityCheckDryRunExcludedAsset[];
};

/**
 * QualityCheck dry-run 运行时摘要
 * 由 runtime-probe.ts 在 reviewEpisodeDraft() 链路中构建
 * 只输出统计摘要，不包含剧本文本、prompt、用户输入
 */
export type QualityCheckDryRunRuntimeSummary = {
  /** 探针目标，固定为 quality_check */
  target: "quality_check";
  /** 标志为只读探针 */
  readonly: true;
  /** 探针来源，用于区分挂点位置 */
  source: "reviewEpisodeDraft";
  /** 已启用 Agent 数量 */
  enabledAgentCount: number;
  /** 已启用 Skill 数量 */
  enabledSkillCount: number;
  /** 已启用 Ruler 数量 */
  enabledRulerCount: number;
  /** 被排除资产数量 */
  excludedAssetCount: number;
  /** 警告数量 */
  warningCount: number;
  /** 确定性保证列表 */
  guarantees: string[];
};

// ==================== Quality Reports 诊断类型（P1-QualityCheck-Reports-Diagnostics） ====================

/** 单条 ProjectDraft 诊断摘要（不含 draftJson 原文、不含 qualityReports 原文） */
export type QualityReportsDiagnosticDraftSummary = {
  projectDraftId: string;
  projectId: string;
  flowType: string;
  draftJsonLen: number;
  jsonValid: boolean;
  qualityReportsType: string | null;
  qualityReportsLen: number | null;
  updatedAt: string;
};

/** Quality Reports 诊断 codeHint（静态审计线索） */
export type QualityReportsDiagnosticCodeHint = {
  file: string;
  line?: number;
  kind: "initializer" | "reader" | "writer_candidate" | "unknown";
  note: string;
};

/** Quality Reports 诊断完整响应 */
export type QualityReportsDiagnosticReport = {
  ok: true;
  readonly: true;
  target: "quality_reports_diagnostics";
  source: "quality-os";
  generatedAt: string;
  summary: {
    totalDrafts: number;
    validJsonCount: number;
    invalidJsonCount: number;
    hasQualityReportsKey: number;
    qualityReportsArrayCount: number;
    emptyQualityReportsCount: number;
    nonEmptyQualityReportsCount: number;
    missingQualityReportsCount: number;
  };
  recentDrafts: QualityReportsDiagnosticDraftSummary[];
  codeHints: QualityReportsDiagnosticCodeHint[];
  guarantees: string[];
};
