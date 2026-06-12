import type { GenerationQualityReport, QualityIssue, QualityMetric } from "@/lib/quality-os/types";

export type LocalScriptAuditInput = {
  projectId?: string;
  episodeNumber?: number;
  scriptText: string;
  targetWordCount?: number;
  now?: string;
};

/**
 * 本地静态审计：基于正文文本生成本地规则检查报告
 * 不调用 LLM、不写 DB、不扣费
 * source = "local_static", mode = "local_static_audit"
 */
export function buildLocalScriptAudit(input: LocalScriptAuditInput): GenerationQualityReport {
  const now = input.now ?? new Date().toISOString();
  const text = input.scriptText;
  const targetWords = input.targetWordCount ?? 0;
  const trimmedText = text.trim();

  const chineseCharCount = (s: string): number => {
    let count = 0;
    for (const ch of s) {
      if (/[\u4e00-\u9fff]/.test(ch)) count++;
    }
    return count;
  };

  const wordCount = chineseCharCount(trimmedText);
  const lines = trimmedText.split("\n").filter(Boolean);
  const dialogueLineCount = lines.filter((l) => /^[\u4e00-\u9fff]{2,4}[：:]/.test(l.trim())).length;
  const sceneLineCount = trimmedText.match(/^\s*\d+-\d+\s+(日|夜|晨|清晨|黄昏|傍晚|凌晨)\s+(内|外|内外)\s+.+$/gm)?.length ?? 0;
  const hasTitle = /第[\u4e00-\u9fff\d]+集/.test(trimmedText) || /Episode\s+\d+/i.test(trimmedText);
  const isScriptEmpty = !trimmedText;

  // 重复行检测
  const lineMap = new Map<string, number[]>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 6) continue; // 跳过太短的行
    const prev = lineMap.get(line) ?? [];
    prev.push(i + 1);
    lineMap.set(line, prev);
  }
  const duplicateLines: string[] = [];
  for (const [text, indices] of lineMap) {
    if (indices.length >= 3) {
      duplicateLines.push(`第${indices.join(",")}行重复: "${text.slice(0, 30)}"`);
    }
  }

  const issues: QualityIssue[] = [];
  let issueIndex = 0;

  const addIssue = (title: string, description: string): void => {
    issues.push({
      id: `local_audit_${input.episodeNumber ?? 0}_${issueIndex++}`,
      level: "L1",
      title,
      description,
      severity: "medium",
      evidenceIds: [],
      location: {
        stage: "script",
        episodeNumber: input.episodeNumber,
      },
      suggestedAction: "",
    });
  };

  if (isScriptEmpty) {
    addIssue("正文内容为空", "当前集没有可分析的正文内容");
  }

  if (targetWords > 0 && wordCount > 0) {
    if (wordCount < targetWords * 0.75) {
      addIssue("字数偏低", `当前 ${wordCount} 字，低于目标 ${targetWords} 字的 75%`);
    } else if (wordCount > targetWords * 1.5) {
      addIssue("字数偏高", `当前 ${wordCount} 字，超出目标 ${targetWords} 字的 150%`);
    }
  } else if (wordCount > 0 && wordCount < 300) {
    addIssue("字数偏短", `当前仅 ${wordCount} 字，可能内容不完整`);
  }

  if (!hasTitle && !isScriptEmpty) {
    addIssue("未检测到标题", "正文中未找到「第X集」格式的标题标记");
  }

  for (const dupInfo of duplicateLines.slice(0, 3)) {
    addIssue("存在连续重复行", dupInfo);
  }

  if (sceneLineCount === 0 && !isScriptEmpty) {
    addIssue("未检测到场景标记", "正文中未找到「X-Y 日/夜 内/外 地点」格式的场景头");
  }

  const metrics: QualityMetric[] = [
    { id: "word_count", name: "中文字数", value: wordCount, unit: "字" },
    { id: "total_lines", name: "总行数", value: lines.length },
    { id: "scene_count", name: "场景段落数", value: sceneLineCount },
    { id: "dialogue_lines", name: "对白行数", value: dialogueLineCount },
    { id: "has_title", name: "包含标题", value: hasTitle ? 1 : 0 },
  ];

  // 摘要
  const summaryParts: string[] = [];
  if (isScriptEmpty) {
    summaryParts.push("正文为空，无法评估");
  } else {
    summaryParts.push(`已完成本地静态审计（${wordCount}字 / ${sceneLineCount}场景 / ${dialogueLineCount}行对白）`);
  }
  if (issues.length > 0) {
    summaryParts.push(`共发现 ${issues.length} 个问题`);
  } else {
    summaryParts.push("未发现明显问题");
  }

  // 建议
  const recommendations: string[] = [];
  if (isScriptEmpty) {
    recommendations.push("建议生成本集正文");
  } else {
    if (targetWords > 0 && wordCount < targetWords * 0.75) {
      recommendations.push(`字数偏低（${wordCount}/${targetWords}），可尝试重新生成`);
    }
    if (wordCount === 0) {
      recommendations.push("正文可能缺少中文字符");
    }
    if (!hasTitle) {
      recommendations.push("建议添加「第X集」标题标记");
    }
    if (duplicateLines.length > 0) {
      recommendations.push("建议检查重复行并手动调整");
    }
    if (sceneLineCount === 0) {
      recommendations.push("建议使用「X-Y 日/夜 内/外 地点」格式的场景标记");
    }
    if (issues.length === 0) {
      recommendations.push("基础指标正常，可进一步人工审阅");
    }
  }

  return {
    id: `local_audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    projectId: input.projectId,
    stage: "script",
    episodeNumber: input.episodeNumber,
    createdAt: now,
    overallScore: issues.length === 0 ? 90 : issues.length <= 2 ? 70 : 50,
    validationLevels: issues.length > 0 ? ["L1"] : ["L0"],
    evidenceCards: [],
    rules: [],
    issues,
    metrics,
    summary: summaryParts.join("。"),
    recommendation: recommendations.length > 0 ? recommendations.join("；") : "基础指标正常",
    source: "local_static",
    mode: "local_static_audit",
  };
}
