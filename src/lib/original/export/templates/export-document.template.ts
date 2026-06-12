import type { OriginalDraft } from "@/lib/types";
import {
  extractProjectInfo,
  renderProjectInfo,
} from "./project-info.template";
import {
  extractCompleteOutline,
  renderCompleteOutline,
} from "./complete-outline.template";
import {
  extractCharacters,
  renderCharacters,
} from "./characters.template";
import {
  extractEpisodeOutlines,
  renderEpisodeOutlines,
} from "./episode-outlines.template";
import {
  extractScriptBody,
  renderScriptBody,
} from "./script-body.template";

export type ExportSection =
  | "characters"
  | "completeOutline"
  | "episodeOutlines"
  | "scriptBody";

export const ALL_EXPORT_SECTIONS: ExportSection[] = [
  "characters",
  "completeOutline",
  "episodeOutlines",
  "scriptBody",
];

export const EXPORT_SECTION_LABELS: Record<ExportSection, string> = {
  characters: "人物小传",
  completeOutline: "完整大纲",
  episodeOutlines: "分集大纲",
  scriptBody: "分集剧本",
};

export function exportDocument(
  draft: OriginalDraft,
  selectedSections: ExportSection[],
): string {
  const parts: string[] = [];

  // 项目信息（始终输出）
  parts.push(renderProjectInfo(extractProjectInfo(draft)));

  for (const section of selectedSections) {
    switch (section) {
      case "characters": {
        const charactersData = extractCharacters(draft);
        parts.push(renderCharacters(charactersData));
        break;
      }
      case "completeOutline": {
        const outlineData = extractCompleteOutline(draft);
        const hasContent =
          outlineData.roughNarrative.length > 0 || outlineData.beatCards.length > 0;
        if (hasContent) {
          parts.push(renderCompleteOutline(outlineData));
        } else {
          parts.push("# 完整大纲\n\n完整大纲尚未生成\n");
        }
        break;
      }
      case "episodeOutlines": {
        const episodeOutlinesData = extractEpisodeOutlines(draft);
        const hasContent = episodeOutlinesData.episodes.length > 0;
        if (hasContent) {
          parts.push(renderEpisodeOutlines(episodeOutlinesData));
        } else {
          parts.push("# 分集大纲\n\n暂无内容\n");
        }
        break;
      }
      case "scriptBody": {
        const scriptBodyData = extractScriptBody(draft);
        const hasContent =
          Object.keys(scriptBodyData.episodeScripts).length > 0;
        if (hasContent) {
          parts.push(renderScriptBody(scriptBodyData));
        } else {
          parts.push("# 分集剧本\n\n暂无内容\n");
        }
        break;
      }
    }
  }

  return parts.join("\n\n---\n\n").trim();
}

/**
 * 触发浏览器下载 markdown 文件
 */
export function downloadExportedDocument(
  content: string,
  filename: string,
): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Word 兼容 HTML .doc ──

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 转换内联 Markdown：**text** → <strong>text</strong>（输入应为已 escape 的文本） */
function convertInlineMD(escaped: string): string {
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/**
 * 将类 Markdown 文本转为 Word 兼容 HTML。
 * 支持：#/##/### 标题、--- 分隔线、- 列表项、**加粗**、普通段落。
 */
function mdToWordHtml(md: string, title: string): string {
  const lines = md.split("\n");
  const bodyLines: string[] = [];

  for (const line of lines) {
    // 空行 → 略过（靠元素自身 margin 留白）
    if (line.trim() === "") continue;

    // 水平分隔线
    if (line.trim() === "---") {
      bodyLines.push('<hr style="border:none;border-top:1px solid #ccc;margin:16px 0;"/>');
      continue;
    }

    // h3
    if (line.startsWith("### ")) {
      bodyLines.push(
        `<h3 style="font-size:14pt;font-weight:bold;margin:12px 0 6px;">${convertInlineMD(escapeHtml(line.slice(4)))}</h3>`,
      );
      continue;
    }

    // h2
    if (line.startsWith("## ")) {
      bodyLines.push(
        `<h2 style="font-size:16pt;font-weight:bold;margin:16px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px;">${convertInlineMD(escapeHtml(line.slice(3)))}</h2>`,
      );
      continue;
    }

    // h1
    if (line.startsWith("# ")) {
      bodyLines.push(
        `<h1 style="font-size:20pt;font-weight:bold;margin:20px 0 10px;border-bottom:1px solid #333;padding-bottom:4px;">${convertInlineMD(escapeHtml(line.slice(2)))}</h1>`,
      );
      continue;
    }

    // 列表项：去掉前导 "- " 后转为带缩进的段落
    let content = line;
    let isListItem = false;
    if (/^-\s+/.test(content)) {
      content = content.replace(/^-\s+/, "");
      isListItem = true;
    }

    const inner = convertInlineMD(escapeHtml(content));
    if (isListItem) {
      bodyLines.push(
        `<p style="margin:2px 0 2px 20px;line-height:1.6;text-indent:-20px;padding-left:20px;">${inner}</p>`,
      );
    } else {
      bodyLines.push(
        `<p style="margin:4px 0;line-height:1.6;">${inner}</p>`,
      );
    }
  }

  return [
    "<!DOCTYPE html>",
    '<html xmlns:o="urn:schemas-microsoft-com:office:office"',
    '      xmlns:w="urn:schemas-microsoft-com:office:word"',
    '      xmlns="http://www.w3.org/TR/REC-html40">',
    '<head><meta charset="utf-8"/>',
    `<title>${escapeHtml(title)}</title>`,
    "<style>",
    "  body { font-family:'Microsoft YaHei','SimSun',Arial,sans-serif; font-size:12pt; color:#222; line-height:1.6; padding:24px; }",
    "  h1 { padding-bottom:4px; border-bottom:1px solid #333; }",
    "  h2 { border-bottom:1px solid #eee; }",
    "  hr { margin:16px 0; }",
    "  p { margin:4px 0; }",
    "  strong { font-weight:bold; }",
    "</style></head>",
    `<body>${bodyLines.join("\n")}</body>`,
    "</html>",
  ].join("\n");
}

/**
 * 触发浏览器下载 Word 兼容 .doc 文件
 */
export function downloadExportedWordDocument(
  content: string,
  filename: string,
): void {
  const html = mdToWordHtml(content, filename);
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".doc") ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
