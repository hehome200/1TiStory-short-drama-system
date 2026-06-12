/**
 * build-user-constraint-pack.ts
 * 将 debug-prompt API 返回的 sections 反推归类为用户可读的「本集约束包」。
 * 不调用 LLM、不写 DB、不扣费。
 */

export type ConstraintGroupKey =
  | "must_follow"
  | "episode_design"
  | "unbreakable_facts"
  | "priority_advice"
  | "continuity"
  | "reference"
  | "characters"
  | "format"
  | "fallback";

export type ConstraintGroup = {
  key: ConstraintGroupKey;
  label: string;
  items: Array<{
    title: string;
    content: string;
  }>;
};

export type UserConstraintPack = {
  groups: ConstraintGroup[];
  totalSections: number;
  totalChars: number;
};

// ── 产品态展示区块 ──
export type DisplayBlockKey =
  | "execution_card"
  | "hard_constraints"
  | "continuity_taboos"
  | "reference_material";

export type DisplayBlock = {
  key: DisplayBlockKey;
  title: string;
  subtitle?: string;
  items: Array<{ title: string; content: string }>;
  defaultExpanded: boolean;
};

type RawSection = {
  title: string;
  source: string;
  chars: number;
  content: string;
};

const GROUP_DEFS: Array<{
  key: ConstraintGroupKey;
  label: string;
  keywords: string[];
  priority: number;
}> = [
  {
    key: "must_follow",
    label: "必须遵守",
    keywords: [
      "硬约束", "必须遵守", "不可违背", "禁止", "不得", "强制",
      "硬禁例", "禁例", "前情事实守恒", "绝对不能",
    ],
    priority: 0,
  },
  {
    key: "episode_design",
    label: "本集设计",
    keywords: [
      "本集", "当前集", "分集设计", "看点", "核心冲突",
      "剧情与冲突", "情感基调", "结尾钩子", "目标", "执行目标",
      "白名单", "纯文本大纲", "大纲", "前后集",
    ],
    priority: 1,
  },
  {
    key: "unbreakable_facts",
    label: "不可违背事实",
    keywords: [
      "事实", "不可违背", "不可更改", "已发生", "前集", "前情",
      "必须承接", "不得增生", "不得重写", "前文", "身份必须",
    ],
    priority: 2,
  },
  {
    key: "priority_advice",
    label: "优先级建议",
    keywords: ["优先级", "先止损", "建议", "更优先", "最优先"],
    priority: 3,
  },
  {
    key: "continuity",
    label: "连续性约束",
    keywords: [
      "时间", "承诺", "兑现", "跨章", "跨集", "连续性",
      "后文叙事时间", "阶段", "第三阶段", "第二阶段", "第一阶段",
    ],
    priority: 4,
  },
  {
    key: "reference",
    label: "参考材料",
    keywords: [
      "参考材料", "全剧大纲", "世界观", "势力", "伏笔", "卡点",
      "结构设计", "故事母本", "核心梗概", "核心亮点", "题材",
      "核心设定", "风格", "用户原文", "原文事件", "改编策略",
      "改编声明", "projectBrief", "数字约束",
    ],
    priority: 5,
  },
  {
    key: "characters",
    label: "人物设定",
    keywords: ["人物", "角色", "人物卡", "主要角色", "人物小传", "摘要"],
    priority: 6,
  },
  {
    key: "format",
    label: "格式要求",
    keywords: ["字数", "格式", "场景数", "输出格式", "剧本格式", "场景上限", "单集"],
    priority: 7,
  },
];

function matchScore(sectionText: string, keywords: string[]): number {
  const lower = sectionText.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    const count = lower.split(kw.toLowerCase()).length - 1;
    score += count;
  }
  return score;
}

function classifySection(section: RawSection): ConstraintGroupKey {
  const textToMatch = `${section.title}\n${section.source}\n${section.content}`;
  let bestKey: ConstraintGroupKey = "fallback";
  let bestScore = 0;
  let bestPriority = Infinity;

  for (const def of GROUP_DEFS) {
    const score = matchScore(textToMatch, def.keywords);
    if (score > 0 && (score > bestScore || (score === bestScore && def.priority < bestPriority))) {
      bestScore = score;
      bestPriority = def.priority;
      bestKey = def.key;
    }
  }

  return bestKey;
}

/**
 * 检测 section 是否为 system prompt / 调试内容，不应展示给用户。
 * 匹配标准：title 或 source 包含已知 system prompt 标识词。
 */
function isSystemPromptSection(section: RawSection): boolean {
  const text = `${section.title}\n${section.source}`.toLowerCase();
  const indicators = [
    "system", "task rule", "prompt 规则", "prompt 说明",
    "generation rule", "buildprompt",
    "system prompt", "调试资产", "debug asset",
  ];
  return indicators.some((ind) => text.includes(ind));
}

/**
 * 对一段文本做用户向清洗：去除 system prompt 标志性段落。
 * safe: 只做逐行匹配 + 上下文标记截断，不影响正常约束内容。
 */
function sanitizeUserContent(text: string): string {
  let cleaned = text;

  // 去除以 system prompt 角色设定开头的行（如「你是资深短剧策划师…」）
  cleaned = cleaned.replace(/^你是资深短剧策划师.*$/gm, "");

  // 去除以格式指令开头的行（如「只返回 JSON」「不要 Markdown」等）
  cleaned = cleaned.replace(/^(只返回 JSON|不要 Markdown|返回结构必须满足|请严格按以下格式输出).*$/gm, "");

  // 截断「当前项目上下文如下：」标记及其后所有内容
  const ctxMarker = "当前项目上下文如下：";
  const ctxIdx = cleaned.indexOf(ctxMarker);
  if (ctxIdx >= 0) {
    cleaned = cleaned.slice(0, ctxIdx).trimEnd();
  }

  // 压缩连续空行
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  return cleaned;
}

/** 单条约束最大展示/复制长度 */
const MAX_ITEM_LENGTH = 4000;
/** 完整上下文最大展示/复制长度 */
const MAX_CONTEXT_LENGTH = 2000;

export function buildUserConstraintPack(
  sections: RawSection[] | undefined | null,
  context?: string | null,
): UserConstraintPack {
  if (!sections || sections.length === 0) {
    // 有 context 但无 sections：sanitize + truncate
    if (context && context.trim().length > 0) {
      const cleanContext = sanitizeUserContent(context);
      const truncated =
        cleanContext.length > MAX_CONTEXT_LENGTH
          ? cleanContext.slice(0, MAX_CONTEXT_LENGTH) + "\n\n…（已截断）"
          : cleanContext;
      return {
        groups: [
          {
            key: "fallback",
            label: "完整上下文",
            items: [{ title: "项目背景摘要", content: truncated }],
          },
        ],
        totalSections: 0,
        totalChars: truncated.length,
      };
    }
    return { groups: [], totalSections: 0, totalChars: 0 };
  }

  const groupMap = new Map<ConstraintGroupKey, ConstraintGroup>();

  // Initialize groups in priority order
  for (const def of GROUP_DEFS) {
    groupMap.set(def.key, { key: def.key, label: def.label, items: [] });
  }
  groupMap.set("fallback", { key: "fallback", label: "完整上下文", items: [] });

  let totalChars = 0;

  for (const section of sections) {
    // 跳过 system prompt / 调试内容
    if (isSystemPromptSection(section)) continue;

    const key = classifySection(section);
    const group = groupMap.get(key);
    if (group) {
      const cleanContent = sanitizeUserContent(section.content);
      if (cleanContent.length === 0) continue; // 清洗后为空则丢弃
      group.items.push({
        title: section.title,
        content: cleanContent.length > MAX_ITEM_LENGTH
          ? cleanContent.slice(0, MAX_ITEM_LENGTH) + "\n\n…（已截断）"
          : cleanContent,
      });
    }
    totalChars += section.chars;
  }

  // Add context as fallback content if no fallback items yet
  if (context && context.trim().length > 0) {
    const fallback = groupMap.get("fallback");
    if (fallback && fallback.items.length === 0) {
      const cleanContext = sanitizeUserContent(context);
      const truncated =
        cleanContext.length > MAX_CONTEXT_LENGTH
          ? cleanContext.slice(0, MAX_CONTEXT_LENGTH) + "\n\n…（已截断，完整上下文请使用左侧 Prompt Inspector）"
          : cleanContext;
      fallback.items.push({ title: "项目背景摘要", content: truncated });
      totalChars += truncated.length;
    }
  }

  // Filter out empty groups
  const groups = Array.from(groupMap.values()).filter((g) => g.items.length > 0);

  return {
    groups,
    totalSections: sections.length,
    totalChars,
  };
}

/**
 * 将 8 组约束合并为 4 个产品态展示区块。
 * @deprecated 请使用 buildProjectedConstraintCard + 直接在 UI 渲染结构化卡片。
 */
export function buildDisplayBlocks(pack: UserConstraintPack): DisplayBlock[] {
  const groupMap = new Map<string, ConstraintGroup>();
  for (const g of pack.groups) {
    groupMap.set(g.key, g);
  }

  function itemsOf(...keys: ConstraintGroupKey[]) {
    const out: Array<{ title: string; content: string }> = [];
    for (const k of keys) {
      const g = groupMap.get(k);
      if (g) out.push(...g.items);
    }
    return out;
  }

  const blocks: DisplayBlock[] = [
    {
      key: "execution_card",
      title: "本集执行卡",
      items: itemsOf("episode_design", "must_follow"),
      defaultExpanded: true,
    },
    {
      key: "hard_constraints",
      title: "硬性约束",
      items: itemsOf("format"),
      defaultExpanded: true,
    },
    {
      key: "continuity_taboos",
      title: "连续性与禁区",
      items: itemsOf("unbreakable_facts", "continuity"),
      defaultExpanded: true,
    },
    {
      key: "reference_material",
      title: "参考材料",
      subtitle: "以下内容用于保持设定一致，不代表本集必须全部写入。",
      items: itemsOf("reference", "characters", "fallback", "priority_advice"),
      defaultExpanded: false,
    },
  ];

  return blocks.filter((b) => b.items.length > 0);
}

/**
 * 将用户约束包格式化为产品态 Markdown 文本，用于复制。
 * @deprecated 请使用 formatConstraintCardForCopy。
 */
export function formatConstraintPackForCopy(pack: UserConstraintPack): string {
  if (pack.groups.length === 0) return "";

  const blocks = buildDisplayBlocks(pack);
  if (blocks.length === 0) return "";

  const lines: string[] = ["# 本集创作执行卡"];

  for (const block of blocks) {
    lines.push("");
    lines.push(`## ${block.title}`);
    if (block.subtitle) {
      lines.push(`> ${block.subtitle}`);
    }
    for (const item of block.items) {
      lines.push("");
      // 最终安全网：再次清洗每条内容
      const safeContent = sanitizeUserContent(item.content);
      if (safeContent.length === 0) continue;
      lines.push(safeContent);
    }
  }

  // 最终全量检查：不包含 system prompt 标志性文本
  const result = lines.join("\n");
  if (/你是资深短剧策划师/.test(result) || /只返回 JSON/.test(result)) {
    return "# 本集创作执行卡\n\n当前约束内容暂不可用，请使用左侧 Prompt Inspector 查看完整调试信息。";
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// P1 结构化投影系统：从 sections 文本中解析结构化字段，
// 彻底停止 raw content 透传。
// ═══════════════════════════════════════════════════════════

export type ProjectedConstraintCard = {
  /** 本集执行卡：必写事件、钩子、边界 */
  executionCard: {
    episodeNumber?: number;
    mustWriteEvents: string[];
    episodeHook: string;
    nextEpisodeBoundary: string;
    isEmpty: boolean;
  };
  /** 硬性约束：数字/格式键值对 */
  hardConstraints: Array<{ label: string; value: string }>;
  /** 角色摘要：每人最多一行，最多 6 人 */
  characters: Array<{ name: string; description: string }>;
  /** 是否完全无结构化数据 */
  isEmpty: boolean;
};

// ── 查找 section ──

function findSectionContent(
  sections: RawSection[] | undefined | null,
  titlePattern: string,
): string | null {
  if (!sections) return null;
  const lower = titlePattern.toLowerCase();
  for (const s of sections) {
    if (s.title.toLowerCase().includes(lower)) return s.content;
  }
  return null;
}

// ── 解析本集大纲 → 执行卡 ──

function parseCurrentEpisodeOutline(text: string): string | null {
  // 匹配 marker 位置（跨行：正文可能在下一行）
  const markerRe = /当前集纯文本大纲[^]*?：第\d+集[：:]\s*/;
  const m = text.match(markerRe);
  if (m) {
    const afterMarker = text.slice(m.index! + m[0].length);
    // 截断到钩子或后一集大纲之前
    const hookIdx = afterMarker.indexOf("钩子：");
    const nextEpIdx = afterMarker.indexOf("后一集大纲：");
    let endIdx = afterMarker.length;
    if (hookIdx >= 0 && hookIdx < endIdx) endIdx = hookIdx;
    if (nextEpIdx >= 0 && nextEpIdx < endIdx) endIdx = nextEpIdx;
    let outline = afterMarker.slice(0, endIdx).trim();
    // 去除首行残留的 "第N集：标题" 前缀
    outline = outline.replace(/^第\d+集[：:]\s*[^\n]*\n?/, "").trim();
    if (outline) return outline;
  }
  // fallback: 匹配 当前正文内容：...（已生成正文的场景）
  const m2 = text.match(/当前正文内容[：:]\s*(.+)/);
  if (m2 && m2[1]?.trim() && !m2[1].trim().startsWith("未生成")) return m2[1].trim();
  return null;
}

type RawNextEp = { ep: number; text: string } | null;

function parseNextEpisode(text: string): RawNextEp {
  const m = text.match(/后一集大纲[：:]\s*第(\d+)集[：:]\s*(.+)/);
  if (m && m[2]?.trim()) return { ep: parseInt(m[1], 10), text: m[2].trim() };
  const m2 = text.match(/后一集大纲[：:]\s*(.+)/);
  if (m2 && m2[1]?.trim()) return { ep: 0, text: m2[1].trim() };
  return null;
}

function parseCurrentEpisodeNumber(text: string): number | undefined {
  const m = text.match(/当前集纯文本大纲[^：]*：第(\d+)集/);
  if (m) return parseInt(m[1], 10);
  const m2 = text.match(/当前正文集数[：:]\s*第(\d+)集/);
  if (m2) return parseInt(m2[1], 10);
  return undefined;
}

/** 从完整文本中提取「钩子：」之后的文字（到换行或文末） */
function parseEpisodeHook(text: string): string {
  const m = text.match(/钩子[：:]\s*(.+?)(?:\n|后一集大纲|$)/);
  if (m && m[1]?.trim()) return m[1].trim();
  return "";
}

/** 从下一集大纲提取标题 + 核心词，构建一句边界提醒 */
function buildNextEpisodeBoundary(scriptText: string, nextEp: RawNextEp): string {
  if (!nextEp) return "";

  // 提取下一集完整文本（从"后一集大纲"到文末或下一个边界）
  const markerRe = /后一集大纲[：:]\s*/;
  const m = scriptText.match(markerRe);
  if (!m) return "";
  const afterMarker = scriptText.slice(m.index! + m[0].length);

  // 截断到下一个"钩子"之前（这不应该是本集的钩子，而是下一集的钩子）
  // 但可能在下一集的钩子之前结束，或者到文末
  const nextHookIdx = afterMarker.indexOf("钩子：");

  // 提取标题（去重前缀）
  let title = nextEp.text.replace(/^第\d+集[：:]\s*/, "").trim();

  // 提取正文第一句作为关键事件
  let bodyText = afterMarker;
  // 跳过标题行
  const bodyNewline = bodyText.indexOf("\n");
  if (bodyNewline >= 0) {
    bodyText = bodyText.slice(bodyNewline + 1).trim();
  } else {
    // 没有换行，尝试去掉"第N集：第N集：标题"前缀
    bodyText = bodyText.replace(/^第\d+集[：:]\s*第\d+集[：:]\s*[^，。；;]*[,，]?/, "").trim();
  }

  let keyEvent = "";
  if (bodyText) {
    const firstSentence = bodyText.split(/[。；;]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 3 && firstSentence.length < 40) {
      keyEvent = firstSentence;
    }
  }

  // 提取下一集钩子
  let nextHook = "";
  if (nextHookIdx >= 0) {
    const hookText = afterMarker.slice(nextHookIdx);
    const hm = hookText.match(/钩子[：:]\s*(.+?)(?:\n|$)/);
    if (hm && hm[1]?.trim() && hm[1].trim().length < 30) {
      nextHook = hm[1].trim();
    }
  }

  const parts: string[] = [];
  if (title) parts.push(title);
  if (nextHook) parts.push(nextHook);
  if (keyEvent) parts.push(keyEvent);

  // 去重
  const unique = [...new Set(parts)];
  if (unique.length === 0) return "";

  return `下一集可展开${unique.join("、")}，本集不得提前写完。`;
}

function splitIntoEvents(outline: string): string[] {
  // 先按句号、分号拆分
  const sentences = outline
    .split(/[。；;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const candidates: string[] = [];

  for (const sentence of sentences) {
    // 跳过纯 "钩子：" 行
    if (/^钩子[：:]/.test(sentence)) continue;
    if (sentence.length <= 30) {
      candidates.push(sentence + "。");
    } else {
      // 长句按逗号拆分子事件
      const subEvents = sentence
        .split(/[，,]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 3);
      if (subEvents.length > 1) {
        for (const se of subEvents) candidates.push(se);
      } else {
        candidates.push(sentence + "。");
      }
    }
  }

  if (candidates.length === 0) {
    const trimmed = outline.trim();
    if (trimmed) return [trimmed.length > 60 ? trimmed.slice(0, 57) + "…" : trimmed];
    return [];
  }

  // 合并到 3–6 条，每条 ≤60 字
  const TARGET_MAX = 6;
  const MAX_LEN = 60;

  const truncate = (s: string) => (s.length > MAX_LEN ? s.slice(0, MAX_LEN - 3) + "…" : s);

  if (candidates.length <= TARGET_MAX) {
    return candidates.map(truncate);
  }

  // 合并相近的候选事件
  const groupSize = Math.ceil(candidates.length / TARGET_MAX);
  const result: string[] = [];
  for (let i = 0; i < candidates.length; i += groupSize) {
    const group = candidates.slice(i, i + groupSize);
    result.push(truncate(group.join("，")));
  }
  return result.slice(0, TARGET_MAX);
}

function parseExecutionCardFromScriptSection(
  scriptSectionContent: string | null,
): ProjectedConstraintCard["executionCard"] {
  if (!scriptSectionContent) {
    return { mustWriteEvents: [], episodeHook: "", nextEpisodeBoundary: "", isEmpty: true };
  }

  const outline = parseCurrentEpisodeOutline(scriptSectionContent);
  if (!outline) {
    return { mustWriteEvents: [], episodeHook: "", nextEpisodeBoundary: "", isEmpty: true };
  }

  const events = splitIntoEvents(outline);
  const epNumber = parseCurrentEpisodeNumber(scriptSectionContent);

  // 从完整文本解析钩子（不再用最后一条事件）
  const hook = parseEpisodeHook(scriptSectionContent);

  // 下一集边界（从标题 + 关键事件 + 钩子构建一句话）
  const nextEp = parseNextEpisode(scriptSectionContent);
  const boundary = buildNextEpisodeBoundary(scriptSectionContent, nextEp);

  return {
    episodeNumber: epNumber,
    mustWriteEvents: events,
    episodeHook: hook,
    nextEpisodeBoundary: boundary,
    isEmpty: events.length === 0,
  };
}

// ── 解析硬性约束 ──

function parseHardConstraints(text: string | null): ProjectedConstraintCard["hardConstraints"] {
  if (!text) return [];
  const result: Array<{ label: string; value: string }> = [];

  const matchers: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /单集目标字数[：:]\s*(\S+)/, label: "单集目标字数" },
    { pattern: /单集场景上限[：:]\s*(\S+)/, label: "单集场景上限" },
    { pattern: /主要人物上限[：:]\s*(\S+)/, label: "主要人物上限" },
    { pattern: /总集数[：:]\s*(\S+)/, label: "总集数" },
    { pattern: /剧本类型[：:]\s*(\S+)/, label: "剧本类型" },
    { pattern: /单集时长[：:]\s*(\S+)/, label: "单集时长" },
  ];

  for (const { pattern, label } of matchers) {
    const m = text.match(pattern);
    if (m && m[1]?.trim()) {
      result.push({ label, value: m[1].trim() });
    }
  }

  return result;
}

// ── 解析角色摘要 ──

/**
 * 从 summarizeCharactersCompact 格式解析角色：每人最多一行，最多 6 人。
 * 输入格式：1. 周承宇｜主角/流程运营岗｜28岁｜背景：擅长从审批流还原责任链
 */
function parseCharacterSummaries(text: string | null): ProjectedConstraintCard["characters"] {
  if (!text) return [];

  const lines = text.split("\n").filter((l) => l.trim());
  const result: Array<{ name: string; description: string }> = [];

  for (const line of lines) {
    if (result.length >= 6) break;
    const parsed = parseCharacterLine(line);
    if (parsed) result.push(parsed);
  }

  return result;
}

/** 角色摘要每行最大描述长度 */
const CHAR_DESC_MAX = 70;

function truncateCharDesc(text: string): string {
  if (text.length <= CHAR_DESC_MAX) return text;
  // 在 CHAR_DESC_MAX-1 处截断，补 …（确保不会断在半字）
  return text.slice(0, CHAR_DESC_MAX - 1) + "…";
}

function parseCharacterLine(line: string): { name: string; description: string } | null {
  // 去除行首编号（如 "1. "、"1、"）
  const cleaned = line.replace(/^\d+[.、)\s]+/, "").trim();
  if (!cleaned) return null;

  // 按 ｜ 或 | 或 ： 分割
  let parts: string[];
  let sep = "";
  if (cleaned.includes("｜")) {
    sep = "｜";
    parts = cleaned.split("｜");
  } else if (cleaned.includes("|")) {
    sep = "|";
    parts = cleaned.split("|");
  } else if (cleaned.includes("：")) {
    // 全角冒号：只切第一处（名字 : 描述）
    const idx = cleaned.indexOf("：");
    parts = [cleaned.slice(0, idx), cleaned.slice(idx + 1)];
    sep = "：";
  } else {
    // 单个名字，没有描述
    const nameMatch = cleaned.match(/^[\u4e00-\u9fff\w·]+/);
    if (!nameMatch) return null;
    return { name: nameMatch[0], description: "" };
  }

  const name = parts[0]?.trim();
  if (!name) return null;

  // 全角冒号分隔：描述是完整文本，直接截断
  if (sep === "：") {
    const rawDesc = parts[1]?.trim() || "";
    return {
      name,
      description: rawDesc ? truncateCharDesc(rawDesc) : "",
    };
  }

  // ｜ 分隔：构建描述（职位 + 背景摘要）
  const descParts: string[] = [];

  // parts[1] 通常是职位/角色类型，如 "主角/流程运营岗"
  if (parts[1]?.trim()) {
    const roleText = parts[1].trim();
    const job = roleText
      .replace(/主角\/?/, "")
      .replace(/配角\/?/, "")
      .replace(/反派\/?/, "")
      .replace(/重要角色\/?/, "")
      .replace(/重要\/?/, "")
      .trim();
    if (job) descParts.push(job);
  }

  // parts[2+] 中找背景
  for (let i = 2; i < parts.length; i++) {
    const part = parts[i]?.trim();
    if (!part) continue;
    if (part.startsWith("背景：") || part.startsWith("背景:")) {
      const background = part.replace(/^背景[：:]\s*/, "").trim();
      if (background) descParts.push(background);
    }
  }

  // fallback：如果 descParts 仍为空，尝试取 parts[1] 的非年龄部分
  if (descParts.length === 0 && parts[1]?.trim()) {
    const roleText = parts[1].trim();
    const noAge = roleText.replace(/\d+岁/, "").trim();
    if (noAge && noAge.length > 0) {
      descParts.push(noAge);
    }
  }

  return {
    name,
    description: truncateCharDesc(descParts.join("，")),
  };
}

// ── 主入口：从 sections + context 构建结构化投影 ──

export function buildProjectedConstraintCard(
  sections: RawSection[] | undefined | null,
  _context?: string | null, // context 不再用于用户展示，仅保留参数兼容
): ProjectedConstraintCard {
  if (!sections || sections.length === 0) {
    return {
      executionCard: { mustWriteEvents: [], episodeHook: "", nextEpisodeBoundary: "", isEmpty: true },
      hardConstraints: [],
      characters: [],
      isEmpty: true,
    };
  }

  // 1. 过滤掉 system prompt / debug sections
  const userSections = sections.filter((s) => !isSystemPromptSection(s));

  // 2. 提取各 section 内容
  const scriptSection = findSectionContent(userSections, "script 白名单") ?? "";
  const hardConstraintsSection = findSectionContent(userSections, "projectBrief 硬约束");
  const charactersSection = findSectionContent(userSections, "人物小传摘要");

  // 3. 结构化解析
  const executionCard = parseExecutionCardFromScriptSection(scriptSection);
  const hardConstraints = parseHardConstraints(hardConstraintsSection);
  const characters = parseCharacterSummaries(charactersSection);

  const isEmpty =
    executionCard.isEmpty && hardConstraints.length === 0 && characters.length === 0;

  return {
    executionCard,
    hardConstraints,
    characters,
    isEmpty,
  };
}

// ── 复制输出：纯结构化生成，不引用任何 raw section content ──

export function formatConstraintCardForCopy(card: ProjectedConstraintCard): string {
  if (card.isEmpty) return "";

  const lines: string[] = ["# 本集创作执行卡"];

  // ── 本集执行卡 ──
  const ec = card.executionCard;
  if (!ec.isEmpty) {
    lines.push("");
    lines.push("## 本集执行卡");

    if (ec.mustWriteEvents.length > 0) {
      lines.push("");
      lines.push("### 本集必须写");
      for (const event of ec.mustWriteEvents) {
        lines.push(`- ${event}`);
      }
    }

    if (ec.episodeHook) {
      lines.push("");
      lines.push("### 本集结尾钩子");
      lines.push(`- ${ec.episodeHook}`);
    }

    if (ec.nextEpisodeBoundary) {
      lines.push("");
      lines.push("### 下一集边界");
      lines.push(`- ${ec.nextEpisodeBoundary}`);
    }
  }

  // ── 硬性约束 ──
  if (card.hardConstraints.length > 0) {
    lines.push("");
    lines.push("## 硬性约束");
    for (const hc of card.hardConstraints) {
      lines.push(`- ${hc.label}：${hc.value}`);
    }
  }

  // ── 连续性与禁区（固定文案） ──
  lines.push("");
  lines.push("## 连续性与禁区");
  lines.push("- 不得提前写下一集事件。");
  lines.push("- 不得新增当前集大纲没有的新主线。");
  lines.push("- 不得改变角色身份、职位、阵营。");
  lines.push("- 不得把怀疑、伏笔或线索升级成已经掌握证据。");
  lines.push("- 新证据必须在本集现场产生。");

  // ── 参考材料 ──
  if (card.characters.length > 0) {
    lines.push("");
    lines.push("## 参考材料");
    lines.push("> 以下内容用于保持设定一致，不代表本集必须全部写入。");
    for (const ch of card.characters) {
      const desc = ch.description ? `：${ch.description}` : "";
      lines.push(`- ${ch.name}${desc}`);
    }
  }

  const result = lines.join("\n");

  // 最终安全网
  if (/你是资深短剧策划师/.test(result) || /只返回 JSON/.test(result)) {
    return "# 本集创作执行卡\n\n当前约束内容暂不可用，请使用左侧 Prompt Inspector 查看完整调试信息。";
  }

  return result;
}
