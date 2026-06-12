import type { OriginalDraft } from "@/lib/types";

export type StoryOutlineData = {
  macro: string;
  phaseRanges: Array<{
    label: string;
    startEpisode: number;
    endEpisode: number;
    stageTask?: string;
  }>;
  outlineBatches: Array<{
    batchIndex: number;
    startEpisode: number;
    endEpisode: number;
    roughOutline: string;
  }>;
};

export function extractStoryOutline(draft: OriginalDraft): StoryOutlineData {
  const ol = draft.outlines;
  return {
    macro: ol.macro || "",
    phaseRanges: (ol.originalPhaseRanges ?? []).map((r) => ({
      label: r.phase,
      startEpisode: r.startEpisode,
      endEpisode: r.endEpisode,
      stageTask: r.stageTask,
    })),
    outlineBatches: (ol.outlineBatches ?? []).map((b) => ({
      batchIndex: b.batchIndex,
      startEpisode: b.startEpisode,
      endEpisode: b.endEpisode,
      roughOutline: b.roughOutline || "",
    })),
  };
}

export function renderStoryOutline(data: StoryOutlineData): string {
  const lines: string[] = [];
  lines.push("# 分集大纲");
  lines.push("");

  if (data.macro) {
    lines.push("## 全剧「剧本创」（Macro）");
    lines.push("");
    lines.push(data.macro);
    lines.push("");
  }

  if (data.phaseRanges.length > 0) {
    lines.push("## 阶段划分");
    lines.push("");
    data.phaseRanges.forEach((p) => {
      const task = p.stageTask ? ` — ${p.stageTask}` : "";
      lines.push(`- **${p.label}**（第 ${p.startEpisode}-${p.endEpisode} 集）${task}`);
    });
    lines.push("");
  }

  if (data.outlineBatches.length > 0) {
    lines.push("## 分集粗纲");
    lines.push("");
    data.outlineBatches.forEach((b) => {
      lines.push(`### 第 ${b.startEpisode}-${b.endEpisode} 集`);
      lines.push("");
      lines.push(b.roughOutline);
      lines.push("");
    });
  }

  return lines.join("\n");
}
