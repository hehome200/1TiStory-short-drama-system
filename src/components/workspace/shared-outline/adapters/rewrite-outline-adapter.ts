import type { OutlineEpisodeView, OutlinePhaseView } from "../contracts";
import {
  normalizeOutlineEpisodeViews,
  normalizeOutlinePhaseViews,
} from "../schemas";

// ==================== rewrite-studio 业务数据适配器 ====================
// 这是唯一理解 rewrite-studio 业务数据结构的文件。
// 不直接 import 业务类型，通过松散类型推断业务字段，避免 UI 层绑定业务类型。

/** adapter 输入：兼容 rewrite-studio 当前 previewOutlines / draft.outlines 形状 */
type RewriteOutlineInput = {
  episodes?: string[];
  stageLabels?: string[];
};

/** adapter 返回 */
type AdaptedViewModel = {
  episodes: OutlineEpisodeView[];
  phases: OutlinePhaseView[];
};

const DEFAULT_PHASE_LABELS = ["起", "承", "转", "合"];

/**
 * 将 rewrite-studio 业务数据转换为 OutlineWorkbenchKit ViewModel。
 * 不修改原始 input，不写回 draft。
 */
export function adaptRewriteOutlineToViewModel(
  input: RewriteOutlineInput
): AdaptedViewModel {
  const episodes = buildEpisodeViews(input);
  const phases = buildPhaseViews(input, episodes.length);
  return { episodes, phases };
}

// ---- 内部函数 ----

function buildEpisodeViews(input: RewriteOutlineInput): OutlineEpisodeView[] {
  const rawEpisodes = input.episodes;
  if (!rawEpisodes || rawEpisodes.length === 0) return [];

  return normalizeOutlineEpisodeViews(
    rawEpisodes.map((text, idx) => ({
      id: `ep-${idx + 1}`,
      episodeNumber: idx + 1,
      summary: text,
    }))
  );
}

function buildPhaseViews(
  input: RewriteOutlineInput,
  totalEpisodes: number
): OutlinePhaseView[] {
  // 尝试从 stageLabels 解析结构化阶段
  const stageLabels = input.stageLabels;
  if (stageLabels && stageLabels.length > 0) {
    const parsed = parseStageLabels(stageLabels, totalEpisodes);
    if (parsed.length > 0) {
      return normalizeOutlinePhaseViews(parsed, totalEpisodes);
    }
  }

  // fallback：按集数自动生成默认四阶段
  return fallbackFourPhases(totalEpisodes);
}

/**
 * 解析 stageLabels 格式，支持：
 * - "起\n1-10" / "承\n11-30"
 * - "起 1-10" / "承 11-30"
 * - "起\n1" （单集）
 * - "转\n-" / "合\n-" （无范围，跳过）
 */
function parseStageLabels(
  labels: string[],
  totalEpisodes: number
): Array<{
  id: string;
  label: string;
  startEpisode: number;
  endEpisode: number;
  episodeIds: string[];
}> {
  const result: Array<{
    id: string;
    label: string;
    startEpisode: number;
    endEpisode: number;
    episodeIds: string[];
  }> = [];

  for (const raw of labels) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // 提取阶段名：取第一个中文词或第一行/第一段
    const labelMatch = trimmed.match(/^([\u4e00-\u9fff]+)/);
    const label = labelMatch ? labelMatch[1] : trimmed.split(/[\n\r\s]+/)[0];

    // 提取范围：找 N-M 或 单数字 N
    const rangeMatch = trimmed.match(/(\d+)\s*[-–—]\s*(\d+)/);
    const singleMatch = trimmed.match(/(?<![-\d])(\d+)(?![-\d])/);

    let start: number;
    let end: number;

    if (rangeMatch) {
      start = parseInt(rangeMatch[1], 10);
      end = parseInt(rangeMatch[2], 10);
    } else if (singleMatch) {
      start = parseInt(singleMatch[1], 10);
      end = start;
    } else {
      // 无法解析范围（如 "转\n-"），跳过该阶段
      continue;
    }

    // 边界保护
    if (start < 1 || end < start || start > totalEpisodes) continue;
    end = Math.min(end, totalEpisodes);

    const episodeIds: string[] = [];
    for (let i = start; i <= end; i++) {
      episodeIds.push(`ep-${i}`);
    }

    result.push({
      id: `phase-${label}`,
      label,
      startEpisode: start,
      endEpisode: end,
      episodeIds,
    });
  }

  return result;
}

/** 将集数等分为起承转合四阶段 */
function fallbackFourPhases(
  total: number
): OutlinePhaseView[] {
  if (total <= 0) return [];

  const size = Math.ceil(total / 4);
  const phases: Array<{ label: string; start: number; end: number }> = [];

  for (let i = 0; i < 4; i++) {
    const start = i * size + 1;
    const end = Math.min((i + 1) * size, total);
    if (start > total) break;
    phases.push({ label: DEFAULT_PHASE_LABELS[i], start, end });
  }

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
    total
  );
}
