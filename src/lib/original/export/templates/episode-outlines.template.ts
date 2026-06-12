import type { OriginalDraft } from "@/lib/types";

export type EpisodeOutlinesData = {
  episodes: string[];
  episodeCount: number;
};

export function extractEpisodeOutlines(draft: OriginalDraft): EpisodeOutlinesData {
  const episodes = draft.outlines.episodes ?? [];
  return {
    episodes,
    episodeCount: draft.overview.projectBrief?.episodeCount ?? episodes.length,
  };
}

export function renderEpisodeOutlines(data: EpisodeOutlinesData): string {
  const lines: string[] = [];
  lines.push("# 分集集纲");
  lines.push("");

  if (!data.episodes.length) {
    lines.push("暂无分集集纲");
    lines.push("");
    return lines.join("\n");
  }

  data.episodes.forEach((text, i) => {
    const titleMatch = text.match(/^第\d+集[：:]\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : "";
    const titleLine = title ? ` — ${title}` : "";

    lines.push(`## 第 ${i + 1} 集${titleLine}`);
    lines.push("");
    lines.push(text);
    lines.push("");
  });

  return lines.join("\n");
}
