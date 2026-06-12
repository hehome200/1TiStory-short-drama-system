// quality-os 统一导出
// - types.ts：所有类型定义（QualityRule / EvidenceCard / SkillEvidence / RuleCandidate / PromptSkill 等）
// - prompt-skills.ts：种子规则 + 纯函数 helper（P0-Rule-1）
// - assets/：静态资产（evidence-cards / quality-rules / breakdown-cards / editor-recommendations）
// - select-assets.ts：按条件筛选资产的纯函数
// - build-quality-report.ts / apply-report-to-draft.ts / apply-script-report.ts：质量报告构建与应用

// 类型
export type {
  // 现有 Quality OS 类型（输出质量检查）
  EvidenceSourceType,
  EvidenceStrength,
  EvidenceFreshness,
  ValidationLevel,
  QualityRuleStatus,
  QualityRuleUseMode,
  RecommendationStrength,
  QualityAssetType,
  GenerationQualityStage,
  ScriptType,
  EditorRecommendation,
  BreakdownCard,
  EvidenceCard,
  QualityRule,
  QualityIssue,
  QualityMetric,
  GenerationQualityReport,
} from "./types";

// Prompt Skill 冷启动类型（P0-Rule-1）
export type {
  SkillSourceType,
  RuleCategory,
  RuleApplyTarget,
  RuleStatus,
  RuleStrength,
  RuleRiskLevel,
  SkillEvidence,
  RuleCandidate,
  PromptSkill,
} from "./types";

// Claude 改稿反馈类型（P0-Rule-2）
export type {
  ClaudeRevisionProblem,
  ClaudeRevisionAction,
  ClaudeRevisionRuleSuggestion,
  ClaudeRevisionDigest,
} from "./types";

// QualityCheck 轻量风险提示类型（P0-Rule-5）
export type {
  QualityCheckHintSeverity,
  QualityCheckHint,
} from "./types";

// 种子规则 & Helper
export {
  getEnabledPromptSkillsForTarget,
  getRuleCandidatesForTarget,
  getEnabledSkillsByCategory,
  getAllRules,
  getAllEvidenceCards,
} from "./prompt-skills";

// Claude 改稿反馈模板（P0-Rule-2）
export {
  CLAUDE_REVISION_DIGEST_PROMPT,
  EXAMPLE_CLAUDE_REVISION_DIGEST,
  createRuleCandidatesFromClaudeRevisionDigest,
} from "./claude-revision-template";

// Prompt Skill 规则块格式化器（P0-Rule-3）
export {
  formatPromptSkillsBlock,
  formatPromptSkillsForTarget,
  FORMAT_SAMPLES,
  logPromptSkillBlocks,
} from "./prompt-skill-formatter";

// QualityCheck 轻量风险提示（P0-Rule-5）
export {
  buildQualityCheckHintsFromSkills,
  buildQualityCheckHintsForTarget,
  formatQualityCheckHintsForPrompt,
  attachQualityCheckHintsToReport,
  EXAMPLE_OUTLINE_QUALITY_CHECK_HINTS,
  QUALITY_CHECK_HINT_SAMPLES,
} from "./quality-check-hints";

// 静态资产（现有）
export {
  editorRecommendations,
  breakdownCards,
  qualityRules,
  evidenceCards,
} from "./assets";

// Quality OS Inspector 只读视图模型（P0-Rule-7）
export {
  buildQualityOsInspectorViewModel,
  detectQualityOsGovernanceIssues,
  /** P0-Governance-1: Agent 绑定治理检查 */
  detectAgentBindingGovernanceIssues,
  /** P0-Governance-2: 注入预览 */
  buildInjectionPreview,
} from "./inspector";

export type {
  GovernanceIssueSeverity,
  GovernanceIssue,
  TargetCoverage,
  QualityOsInspectorViewModel,
} from "./inspector";

// Rulers / Skills 产品资产层（P0-Asset-1）
export type {
  AssetScope,
  AssetTarget,
  AssetPlacement,
  AssetSource,
  AssetStatus,
  SkillAsset,
  RulerAssetCard,
  RulersSkillsAssetKind,
  RulersSkillsAssetCard,
} from "./types";

// 注入预览类型（P0-Governance-2）
export type {
  InjectionPreviewAgent,
  InjectionPreviewAsset,
  InjectionPreviewWarning,
  InjectionPreviewTarget,
} from "./types";

// quality_check dry-run 只读旁路探针（P0-Governance-7）
export type {
  QualityCheckDryRunProbe,
  QualityCheckDryRunAsset,
  QualityCheckDryRunExcludedAsset,
  QualityCheckDryRunWarning,
} from "./types";

export {
  getSkillAssets,
  getRulerAssetCards,
  getRulersSkillsAssetCards,
  getRulersSkillsAssetSummary,
} from "./rulers-skills-assets";

export { buildQualityCheckDryRunProbe } from "./inspector";

// quality_check dry-run 运行时探针（P1-QualityCheck-DryRun-RealProbe）
export type { QualityCheckDryRunRuntimeSummary, QualityCheckDryRunRuntimeAssetSnapshot } from "./types";
export { buildQualityCheckDryRunRuntimeSummary, buildQualityCheckDryRunRuntimeAssetSnapshot, emitQualityCheckDryRunRuntimeProbe } from "./runtime-probe";

// quality_check dry-run 审稿规则只读对照（P1-QualityCheck-DryRun-ReviewRuleAlignment）
export type { QualityCheckRuleAlignmentInputType, QualityCheckRuleAlignmentMatch } from "./types";
export { buildQualityCheckRuleAlignment } from "./review-rule-alignment";
export type { QualityCheckRuleAlignmentReport } from "./review-rule-alignment";

// Quality Reports 诊断（P1-QualityCheck-Reports-Diagnostics）
export type {
  QualityReportsDiagnosticDraftSummary,
  QualityReportsDiagnosticCodeHint,
  QualityReportsDiagnosticReport,
} from "./types";
export { buildQualityReportsCodeHints } from "./quality-reports-diagnostics";
