import type { OutlineBatch, Phase, PhaseRange, TurningPoint } from "@/lib/types";

export type BeatPhaseKey = "qi" | "kun" | "fan" | "sheng" | "shuang" | "he";
export type BeatPhaseLabel = "起" | "困" | "反" | "升" | "爽" | "合";

export type BeatPhaseRange = {
  id: string;
  unitIndex: number;
  phase: BeatPhaseKey;
  label: BeatPhaseLabel;
  startEpisode: number;
  endEpisode: number;
  description?: string;
};

export type StoryArcUnit = {
  arcIndex: number;
  startEpisode: number;
  endEpisode: number;
  arcRole: "opening" | "expansion" | "deepening" | "finale" | "compressed_finale";
  phases: BeatPhaseRange[];
};

export const BEAT_PHASE_LABELS: Record<BeatPhaseKey, BeatPhaseLabel> = {
  qi: "起",
  kun: "困",
  fan: "反",
  sheng: "升",
  shuang: "爽",
  he: "合",
};

const BEAT_PHASE_SEQUENCE: BeatPhaseKey[] = ["qi", "kun", "fan", "sheng", "shuang", "he"];
const BEAT_PHASE_WEIGHTS = [3, 6, 3, 9, 6, 3];

export function normalizeEpisodeCount(value: number, fallback = 60): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.trunc(value));
}

function distributeByWeights(totalEpisodes: number, weights: number[]): number[] {
  const total = normalizeEpisodeCount(totalEpisodes);
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const raw = weights.map((weight) => (total * weight) / weightSum);
  const counts = raw.map((value) => Math.max(1, Math.floor(value)));
  let remaining = total - counts.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({
      index,
      fraction: value - Math.floor(value),
    }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);

  for (const item of order) {
    if (remaining <= 0) break;
    counts[item.index] += 1;
    remaining -= 1;
  }

  if (remaining > 0) {
    let cursor = 0;
    while (remaining > 0) {
      counts[cursor % counts.length] += 1;
      cursor += 1;
      remaining -= 1;
    }
  }

  return counts;
}

function buildUnitPhaseCounts(unitSize: number): number[] {
  const normalized = normalizeEpisodeCount(unitSize);
  if (normalized === 10) return [1, 1, 2, 2, 2, 2];
  if (normalized === 20) return [2, 3, 4, 5, 4, 2];
  if (normalized === 30) return [3, 5, 6, 7, 6, 3];
  if (normalized <= 30) return distributeByWeights(normalized, BEAT_PHASE_WEIGHTS);

  const baseCounts = [3, 5, 6, 7, 6, 3];
  const extra = normalized - 30;
  baseCounts[5] += extra;
  return baseCounts;
}

export function buildBeatPhaseRanges(totalEpisodes: number, startEpisode = 1, unitIndex = 1): BeatPhaseRange[] {
  const normalizedTotal = normalizeEpisodeCount(totalEpisodes);
  const counts = buildUnitPhaseCounts(normalizedTotal);
  const ranges: BeatPhaseRange[] = [];
  let cursor = startEpisode;

  for (let index = 0; index < BEAT_PHASE_SEQUENCE.length; index += 1) {
    const phase = BEAT_PHASE_SEQUENCE[index];
    const label = BEAT_PHASE_LABELS[phase];
    const phaseCount = counts[index] ?? 1;
    const endEpisode = index === BEAT_PHASE_SEQUENCE.length - 1
      ? startEpisode + normalizedTotal - 1
      : cursor + phaseCount - 1;
    ranges.push({
      id: `arc-${unitIndex}-${phase}`,
      unitIndex,
      phase,
      label,
      startEpisode: cursor,
      endEpisode,
      description: "",
    });
    cursor = endEpisode + 1;
  }

  return ranges;
}

export function buildStoryArcUnits(totalEpisodes: number): StoryArcUnit[] {
  const normalizedTotal = normalizeEpisodeCount(totalEpisodes);
  const units: StoryArcUnit[] = [];
  let cursor = 1;
  let arcIndex = 1;
  let remaining = normalizedTotal;

  while (remaining > 0) {
    let unitSize = 0;
    if (remaining >= 30) {
      unitSize = 30;
    } else if (remaining >= 10) {
      unitSize = remaining;
    } else if (units.length > 0) {
      const previous = units[units.length - 1];
      units[units.length - 1] = {
        ...previous,
        endEpisode: previous.endEpisode + remaining,
        phases: buildBeatPhaseRanges(previous.endEpisode + remaining - previous.startEpisode + 1, previous.startEpisode, previous.arcIndex),
        arcRole: "finale",
      };
      break;
    } else {
      unitSize = remaining;
    }

    const phases = buildBeatPhaseRanges(unitSize, cursor, arcIndex);
    units.push({
      arcIndex,
      startEpisode: cursor,
      endEpisode: cursor + unitSize - 1,
      arcRole:
        arcIndex === 1
          ? "opening"
          : remaining === unitSize
            ? "finale"
            : "expansion",
      phases,
    });
    cursor += unitSize;
    remaining -= unitSize;
    arcIndex += 1;
  }

  if (units.length > 1) {
    const lastIndex = units.length - 1;
    units[lastIndex] = {
      ...units[lastIndex],
      arcRole: units[lastIndex].endEpisode === normalizedTotal ? "finale" : "compressed_finale",
    };
    for (let i = 1; i < units.length - 1; i += 1) {
      units[i] = { ...units[i], arcRole: "deepening" };
    }
  }

  if (units.length === 1) {
    units[0] = {
      ...units[0],
      arcRole: normalizedTotal === 30 ? "finale" : "compressed_finale",
    };
  }

  return units;
}

export function buildEpisodeBatches(totalEpisodes: number, episodeTexts: Array<string | undefined | null> = []): OutlineBatch[] {
  const normalizedTotal = normalizeEpisodeCount(totalEpisodes);
  const batches: OutlineBatch[] = [];

  for (let startEpisode = 1, batchIndex = 1; startEpisode <= normalizedTotal; startEpisode += 10, batchIndex += 1) {
    const endEpisode = Math.min(startEpisode + 9, normalizedTotal);
    const episodeNumbers = Array.from(
      { length: endEpisode - startEpisode + 1 },
      (_, index) => startEpisode + index,
    );
    const roughOutline = episodeTexts
      .slice(startEpisode - 1, endEpisode)
      .map((text) => (typeof text === "string" ? text.trim() : ""))
      .filter(Boolean)
      .join("\n\n");
    const generatedEpisodeCount = roughOutline ? episodeTexts.slice(startEpisode - 1, endEpisode).filter((text) => typeof text === "string" && text.trim().length > 0).length : 0;

    batches.push({
      batchIndex,
      startEpisode,
      endEpisode,
      episodeNumbers,
      generatedEpisodeCount,
      roughOutline,
      summary: `第 ${startEpisode} - ${endEpisode} 集`,
      status: roughOutline ? "rough_ready" : "empty",
    });
  }

  return batches;
}

export function getEpisodeBatchIndex(episodeNumber: number): number {
  return Math.max(1, Math.ceil(normalizeEpisodeCount(episodeNumber) / 10));
}

export function getEpisodeBeatPhase(episodeNumber: number, storyArcUnits: StoryArcUnit[]): BeatPhaseRange | null {
  for (const unit of storyArcUnits) {
    for (const phase of unit.phases) {
      if (episodeNumber >= phase.startEpisode && episodeNumber <= phase.endEpisode) {
        return phase;
      }
    }
  }
  return null;
}

export function getEpisodeArcUnit(episodeNumber: number, storyArcUnits: StoryArcUnit[]): StoryArcUnit | null {
  for (const unit of storyArcUnits) {
    if (episodeNumber >= unit.startEpisode && episodeNumber <= unit.endEpisode) {
      return unit;
    }
  }
  return null;
}

export function isPhaseRangesUsableForSlots(phaseRanges: PhaseRange[] | undefined, slotCount: number): boolean {
  if (!phaseRanges || phaseRanges.length !== 4) return false;

  const qi = phaseRanges.find((range) => range.phase === "qi");
  const cheng = phaseRanges.find((range) => range.phase === "cheng");
  const zhuan = phaseRanges.find((range) => range.phase === "zhuan");
  const he = phaseRanges.find((range) => range.phase === "he");

  if (!qi || !cheng || !zhuan || !he) return false;

  // Check for invalid ranges where end < start
  if ([qi, cheng, zhuan, he].some((range) => range.endEpisode < range.startEpisode)) {
    return false;
  }

  // Must cover the requested total slot count
  if (he.endEpisode < slotCount) {
    return false;
  }

  return true;
}

export function buildDefaultPhaseSlotRanges(slotCount: number): PhaseRange[] {
  return buildDefaultPhaseRanges(slotCount);
}

export function buildDefaultPhaseRanges(totalEpisodes: number): PhaseRange[] {
  const total = Math.max(1, Math.trunc(totalEpisodes));
  if (!Number.isFinite(totalEpisodes) || total <= 0) return [];

  const qiEnd = Math.max(1, Math.min(total - 3, Math.round(total / 6)));
  const chengEnd = Math.max(qiEnd + 1, Math.min(total - 2, Math.round(total / 2)));
  const zhuanEnd = Math.max(chengEnd + 1, Math.min(total - 1, Math.round((total * 5) / 6)));

  return [
    { phase: "qi", startEpisode: 1, endEpisode: qiEnd },
    { phase: "cheng", startEpisode: qiEnd + 1, endEpisode: chengEnd },
    { phase: "zhuan", startEpisode: chengEnd + 1, endEpisode: zhuanEnd },
    { phase: "he", startEpisode: zhuanEnd + 1, endEpisode: total },
  ];
}

export function validatePhaseRanges(phaseRanges: PhaseRange[], totalEpisodes: number): PhaseRange[] {
  if (!phaseRanges || phaseRanges.length === 0) {
    return buildDefaultPhaseRanges(totalEpisodes);
  }

  const validPhases: Phase[] = ["qi", "cheng", "zhuan", "he"];
  const filtered = phaseRanges
    .filter(pr => validPhases.includes(pr.phase))
    .sort((a, b) => a.startEpisode - b.startEpisode);

  if (filtered.length !== 4) {
    return buildDefaultPhaseRanges(totalEpisodes);
  }

  return filtered.map((pr, idx) => ({
    phase: pr.phase,
    startEpisode: Math.max(1, Math.min(pr.startEpisode, totalEpisodes)),
    endEpisode: Math.max(1, Math.min(pr.endEpisode, totalEpisodes)),
  }));
}

export function getPhaseByEpisode(episodeNumber: number, phaseRanges: PhaseRange[]): Phase | null {
  for (const pr of phaseRanges) {
    if (episodeNumber >= pr.startEpisode && episodeNumber <= pr.endEpisode) {
      return pr.phase;
    }
  }
  return null;
}

export function getTurningPointCountsByEpisode(turningPoints: TurningPoint[], episodeNumber: number): number {
  return turningPoints.filter(tp => tp.episodeNumber === episodeNumber).length;
}

export function getTurningPointCountsByPhase(turningPoints: TurningPoint[], phase: Phase): number {
  return turningPoints.filter(tp => tp.section === phase).length;
}

export const PHASE_LABELS: Record<Phase, string> = {
  qi: "起",
  cheng: "承",
  zhuan: "转",
  he: "合",
};

export const REVERSAL_TYPE_LABELS: Record<string, string> = {
  plot: "剧情反转",
  relationship: "关系反转",
  stance: "立场反转",
  cognition: "认知反转",
  identity: "身份反转",
  emotion: "情绪反转",
};

export const INTENSITY_LABELS: Record<string, string> = {
  small: "小",
  medium: "中",
  big: "大",
  cliffhanger: "尾钩",
};
