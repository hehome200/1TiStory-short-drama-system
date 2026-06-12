/**
 * QualityCheck dry-run 运行时探针
 *
 * 在 reviewEpisodeDraft() 真实审稿链路中挂入零副作用 probe，
 * 只输出治理资产状态摘要，不触发额外 LLM，不写 DB，不扣费。
 *
 * 挂点位置：buildReviewEpisodeDraftPrompt() 之后，streamAliyunChatCompletion() 之前。
 */

import { buildQualityCheckDryRunProbe } from "./inspector";
import type { QualityCheckDryRunRuntimeSummary, QualityCheckDryRunRuntimeAssetSnapshot } from "./types";

/**
 * 构建 QualityCheck dry-run 运行时摘要
 * 只输出统计数字和 guarantees，不包含剧本文本、prompt、用户输入
 */
export function buildQualityCheckDryRunRuntimeSummary(): QualityCheckDryRunRuntimeSummary {
  const probe = buildQualityCheckDryRunProbe();
  return {
    target: probe.target,
    readonly: true,
    source: "reviewEpisodeDraft",
    enabledAgentCount: probe.enabledAssets.agents.length,
    enabledSkillCount: probe.enabledAssets.skills.length,
    enabledRulerCount: probe.enabledAssets.rulers.length,
    excludedAssetCount: probe.excludedAssets.length,
    warningCount: probe.warnings.length,
    guarantees: probe.guarantees,
  };
}

/**
 * 构建 QualityCheck dry-run 运行时资产快照
 * 包含完整资产明细（Agent/Skill/Ruler/排除项），不包含剧本文本、prompt、用户输入
 */
export function buildQualityCheckDryRunRuntimeAssetSnapshot(): QualityCheckDryRunRuntimeAssetSnapshot {
  const probe = buildQualityCheckDryRunProbe();
  return {
    target: probe.target,
    readonly: true,
    enabledAssets: {
      agents: probe.enabledAssets.agents.map((a) => ({ ...a })),
      skills: probe.enabledAssets.skills.map((s) => ({ ...s })),
      rulers: probe.enabledAssets.rulers.map((r) => ({ ...r })),
    },
    excludedAssets: probe.excludedAssets.map((e) => ({ ...e })),
  };
}

/**
 * 发射 QualityCheck dry-run 运行时探针
 * 纯日志输出，零副作用，失败不影响原审稿链路
 */
export function emitQualityCheckDryRunRuntimeProbe(): void {
  const summary = buildQualityCheckDryRunRuntimeSummary();
  console.info("[quality-os][quality_check][dry-run-probe]", JSON.stringify(summary));
}
