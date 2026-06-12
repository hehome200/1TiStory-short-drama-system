import type { OutlineEpisodeView, OutlinePhaseView } from "./contracts";

// ==================== 轻量 normalize ====================
// 非法字段降级，不 throw。

/**
 * normalize 分集卡片列表：
 * - episodeNumber 必须为正整数，否则跳过
 * - 按 episodeNumber 升序排列
 * - 空输入返回 []
 */
export function normalizeOutlineEpisodeViews(
  episodes: Partial<OutlineEpisodeView>[]
): OutlineEpisodeView[] {
  if (!Array.isArray(episodes)) return [];

  const valid: OutlineEpisodeView[] = [];

  for (const ep of episodes) {
    const num = ep.episodeNumber;
    if (typeof num !== "number" || !Number.isFinite(num) || num < 1) continue;

    valid.push({
      id: ep.id ?? `ep-${num}`,
      episodeNumber: num,
      title: ep.title,
      summary: typeof ep.summary === "string" ? ep.summary : "",
      goal: ep.goal,
      coreEvent: ep.coreEvent,
      conflictProgress: ep.conflictProgress,
      resultChange: ep.resultChange,
      phaseId: ep.phaseId,
      sourceRefs: Array.isArray(ep.sourceRefs) ? ep.sourceRefs : undefined,
      warnings: Array.isArray(ep.warnings) ? ep.warnings : undefined,
    });
  }

  valid.sort((a, b) => a.episodeNumber - b.episodeNumber);
  return valid;
}

/**
 * normalize 阶段列表：
 * - 过滤掉 episodeIds 中指向不存在集数的引用（需传入有效集数总量）
 * - 空输入返回 []
 * - 不 throw，即使阶段范围超出集数范围
 */
export function normalizeOutlinePhaseViews(
  phases: Partial<OutlinePhaseView>[],
  totalEpisodes: number
): OutlinePhaseView[] {
  if (!Array.isArray(phases)) return [];

  const validIds = new Set<string>();
  // 先预生成合法 episode id 集合
  for (let i = 1; i <= Math.max(0, totalEpisodes); i++) {
    validIds.add(`ep-${i}`);
  }

  return phases.map((ph, idx) => {
    const id = ph.id ?? `phase-${idx}`;
    const filteredIds = Array.isArray(ph.episodeIds)
      ? ph.episodeIds.filter((eid) => validIds.has(eid))
      : [];
    return {
      id,
      label: typeof ph.label === "string" && ph.label ? ph.label : `阶段${idx + 1}`,
      startEpisode: typeof ph.startEpisode === "number" && ph.startEpisode > 0 ? ph.startEpisode : 1,
      endEpisode: typeof ph.endEpisode === "number" && ph.endEpisode > 0 ? ph.endEpisode : 1,
      episodeIds: filteredIds,
      summary: ph.summary,
    };
  });
}
