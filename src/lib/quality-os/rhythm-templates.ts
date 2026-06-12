/**
 * 短剧节奏模板共享配置
 *
 * 纯数据 + 纯函数，不依赖 React / Prisma / Provider / 环境变量。
 * 同时供 Quality OS 展示层（client component）和生成侧 prompts.ts（server util）引用。
 */

// ==================== 类型定义 ====================

export type RhythmBeatKey = "起" | "困" | "反" | "升" | "爽" | "合";
export type RhythmActKey = "起" | "承" | "转" | "合";

export type RhythmSegment = {
  key: RhythmBeatKey;
  start: number;
  end: number;
  label: string;
};

export type RhythmAnchor = {
  episodeNumber: number;
  /** prompts.ts 生成侧使用的标签 */
  labelForPrompt: string;
  /** Quality OS 展示层使用的标签 */
  labelForDisplay: string;
  isPrimary: boolean;
  note?: string;
};

export type RhythmBatch = {
  batchIndex: number;
  startEpisode: number;
  endEpisode: number;
  /** Quality OS 表格 act 列 */
  leadingTask: string;
  /** Quality OS 表格 unit 列 + prompts.ts coverageText */
  coverageText: string;
  /** Quality OS 表格 anchor 列 */
  anchorText: string;
  /** Quality OS 表格 note 列 */
  description: string;
  /** Quality OS 表格 badge 列（起/承/转/合 或组合） */
  batchTaskLabel: string;
  /** prompts.ts 生成侧批次任务文案（仅终局批次需覆盖） */
  batchTaskForPrompt?: string;
};

export type RhythmTemplate = {
  episodeCount: 40 | 60 | 80;
  name: string;
  summary: string;
  /** 全剧四幕总控区间 */
  actRanges: { act: RhythmActKey; start: number; end: number }[];
  /** 六段卡点区间 */
  segments: RhythmSegment[];
  /** 批次映射 */
  batches: RhythmBatch[];
  /** 主锚点 */
  anchors: RhythmAnchor[];
  /** 收束钩（非主卡点，如 EP40 / EP80） */
  closingHook?: {
    episodeNumber: number;
    labelForPrompt: string;
    labelForDisplay: string;
  };
  /** 第二循环递增提示（仅 80 集） */
  secondCycleEscalationHint?: string;
};

// ==================== 40 集非均匀六段模板 ====================

const TEMPLATE_40: RhythmTemplate = {
  episodeCount: 40,
  name: "40集高反转短剧模板",
  summary: "非均匀六段。起=1-3而非1-10；EP40仅收束钩，EP37为主卡点。",
  actRanges: [
    { act: "起", start: 1, end: 3 },
    { act: "承", start: 4, end: 12 },
    { act: "转", start: 13, end: 30 },
    { act: "合", start: 31, end: 40 },
  ],
  segments: [
    { key: "起", start: 1, end: 3, label: "起" },
    { key: "困", start: 4, end: 9, label: "困" },
    { key: "反", start: 10, end: 12, label: "反" },
    { key: "升", start: 13, end: 21, label: "升" },
    { key: "爽", start: 22, end: 30, label: "爽" },
    { key: "合", start: 31, end: 40, label: "合" },
  ],
  batches: [
    {
      batchIndex: 1,
      startEpisode: 1,
      endEpisode: 10,
      leadingTask: "起势强反",
      coverageText: "起1-3 + 困4-9 + 反10",
      anchorText: "EP10",
      description: "开局压迫 + 一卡强反转",
      batchTaskLabel: "起/困/反",
    },
    {
      batchIndex: 2,
      startEpisode: 11,
      endEpisode: 20,
      leadingTask: "余震升压",
      coverageText: "反11-12 + 升13-20",
      anchorText: "EP17",
      description: "反转余震 + 二卡蓄力",
      batchTaskLabel: "升前半",
    },
    {
      batchIndex: 3,
      startEpisode: 21,
      endEpisode: 30,
      leadingTask: "爽点兑现",
      coverageText: "升21 + 爽22-30",
      anchorText: "EP27",
      description: "蓄力反杀 + 三卡兑现",
      batchTaskLabel: "升后半/爽",
    },
    {
      batchIndex: 4,
      startEpisode: 31,
      endEpisode: 40,
      leadingTask: "终局清算",
      coverageText: "合31-40",
      anchorText: "EP37",
      description: "终局清算，EP40 仅收束钩",
      batchTaskLabel: "合/终局",
      batchTaskForPrompt:
        "终局清算与收束（合）：完成所有未兑现反杀、阶段性收束，抛结尾钩",
    },
  ],
  anchors: [
    {
      episodeNumber: 10,
      labelForPrompt: "一卡/第一强付费点",
      labelForDisplay: "EP10 一卡（反/翻转）",
      isPrimary: true,
    },
    {
      episodeNumber: 17,
      labelForPrompt: "二卡/中段强付费点",
      labelForDisplay: "EP17 二卡（升/蓄力）",
      isPrimary: true,
    },
    {
      episodeNumber: 27,
      labelForPrompt: "三卡/阶段大爽点",
      labelForDisplay: "EP27 三卡（爽/兑现）",
      isPrimary: true,
    },
    {
      episodeNumber: 37,
      labelForPrompt: "终局收束锚",
      labelForDisplay: "EP37 收束（合/清算）",
      isPrimary: true,
    },
  ],
  closingHook: {
    episodeNumber: 40,
    labelForPrompt: "仅收束钩",
    labelForDisplay: "EP40 为结尾钩/余韵，非主卡点",
  },
};

// ==================== 60 集 30 单元串联模板 ====================

const TEMPLATE_60: RhythmTemplate = {
  episodeCount: 60,
  name: "60集高反转短剧模板",
  summary: "两个30集单元串联。每个30集单元独立成环，六段卡点。",
  actRanges: [
    { act: "起", start: 1, end: 10 },
    { act: "承", start: 11, end: 30 },
    { act: "转", start: 31, end: 50 },
    { act: "合", start: 51, end: 60 },
  ],
  segments: [
    { key: "起", start: 1, end: 3, label: "起" },
    { key: "困", start: 4, end: 9, label: "困" },
    { key: "反", start: 10, end: 12, label: "反" },
    { key: "升", start: 13, end: 21, label: "升" },
    { key: "爽", start: 22, end: 27, label: "爽" },
    { key: "合", start: 28, end: 30, label: "合" },
  ],
  batches: [
    {
      batchIndex: 1,
      startEpisode: 1,
      endEpisode: 10,
      leadingTask: "起",
      coverageText: "单元1 起/困/反",
      anchorText: "EP10",
      description: "开局压迫 + 第一轮强反转",
      batchTaskLabel: "起",
    },
    {
      batchIndex: 2,
      startEpisode: 11,
      endEpisode: 20,
      leadingTask: "承",
      coverageText: "单元1 余震/升",
      anchorText: "EP17",
      description: "承接余震 + 二卡蓄力",
      batchTaskLabel: "承",
    },
    {
      batchIndex: 3,
      startEpisode: 21,
      endEpisode: 30,
      leadingTask: "承",
      coverageText: "单元1 爽/合",
      anchorText: "EP27/EP30",
      description: "阶段反杀 + 下一单元钩子",
      batchTaskLabel: "转",
    },
    {
      batchIndex: 4,
      startEpisode: 31,
      endEpisode: 40,
      leadingTask: "转",
      coverageText: "单元2 起/困/反",
      anchorText: "EP40",
      description: "新局承压 + 第二单元一卡",
      batchTaskLabel: "承",
    },
    {
      batchIndex: 5,
      startEpisode: 41,
      endEpisode: 50,
      leadingTask: "转",
      coverageText: "单元2 余震/升",
      anchorText: "EP47",
      description: "深层反转 + 终局前升级",
      batchTaskLabel: "转",
    },
    {
      batchIndex: 6,
      startEpisode: 51,
      endEpisode: 60,
      leadingTask: "合",
      coverageText: "单元2 爽/合",
      anchorText: "EP57/EP60",
      description: "终局清算 + 最终落点",
      batchTaskLabel: "合",
    },
  ],
  anchors: [
    {
      episodeNumber: 10,
      labelForPrompt: "一卡/第一强付费点",
      labelForDisplay: "EP10 一卡",
      isPrimary: true,
    },
    {
      episodeNumber: 17,
      labelForPrompt: "二卡/中段强付费点",
      labelForDisplay: "EP17 二卡",
      isPrimary: true,
    },
    {
      episodeNumber: 27,
      labelForPrompt: "三卡/阶段大爽点",
      labelForDisplay: "EP27 三卡",
      isPrimary: true,
    },
    {
      episodeNumber: 30,
      labelForPrompt: "单元结尾钩",
      labelForDisplay: "EP30 单元结尾钩",
      isPrimary: true,
    },
  ],
};

// ==================== 80 集双 40 非均匀循环模板 ====================

const TEMPLATE_80: RhythmTemplate = {
  episodeCount: 80,
  name: "80集高反转短剧模板",
  summary:
    "两个40集非均匀六段循环。1-40起1-3→合31-40，锚EP10/17/27/37；41-80起41-43→合71-80，锚EP50/57/67/77。第二轮递增，EP80仅结尾钩。",
  actRanges: [
    { act: "起", start: 1, end: 3 },
    { act: "承", start: 4, end: 12 },
    { act: "转", start: 13, end: 30 },
    { act: "合", start: 31, end: 40 },
    { act: "起", start: 41, end: 43 },
    { act: "承", start: 44, end: 52 },
    { act: "转", start: 53, end: 70 },
    { act: "合", start: 71, end: 80 },
  ],
  segments: [
    // 第一循环
    { key: "起", start: 1, end: 3, label: "起" },
    { key: "困", start: 4, end: 9, label: "困" },
    { key: "反", start: 10, end: 12, label: "反" },
    { key: "升", start: 13, end: 21, label: "升" },
    { key: "爽", start: 22, end: 30, label: "爽" },
    { key: "合", start: 31, end: 40, label: "合" },
    // 第二循环（递增）
    { key: "起", start: 41, end: 43, label: "起" },
    { key: "困", start: 44, end: 49, label: "困" },
    { key: "反", start: 50, end: 52, label: "反" },
    { key: "升", start: 53, end: 61, label: "升" },
    { key: "爽", start: 62, end: 70, label: "爽" },
    { key: "合", start: 71, end: 80, label: "合" },
  ],
  batches: [
    // === 第一循环 ===
    {
      batchIndex: 1,
      startEpisode: 1,
      endEpisode: 10,
      leadingTask: "第一循环起势",
      coverageText: "起1-3+困4-9+反10-12",
      anchorText: "EP10",
      description: "开局压迫 + 一卡强反转",
      batchTaskLabel: "起/困/反",
    },
    {
      batchIndex: 2,
      startEpisode: 11,
      endEpisode: 20,
      leadingTask: "第一循环承压",
      coverageText: "反11-12 + 升13-20",
      anchorText: "EP17",
      description: "新压迫源 + 二卡蓄力",
      batchTaskLabel: "升前半",
    },
    {
      batchIndex: 3,
      startEpisode: 21,
      endEpisode: 30,
      leadingTask: "第一循环转折",
      coverageText: "升21 + 爽22-30",
      anchorText: "EP27",
      description: "蓄力反杀 + 三卡兑现",
      batchTaskLabel: "升后半/爽",
    },
    {
      batchIndex: 4,
      startEpisode: 31,
      endEpisode: 40,
      leadingTask: "第一循环收束",
      coverageText: "合31-40",
      anchorText: "EP37",
      description: "阶段清算（EP40仅钩）",
      batchTaskLabel: "合/终局",
      batchTaskForPrompt:
        "第一循环终局清算（合）：完成本循环未兑现反杀、阶段性收束，抛下一循环入口钩",
    },
    // === 第二循环（递增） ===
    {
      batchIndex: 5,
      startEpisode: 41,
      endEpisode: 50,
      leadingTask: "第二循环起势",
      coverageText: "起41-43+困44-49+反50-52",
      anchorText: "EP50",
      description: "更高层压迫 + 新强反转",
      batchTaskLabel: "起/困/反",
    },
    {
      batchIndex: 6,
      startEpisode: 51,
      endEpisode: 60,
      leadingTask: "第二循环承压",
      coverageText: "反51-52 + 升53-60",
      anchorText: "EP57",
      description: "深层规则逼近 + 终局蓄力",
      batchTaskLabel: "升前半",
    },
    {
      batchIndex: 7,
      startEpisode: 61,
      endEpisode: 70,
      leadingTask: "第二循环转折",
      coverageText: "升61 + 爽62-70",
      anchorText: "EP67",
      description: "深层真相翻转 + 终局前大卡",
      batchTaskLabel: "升后半/爽",
    },
    {
      batchIndex: 8,
      startEpisode: 71,
      endEpisode: 80,
      leadingTask: "第二循环收束",
      coverageText: "合71-80",
      anchorText: "EP77",
      description: "总清算（EP80仅结尾钩）",
      batchTaskLabel: "合/终局",
      batchTaskForPrompt:
        "总清算与终局收束（合）：全剧所有未兑现反杀、最终清算，情绪落点收束",
    },
  ],
  anchors: [
    {
      episodeNumber: 10,
      labelForPrompt: "一卡/第一强付费点",
      labelForDisplay: "EP10 一卡（反/翻转）",
      isPrimary: true,
    },
    {
      episodeNumber: 17,
      labelForPrompt: "二卡/中段强付费点",
      labelForDisplay: "EP17 二卡（升/蓄力）",
      isPrimary: true,
    },
    {
      episodeNumber: 27,
      labelForPrompt: "三卡/阶段大爽点",
      labelForDisplay: "EP27 三卡（爽/兑现）",
      isPrimary: true,
    },
    {
      episodeNumber: 37,
      labelForPrompt: "第一循环收束锚",
      labelForDisplay: "EP37 第一循环收束",
      isPrimary: true,
    },
    {
      episodeNumber: 50,
      labelForPrompt: "第二循环一卡",
      labelForDisplay: "EP50 第二循环一卡",
      isPrimary: true,
    },
    {
      episodeNumber: 57,
      labelForPrompt: "第二循环二卡",
      labelForDisplay: "EP57 二卡",
      isPrimary: true,
    },
    {
      episodeNumber: 67,
      labelForPrompt: "第二循环三卡",
      labelForDisplay: "EP67 三卡",
      isPrimary: true,
    },
    {
      episodeNumber: 77,
      labelForPrompt: "第二循环收束锚",
      labelForDisplay: "EP77 终局收束",
      isPrimary: true,
    },
  ],
  closingHook: {
    episodeNumber: 80,
    labelForPrompt: "仅结尾钩",
    labelForDisplay: "EP80 为最终结尾钩，非主卡点",
  },
  secondCycleEscalationHint:
    "第二循环不能机械重复第一循环，必须在压迫源、反派层级、信息量、爽点代价上递增。",
};

// ==================== 总注册表 ====================

export const RHYTHM_TEMPLATES: Record<40 | 60 | 80, RhythmTemplate> = {
  40: TEMPLATE_40,
  60: TEMPLATE_60,
  80: TEMPLATE_80,
};

// ==================== 辅助函数 ====================

/** 获取指定集数的节奏模板 */
export function getRhythmTemplate(
  totalEpisodes: number,
): RhythmTemplate | null {
  if (totalEpisodes === 40 || totalEpisodes === 60 || totalEpisodes === 80) {
    return RHYTHM_TEMPLATES[totalEpisodes];
  }
  return null;
}

/** 获取批次定义 */
export function getRhythmBatch(
  totalEpisodes: number,
  startEpisode: number,
  endEpisode: number,
): RhythmBatch | null {
  const template = getRhythmTemplate(totalEpisodes);
  if (!template) return null;
  return (
    template.batches.find(
      (b) => b.startEpisode === startEpisode && b.endEpisode === endEpisode,
    ) ?? null
  );
}

/** 获取指定区间内的锚点列表 */
export function getRhythmAnchorsForRange(
  totalEpisodes: number,
  startEpisode: number,
  endEpisode: number,
): RhythmAnchor[] {
  const template = getRhythmTemplate(totalEpisodes);
  if (!template) return [];
  return template.anchors.filter(
    (a) => a.episodeNumber >= startEpisode && a.episodeNumber <= endEpisode,
  );
}

/** 获取指定区间的 coverageText（从模板批次取） */
export function getRhythmCoverageText(
  totalEpisodes: number,
  startEpisode: number,
  endEpisode: number,
): string | null {
  const batch = getRhythmBatch(totalEpisodes, startEpisode, endEpisode);
  return batch?.coverageText ?? null;
}

/** 获取全剧四幕所属 */
export function getRhythmAct(
  totalEpisodes: number,
  episodeNumber: number,
): RhythmActKey | null {
  const template = getRhythmTemplate(totalEpisodes);
  if (!template) return null;
  for (const range of template.actRanges) {
    if (episodeNumber >= range.start && episodeNumber <= range.end) {
      return range.act;
    }
  }
  return null;
}
