import type { OriginalDraft } from "@/lib/types";

export type ProjectInfoData = {
  title: string;
  scriptType: string;
  genres: string[];
  audience: string;
};

export function extractProjectInfo(draft: OriginalDraft): ProjectInfoData {
  const pb = draft.overview.projectBrief ?? ({} as any);
  return {
    title: draft.title || "未命名项目",
    scriptType: pb.scriptType === "ai_comic" ? "AI漫剧" : "真人短剧",
    genres: draft.overview.genres?.length ? draft.overview.genres : ["未填写"],
    audience: draft.overview.audience || "未填写",
  };
}

export function renderProjectInfo(data: ProjectInfoData): string {
  const lines: string[] = [];
  lines.push("# 项目信息");
  lines.push("");
  lines.push(`- **项目名称**：${data.title}`);
  lines.push(`- **剧本类型**：${data.scriptType}`);
  lines.push(`- **题材**：${data.genres.join("、")}`);
  lines.push(`- **目标市场**：${data.audience}`);
  lines.push("");
  return lines.join("\n");
}
