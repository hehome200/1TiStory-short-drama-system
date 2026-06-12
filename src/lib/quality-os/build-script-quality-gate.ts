/**
 * build-script-quality-gate.ts
 * 本地质量 Gate：4 个纯前端规则检查
 * - 人物名一致性
 * - 本集事件覆盖
 * - 下一集提前泄露
 * - 钩子落点检查
 *
 * 不调用 LLM、不写 DB、不扣费、不改后端、不阻断生成。
 */

import type { Character, OriginalDraft } from "@/lib/types";

// ── 公共类型 ──

export type LocalQualityGateStatus = "pass" | "warning" | "fail" | "unknown";

export type LocalQualityGate = {
  id: string;
  title: string;
  status: LocalQualityGateStatus;
  evidence: string[];
  suggestion?: string;
};

export type BuildQualityGateInput = {
  episodeNumber: number;
  scriptContent: string;
  characters: Character[];
  outlines: OriginalDraft["outlines"];
  reasoningText?: string;
};

// ── 工具 ──

/** 中文姓氏（常见 Top 100） */
const CHINESE_SURNAMES = new Set(
  "王李张刘陈杨黄赵周吴徐孙马胡朱郭何罗高林郑梁谢唐许冯宋韩邓彭曹曾田萧潘袁蔡蒋余于杜叶程魏苏吕丁任卢姚沈钟姜崔谭陆范汪廖石金韦贾夏付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤".split(""),
);

/** 常见中文名用字（top 100+ 高频名用字） */
const CHINESE_NAME_CHARS = new Set(
  "伟芳娜秀英敏静丽强磊军洋勇艳杰娟涛明超华洁秀兰萍强文斌建华峰刚莉桂琳鑫慧莹雪丹晶健宇浩志鹏飞彬婷欣燕玲佳蕾菲婉怡思雨晨阳瑶安琪蕊瑜彤凡仪".split(""),
);

/** 提取文本中的中文人名（保守：姓+1~2字名） */
function extractChineseNames(text: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const re = /([\u4e00-\u9fff]{2,3})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const candidate = m[1];
    if (candidate.length === 2) {
      const [s, g] = candidate;
      if (CHINESE_SURNAMES.has(s) && CHINESE_NAME_CHARS.has(g)) {
        if (!seen.has(candidate)) {
          seen.add(candidate);
          names.push(candidate);
        }
      }
    } else if (candidate.length === 3) {
      const [s, g1, g2] = candidate;
      if (CHINESE_SURNAMES.has(s) && CHINESE_NAME_CHARS.has(g1) && CHINESE_NAME_CHARS.has(g2)) {
        if (!seen.has(candidate)) {
          seen.add(candidate);
          names.push(candidate);
        }
      }
    }
  }
  return names;
}

/** 从文本中直接匹配已知名字的出现次数 */
function countNameHits(text: string, knownNames: string[]): Map<string, number> {
  const hits = new Map<string, number>();
  for (const name of knownNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "g");
    const count = (text.match(re) ?? []).length;
    if (count > 0) hits.set(name, count);
  }
  return hits;
}

/** 将大纲文本拆分为事件短句（2-6 条） */
function splitOutlineToEvents(outlineText: string): string[] {
  const clean = outlineText.replace(/^第[\u4e00-\u9fff\d]+集[：:]?/, "").trim();
  if (!clean) return [];

  // 按句号/分号/逗号/换行/顿号拆
  const parts = clean
    .split(/[。；，；\n、]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);

  if (parts.length <= 6) return parts;

  // 太多句就取前 2 + 末 2 + 中间均匀采样
  const result = [parts[0], parts[1]];
  if (parts.length > 4) {
    const mid = Math.floor(parts.length / 2);
    result.push(parts[mid]);
  }
  result.push(parts[parts.length - 2], parts[parts.length - 1]);
  return result;
}

/** 从短句中提取关键词 */
function extractKeywords(sentence: string): string[] {
  // 简单做法：取长度 >= 2 的中文片段，过滤太通用词
  const stopWords = new Set([
    "他们", "她们", "我们", "自己", "可以", "已经", "这个", "那个",
    "一个", "什么", "怎么", "为什么", "没有", "知道", "觉得",
    "因为", "所以", "但是", "如果", "虽然", "然后", "不过",
    "开始", "进行", "发生", "出现", "继续", "更加",
  ]);
  const tokens: string[] = [];
  const re = /[\u4e00-\u9fff]{2,4}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence)) !== null) {
    const t = m[0];
    if (!stopWords.has(t)) tokens.push(t);
  }
  return [...new Set(tokens)];
}

/** 统计一组关键词在正文中的命中率 */
function computeCoverageRate(text: string, keywords: string[][]): { covered: number; total: number } {
  let covered = 0;
  let total = 0;
  for (const kwSet of keywords) {
    if (kwSet.length === 0) continue;
    total++;
    const anyHit = kwSet.some((kw) => text.includes(kw));
    if (anyHit) covered++;
  }
  return { covered, total };
}

// ── Gate 1: 人物名一致性 ──

function checkCharacterNameConsistency(
  scriptText: string,
  characters: Character[],
  outlineText: string,
  reasoningText?: string,
): LocalQualityGate {
  const evidence: string[] = [];
  const knownNames = characters.map((c) => c.name).filter((n) => n.length >= 2 && n.length <= 4);
  const knownNameSet = new Set(knownNames);

  // 从大纲提取人名
  const outlineNames = extractChineseNames(outlineText).filter((n) => knownNameSet.has(n));
  const outlineNameSet = new Set(outlineNames);

  // 从正文提取人名
  const scriptNames = extractChineseNames(scriptText);
  // 正文命中的人物名
  const nameHits = countNameHits(scriptText, knownNames);

  if (knownNames.length === 0) {
    return {
      id: "char_name_consistency",
      title: "人物名一致性",
      status: "unknown",
      evidence: ["缺少人物小传数据，无法检查"],
    };
  }

  if (!scriptText.trim()) {
    return {
      id: "char_name_consistency",
      title: "人物名一致性",
      status: "unknown",
      evidence: ["暂无正文，无法检查人物名一致性"],
    };
  }

  // 检查：大纲中的主角名是否在正文中出现
  const missingFromScript: string[] = [];
  for (const name of outlineNames) {
    if (!nameHits.has(name)) {
      missingFromScript.push(name);
    }
  }

  // 检查：正文中是否出现了不在已知名单中的人名
  const unknownInScript = scriptNames.filter((n) => !knownNameSet.has(n));

  // thinking 中是否出现过人物名冲突
  const thinkingConflict = reasoningText?.includes("人物名冲突") || reasoningText?.includes("姓名冲突") || reasoningText?.includes("名字冲突");

  if (missingFromScript.length > 0) {
    evidence.push(`大纲主角「${missingFromScript.join("」「")}」未在正文中出现`);
  }
  if (unknownInScript.length > 0) {
    evidence.push(`正文出现未知人名「${unknownInScript.join("」「")}」，不在人物小传中`);
  }
  if (thinkingConflict) {
    evidence.push("模型思路中曾暴露人物名冲突（辅助参考）");
  }

  if (evidence.length === 0) {
    evidence.push(`所有登记人物名（${knownNames.length} 个）与正文一致`);
    return {
      id: "char_name_consistency",
      title: "人物名一致性",
      status: "pass",
      evidence,
    };
  }

  // 大纲主角缺失是严重问题
  if (missingFromScript.length > 0 && outlineNames.length > 0) {
    return {
      id: "char_name_consistency",
      title: "人物名一致性",
      status: "fail",
      evidence,
      suggestion: "检查人物小传与分集大纲是否存在主角名冲突，或正文是否遗漏了关键人物出场。",
    };
  }

  return {
    id: "char_name_consistency",
    title: "人物名一致性",
    status: "warning",
    evidence,
    suggestion: unknownInScript.length > 0
      ? "正文中出现未登记人名，请确认是否为新增人物或别名。"
      : undefined,
  };
}

// ── Gate 2: 本集事件覆盖 ──

function checkEpisodeEventCoverage(
  scriptText: string,
  outlineText: string,
): LocalQualityGate {
  if (!scriptText.trim()) {
    return {
      id: "episode_event_coverage",
      title: "本集事件覆盖",
      status: "unknown",
      evidence: ["暂无正文，无法检查事件覆盖"],
    };
  }

  if (!outlineText.trim()) {
    return {
      id: "episode_event_coverage",
      title: "本集事件覆盖",
      status: "unknown",
      evidence: ["缺少当前集大纲数据，无法检查事件覆盖"],
    };
  }

  const events = splitOutlineToEvents(outlineText);
  if (events.length === 0) {
    return {
      id: "episode_event_coverage",
      title: "本集事件覆盖",
      status: "unknown",
      evidence: ["当前集大纲无法拆解为有效事件"],
    };
  }

  const eventKeywords = events.map((e) => extractKeywords(e));
  const { covered, total } = computeCoverageRate(scriptText, eventKeywords);
  const rate = total === 0 ? 0 : covered / total;

  const uncoveredEvents = events
    .map((e, i) => ({ event: e, keywords: eventKeywords[i] }))
    .filter(({ keywords }) => keywords.length > 0 && !keywords.some((k) => scriptText.includes(k)))
    .map(({ event }) => event);

  const evidence: string[] = [
    `大纲拆解出 ${total} 个事件点，正文覆盖 ${covered} 个（${Math.round(rate * 100)}%）`,
  ];

  if (uncoveredEvents.length > 0 && uncoveredEvents.length <= 3) {
    evidence.push(`未覆盖事件：${uncoveredEvents.map((e) => `「${e.slice(0, 24)}…」`).join("；")}`);
  } else if (uncoveredEvents.length > 3) {
    evidence.push(`未覆盖事件：共 ${uncoveredEvents.length} 项（首项「${uncoveredEvents[0]?.slice(0, 24)}…」）`);
  }

  let status: LocalQualityGateStatus;
  let suggestion: string | undefined;

  if (rate >= 0.8) {
    status = "pass";
  } else if (rate >= 0.5) {
    status = "warning";
    suggestion = "部分大纲事件未在正文中体现，建议检查是否在合理省略范围内。";
  } else {
    status = "fail";
    suggestion = "多数大纲事件未覆盖，正文可能偏离大纲方向，建议审查。";
  }

  return {
    id: "episode_event_coverage",
    title: "本集事件覆盖",
    status,
    evidence,
    suggestion,
  };
}

// ── Gate 3: 下一集提前泄露 ──

function checkNextEpisodeLeak(
  scriptText: string,
  nextOutlineText: string,
  nextEpisodeTitle?: string,
): LocalQualityGate {
  if (!scriptText.trim()) {
    return {
      id: "next_episode_leak",
      title: "下一集提前泄露",
      status: "unknown",
      evidence: ["暂无正文，无法检查下一集泄露"],
    };
  }

  if (!nextOutlineText.trim() && !nextEpisodeTitle) {
    return {
      id: "next_episode_leak",
      title: "下一集提前泄露",
      status: "unknown",
      evidence: ["当前为最后一集或缺少下一集大纲数据"],
    };
  }

  // 提取下一集关键词
  const nextText = [nextEpisodeTitle ?? "", nextOutlineText].filter(Boolean).join(" ");
  const nextKeywords = extractKeywords(nextText);

  if (nextKeywords.length === 0) {
    return {
      id: "next_episode_leak",
      title: "下一集提前泄露",
      status: "unknown",
      evidence: ["下一集大纲未能提取有效关键词"],
    };
  }

  // 过滤出现在当前集大纲中的词（自然承接）
  const leakedKeywords = nextKeywords.filter((kw) => scriptText.includes(kw));

  const leakRate = nextKeywords.length > 0 ? leakedKeywords.length / nextKeywords.length : 0;

  const evidence: string[] = [];
  if (leakedKeywords.length > 0) {
    const display = leakedKeywords.slice(0, 5).join("、");
    evidence.push(`正文命中下一集关键词（${leakedKeywords.length}/${nextKeywords.length}）：${display}${leakedKeywords.length > 5 ? "…" : ""}`);
  } else {
    evidence.push("正文未命中下一集专属关键词");
    return {
      id: "next_episode_leak",
      title: "下一集提前泄露",
      status: "pass",
      evidence,
    };
  }

  // 保守阈值：只命中少量关键词且可能是自然承接 → warning
  // 命中大量关键词 → fail
  if (leakRate >= 0.5 && leakedKeywords.length >= 4) {
    return {
      id: "next_episode_leak",
      title: "下一集提前泄露",
      status: "fail",
      evidence,
      suggestion: "正文大量命中下一集专属关键词，疑似提前写了下一集内容。建议核实是否为过度展开。",
    };
  }

  if (leakRate >= 0.3 || leakedKeywords.length >= 3) {
    return {
      id: "next_episode_leak",
      title: "下一集提前泄露",
      status: "warning",
      evidence,
      suggestion: "存在少量命中，可能为自然承接。建议人工核实。",
    };
  }

  return {
    id: "next_episode_leak",
    title: "下一集提前泄露",
    status: "pass",
    evidence: [
      `仅有 ${leakedKeywords.length} 个关键词重合（${Math.round(leakRate * 100)}%），属于正常承接范围`,
    ],
  };
}

// ── Gate 4: 钩子落点 ──

function checkHookLanding(
  scriptText: string,
  hookText: string,
  outlineText: string,
): LocalQualityGate {
  if (!scriptText.trim()) {
    return {
      id: "hook_landing",
      title: "钩子落点",
      status: "unknown",
      evidence: ["暂无正文，无法检查钩子落点"],
    };
  }

  // 钩子数据来源：优先 episodeHook，其次大纲末尾
  const hookSource = hookText.trim() || (() => {
    // 从大纲文本末尾提取可能的钩子描述
    const tail = outlineText.trim();
    if (!tail) return "";
    const sentences = tail.split(/[。！？]/);
    const lastSentences = sentences.slice(-3).filter(Boolean);
    return lastSentences.join("。");
  })();

  if (!hookSource.trim()) {
    return {
      id: "hook_landing",
      title: "钩子落点",
      status: "unknown",
      evidence: ["缺少当前集钩子数据，无法检查"],
    };
  }

  const hookKeywords = extractKeywords(hookSource);
  if (hookKeywords.length === 0) {
    return {
      id: "hook_landing",
      title: "钩子落点",
      status: "unknown",
      evidence: ["钩子文本未能提取有效关键词"],
    };
  }

  // 正文尾部（后 30%）和全文
  const tailStart = Math.floor(scriptText.length * 0.7);
  const tailText = scriptText.slice(tailStart);

  const tailHits = hookKeywords.filter((kw) => tailText.includes(kw));
  const bodyHits = hookKeywords.filter(
    (kw) => scriptText.slice(0, tailStart).includes(kw) && !tailText.includes(kw),
  );

  const evidence: string[] = [];

  const tailHitRate = hookKeywords.length > 0 ? tailHits.length / hookKeywords.length : 0;

  if (tailHitRate >= 0.5) {
    evidence.push(`尾部命中钩子关键词（${tailHits.length}/${hookKeywords.length}）`);
    return {
      id: "hook_landing",
      title: "钩子落点",
      status: "pass",
      evidence,
    };
  }

  if (tailHits.length > 0) {
    evidence.push(`尾部仅有 ${tailHits.length}/${hookKeywords.length} 个关键词命中`);
    if (bodyHits.length > 0) {
      evidence.push(`但正文中段已出现钩子关键词：${bodyHits.slice(0, 3).join("、")}`);
    }
    return {
      id: "hook_landing",
      title: "钩子落点",
      status: "warning",
      evidence,
      suggestion: "钩子关键词在正文尾部命中不足，建议检查结尾是否已落实钩子设计。",
    };
  }

  // 完全不命中尾部
  if (bodyHits.length > 0) {
    evidence.push(`钩子关键词全部出现在正文中段而非尾部：${bodyHits.slice(0, 4).join("、")}…`);
    return {
      id: "hook_landing",
      title: "钩子落点",
      status: "warning",
      evidence,
      suggestion: "钩子内容在正文中间出现但结尾未收束，建议调整钩子落点位置。",
    };
  }

  evidence.push("正文中未检测到本集钩子关键词");
  return {
    id: "hook_landing",
    title: "钩子落点",
    status: "warning",
    evidence,
    suggestion: "正文结尾与钩子设计关联较弱，建议检查本集结尾是否具备了钩子引导力。",
  };
}

// ── 主入口 ──

export function buildScriptQualityGate(input: BuildQualityGateInput): LocalQualityGate[] {
  const { episodeNumber, scriptContent, characters, outlines, reasoningText } = input;
  const epIndex = episodeNumber - 1;

  // 当前集大纲文本
  const currentOutline = outlines.episodes[epIndex]?.trim() ?? "";
  // 下一集大纲文本
  const nextOutline = outlines.episodes[epIndex + 1]?.trim() ?? "";
  // 下一集标题（如果有 episodesStructured）
  const nextEpisodeStructured = outlines.episodesStructured?.find(
    (e: { episodeNumber: number }) => e.episodeNumber === episodeNumber + 1,
  );
  const nextEpisodeTitle = nextEpisodeStructured?.title ?? "";
  // 当前集钩子（如果有 episodesStructured）
  const currentEpisodeStructured = outlines.episodesStructured?.find(
    (e: { episodeNumber: number }) => e.episodeNumber === episodeNumber,
  );
  const currentEpisodeHook = currentEpisodeStructured?.hook ?? "";

  const gates: LocalQualityGate[] = [
    checkCharacterNameConsistency(scriptContent, characters, currentOutline, reasoningText),
    checkEpisodeEventCoverage(scriptContent, currentOutline),
    checkNextEpisodeLeak(scriptContent, nextOutline, nextEpisodeTitle),
    checkHookLanding(scriptContent, currentEpisodeHook, currentOutline),
  ];

  return gates;
}
