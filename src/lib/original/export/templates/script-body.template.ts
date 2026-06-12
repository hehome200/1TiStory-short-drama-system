import type { OriginalDraft } from "@/lib/types";
import { stripGeneratedWordCountFooter } from "@/lib/original/script-word-count";

export type ScriptBodyData = {
  episodeScripts: Record<string, string>;
};

export function extractScriptBody(draft: OriginalDraft): ScriptBodyData {
  const episodeScripts: Record<string, string> = {};

  if (draft.episodeScripts) {
    for (const [key, sd] of Object.entries(draft.episodeScripts)) {
      const epKey = key.startsWith("第") ? key : `第${key}集`;
      const raw = typeof sd.content === "string" ? sd.content : "";
      episodeScripts[epKey] = stripGeneratedWordCountFooter(raw);
    }
  }

  // 如果 episodeScripts 为空但有一笔 script 全局，也纳入
  if (
    Object.keys(episodeScripts).length === 0 &&
    draft.script?.content
  ) {
    const ep = draft.script.episode || "第1集";
    episodeScripts[ep] = stripGeneratedWordCountFooter(draft.script.content);
  }

  return { episodeScripts };
}

export function renderScriptBody(data: ScriptBodyData): string {
  const lines: string[] = [];
  lines.push("# 分集剧本");
  lines.push("");

  const entries = Object.entries(data.episodeScripts);
  if (!entries.length) {
    lines.push("暂无剧本正文");
    lines.push("");
    return lines.join("\n");
  }

  // 按集号排序
  entries.sort((a, b) => {
    const na = parseInt((a[0].match(/\d+/) ?? [])[0] ?? "0", 10);
    const nb = parseInt((b[0].match(/\d+/) ?? [])[0] ?? "0", 10);
    return na - nb;
  });

  entries.forEach(([epKey, content]) => {
    lines.push(`## ${epKey}`);
    lines.push("");
    lines.push(content);
    lines.push("");
  });

  return lines.join("\n");
}
