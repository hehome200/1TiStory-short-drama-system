import type { OutlineEpisodeView, OutlinePhaseView } from "../contracts";
import {
  normalizeOutlineEpisodeViews,
  normalizeOutlinePhaseViews,
} from "../schemas";

// ==================== original-studio 业务数据适配器 ====================
// 这是唯一理解 original-studio 业务数据结构的文件。
// 不直接 import 业务类型，通过松散类型推断业务字段，避免 UI 层绑定业务类型。

/** adapter 输入：兼容 original-studio 当前 previewOutlines / draft.outlines 形状 */
type OriginalOutlineInput = {
  episodes?: string[];
  episodesStructured?: Array<{
    episodeNumber: number;
    title?: string;
    plotTask?: string;
    conflict?: string;
    newInformation?: string;
    emotionalPoint?: string;
    hook?: string;
    characterFocus?: string[];
    macroStage?: string;
    microBeat?: string;
  }>;
  originalPhaseRanges?: Array<{
    phase: string;
    startEpisode: number;
    endEpisode: number;
    stageTask?: string;
    relationshipTask?: string;
    emotionTask?: string;
  }>;
  stageLabels?: string[];
  extractionResult?: {
    confirmedEpisodes?: Array<{
      episode: number;
      title?: string;
      goal?: string;
      coreEvent?: string;
      conflictProgress?: string;
      resultChange?: string;
    }>;
  };
};

/** adapter 返回 */
type AdaptedViewModel = {
  episodes: OutlineEpisodeView[];
  phases: OutlinePhaseView[];
};

const DEFAULT_PHASE_LABELS = ["起", "承", "转", "合"];

/**
 * 将 original-studio 业务数据转换为 OutlineWorkbenchKit ViewModel。
 * 不修改原始 input，不写回 draft。
 */
export function adaptOriginalOutlineToViewModel(
  input: OriginalOutlineInput
): AdaptedViewModel {
  const episodes = buildEpisodeViews(input);
  const phases = buildPhaseViews(input, episodes.length);
  return { episodes, phases };
}

// ---- 内部函数 ----

function buildEpisodeViews(input: OriginalOutlineInput): OutlineEpisodeView[] {
  // 优先级 1: extractionResult.confirmedEpisodes
  const confirmed = input.extractionResult?.confirmedEpisodes;
  if (confirmed && confirmed.length > 0) {
    return normalizeOutlineEpisodeViews(
      confirmed.map((ce) => ({
        id: `ep-${ce.episode}`,
        episodeNumber: ce.episode,
        title: ce.title,
        summary: ce.goal || ce.coreEvent || "",
        goal: ce.goal,
        coreEvent: ce.coreEvent,
        conflictProgress: ce.conflictProgress,
        resultChange: ce.resultChange,
      }))
    );
  }

  // 优先级 2: episodes（string[]）纯文本
  const rawEpisodes = input.episodes;
  if (rawEpisodes && rawEpisodes.length > 0) {
    return normalizeOutlineEpisodeViews(
      rawEpisodes.map((text, idx) => ({
        id: `ep-${idx + 1}`,
        episodeNumber: idx + 1,
        summary: text,
      }))
    );
  }

  // 优先级 3: episodesStructured（后置，待数据稳定后再提升）
  const structured = input.episodesStructured;
  if (structured && structured.length > 0) {
    return normalizeOutlineEpisodeViews(
      structured.map((ep) => ({
        id: `ep-${ep.episodeNumber}`,
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        summary: ep.plotTask || "",
        goal: ep.plotTask,
        coreEvent: ep.conflict,
        conflictProgress: ep.newInformation,
        resultChange: ep.hook,
        phaseId: ep.macroStage ? `phase-${ep.macroStage}` : undefined,
      }))
    );
  }

  return [];
}

function buildPhaseViews(
  input: OriginalOutlineInput,
  totalEpisodes: number
): OutlinePhaseView[] {
  // 优先使用 originalPhaseRanges
  const phaseRanges = input.originalPhaseRanges;
  if (phaseRanges && phaseRanges.length > 0) {
    return normalizeOutlinePhaseViews(
      phaseRanges.map((pr) => {
        const episodeIds: string[] = [];
        for (let i = pr.startEpisode; i <= pr.endEpisode; i++) {
          episodeIds.push(`ep-${i}`);
        }
        const parts: string[] = [];
        if (pr.stageTask) parts.push(pr.stageTask);
        if (pr.relationshipTask) parts.push(pr.relationshipTask);
        if (pr.emotionTask) parts.push(pr.emotionTask);
        return {
          id: `phase-${pr.phase}`,
          label: pr.phase,
          startEpisode: pr.startEpisode,
          endEpisode: pr.endEpisode,
          episodeIds,
          summary: parts.length > 0 ? parts.join(" | ") : undefined,
        };
      }),
      totalEpisodes
    );
  }

  // fallback：按集数自动生成默认四阶段
  if (totalEpisodes <= 0) return [];

  const phases = splitIntoFourPhases(totalEpisodes);
  return normalizeOutlinePhaseViews(
    phases.map((ph) => ({
      id: `phase-${ph.label}`,
      label: ph.label,
      startEpisode: ph.start,
      endEpisode: ph.end,
      episodeIds: Array.from(
        { length: ph.end - ph.start + 1 },
        (_, i) => `ep-${ph.start + i}`
      ),
    })),
    totalEpisodes
  );
}

/** 将集数等分为起承转合四阶段 */
function splitIntoFourPhases(total: number): Array<{ label: string; start: number; end: number }> {
  const labels = DEFAULT_PHASE_LABELS;
  const size = Math.ceil(total / 4);
  const result: Array<{ label: string; start: number; end: number }> = [];

  for (let i = 0; i < 4; i++) {
    const start = i * size + 1;
    const end = Math.min((i + 1) * size, total);
    if (start > total) break;
    result.push({ label: labels[i], start, end });
  }

  return result;
}
