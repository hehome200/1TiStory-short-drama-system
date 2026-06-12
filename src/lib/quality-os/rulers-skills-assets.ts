/**
 * Rulers / Skills 产品资产层只读底座（P0-Asset-1）
 *
 * 职责：
 * - 提供静态 SkillAsset 种子资产。
 * - 将现有 RuleCandidate/PromptSkill 映射为产品化 RulerAssetCard。
 * - 提供联合视图 getRulersSkillsAssetCards / getRulersSkillsAssetSummary。
 *
 * 约束：
 * - 纯函数，不访问 DB / 网络 / LLM。
 * - 不新增 API、不写 DB、不修改生成链路。
 * - 不改变现有 RuleCandidate / PromptSkill 语义。
 */

import { getAllRules, getAllEvidenceCards } from "./prompt-skills";
import type {
  SkillAsset,
  RulerAssetCard,
  RulersSkillsAssetCard,
  RuleCandidate,
  AssetSource,
  AssetStatus,
  AssetTarget,
  SkillSourceType,
} from "./types";

// ==================== 内部映射工具 ====================

/** 将 SkillSourceType（证据卡）映射为 AssetSource（产品资产来源） */
function mapEvidenceSourceToAssetSource(
  sourceType: SkillSourceType,
): AssetSource {
  switch (sourceType) {
    case "claude_revision":
      return "claude_skill";
    case "openclaw_legacy":
      return "openclaw_legacy";
    case "editor_review":
    case "breakdown":
      return "sboard_native";
    case "user_feedback":
      return "user_created";
    default:
      return "sboard_native";
  }
}

/** 根据 RuleCandidate 的 evidenceIds 推断 AssetSource */
function inferAssetSourceFromRule(rule: RuleCandidate): AssetSource {
  if (rule.evidenceIds.length === 0) return "sboard_native";

  const evidenceCards = getAllEvidenceCards();
  const matchedSources = new Set<AssetSource>();

  for (const eid of rule.evidenceIds) {
    const evidence = evidenceCards.find((e) => e.id === eid);
    if (evidence) {
      matchedSources.add(mapEvidenceSourceToAssetSource(evidence.sourceType));
    }
  }

  if (matchedSources.size === 0) return "sboard_native";
  if (matchedSources.size === 1) return [...matchedSources][0];

  // 多个来源时优先取 claude_skill / openclaw_legacy
  if (matchedSources.has("claude_skill")) return "claude_skill";
  if (matchedSources.has("openclaw_legacy")) return "openclaw_legacy";
  return "sboard_native";
}

/** 将 RuleStatus 映射为 AssetStatus */
function mapRuleStatusToAssetStatus(status: RuleCandidate["status"]): AssetStatus {
  // RuleStatus = "candidate" | "enabled" | "frozen" | "deprecated" | "archived"
  // AssetStatus 完全覆盖这些值，外加 "draft"
  return status as AssetStatus;
}

/** 为 RuleCandidate 生成产品描述（不直接等于 problemPattern） */
function buildRulerDescription(rule: RuleCandidate): string {
  switch (rule.id) {
    case "rule-character-agency-main":
      return "解决主角缺少主动选择与反击动作的问题";
    case "rule-hook-episode-ending":
      return "解决结尾缺钩子、缺新威胁的问题";
    case "rule-dialogue-character-voice":
      return "解决台词解释腔和角色声音趋同的问题";
    case "rule-structure-30ep-unit":
      return "解决分集结构平铺、缺少剧情单元节奏的问题";
    case "short-drama-humanizer":
      return "解决短剧正文 AI 模板化表达的问题";
    case "rule-openclaw-audit-boundary":
      return "确保 OpenClaw 历史资产仅作审计参考";
    default:
      return `创作规则：${rule.name}`;
  }
}

/** 将 RuleCandidate 映射为 RulerAssetCard */
function mapRuleToRulerCard(rule: RuleCandidate): RulerAssetCard {
  return {
    id: rule.id,
    name: rule.name,
    description: buildRulerDescription(rule),
    scope: "project",
    target: "short_drama" as AssetTarget,
    placement: "system",
    priority: 50,
    status: mapRuleStatusToAssetStatus(rule.status),
    source: inferAssetSourceFromRule(rule),
    category: rule.category,
    appliesTo: rule.appliesTo,
    riskLevel: rule.riskLevel,
    tags: [rule.category],
    problemPattern: rule.problemPattern,
    generationRule: rule.generationRule,
    reviewRule: rule.reviewRule,
    failureMessage: rule.failureMessage,
    evidenceIds: rule.evidenceIds,
  };
}

// ==================== 种子 Skill 资产 ====================

const seedSkillAssets: SkillAsset[] = [
  // Skill 1: 短剧人话化（已接入生成链路，status=enabled）
  {
    id: "skill-short-drama-humanizer",
    name: "短剧人话化",
    description:
      "对短剧正文执行去 AI 味处理：消除解释型台词、模板动作、角色语言趋同，保留戏剧功能动作",
    scope: "project",
    target: "short_drama",
    placement: "system",
    priority: 80,
    content:
      "短剧正文需去 AI 味但不牺牲戏剧功能：台词优先反应句、打断句和角色化表达，少用因为/所以/其实/这说明等解释型说明腔；角色语言需区分句长、节奏、攻击方式和露怯方式；情绪用可拍动作、停顿、误判、反击表现；禁用心中一惊、眼神骤冷、深吸一口气、嘴角冷笑等模板动作；保留剧情事实、人物关系、集纲节点、爽点、关键主语/对象/证据/因果/威胁；动作不是越少越好，证据/压迫/反击/职业/情绪/空间/道具等功能动作只能优化不能删除，不得把场面改成纯对白。",
    status: "enabled",
    source: "claude_skill",
    tags: ["去AI味", "短剧", "对白优化", "动作保留"],
    appliesTo: ["episode_script", "quality_check"],
    evidenceIds: [],
    riskLevel: "medium",
  },

  // Skill 2: 动作功能分级
  {
    id: "skill-action-function-grading",
    name: "动作功能分级",
    description:
      "区分 A 类无功能模板动作与 B 类功能动作，去 AI 味时不得误删证据、压迫、反击、职业、情绪、空间、道具动作",
    scope: "project",
    target: "short_drama",
    placement: "system",
    priority: 70,
    content:
      "动作分级规则：\nA 类（无功能模板动作）— 心中一惊、眼神骤冷、深吸一口气、嘴角冷笑、眸光一闪等，这些是 AI 高频模板，应删除或替换。\nB 类（功能动作）— 证据动作（藏/递/翻/拍）、压迫动作（逼近/按住/拦/俯视）、反击动作（推开/抄起/踹/扇）、职业动作（刷卡/递病历/拨号）、情绪动作（后退半步/停顿/手抖）、空间动作（靠墙/蹲下/拉窗帘）、道具动作（点燃/拧开/折叠）— 这些承载戏剧功能，只能优化不能删除。\n关键原则：动作不是越少越好，不得把场面改成纯对白。",
    status: "candidate",
    source: "claude_skill",
    tags: ["动作分级", "去AI味", "功能动作", "模板动作"],
    appliesTo: ["episode_script", "quality_check"],
    evidenceIds: [],
    riskLevel: "medium",
  },

  // Skill 3: 角色语言指纹
  {
    id: "skill-character-voice-fingerprint",
    name: "角色语言指纹",
    description:
      "按句长、节奏、攻击方式、露怯方式区分角色语言，避免不同角色对白风格趋同",
    scope: "project",
    target: "short_drama",
    placement: "system",
    priority: 60,
    content:
      "为每个主要角色建立独立的语言指纹：\n1. 句长偏好 — 短句/中长句/长句，反映性格急躁程度和思考习惯。\n2. 节奏 — 话密/话疏、是否爱停顿、是否爱反问、是否爱截话。\n3. 攻击方式 — 直接挑衅/阴阳怪气/冷漠无视/居高临下/装无辜/道德绑架。\n4. 露怯方式 — 嘴硬/转移话题/沉默/装傻/甩锅/认怂。\n5. 职业语言 — 是否带有职业术语、行话、敬语习惯。\n6. 利害语言 — 试探/命令/讨好/回避策略。\n关键原则：抹去角色名后仍能区分说话者。",
    status: "candidate",
    source: "openclaw_legacy",
    tags: ["角色语言", "对白", "人物辨识度"],
    appliesTo: ["characters", "episode_script", "quality_check"],
    evidenceIds: [],
    riskLevel: "medium",
  },

  // Skill 4: 强钩子结尾
  {
    id: "skill-strong-ending-hook",
    name: "强钩子结尾",
    description:
      "每集结尾制造新问题、新威胁、新证据、关系变化或反转，形成持续观看动机",
    scope: "project",
    target: "short_drama",
    placement: "system",
    priority: 75,
    content:
      "每集结尾必须包含以下至少一项：\n1. 新问题 — 抛出必须回答的悬念（谁来了？什么意思？）。\n2. 新威胁 — 角色刚松一口气立刻面临新危险。\n3. 新证据 — 揭露关键线索改变局势认知。\n4. 关系变化 — 信任/敌意/同盟关系的突然转变。\n5. 反转 — 观众以为的真相被推翻。\n禁止结尾：纯情绪描写收尾（如'他握紧了拳'）、任务完成式收尾（'一切终于结束了'）、无新信息的状态描述。",
    status: "candidate",
    source: "sboard_native",
    tags: ["钩子", "结尾", "悬念"],
    appliesTo: ["outline", "episode_script", "quality_check"],
    evidenceIds: [],
    riskLevel: "high",
  },

  // Skill 5: 大纲锁定意识
  {
    id: "skill-outline-lock-awareness",
    name: "大纲锁定意识",
    description:
      "生成时把故事母本、项目约束、分集大纲作为上位约束，确保正文不偏离大纲设定",
    scope: "project",
    target: "short_drama",
    placement: "system",
    priority: 65,
    content:
      "大纲锁定意识规则：\n1. 故事母本优先 — 正文生成前必须先提取故事母本中的核心设定（人物关系、主线矛盾、世界观规则），不得在正文中引入母本之外的重大新设定。\n2. 项目约束不可覆盖 — 集数限制、篇幅限制、审查边界等来自项目 Brief 的硬约束不得被正文生成忽略。\n3. 分集大纲为上位约束 — 每集正文必须完成分集大纲指定的剧情节点、情绪曲线和关键对话场景，不得跳过或替换核心节点。\n4. 偏离检测 — 如正文生成中发现与大纲冲突（人物行为不符合大纲设定、事件顺序错乱），应在生成前检测并拒绝，而非事后修改。",
    status: "candidate",
    source: "openclaw_legacy",
    tags: ["大纲约束", "母本锁定", "一致性"],
    appliesTo: ["outline", "episode_script", "quality_check"],
    evidenceIds: [],
    riskLevel: "medium",
  },
];

// ==================== 导出函数 ====================

/** 获取所有 Skill 静态种子资产 */
export function getSkillAssets(): SkillAsset[] {
  return seedSkillAssets;
}

/** 从现有 RuleCandidate 映射所有 Ruler 产品卡片 */
export function getRulerAssetCards(): RulerAssetCard[] {
  const allRules = getAllRules();
  return allRules.map(mapRuleToRulerCard);
}

/** 获取联合 Rulers + Skills 资产卡片（为 /admin/rulers-skills 广场页提供数据） */
export function getRulersSkillsAssetCards(): RulersSkillsAssetCard[] {
  const rulerCards: RulersSkillsAssetCard[] = getRulerAssetCards().map(
    (card) => ({
      kind: "ruler" as const,
      ...card,
    }),
  );

  const skillCards: RulersSkillsAssetCard[] = getSkillAssets().map((asset) => ({
    kind: "skill" as const,
    ...asset,
  }));

  return [...rulerCards, ...skillCards];
}

/** 获取资产概览统计 */
export function getRulersSkillsAssetSummary() {
  const rulerCards = getRulerAssetCards();
  const skillAssets = getSkillAssets();
  const allCards = [...rulerCards, ...skillAssets];

  const sources = [...new Set(allCards.map((c) => c.source))];
  const targets = [...new Set(allCards.map((c) => c.target))];

  const enabledCount = allCards.filter(
    (c) => c.status === "enabled" || c.status === "frozen",
  ).length;
  const candidateCount = allCards.filter(
    (c) => c.status === "candidate",
  ).length;

  return {
    total: allCards.length,
    rulersCount: rulerCards.length,
    skillsCount: skillAssets.length,
    enabledCount,
    candidateCount,
    sources,
    targets,
  };
}
