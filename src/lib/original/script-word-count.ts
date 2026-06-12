/**
 * 剧本正文字数统计工具。
 *
 * 约定：剧本字数 = 中文字符数（不含标点、空格、英文、场景头标记等）。
 * 目录卡片、保存前校验、正文底部字数展示统一使用本文件的计数方式。
 */

/** 统计中文汉字数（只计 CJK 统一汉字 U+4E00–U+9FFF）。 */
export function countScriptChineseChars(content: string): number {
  return (content.match(/[\u4e00-\u9fff]/g) || []).length;
}

/**
 * 清洗模型自报的尾注类字数行，例如：
 * - "本集字数：526字"
 * - "本集字数：526 字"
 * - "字数：526字"
 * - "（共526字）"
 * - "本集字数526字"
 * 不修改内容主体，只移除末尾一行或一行的尾注片段。
 */
export function stripGeneratedWordCountFooter(content: string): string {
  if (!content) return content;

  // 先移除末尾独立行（换行后紧跟此类模式）
  const footerPatterns: RegExp[] = [
    /^本集字数[：:]\s*\d+\s*字\s*$/,
    /^字数[：:]\s*\d+\s*字\s*$/,
    /^共\s*\d+\s*字\s*$/,
    /^本集字数\s*\d+\s*字\s*$/,
    /^\（共\d+字\）\s*$/,
    /^\（共\s*\d+\s*字\）\s*$/,
    /^\(\s*共\s*\d+\s*字\s*\)\s*$/,
  ];

  const lines = content.split("\n");
  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1].trim();
    if (footerPatterns.some((p) => p.test(lastLine))) {
      lines.pop();
      // 移除空尾行
      while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
        lines.pop();
      }
      return lines.join("\n");
    }
    // 再处理非独立行尾注（紧跟在正文末尾，同一行中间有空格或—或——）
    // 例如 "正文结束。——本集字数526字"
    const inlinePatterns = [
      /\s*[—―-]+\s*本集字数\s*\d+\s*字\s*$/,
      /\s*本集字数[：:]\s*\d+\s*字\s*$/,
      /\s*字数[：:]\s*\d+\s*字\s*$/,
    ];
    for (const pat of inlinePatterns) {
      if (pat.test(lastLine)) {
        const cleaned = lastLine.replace(pat, "");
        if (cleaned.trim()) {
          lines[lines.length - 1] = lines[lines.length - 1].replace(
            /\s*[—―-]*\s*本集字数[：:]?\s*\d+\s*字\s*$/,
            "",
          );
        } else {
          // 整行只剩尾注，移除该行
          lines.pop();
          while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
            lines.pop();
          }
        }
        return lines.join("\n");
      }
    }
  }

  return content;
}
