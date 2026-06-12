import type {
  SkillEvidence,
  RuleCandidate,
  PromptSkill,
  RuleApplyTarget,
} from "./types";

// ==================== 公共证据卡 ====================

const seedEvidenceCards: SkillEvidence[] = [
  {
    id: "public-outline-rhythm",
    sourceType: "user_feedback",
    claim: "公开版大纲通常需要清晰的节奏推进和阶段边界。",
    evidenceSummary: "当单集或单章缺少节奏变化时，读者更容易流失。",
    appliesTo: ["overview", "outline", "quality_check"],
    strength: "medium",
    riskTags: ["flat_structure"],
    createdAt: "2025-06-01T00:00:00.000Z",
  },
  {
    id: "public-character-voice",
    sourceType: "editor_review",
    claim: "不同角色需要稳定且可区分的表达方式。",
    evidenceSummary: "角色对白如果过于同质，人物辨识度会下降。",
    appliesTo: ["characters", "episode_script", "quality_check"],
    strength: "medium",
    riskTags: ["same_voice"],
    createdAt: "2025-06-01T00:00:00.000Z",
  },
  {
    id: "public-ending-hook",
    sourceType: "editor_review",
    claim: "段落结尾需要留下继续阅读或继续观看的动机。",
    evidenceSummary: "结尾如果只是状态收束而没有新问题，续看动力会变弱。",
    appliesTo: ["outline", "episode_script", "quality_check"],
    strength: "strong",
    riskTags: ["weak_hook"],
    createdAt: "2025-06-01T00:00:00.000Z",
  },
  {
    id: "public-boundary-safety",
    sourceType: "breakdown",
    claim: "生成链路应避免把内部实现细节、私有路由或私有规则正文注入公开输出。",
    evidenceSummary: "公开版保留功能接口，但不应输出内部策略、私有样本或内部成本信息。",
    appliesTo: ["inspiration", "overview", "characters", "outline", "episode_script", "quality_check"],
    strength: "strong",
    riskTags: ["private_body_leak"],
    createdAt: "2025-06-01T00:00:00.000Z",
  },
];

// ==================== 公共规则种子 ====================

const seedRules: RuleCandidate[] = [
  {
    id: "rule-project-intent-clarity",
    evidenceIds: ["public-boundary-safety"],
    name: "项目意图清晰规则",
    category: "revision",
    appliesTo: ["inspiration", "overview", "quality_check"],
    problemPattern: "项目目标、受众或边界描述过于模糊。",
    generationRule: "生成前先明确题材、受众、约束和输出目标，避免在核心意图未收敛时继续扩写。",
    reviewRule: "检查项目描述是否足够清晰，是否存在方向摇摆、约束冲突或目标缺失。",
    failureMessage: "项目意图不清晰：请先收敛题材、受众和边界，再继续生成。",
    status: "enabled",
    riskLevel: "low",
  },
  {
    id: "rule-character-agency-basic",
    evidenceIds: ["public-outline-rhythm"],
    name: "角色主动性规则",
    category: "character_agency",
    appliesTo: ["characters", "outline", "episode_script", "quality_check"],
    problemPattern: "角色只被动承受事件，没有主动选择或反应。",
    generationRule: "每个关键角色都应有可识别的选择、行动或推动剧情的动作，避免角色沦为纯反应器。",
    reviewRule: "检查关键角色是否有主动推进事件的节点，是否连续多段处于纯被动状态。",
    failureMessage: "角色主动性不足：关键角色缺少可识别的主动行为。",
    status: "enabled",
    riskLevel: "high",
  },
  {
    id: "rule-hook-episode-ending",
    evidenceIds: ["public-ending-hook"],
    name: "结尾钩子规则",
    category: "hook",
    appliesTo: ["outline", "episode_script", "quality_check"],
    problemPattern: "段落收尾过于平淡，没有留下下一步问题。",
    generationRule: "每个关键段落结尾都应留下问题、悬念、转折或新的待解决事项，以维持后续阅读动力。",
    reviewRule: "检查结尾是否存在明确的新问题、新风险或新的信息落点。",
    failureMessage: "结尾钩子缺失：请在段落结尾增加可继续推进的悬念或问题。",
    status: "enabled",
    riskLevel: "high",
  },
  {
    id: "rule-dialogue-character-voice",
    evidenceIds: ["public-character-voice"],
    name: "对白差异规则",
    category: "dialogue",
    appliesTo: ["characters", "episode_script", "quality_check"],
    problemPattern: "多个角色使用近似的话术和句式。",
    generationRule: "为不同角色保留稳定但有差异的语言习惯，让身份、性格和关系压力体现在对白里。",
    reviewRule: "检查抹去角色名后能否区分不同说话者，避免所有人都像同一种口吻。",
    failureMessage: "对白差异不足：不同角色的语言风格过于接近。",
    status: "enabled",
    riskLevel: "medium",
  },
  {
    id: "rule-outline-rhythm-structure",
    evidenceIds: ["public-outline-rhythm"],
    name: "大纲节奏规则",
    category: "outline_structure",
    appliesTo: ["overview", "outline", "quality_check"],
    problemPattern: "结构缺少阶段推进，节奏过于平均。",
    generationRule: "在大纲中安排清晰的推进阶段和节奏变化，让冲突、升级、反转和收束有可感知的边界。",
    reviewRule: "检查大纲是否存在阶段变化，是否能看到冲突与回收的节奏差异。",
    failureMessage: "大纲节奏不足：请补足结构阶段和推进节拍。",
    status: "candidate",
    riskLevel: "low",
  },
];

// ==================== 纯函数 Helper ====================

export function getEnabledPromptSkillsForTarget(
  target: RuleApplyTarget,
): PromptSkill[] {
  return seedRules.filter(
    (r): r is PromptSkill =>
      (r.status === "enabled" || r.status === "frozen") &&
      r.appliesTo.includes(target),
  );
}

export function getRuleCandidatesForTarget(
  target: RuleApplyTarget,
): RuleCandidate[] {
  return seedRules.filter((r) => r.appliesTo.includes(target));
}

export function getEnabledSkillsByCategory(
  target: RuleApplyTarget,
  category: RuleCandidate["category"],
): PromptSkill[] {
  return getEnabledPromptSkillsForTarget(target).filter((r) => r.category === category);
}

export function getAllRules(): ReadonlyArray<RuleCandidate> {
  return seedRules;
}

export function getAllEvidenceCards(): ReadonlyArray<SkillEvidence> {
  return seedEvidenceCards;
}
