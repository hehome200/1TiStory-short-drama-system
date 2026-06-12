/**
 * QualityCheck 轻量风险提示底座（P0-Rule-5）
 *
 * 用途：
 * - 基于已启用的 PromptSkill，生成"生成后检查提示"（QualityCheckHint[]）。
 * - 使用每条规则的 reviewRule / failureMessage 形成轻量风险提示。
 * - 为未来 QualityCheck prompt 构造提供纯函数底座。
 *
 * 约束：
 * - 纯函数，不访问 DB / 网络 / LLM / Provider
 * - 不解析真实生成文本
 * - 不判断"是否命中"
 * - 不调用 LLM
 * - 不写入 GenerationQualityReport
 * - 不把 candidate 规则转成 hint
 * - 不自动改稿、不覆盖用户内容
 */

import { getEnabledPromptSkillsForTarget } from "./prompt-skills";
import type {
  GenerationQualityReport,
  PromptSkill,
  QualityCheckHint,
  QualityCheckHintSeverity,
  RuleApplyTarget,
  RuleCategory,
} from "./types";

// ==================== 分类操作提示文案 ====================

const CATEGORY_ACTION_HINTS: Record<RuleCategory, string> = {
  hook: "补强结尾悬念或新问题",
  character_agency: "补主角主动动作或选择",
  dialogue: "增强角色语言差异",
  outline_structure: "复核阶段节奏与卡点承接",
  revision: "只作为审计边界，不作为强制改写",
  aether: "检查是否过度模板化",
};

// ==================== severity 映射 ====================

/** 按 PromptSkill.riskLevel 映射 QualityCheckHintSeverity */
function getSeverityForSkill(skill: PromptSkill): QualityCheckHintSeverity {
  if (skill.riskLevel === "high") return "error";
  if (skill.riskLevel === "medium") return "warning";
  return "info";
}

/** 通用 suggestedAction 生成（纯字符串，不调用模型） */
function buildSuggestedAction(skill: PromptSkill): string {
  const actionHint = CATEGORY_ACTION_HINTS[skill.category] ?? "复核生成结果";
  return `请根据该检查项复核生成结果；如命中风险，优先按 "${skill.failureMessage.replace(/"/g, "'")}" 的方向调整，不要覆盖用户明确约束。建议方向：${actionHint}。`;
}

// ==================== 核心映射函数 ====================

/**
 * 将一组 PromptSkill 映射为 QualityCheckHint[]。
 * 纯映射：提取 reviewRule / failureMessage → QualityCheckHint 字段。
 *
 * @param target - 生成阶段
 * @param skills - 已启用的 PromptSkill 数组
 * @returns QualityCheckHint 数组
 */
export function buildQualityCheckHintsFromSkills(
  target: RuleApplyTarget,
  skills: PromptSkill[],
): QualityCheckHint[] {
  return skills.map((skill, idx) => ({
    id: `qc-hint-${target}-${skill.id}`,
    sourceRuleId: skill.id,
    target,
    category: skill.category,
    severity: getSeverityForSkill(skill),
    title: skill.name,
    reviewRule: skill.reviewRule,
    failureMessage: skill.failureMessage,
    suggestedAction: buildSuggestedAction(skill),
  }));
}

/**
 * 根据 target 获取已启用的 PromptSkill 并构建 QualityCheckHint[]。
 * 最常用入口：传入目标阶段，直接获得该阶段的检查提示列表。
 *
 * @param target - 生成阶段
 * @returns QualityCheckHint 数组
 */
export function buildQualityCheckHintsForTarget(
  target: RuleApplyTarget,
): QualityCheckHint[] {
  const skills = getEnabledPromptSkillsForTarget(target);
  return buildQualityCheckHintsFromSkills(target, skills);
}

// ==================== 格式化输出 ====================

/**
 * 将 QualityCheckHint[] 格式化为中文轻量检查提示块，供未来 QualityCheck prompt 使用。
 *
 * 格式：
 * ```
 * ## 生成后质量检查项
 *
 * ### ❌ 主角能动性规则
 * - 检查规则：检查每集主角是否至少有一个主动行为节点...
 * - 命中提示：主角能动性不足：本集主角缺少主动决策或行动节点...
 * - 建议：...
 * ```
 *
 * @param hints - QualityCheckHint 数组
 * @returns 格式化的中文检查提示块字符串。如果 hints 为空，返回空串。
 */
export function formatQualityCheckHintsForPrompt(
  hints: QualityCheckHint[],
): string {
  if (hints.length === 0) return "";

  const lines: string[] = [];
  lines.push("## 生成后质量检查项");
  lines.push("");

  for (const hint of hints) {
    const severityIcon =
      hint.severity === "error" ? "❌" : hint.severity === "warning" ? "⚠️" : "ℹ️";
    lines.push(`### ${severityIcon} ${hint.title}`);
    lines.push("");
    lines.push(`- **检查规则**：${hint.reviewRule}`);
    lines.push(`- **命中提示**：${hint.failureMessage}`);
    lines.push(`- **建议**：${hint.suggestedAction}`);
    lines.push("");
  }

  lines.push("以上检查项仅供人工复核参考，请勿自动修改生成内容。如命中风险，优先调整后重新生成。");

  return lines.join("\n");
}

// ==================== Report 旁路接入（P0-Rule-6） ====================

/**
 * 将 QualityCheckHint[] 以只读旁路附加到 GenerationQualityReport。
 *
 * - 纯函数，不修改原 report 对象。
 * - hints 为空时不输出 title，不增加噪音。
 * - 不判断命中、不解析真实文本、不调用 LLM、不写 DB。
 *
 * @param report - 已有质量报告
 * @param target - 生成阶段
 * @returns 附加了 qualityHints 的新报告对象
 */
export function attachQualityCheckHintsToReport(
  report: GenerationQualityReport,
  target: RuleApplyTarget,
): GenerationQualityReport {
  const qualityHints = buildQualityCheckHintsForTarget(target);
  if (qualityHints.length === 0) return report;
  return { ...report, qualityHints };
}

// ==================== 测试样例 ====================

/** outline 阶段的 QualityCheckHint 样例（当前含 2 条规则） */
export const EXAMPLE_OUTLINE_QUALITY_CHECK_HINTS =
  buildQualityCheckHintsForTarget("outline");

/** 所有 target 的 QualityCheckHint 样例，供快速验证 */
export const QUALITY_CHECK_HINT_SAMPLES: Record<RuleApplyTarget, QualityCheckHint[]> = {
  overview: buildQualityCheckHintsForTarget("overview"),
  characters: buildQualityCheckHintsForTarget("characters"),
  outline: buildQualityCheckHintsForTarget("outline"),
  episode_script: buildQualityCheckHintsForTarget("episode_script"),
  quality_check: buildQualityCheckHintsForTarget("quality_check"),
  inspiration: buildQualityCheckHintsForTarget("inspiration"),
};
