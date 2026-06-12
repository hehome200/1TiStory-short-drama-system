/**
 * Quality OS Inspector 纯函数层（P0-Rule-7）
 *
 * 用途：
 * - 构建后台只读 Quality OS / Prompt Skill Inspector 视图模型。
 * - 执行治理检查，检测缺失/冲突/高风险规则配置。
 *
 * 约束：
 * - 纯函数，不访问 DB / 网络 / LLM / Provider / API
 * - 不写 DB、不触发真实调用
 * - 所有数据来源于当前已加载的静态种子规则
 */

import { getAllRules, getAllEvidenceCards } from "./prompt-skills";
import { buildQualityCheckHintsForTarget } from "./quality-check-hints";
import {
  getRulerAssetCards,
  getSkillAssets,
} from "./rulers-skills-assets";
import type {
  RuleCandidate,
  RuleApplyTarget,
  QualityCheckHint,
  SkillSourceType,
  InjectionPreviewTarget,
  InjectionPreviewAgent,
  InjectionPreviewAsset,
  InjectionPreviewWarning,
  QualityCheckDryRunProbe,
  QualityCheckDryRunAsset,
  QualityCheckDryRunExcludedAsset,
  QualityCheckDryRunWarning,
} from "./types";

// ==================== View Model 类型 ====================

export type GovernanceIssueSeverity = "info" | "warning" | "error";

export type GovernanceIssue = {
  check: string;
  severity: GovernanceIssueSeverity;
  detail: string;
  affectedIds: string[];
  /** Agent 绑定治理专用：关联的 Agent ID */
  agentId?: string;
  /** Agent 绑定治理专用：关联的资产 ID 列表 */
  relatedAssetIds?: string[];
  /** Agent 绑定治理专用：治理建议 */
  recommendation?: string;
};

export type TargetCoverage = {
  target: RuleApplyTarget;
  enabledSkillsCount: number;
  hintsCount: number;
  rules: RuleCandidate[];
  hints: QualityCheckHint[];
};

export type QualityOsInspectorViewModel = {
  summary: {
    totalRules: number;
    enabledFrozen: number;
    candidate: number;
    governanceIssueCount: number;
    /** Agent 绑定治理风险数（仅 warning + error） */
    agentBindingIssueCount: number;
  };
  targets: Record<RuleApplyTarget, TargetCoverage>;
  rules: RuleCandidate[];
  allHints: Record<RuleApplyTarget, QualityCheckHint[]>;
  governanceIssues: GovernanceIssue[];
  /** Agent 绑定治理检查结果（P0-Governance-1） */
  agentBindingGovernanceIssues: GovernanceIssue[];
  /** P0-Governance-2: 注入预览（Rulers / Skills / Agents 统一视角） */
  injectionPreview: InjectionPreviewTarget[];
  evidenceStats: {
    totalEvidenceCards: number;
    bySourceType: Record<SkillSourceType | "unknown", number>;
  };
};

// ==================== quality_check dry-run 只读旁路探针（P0-Governance-7） ====================

/**
 * 构建 quality_check dry-run 只读旁路探针（P0-Governance-7）
 *
 * 设计目标：
 * - 在真实审稿链路（reviewEpisodeDraft）旁边，提供一个只读 dry-run 探针
 * - 探针只评估当前 quality_check 会关联哪些 enabled/frozen 资产
 * - 探针不触发 LLM，不写 DB，不扣费，不改变原 quality_check 结果
 *
 * 数据来源：
 * - 完全复用 buildInjectionPreview() 中 quality_check target 的资产数据
 * - 不访问 DB / LLM / Provider / API
 * - 不修改任何生成链路
 *
 * 安全性保证：
 * - 纯函数，无副作用
 * - 不触发 real_call
 * - 不调用 runWithAuraCharge
 * - 不写 prisma
 */
export function buildQualityCheckDryRunProbe(): QualityCheckDryRunProbe {
  const allPreviews = buildInjectionPreview();
  const qcPreview = allPreviews.find((p) => p.target === "quality_check");

  const enabledAgents: QualityCheckDryRunAsset[] = [];
  const enabledSkills: QualityCheckDryRunAsset[] = [];
  const enabledRulers: QualityCheckDryRunAsset[] = [];
  const excludedAssets: QualityCheckDryRunExcludedAsset[] = [];
  const warnings: QualityCheckDryRunWarning[] = [];

  if (!qcPreview) {
    return {
      target: "quality_check",
      readonly: true,
      enabledAssets: { agents: [], skills: [], rulers: [] },
      excludedAssets: [],
      warnings: [
        {
          severity: "warning",
          title: "未找到 quality_check 注入预览数据",
          description:
            "buildInjectionPreview() 未返回 quality_check target，可能 ALL_TARGETS 配置有误或类型不一致。",
        },
      ],
      guarantees: [
        "纯函数，无副作用",
        "不触发 LLM",
        "不写 DB",
        "不扣费",
        "不改变原 quality_check 判断",
        "不拼接真实 prompt",
        "不修改 Provider routing",
      ],
    };
  }

  // ── Agents ──
  for (const agent of qcPreview.agents) {
    if (isEnabledOrFrozenAgent(agent)) {
      enabledAgents.push({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        source: agent.source,
      });
    } else {
      excludedAssets.push({
        id: agent.id,
        name: agent.name,
        reason: agent.status as QualityCheckDryRunExcludedAsset["reason"],
      });
    }
  }

  // ── Skills ──
  for (const skill of qcPreview.skills) {
    if (isNonActiveAssetStatus(skill.status)) {
      excludedAssets.push({
        id: skill.id,
        name: skill.name,
        reason: skill.status as QualityCheckDryRunExcludedAsset["reason"],
      });
    } else {
      enabledSkills.push({
        id: skill.id,
        name: skill.name,
        status: skill.status,
        source: skill.source,
        priority: skill.priority,
      });
    }
  }

  // ── Rulers ──
  for (const ruler of qcPreview.rulers) {
    if (isNonActiveAssetStatus(ruler.status)) {
      excludedAssets.push({
        id: ruler.id,
        name: ruler.name,
        reason: ruler.status as QualityCheckDryRunExcludedAsset["reason"],
      });
    } else {
      enabledRulers.push({
        id: ruler.id,
        name: ruler.name,
        status: ruler.status,
        source: ruler.source,
        priority: ruler.priority,
      });
    }
  }

  // ── Warnings ──
  // 无 Agent 时提示
  if (enabledAgents.length === 0) {
    warnings.push({
      severity: "warning",
      title: "无已注册执行 Agent",
      description:
        "quality_check 当前无 enabled/frozen Agent。未来接入真实审稿链路前需确认执行主体。",
    });
  }

  // candidate 过多时提示
  const candidateCount = excludedAssets.filter((a) => a.reason === "candidate").length;
  if (candidateCount > 0) {
    warnings.push({
      severity: "info",
      title: `${candidateCount} 条候选资产待审核`,
      description:
        `当前有 ${candidateCount} 条 candidate 状态资产被排除，仅展示不代表进入真实审稿链路。`,
    });
  }

  // OpenClaw legacy 检测（source === "openclaw" 且 status === "legacy"）
  const openclawAssets = excludedAssets.filter(
    (a) =>
      (a.id.startsWith("openclaw-") || a.source?.includes("openclaw")) &&
      a.reason === "archived",
  );
  if (openclawAssets.length > 0) {
    warnings.push({
      severity: "info",
      title: "OpenClaw legacy 资产已排除",
      description:
        `${openclawAssets.length} 条 OpenClaw legacy 资产仅提示不注入，不会进入真实审稿链路。`,
    });
  }

  return {
    target: "quality_check",
    readonly: true,
    enabledAssets: {
      agents: enabledAgents,
      skills: enabledSkills,
      rulers: enabledRulers,
    },
    excludedAssets,
    warnings,
    guarantees: [
      "纯函数，无副作用",
      "不触发 LLM",
      "不写 DB",
      "不扣费",
      "不改变原 quality_check 判断",
      "不拼接真实 prompt",
      "不修改 Provider routing",
    ],
  };
}

// Agent enabled/frozen 判断（Agent 使用不同的 status 字段）
function isEnabledOrFrozenAgent(agent: InjectionPreviewAgent): boolean {
  return agent.status === "enabled" || agent.status === "frozen";
}

// Re-export 注入预览类型（供 client panel import）
export type { InjectionPreviewTarget } from "./types";

// ==================== 治理检查 ====================

const ALL_TARGETS: RuleApplyTarget[] = [
  "overview",
  "characters",
  "outline",
  "episode_script",
  "quality_check",
  "inspiration",
];

/** Target 中文标签（用于注入预览等 server 端视图） */
const TARGET_LABELS: Record<RuleApplyTarget, string> = {
  overview: "世界观/综览",
  characters: "角色设定",
  outline: "分集大纲",
  episode_script: "单集剧本",
  quality_check: "质量审计",
  inspiration: "灵感激发",
};

function isEnabledOrFrozen(r: RuleCandidate): boolean {
  return r.status === "enabled" || r.status === "frozen";
}

export function detectQualityOsGovernanceIssues(): GovernanceIssue[] {
  const allRules = getAllRules();
  const issues: GovernanceIssue[] = [];

  // 1. candidate 误注入 — candidate 规则可能被注入到 prompt 或 hints 中
  // （当前的 prompt-skills.ts 和 quality-check-hints.ts 已经做了 candidate 过滤，这里检测是否有遗漏风险）
  const candidates = allRules.filter((r) => r.status === "candidate");
  if (candidates.length > 0) {
    issues.push({
      check: "candidate 规则确认",
      severity: "info",
      detail: `当前 ${candidates.length} 条 candidate 规则（${candidates.map((r) => r.name).join("、")}）。已确认 getEnabledPromptSkillsForTarget 和 buildQualityCheckHintsForTarget 均排除 candidate，注入安全。`,
      affectedIds: candidates.map((r) => r.id),
    });
  }

  // 2. 缺 evidence
  const missingEvidence = allRules.filter(
    (r) => r.evidenceIds.length === 0,
  );
  if (missingEvidence.length > 0) {
    issues.push({
      check: "缺 evidence",
      severity: "warning",
      detail: `以下 ${missingEvidence.length} 条规则 evidenceIds 为空，缺乏可追溯证据来源：${missingEvidence.map((r) => r.name).join("、")}。`,
      affectedIds: missingEvidence.map((r) => r.id),
    });
  }

  // 3. 缺 failureMessage
  const missingFailure = allRules.filter(
    (r) => !r.failureMessage || r.failureMessage.trim().length === 0,
  );
  if (missingFailure.length > 0) {
    issues.push({
      check: "缺 failureMessage",
      severity: "warning",
      detail: `以下 ${missingFailure.length} 条规则 failureMessage 为空：${missingFailure.map((r) => r.name).join("、")}。`,
      affectedIds: missingFailure.map((r) => r.id),
    });
  }

  // 4. 缺 reviewRule
  const missingReview = allRules.filter(
    (r) => !r.reviewRule || r.reviewRule.trim().length === 0,
  );
  if (missingReview.length > 0) {
    issues.push({
      check: "缺 reviewRule",
      severity: "warning",
      detail: `以下 ${missingReview.length} 条规则 reviewRule 为空：${missingReview.map((r) => r.name).join("、")}。`,
      affectedIds: missingReview.map((r) => r.id),
    });
  }

  // 5. 高风险启用
  const highRiskEnabled = allRules.filter(
    (r) => r.riskLevel === "high" && r.status === "enabled",
  );
  if (highRiskEnabled.length > 0) {
    issues.push({
      check: "高风险启用",
      severity: "warning",
      detail: `以下 ${highRiskEnabled.length} 条规则 riskLevel=high 且 status=enabled，建议持续监控其注入效果：${highRiskEnabled.map((r) => r.name).join("、")}。`,
      affectedIds: highRiskEnabled.map((r) => r.id),
    });
  }

  // 6. target 过载 — 单 target enabled/frozen 规则超过 5 条
  for (const target of ALL_TARGETS) {
    const enabledCount = allRules.filter(
      (r) => isEnabledOrFrozen(r) && r.appliesTo.includes(target),
    ).length;
    if (enabledCount > 5) {
      issues.push({
        check: "target 过载",
        severity: "warning",
        detail: `target "${target}" 当前 ${enabledCount} 条 enabled/frozen 规则，超过 5 条上限。过多注入约束可能导致生成质量下降。`,
        affectedIds: allRules
          .filter(
            (r) => isEnabledOrFrozen(r) && r.appliesTo.includes(target),
          )
          .map((r) => r.id),
      });
    }
  }

  // 7. 重复名称
  const nameCounts = new Map<string, string[]>();
  for (const r of allRules) {
    const list = nameCounts.get(r.name) ?? [];
    list.push(r.id);
    nameCounts.set(r.name, list);
  }
  for (const [name, ids] of nameCounts) {
    if (ids.length > 1) {
      issues.push({
        check: "重复名称",
        severity: "error",
        detail: `规则名称 "${name}" 出现 ${ids.length} 次（IDs: ${ids.join(", ")}），可能造成注入覆盖或治理混淆。`,
        affectedIds: ids,
      });
    }
  }

  // 8. 重复 problemPattern（同 category）
  const catPatternMap = new Map<string, string[]>();
  for (const r of allRules) {
    const key = `${r.category}::${r.problemPattern}`;
    const list = catPatternMap.get(key) ?? [];
    list.push(r.id);
    catPatternMap.set(key, list);
  }
  for (const [key, ids] of catPatternMap) {
    if (ids.length > 1) {
      const cat = key.split("::")[0];
      issues.push({
        check: "重复 problemPattern",
        severity: "warning",
        detail: `category "${cat}" 下存在 ${ids.length} 条规则共用相同 problemPattern（IDs: ${ids.join(", ")}）。`,
        affectedIds: ids,
      });
    }
  }

  // 9. OpenClaw 边界 — openclaw_legacy 相关规则在 quality_check 场景下作为审计参考
  const evidenceCards = getAllEvidenceCards();
  const openclawEvidenceIds = evidenceCards
    .filter((e) => e.sourceType === "openclaw_legacy")
    .map((e) => e.id);
  const openclawRules = allRules.filter((r) =>
    r.evidenceIds.some((eid) => openclawEvidenceIds.includes(eid)),
  );
  if (openclawRules.length > 0) {
    const hardConstraintRisks = openclawRules.filter(
      (r) =>
        isEnabledOrFrozen(r) &&
        !r.appliesTo.every((t) => t === "quality_check"),
    );
    if (hardConstraintRisks.length > 0) {
      issues.push({
        check: "OpenClaw 边界",
        severity: "info",
        detail: `${hardConstraintRisks.length} 条基于 openclaw_legacy 证据的规则启用于非 quality_check target（${hardConstraintRisks.map((r) => `${r.name}[${r.appliesTo.join(",")}]`).join("、")}）。建议确认这些规则是否需要限制为审计-only。`,
        affectedIds: hardConstraintRisks.map((r) => r.id),
      });
    }
  }

  return issues;
}

// ==================== Agent 绑定治理检查（P0-Governance-1） ====================

export function detectAgentBindingGovernanceIssues(): GovernanceIssue[] {
  const agents: InjectionPreviewAgent[] = [];
  const rulerCards = getRulerAssetCards();
  const skillAssets = getSkillAssets();

  const rulerIdSet = new Set(rulerCards.map((r) => r.id));
  const rulerById = new Map(rulerCards.map((r) => [r.id, r]));
  const skillIdSet = new Set(skillAssets.map((s) => s.id));
  const skillById = new Map(skillAssets.map((s) => [s.id, s]));

  const issues: GovernanceIssue[] = [];

  for (const agent of agents) {
    // ── 检查 A：缺失 Ruler 绑定 ──
    for (const rid of agent.boundRulerIds) {
      if (!rulerIdSet.has(rid)) {
        issues.push({
          check: "缺失 Ruler 绑定",
          severity: "error",
          detail: `Agent "${agent.name}"（${agent.id}）绑定了不存在的 Ruler "${rid}"。该 Ruler 不在当前资产广场中，需确认是否已删除或 ID 拼写错误。`,
          affectedIds: [agent.id],
          agentId: agent.id,
          relatedAssetIds: [rid],
          recommendation: `请确认 Ruler ID "${rid}" 是否存在，或从 Agent 绑定中移除该无效 ID。`,
        });
      }
    }

    // ── 检查 B：缺失 Skill 绑定 ──
    for (const sid of agent.boundSkillIds) {
      if (!skillIdSet.has(sid)) {
        issues.push({
          check: "缺失 Skill 绑定",
          severity: "error",
          detail: `Agent "${agent.name}"（${agent.id}）绑定了不存在的 Skill "${sid}"。该 Skill 不在当前资产广场中，需确认是否已删除或 ID 拼写错误。`,
          affectedIds: [agent.id],
          agentId: agent.id,
          relatedAssetIds: [sid],
          recommendation: `请确认 Skill ID "${sid}" 是否存在，或从 Agent 绑定中移除该无效 ID。`,
        });
      }
    }

    // ── 检查 C：enabled/frozen Agent 绑定 candidate/draft/deprecated/archived 资产 ──
    if (agent.status === "enabled" || agent.status === "frozen") {
      const nonActiveRulerIds: string[] = [];
      for (const rid of agent.boundRulerIds) {
        const ruler = rulerById.get(rid);
        if (
          ruler &&
          ["candidate", "draft", "deprecated", "archived"].includes(
            ruler.status,
          )
        ) {
          nonActiveRulerIds.push(`${rid}(${ruler.status})`);
        }
      }
      const nonActiveSkillIds: string[] = [];
      for (const sid of agent.boundSkillIds) {
        const skill = skillById.get(sid);
        if (
          skill &&
          ["candidate", "draft", "deprecated", "archived"].includes(
            skill.status,
          )
        ) {
          nonActiveSkillIds.push(`${sid}(${skill.status})`);
        }
      }

      if (nonActiveRulerIds.length > 0 || nonActiveSkillIds.length > 0) {
        const parts: string[] = [];
        if (nonActiveRulerIds.length > 0) {
          parts.push(`Ruler: ${nonActiveRulerIds.join("、")}`);
        }
        if (nonActiveSkillIds.length > 0) {
          parts.push(`Skill: ${nonActiveSkillIds.join("、")}`);
        }
        issues.push({
          check: "已启用 Agent 绑定非正式资产",
          severity: "warning",
          detail: `Agent "${agent.name}"（${agent.id}，status=${agent.status}）绑定了非正式状态资产：${parts.join("；")}。当前仅作为只读提示，未进入生成链路。`,
          affectedIds: [agent.id],
          agentId: agent.id,
          relatedAssetIds: [
            ...nonActiveRulerIds.map((s) => s.split("(")[0]),
            ...nonActiveSkillIds.map((s) => s.split("(")[0]),
          ],
          recommendation:
            "这些资产当前为 candidate/draft/deprecated/archived 状态，不保证质量和兼容性。建议待资产进入 enabled/frozen 后再绑定，或仅用于治理审计参考。",
        });
      }
    }

    // ── 检查 D：OpenClaw Agent 状态边界 ──
    if (agent.source === "openclaw_legacy") {
      if (agent.status === "enabled" || agent.status === "frozen") {
        issues.push({
          check: "OpenClaw 状态边界",
          severity: "warning",
          detail: `Agent "${agent.name}"（${agent.id}）来源为 openclaw_legacy，但当前状态为 ${agent.status}。OpenClaw 历史 Agent 不应直接视为已迁移运行，建议保持 candidate 状态仅作注册参考。`,
          affectedIds: [agent.id],
          agentId: agent.id,
          relatedAssetIds: [],
          recommendation:
            "OpenClaw 遗留 Agent 仅作历史资产映射，不建议启用。如确需启用，请先完成完整的多 Agent 编排体系验收。",
        });
      }
    }

    // ── 检查 E：Agent 无任何绑定 ──
    if (
      agent.boundRulerIds.length === 0 &&
      agent.boundSkillIds.length === 0
    ) {
      issues.push({
        check: "Agent 无绑定",
        severity: "info",
        detail: `Agent "${agent.name}"（${agent.id}）暂无 Rulers / Skills 绑定。`,
        affectedIds: [agent.id],
        agentId: agent.id,
        relatedAssetIds: [],
        recommendation:
          "该 Agent 暂无 Rulers / Skills 绑定，后续需要人工确认是否补齐。",
      });
    }
  }

  return issues;
}

// ==================== 注入预览（P0-Governance-2） ====================

/** 注入顺序（所有 target 统一） */
const INJECTION_ORDER = [
  "Agent Identity",
  "Skills",
  "Rulers",
  "Source Contract",
  "User Input",
];

function isNonActiveAssetStatus(s: string): boolean {
  return ["candidate", "draft", "deprecated", "archived"].includes(s);
}

export function buildInjectionPreview(): InjectionPreviewTarget[] {
  const agents: InjectionPreviewAgent[] = [];
  const rulerCards = getRulerAssetCards();
  const skillAssets = getSkillAssets();

  return ALL_TARGETS.map((target): InjectionPreviewTarget => {
    // ── Agents：按 stage 匹配 ──
    const matchedAgents: InjectionPreviewAgent[] = agents
      .filter((a) => a.stage === target)
      .map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        stage: a.stage,
        status: a.status,
        source: a.source,
        riskLevel: a.riskLevel,
        boundRulerIds: a.boundRulerIds,
        boundSkillIds: a.boundSkillIds,
      }));

    // ── Skills：按 appliesTo 匹配 ──
    const matchedSkills: InjectionPreviewAsset[] = skillAssets
      .filter((s) => s.appliesTo.includes(target))
      .map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        source: s.source,
        placement: s.placement,
        priority: s.priority,
        riskLevel: s.riskLevel,
        kind: "skill" as const,
      }))
      .sort((a, b) => b.priority - a.priority);

    // ── Rulers：按 appliesTo 匹配 ──
    const matchedRulers: InjectionPreviewAsset[] = rulerCards
      .filter((r) => r.appliesTo.includes(target))
      .map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        source: r.source,
        placement: r.placement,
        priority: r.priority,
        riskLevel: r.riskLevel,
        kind: "ruler" as const,
      }))
      .sort((a, b) => b.priority - a.priority);

    // ── Warnings ──
    const warnings: InjectionPreviewWarning[] = [];

    // A. target 无 Agent
    if (matchedAgents.length === 0) {
      warnings.push({
        severity: "warning",
        title: "缺少执行角色",
        description:
          `"${TARGET_LABELS[target]}" 暂无已注册的 Agent 执行角色，后续如果接入生成链路需要确认执行主体。`,
        relatedIds: [],
      });
    }

    // B. 存在 candidate/draft/deprecated/archived 资产
    const nonActiveAssets: string[] = [
      ...matchedSkills
        .filter((s) => isNonActiveAssetStatus(s.status))
        .map((s) => `${s.name}(${s.status})`),
      ...matchedRulers
        .filter((r) => isNonActiveAssetStatus(r.status))
        .map((r) => `${r.name}(${r.status})`),
    ];
    if (nonActiveAssets.length > 0) {
      warnings.push({
        severity: "info",
        title: "非正式状态资产",
        description:
          `以下资产当前为 candidate/draft/deprecated/archived 状态，仅展示不代表进入真实生成链路：${nonActiveAssets.join("、")}。`,
        relatedIds: [
          ...matchedSkills
            .filter((s) => isNonActiveAssetStatus(s.status))
            .map((s) => s.id),
          ...matchedRulers
            .filter((r) => isNonActiveAssetStatus(r.status))
            .map((r) => r.id),
        ],
      });
    }

    // C. enabled Agent 绑定非正式资产（复用已有逻辑的摘要提示）
    const enabledAgentsWithNonActive = matchedAgents.filter(
      (a) =>
        (a.status === "enabled" || a.status === "frozen") &&
        agents.find(
          (def) =>
            def.id === a.id &&
            def.stage === target &&
            [
              ...def.boundRulerIds.flatMap(
                (rid) =>
                  rulerCards.find((rc) => rc.id === rid)?.status ?? "",
              ),
              ...def.boundSkillIds.flatMap(
                (sid) =>
                  skillAssets.find((sa) => sa.id === sid)?.status ?? "",
              ),
            ].some((s) => isNonActiveAssetStatus(s)),
        ),
    );
    if (enabledAgentsWithNonActive.length > 0) {
      warnings.push({
        severity: "warning",
        title: "已启用 Agent 绑定非正式资产",
        description:
          `${enabledAgentsWithNonActive.map((a) => a.name).join("、")}（${target}）存在已启用 Agent 绑定了 candidate/draft/deprecated/archived 状态的 Ruler 或 Skill。详细信息请查看「Agent 绑定治理」Tab。`,
        relatedIds: enabledAgentsWithNonActive.map((a) => a.id),
      });
    }

    // D. OpenClaw Agent 边界
    const openclawAgents = matchedAgents.filter(
      (a) => a.source === "openclaw_legacy",
    );
    if (openclawAgents.length > 0) {
      warnings.push({
        severity: "warning",
        title: "OpenClaw 候选历史资产",
        description:
          `${openclawAgents.map((a) => a.name).join("、")} 来源为 openclaw_legacy，候选历史资产，未接入多 Agent 编排。`,
        relatedIds: openclawAgents.map((a) => a.id),
      });
    }

    return {
      target,
      label: TARGET_LABELS[target],
      agents: matchedAgents,
      skills: matchedSkills,
      rulers: matchedRulers,
      warnings,
      order: INJECTION_ORDER,
    };
  });
}

// ==================== View Model 构建 ====================

export function buildQualityOsInspectorViewModel(): QualityOsInspectorViewModel {
  const allRules = getAllRules();
  const evidenceCards = getAllEvidenceCards();
  const governanceIssues = detectQualityOsGovernanceIssues();
  const agentBindingIssues = detectAgentBindingGovernanceIssues();

  // Summary
  const enabledFrozen = allRules.filter((r) => isEnabledOrFrozen(r)).length;
  const candidate = allRules.filter((r) => r.status === "candidate").length;

  // Target coverage
  const targets: Record<RuleApplyTarget, TargetCoverage> = {} as Record<
    RuleApplyTarget,
    TargetCoverage
  >;
  const allHints: Record<RuleApplyTarget, QualityCheckHint[]> = {} as Record<
    RuleApplyTarget,
    QualityCheckHint[]
  >;

  for (const target of ALL_TARGETS) {
    const enabledRules = allRules.filter(
      (r) => isEnabledOrFrozen(r) && r.appliesTo.includes(target),
    );
    const hints = buildQualityCheckHintsForTarget(target);
    targets[target] = {
      target,
      enabledSkillsCount: enabledRules.length,
      hintsCount: hints.length,
      rules: enabledRules,
      hints,
    };
    allHints[target] = hints;
  }

  // Evidence stats
  const bySourceType: Record<SkillSourceType | "unknown", number> = {
    claude_revision: 0,
    openclaw_legacy: 0,
    editor_review: 0,
    breakdown: 0,
    user_feedback: 0,
    unknown: 0,
  };
  for (const e of evidenceCards) {
    bySourceType[e.sourceType] = (bySourceType[e.sourceType] ?? 0) + 1;
  }

  // Governance issue count (only warning and error)
  const governanceIssueCount = governanceIssues.filter(
    (i) => i.severity !== "info",
  ).length;

  // Agent binding issue count (only warning and error)
  const agentBindingIssueCount = agentBindingIssues.filter(
    (i) => i.severity !== "info",
  ).length;

  const injectionPreview = buildInjectionPreview();

  return {
    summary: {
      totalRules: allRules.length,
      enabledFrozen,
      candidate,
      governanceIssueCount,
      agentBindingIssueCount,
    },
    targets,
    rules: allRules as RuleCandidate[],
    allHints,
    governanceIssues,
    agentBindingGovernanceIssues: agentBindingIssues,
    injectionPreview,
    evidenceStats: {
      totalEvidenceCards: evidenceCards.length,
      bySourceType,
    },
  };
}
