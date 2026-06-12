import { useState, useCallback, useMemo } from "react";
import type { OutlineWorkbenchProps } from "./contracts";
import { OutlineEpisodeCard } from "./outline-episode-card";
import { OutlinePhaseSidebar } from "./outline-phase-sidebar";

export function OutlineWorkbench({
  episodes,
  phases,
  selectedEpisodeId: controlledEpisodeId,
  selectedPhaseId: controlledPhaseId,
  readonly,
  onSelectEpisode,
  onSelectPhase,
  className,
  slots,
}: OutlineWorkbenchProps) {
  const hasEpisodes = episodes.length > 0;
  const hasPhases = hasEpisodes && Boolean(phases?.length);

  // 内部 fallback 状态：外部不传时自管
  const [internalEpisodeId, setInternalEpisodeId] = useState<string | undefined>();
  const [internalPhaseId, setInternalPhaseId] = useState<string | undefined>();

  const activeEpisodeId = controlledEpisodeId ?? internalEpisodeId;
  const activePhaseId = controlledPhaseId ?? internalPhaseId;

  // episodeId → phaseId 映射（useMemo 避免每次 render 重建）
  const episodePhaseMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const phase of phases ?? []) {
      for (const eid of phase.episodeIds) {
        map.set(eid, phase.id);
      }
    }
    return map;
  }, [phases]);

  // phaseId → episodeIds 映射（useMemo 避免每次 render 重建）
  const phaseEpisodesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const phase of phases ?? []) {
      map.set(phase.id, phase.episodeIds);
    }
    return map;
  }, [phases]);

  // 有效 id 集合，用于校验外部传入的 selectedId 是否存在
  const validEpisodeIds = useMemo(() => new Set(episodes.map((e) => e.id)), [episodes]);
  const validPhaseIds = useMemo(() => new Set((phases ?? []).map((p) => p.id)), [phases]);

  // 安全的 activeId：外部传入但不存在时降级为 undefined
  const safeEpisodeId =
    activeEpisodeId && validEpisodeIds.has(activeEpisodeId) ? activeEpisodeId : undefined;
  const safePhaseId =
    activePhaseId && validPhaseIds.has(activePhaseId) ? activePhaseId : undefined;

  // 点击分集：选中分集 + 同步高亮所属阶段
  const handleSelectEpisode = useCallback(
    (episodeId: string) => {
      setInternalEpisodeId(episodeId);
      const belongingPhaseId = episodePhaseMap.get(episodeId);
      if (belongingPhaseId) {
        setInternalPhaseId(belongingPhaseId);
      }
      onSelectEpisode?.(episodeId);
    },
    [episodePhaseMap, onSelectEpisode]
  );

  // 点击阶段：选中阶段 + 若该阶段有分集且当前选中分集不在该阶段，则选中其下第一集
  const handleSelectPhase = useCallback(
    (phaseId: string) => {
      setInternalPhaseId(phaseId);
      const phaseEpIds = phaseEpisodesMap.get(phaseId);
      const currentEpisodePhase = safeEpisodeId
        ? episodePhaseMap.get(safeEpisodeId)
        : undefined;
      if (phaseEpIds && phaseEpIds.length > 0 && currentEpisodePhase !== phaseId) {
        setInternalEpisodeId(phaseEpIds[0]);
      }
      onSelectPhase?.(phaseId);
    },
    [phaseEpisodesMap, episodePhaseMap, safeEpisodeId, onSelectPhase]
  );

  // 当前阶段下的分集 id 集合（用于次级高亮）
  const highlightedEpisodeIds = safePhaseId
    ? new Set(phaseEpisodesMap.get(safePhaseId) ?? [])
    : new Set<string>();

  // 当前选中分集所属阶段 id（用于次级高亮）
  const highlightedPhaseId = safeEpisodeId
    ? episodePhaseMap.get(safeEpisodeId)
    : undefined;

  return (
    <div className={`grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px] ${className ?? ""}`}>
      {/* 左侧：分集卡片 */}
      <div className="space-y-5">
        {slots?.header}
        {!hasEpisodes ? (
          slots?.empty ?? (
            <div className="rounded-[28px] border border-white/10 bg-white/4 px-6 py-16 text-center text-slate-500">
              暂无分集大纲
            </div>
          )
        ) : (
          <div className="grid gap-4">
            {episodes.map((ep) => (
              <OutlineEpisodeCard
                key={ep.id}
                episode={ep}
                selected={ep.id === safeEpisodeId}
                highlighted={highlightedEpisodeIds.has(ep.id) && ep.id !== safeEpisodeId}
                onSelect={handleSelectEpisode}
                readonly={readonly}
              />
            ))}
          </div>
        )}
        {slots?.footer}
      </div>

      {/* 右侧：阶段侧栏（仅在 phases 非空时渲染） */}
      {hasPhases && phases && (
        <OutlinePhaseSidebar
          phases={phases}
          selectedPhaseId={safePhaseId}
          highlightedPhaseId={highlightedPhaseId}
          onSelect={handleSelectPhase}
          readonly={readonly}
        />
      )}
    </div>
  );
}
