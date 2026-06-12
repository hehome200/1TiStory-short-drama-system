/**
 * Claude 改稿反馈提炼模板（P0-Rule-2）
 *
 * 用途：
 * - CLAUDE_REVISION_DIGEST_PROMPT：给 Claude 的中文提示词模板，要求每次改稿后输出结构化摘要
 * - EXAMPLE_CLAUDE_REVISION_DIGEST：示例对象，展示"主角太被动"问题的提炼结果
 * - createRuleCandidatesFromClaudeRevisionDigest：将摘要中的 ruleSuggestions 转为 RuleCandidate[]
 *
 * 约束：
 * - 纯静态 / 纯类型层，不访问 DB、网络、LLM、Provider
 * - 不触发真实调用、不扣费、不写入
 */

import type {
  ClaudeRevisionDigest,
  ClaudeRevisionRuleSuggestion,
  RuleCandidate,
} from "./types";

// ==================== Claude 改稿 digest 模板 ====================

/**
 * 给 Claude 的中文提示词模板。
 *
 * 使用方式：在 Claude 改稿 session 开始时注入此模板，要求 Claude 在每次改稿后
 * 输出一个 ClaudeRevisionDigest 结构的 JSON，便于后续提炼为 RuleCandidate。
 */
export const CLAUDE_REVISION_DIGEST_PROMPT = `
## 改稿反馈规范（ClaudeRevisionDigest）

每次改稿完成后，请在回复末尾输出一个结构化摘要，格式如下：

\`\`\`json
{
  "id": "rev-{日期}-{序号}",
  "sourceType": "claude_revision",
  "title": "本次改稿的简短标题",
  "projectContext": "当前作品的项目背景（可选）",
  "problems": [
    {
      "originalIssue": "原版本存在的问题描述",
      "affectedStage": "感染阶段（inspiration|overview|characters|outline|episode_script|quality_check）",
      "observedSymptom": "具体表现为……",
      "userFeedback": "用户补充反馈（可选）"
    }
  ],
  "actions": [
    {
      "changedWhat": "具体修改了什么内容",
      "changedWhy": "为什么这样改",
      "reusablePattern": "可复用的修改模式"
    }
  ],
  "ruleSuggestions": [
    {
      "name": "规则名称（简短）",
      "category": "hook|character_agency|dialogue|outline_structure|revision|aether",
      "appliesTo": ["outline", "episode_script"],
      "problemPattern": "AI 搜索用的问题模式描述",
      "generationRule": "生成端正向约束",
      "reviewRule": "审稿端检查规则",
      "failureMessage": "违反时的提示文案",
      "riskLevel": "low|medium|high"
    }
  ],
  "createdAt": "ISO 8601 时间戳"
}
\`\`\`

### 填写要求

1. **problems**：至少 1 条。原问题必须具体，不要写"节奏不好"这种模糊描述。
2. **actions**：至少 1 条。reusablePattern 应该是"下次遇到类似问题可以直接套用"的模式。
3. **ruleSuggestions**：每条建议应该对应一个可沉淀的规则。如果本次改稿没有发现新规则模式，可以不输出。

### 示例

如果主角连续三集都是被动承受压力，应输出：

\`\`\`json
{
  "problems": [{
    "originalIssue": "主角在第 4-6 集完全被动，只承受反派攻击，没有做出任何主动选择",
    "affectedStage": "outline",
    "observedSymptom": "反派下毒→主角中毒→被救，反派绑架→主角被绑→等待救援，没有主角主动制造变量或反击的节点",
    "userFeedback": "用户说'主角太弱了，一直在挨打'"
  }],
  "actions": [{
    "changedWhat": "在第 5 集加入主角主动设局：表面接受反派条件，实则暗中收集证据",
    "changedWhy": "主角不能只是'受害者'，需要展示策略能力，让观众对主角产生认同",
    "reusablePattern": "主角被动→主动转换模式：在被压制时找到一个'信息差'或'盟友'作为突破口"
  }],
  "ruleSuggestions": [{
    "name": "主角能动性规则",
    "category": "character_agency",
    "appliesTo": ["outline", "episode_script", "quality_check"],
    "problemPattern": "主角连续被动承受压力，没有主动选择、反击或误判后的补救动作",
    "generationRule": "每集必须包含至少一个主角的主动决策或行动",
    "reviewRule": "检查每集主角是否至少有一个主动行为节点",
    "failureMessage": "主角能动性不足：本集缺少主动决策或行动节点",
    "riskLevel": "high"
  }]
}
\`\`\`
`.trim();

// ==================== 示例对象 ====================

/**
 * 示例 ClaudeRevisionDigest，围绕"主角太被动"问题。
 * 可用于测试 createRuleCandidatesFromClaudeRevisionDigest 映射函数。
 */
export const EXAMPLE_CLAUDE_REVISION_DIGEST: ClaudeRevisionDigest = {
  id: "rev-2025-06-01-A",
  sourceType: "claude_revision",
  title: "第 4-6 集主角能动性修复",
  projectContext: "都市悬疑短剧《暗涌》第 4-6 集大纲",
  problems: [
    {
      originalIssue:
        "主角在第 4-6 集完全被动，只承受反派攻击，没有做出任何主动选择或反击动作。",
      affectedStage: "outline",
      observedSymptom:
        "第 4 集：反派下毒 → 主角中毒 → 被朋友送医。第 5 集：反派设局陷害 → 主角被警察带走 → 律师保释。第 6 集：反派派人跟踪 → 主角发现但只是躲。连续三集主角没有主动制造变量，纯粹'遭遇-承受-被救'循环。",
      userFeedback: "用户反馈'主角太弱了，一直在挨打，没有爽感'。",
    },
    {
      originalIssue: "第 6 集结尾情绪描写收尾，没有形成新钩子。",
      affectedStage: "episode_script",
      observedSymptom:
        "结尾段落仅写'他站在窗边，握紧了拳头'，未抛出下一集必须回答的问题。",
    },
  ],
  actions: [
    {
      changedWhat:
        "在第 5 集加入主角主动设局：表面接受反派的条件，实则利用自己的 IT 背景暗中收集证据，在手机里留了备份。",
      changedWhy:
        "主角不能只是'受害者'。展示他的策略能力和专业优势，让观众对主角产生认同和期待。这也是悬疑类型的基本期待：主角应该比反派多想一步。",
      reusablePattern:
        "主角被动→主动转换模式：在被压制时找到一个'信息差'（如专业技能、隐藏人脉、反派不知道的秘密）作为突破口，将'承受'变为'布局'。",
    },
    {
      changedWhat:
        "将第 6 集结尾改为：主角发现证据链中有一个关键时间对不上——反派的不在场证明是伪造的。",
      changedWhy:
        "结尾必须抛出新线索/新问题，让观众产生'下一集会怎样'的期待。'握紧拳头'只是情绪，没有信息增量。改为'发现新线索'后，观众会想知道这个线索指向什么。",
      reusablePattern:
        "结尾钩子模式：发现新证据/新矛盾 → 原有认知被颠覆 → 必须看下一集才能确认。",
    },
  ],
  ruleSuggestions: [
    {
      name: "主角能动性规则",
      category: "character_agency",
      appliesTo: ["outline", "episode_script", "quality_check"],
      problemPattern:
        "主角连续被动承受压力，没有主动选择、反击或误判后的补救动作。",
      generationRule:
        "每集必须包含至少一个主角的主动决策或行动。主角不能只是'遭遇-承受-被救'，必须展示选择、反击、误判后的补救、或主动制造新变量。",
      reviewRule:
        "逐集检查主角行为图谱。如果某集主角只做了'观察/承受/逃跑/等待'而没有'决策/反击/布局/误导'，标记 failure。",
      failureMessage:
        "主角能动性不足：本集主角缺少主动决策或行动节点，仅被动承受外部压力。",
      riskLevel: "high",
    },
    {
      name: "结尾钩子规则",
      category: "hook",
      appliesTo: ["outline", "episode_script", "quality_check"],
      problemPattern:
        "集末缺乏新问题、新威胁、新误会、新证据或新反转，仅以情绪描述收尾。",
      generationRule:
        "每集结尾必须包含以下至少一项：新问题、新威胁、新误会、新证据揭露、关系变化、或剧情反转。",
      reviewRule:
        "检查每集结尾是否包含明确的新悬念或钩子。如果结尾仅含情绪描写且无新信息抛出，标记 failure。",
      failureMessage:
        "结尾钩子缺失：本集结尾未形成新问题/新威胁/新误会/新线索/新反转。",
      riskLevel: "high",
    },
  ],
  createdAt: "2025-06-01T12:00:00.000Z",
};

// ==================== 映射函数 ====================

/**
 * 将 ClaudeRevisionDigest 中的 ruleSuggestions 映射为 RuleCandidate[]。
 *
 * 规则：
 * - 每个 ruleSuggestion 映射为一条 RuleCandidate
 * - status 默认为 "candidate"
 * - evidenceIds 使用 digest.id（可后续由人工审核补全）
 * - id 格式：{digest.id}-rule-{序号}
 *
 * 纯函数，不访问 DB / 网络 / LLM / Provider，不产生写入。
 */
export function createRuleCandidatesFromClaudeRevisionDigest(
  digest: ClaudeRevisionDigest,
): RuleCandidate[] {
  return digest.ruleSuggestions.map(
    (suggestion: ClaudeRevisionRuleSuggestion, index: number): RuleCandidate => ({
      id: `${digest.id}-rule-${String(index + 1).padStart(2, "0")}`,
      evidenceIds: [digest.id],
      name: suggestion.name,
      category: suggestion.category,
      appliesTo: suggestion.appliesTo,
      problemPattern: suggestion.problemPattern,
      generationRule: suggestion.generationRule,
      reviewRule: suggestion.reviewRule,
      failureMessage: suggestion.failureMessage,
      status: "candidate",
      riskLevel: suggestion.riskLevel,
    }),
  );
}
