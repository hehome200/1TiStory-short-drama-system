import type { OriginalDraft, ProjectBrief, ScriptPlan } from "@/lib/types";

export type StorySynopsisData = {
  premise: string;
  coreHooks: string[];
  worldview: string;
  storyBackground: string;
  highlight: string;
  styleTags: string[];
  projectBrief: ProjectBrief | null;
  scriptPlan: ScriptPlan | null;
};

export function extractStorySynopsis(draft: OriginalDraft): StorySynopsisData {
  const ov = draft.overview;
  return {
    premise: ov.premise || ov.userPremise || "",
    coreHooks: ov.coreHooks?.filter(Boolean) ?? [],
    worldview: ov.worldview || "",
    storyBackground: ov.storyBackground || "",
    highlight: ov.highlight || ov.coreHighlight || "",
    styleTags: ov.styleTags?.filter(Boolean) ?? [],
    projectBrief: ov.projectBrief ?? null,
    scriptPlan: ov.scriptPlan ?? null,
  };
}

export function renderStorySynopsis(data: StorySynopsisData): string {
  const lines: string[] = [];
  lines.push("# 项目设定");
  lines.push("");

  // ── 故事梗概 ──
  if (data.premise) {
    lines.push("## 一句话故事");
    lines.push("");
    lines.push(data.premise);
    lines.push("");
  }

  if (data.coreHooks.length > 0) {
    lines.push("## 核心钩子");
    lines.push("");
    data.coreHooks.forEach((h) => lines.push(`- ${h}`));
    lines.push("");
  }

  if (data.highlight) {
    lines.push("## 故事亮点");
    lines.push("");
    lines.push(data.highlight);
    lines.push("");
  }

  if (data.worldview) {
    lines.push("## 世界观");
    lines.push("");
    lines.push(data.worldview);
    lines.push("");
  }

  if (data.storyBackground) {
    lines.push("## 故事背景");
    lines.push("");
    lines.push(data.storyBackground);
    lines.push("");
  }

  if (data.styleTags.length > 0) {
    lines.push("## 风格标签");
    lines.push("");
    lines.push(data.styleTags.join("、"));
    lines.push("");
  }

  // ── ProjectBrief ──
  if (data.projectBrief) {
    const pb = data.projectBrief;
    lines.push("## 项目约束（ProjectBrief）");
    lines.push("");
    if (pb.genres?.length) lines.push(`- **题材**：${pb.genres.join("、")}`);
    if (pb.coreHooks?.length) lines.push(`- **核心钩子**：${pb.coreHooks.join("、")}`);
    if (pb.coreEmotion) lines.push(`- **核心情感**：${pb.coreEmotion}`);
    if (pb.episodeCount) lines.push(`- **总集数**：${pb.episodeCount}`);
    if (pb.episodeDuration) lines.push(`- **单集时长**：${pb.episodeDuration}`);
    if (pb.targetWordsPerEpisode) lines.push(`- **单集目标字数**：${pb.targetWordsPerEpisode}`);
    if (pb.sceneLimitPerEpisode) lines.push(`- **场景上限**：${pb.sceneLimitPerEpisode}`);
    if (pb.productionConstraint) lines.push(`- **制作限制**：${pb.productionConstraint}`);
    if (pb.complexityLevel) lines.push(`- **复杂度**：${pb.complexityLevel}`);
    if (pb.styleTags?.length) lines.push(`- **风格**：${pb.styleTags.join("、")}`);
    lines.push("");
  }

  // ── ScriptPlan ──
  if (data.scriptPlan) {
    const sp = data.scriptPlan;
    lines.push("## 剧本策划（ScriptPlan）");
    lines.push("");
    if (sp.logline) lines.push(`- **Logline**：${sp.logline}`);
    if (sp.commercialHook) lines.push(`- **商业钩子**：${sp.commercialHook}`);
    if (sp.targetAudience) lines.push(`- **目标人群**：${sp.targetAudience}`);
    if (sp.genrePromise) lines.push(`- **类型承诺**：${sp.genrePromise}`);
    if (sp.mainConflict) lines.push(`- **主线冲突**：${sp.mainConflict}`);
    if (sp.tone) lines.push(`- **基调**：${sp.tone}`);
    if (sp.productionNotes) lines.push(`- **制作备注**：${sp.productionNotes}`);
    if (sp.riskNotes?.length) {
      lines.push(`- **风险提示**：`);
      sp.riskNotes.forEach((r) => lines.push(`  - ${r}`));
    }
    lines.push("");
  }

  return lines.join("\n");
}
