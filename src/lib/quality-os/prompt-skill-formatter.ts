/**
 * Prompt Skill 规则块格式化器（P0-Rule-3）
 *
 * 用途：
 * - 将 PromptSkill[] 按 RuleApplyTarget 筛选后，格式化为可注入 Prompt 的中文规则块。
 * - 为后续 overview / characters / outline / episode_script 的生成前规则读取做准备。
 *
 * 约束：
 * - 纯函数，不访问 DB / 网络 / LLM / Provider
 * - 不触发真实调用、不扣费、不写入
 * - 不修改现有生成 prompt
 */

import type { PromptSkill, RuleApplyTarget, RuleCategory } from "./types";
import { getEnabledPromptSkillsForTarget } from "./prompt-skills";

// ==================== 分类标签中文映射 ====================

const CATEGORY_LABELS: Record<RuleCategory, string> = {
  hook: "钩子与悬念",
  character_agency: "角色能动性",
  dialogue: "对白与语言",
  outline_structure: "大纲结构",
  revision: "修改与审计",
  aether: "灵气与风格",
};

const CATEGORY_ORDER: RuleCategory[] = [
  "character_agency",
  "hook",
  "dialogue",
  "outline_structure",
  "revision",
  "aether",
];

// ==================== 格式化函数 ====================

/**
 * 将一组 PromptSkill 按 category 分组并格式化为可注入 Prompt 的中文规则块。
 *
 * 格式：
 * ```
 * ## 生成约束规则
 *
 * ### 角色能动性
 * - 【主角能动性规则】每集必须包含至少一个主角的主动决策或行动...
 *
 * ### 钩子与悬念
 * - 【结尾钩子规则】每集结尾必须包含以下至少一项...
 * ```
 *
 * @param skills - 待格式化的 PromptSkill 数组
 * @returns 格式化的中文规则块字符串。如果 skills 为空，返回空串。
 */
export function formatPromptSkillsBlock(skills: PromptSkill[]): string {
  if (skills.length === 0) return "";

  // 按 category 分组
  const grouped = new Map<RuleCategory, PromptSkill[]>();
  for (const skill of skills) {
    const list = grouped.get(skill.category);
    if (list) {
      list.push(skill);
    } else {
      grouped.set(skill.category, [skill]);
    }
  }

  // 按固定顺序输出分组
  const lines: string[] = [];
  lines.push("## 生成约束规则");
  lines.push("");

  for (const cat of CATEGORY_ORDER) {
    const catSkills = grouped.get(cat);
    if (!catSkills || catSkills.length === 0) continue;

    const label = CATEGORY_LABELS[cat] ?? cat;
    lines.push(`### ${label}`);
    lines.push("");

    for (const skill of catSkills) {
      // 每条规则：名称 + generationRule
      lines.push(`- **${skill.name}**：${skill.generationRule}`);
    }

    lines.push("");
  }

  // 尾部约束提示
  lines.push("以上规则为生成约束，请在输出前逐条自检。如有违反，请修改后再输出。");

  return lines.join("\n");
}

/**
 * 根据 target 获取已启用的 PromptSkill 并格式化为规则块。
 * 这是最常用的入口：传入目标阶段，直接获得可注入 Prompt 的规则文本。
 *
 * @param target - 生成阶段（overview / characters / outline / episode_script / quality_check）
 * @returns 格式化的中文规则块字符串。如果该 target 没有启用规则，返回空串。
 */
export function formatPromptSkillsForTarget(
  target: RuleApplyTarget,
): string {
  const skills = getEnabledPromptSkillsForTarget(target);
  return formatPromptSkillsBlock(skills);
}

// ==================== 测试样例 ====================

/**
 * 各 target 的预期格式化输出样例，用于快速验证格式化结果。
 * 仅作参考，实际输出取决于种子规则的 generationRule 内容。
 */
export const FORMAT_SAMPLES: Record<RuleApplyTarget, string> = {
  overview: formatPromptSkillsForTarget("overview"),
  characters: formatPromptSkillsForTarget("characters"),
  outline: formatPromptSkillsForTarget("outline"),
  episode_script: formatPromptSkillsForTarget("episode_script"),
  quality_check: formatPromptSkillsForTarget("quality_check"),
  inspiration: formatPromptSkillsForTarget("inspiration"),
};

/**
 * 输出所有 target 的规则块预览到 console。
 * 纯调试用，不影响任何生成链路。
 */
export function logPromptSkillBlocks(): void {
  const targets: RuleApplyTarget[] = [
    "inspiration",
    "overview",
    "characters",
    "outline",
    "episode_script",
    "quality_check",
  ];

  for (const target of targets) {
    const block = formatPromptSkillsForTarget(target);
    if (block) {
      console.log(`\n=== ${target} (${getEnabledPromptSkillsForTarget(target).length} 条规则) ===\n`);
      console.log(block);
    } else {
      console.log(`\n=== ${target} (0 条规则) ===\n`);
    }
  }
}
