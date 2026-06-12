import type { SelectedScenarioPlan } from "@/lib/original/selected-scenario-plan";

export type CoreSynopsisQualityScriptType = "short_drama" | "ai_comic";

export type CoreSynopsisQualityCheck = {
  ok: boolean;
  score: number;
  missing: string[];
  warnings: string[];
  scriptType: CoreSynopsisQualityScriptType;
};

type CoreSynopsisQualityInput = {
  scriptType: CoreSynopsisQualityScriptType;
  plan: Pick<
    SelectedScenarioPlan,
    | "title"
    | "audience"
    | "genres"
    | "eraOrWorldType"
    | "coreSettings"
    | "storyBackground"
    | "coreHighlight"
    | "coreSynopsis"
    | "highlight"
    | "worldview"
    | "premise"
    | "oneLineStory"
  >;
};

const SHORT_DRAMA_MANDATORY = [
  { key: "protagonistIdentity", label: "主角身份" },
  { key: "initialPressure", label: "初始困境 / 外部压迫" },
  { key: "relationshipOrOpponent", label: "人物关系 / 对手压力" },
  { key: "protagonistGoal", label: "主角目标" },
  { key: "turnaroundMechanism", label: "翻盘机制" },
  { key: "followHook", label: "追剧钩子" },
] as const;

const AI_COMIC_MANDATORY = [
  { key: "worldRule", label: "世界规则 / 题材壳" },
  { key: "protagonistStart", label: "主角起点" },
  { key: "coreMechanism", label: "核心机制" },
  { key: "mechanismCost", label: "机制代价 / 限制" },
  { key: "upgradePath", label: "升级路径" },
  { key: "visualHook", label: "视觉卖点 / 高概念看点" },
  { key: "followHook", label: "追剧钩子" },
] as const;

function normalize(text: string | undefined) {
  return typeof text === "string" ? text.replace(/\s+/g, "").trim() : "";
}

function makeHaystack(plan: CoreSynopsisQualityInput["plan"]) {
  return normalize([
    plan.coreHighlight,
    plan.highlight,
    plan.coreSynopsis,
    plan.storyBackground,
    plan.worldview,
    plan.premise,
    plan.oneLineStory,
  ].join(" "));
}

function includesAny(haystack: string, candidates: string[]) {
  return candidates.some((candidate) => haystack.includes(normalize(candidate)));
}

function findAny(haystack: string, candidates: string[]) {
  return candidates.filter((candidate) => haystack.includes(normalize(candidate)));
}

const SHORT_DRAMA_BANNED_PATTERNS = [
  "主角暂时处在弱势",
  "主角暂时处在",
  "先被压到低位",
  "被推到低位",
  "家族、公司、组织、阶层或规则",
  "持续压低主角",
  "持续压住",
  "反击升级、身份反杀、借势控局",
  "因圣女持续承压",
  "主角被家族、公司、组织、阶层或规则持续压低主角",
  "主角被家族、公司、组织、阶层或规则持续压低",
  "在现代都市里，主角暂时处在弱势",
  "都市 的主流语境",
  "都市 的差异化赛道",
  "代价、限制、反噬和暴露。，",
];

const AI_COMIC_BANNED_PATTERNS = [
  "主角暂时处在弱势",
  "主角暂时处在",
  "先被压到低位",
  "被推到低位",
  "家族、公司、组织、阶层或规则",
  "持续压低主角",
  "持续压住",
  "反击升级、身份反杀、借势控局",
  "因圣女持续承压",
  "在现代都市里，主角暂时处在弱势",
  "世界规则 + 核心机制 + 规则反击",
  "关系翻局 + 断情自救 + 设定回弹",
  "高设定规则 + 视觉冲击 + 漏洞反击",
  "都市 的主流语境",
  "都市 的差异化赛道",
  "代价、限制、反噬和暴露。，",
];

function evaluateShortDrama(haystack: string) {
  const checks = [
    {
      key: "protagonistIdentity",
      label: "主角身份",
      hit: includesAny(haystack, ["身份", "主角", "女主", "男主", "凡人", "大女主", "大男主", "小人物", "仙尊", "圣女", "神豪", "废材", "身份反转"]),
    },
    {
      key: "initialPressure",
      label: "初始困境 / 外部压迫",
      hit: includesAny(haystack, ["压迫", "困境", "被逼", "被压", "压制", "危机", "困局", "处境", "压力", "陷入", "低位", "打压", "羞辱"]),
    },
    {
      key: "relationshipOrOpponent",
      label: "人物关系 / 对手压力",
      hit: includesAny(haystack, ["关系", "对手", "敌人", "反派", "上司", "前任", "白月光", "夫妻", "家人", "亲密", "背叛", "拉扯", "试探", "冲突"]),
    },
    {
      key: "protagonistGoal",
      label: "主角目标",
      hit: includesAny(haystack, ["目标", "想要", "想夺回", "想复仇", "想翻盘", "想证明", "想拯救", "要赢", "要回", "要查清", "要摆脱"]),
    },
    {
      key: "turnaroundMechanism",
      label: "翻盘机制",
      hit: includesAny(haystack, ["翻盘", "反击", "反转", "逆转", "回击", "借势", "布局", "破局", "控局", "揭露", "扳回"]),
    },
    {
      key: "followHook",
      label: "追剧钩子",
      hit: includesAny(haystack, ["钩子", "悬念", "反转", "追剧", "爆点", "爽点", "下一集", "连环", "层层", "秘密", "真相", "揭晓"]),
    },
  ] as const;

  const missing = checks.filter((item) => !item.hit).map((item) => item.label);
  const mandatoryMissing = SHORT_DRAMA_MANDATORY.filter((item) => !checks.find((check) => check.key === item.key)?.hit).map((item) => item.label);
  const score = checks.filter((item) => item.hit).length;
  const bannedHits = findAny(haystack, SHORT_DRAMA_BANNED_PATTERNS);
  const ok = score >= 5 && mandatoryMissing.length === 0 && bannedHits.length === 0;

  return {
    ok,
    score,
    missing,
    warnings: ok
      ? []
      : [
          `核心梗概待补强：${
            bannedHits.length > 0
              ? `包含泛模板 ${bannedHits.join("、")}`
              : mandatoryMissing.length > 0
                ? `缺少 ${mandatoryMissing.join("、")}`
                : `缺少 ${missing.slice(0, 2).join("、")}`
          }`,
        ],
  };
}

function evaluateAiComic(haystack: string) {
  const checks = [
    {
      key: "worldRule",
      label: "世界规则 / 题材壳",
      hit: includesAny(haystack, ["世界规则", "题材壳", "世界壳", "规则怪谈", "异世界", "末世", "修仙", "玄幻", "科幻", "系统", "异能", "穿书", "高设定", "赛博", "怪谈"]),
    },
    {
      key: "protagonistStart",
      label: "主角起点",
      hit: includesAny(haystack, ["起点", "开局", "初始", "凡人", "废材", "小人物", "低阶", "弱起点", "主角", "女主", "男主", "圣女", "仙尊", "师妹", "身份"]),
    },
    {
      key: "coreMechanism",
      label: "核心机制",
      hit: includesAny(haystack, ["机制", "系统", "异能", "穿书", "规则", "金手指", "能力", "变身", "契约", "直播", "外挂", "升级"]),
    },
    {
      key: "mechanismCost",
      label: "机制代价 / 限制",
      hit: includesAny(haystack, ["代价", "限制", "副作用", "门槛", "禁忌", "代偿", "风险", "成本", "限制条件", "冷却", "反噬", "暴露", "惩罚"]),
    },
    {
      key: "upgradePath",
      label: "升级路径",
      hit: includesAny(haystack, ["升级", "成长", "进阶", "进化", "变强", "突破", "层层", "进化", "成长线", "解锁"]),
    },
    {
      key: "visualHook",
      label: "视觉卖点 / 高概念看点",
      hit: includesAny(haystack, ["视觉", "高概念", "特效", "奇观", "画面", "场景", "战斗", "诡秘", "炫酷", "世界观", "设定"]),
    },
    {
      key: "followHook",
      label: "追剧钩子",
      hit: includesAny(haystack, ["钩子", "悬念", "反转", "爆点", "爽点", "下一集", "连环", "秘密", "真相", "揭晓"]),
    },
  ] as const;

  const missing = checks.filter((item) => !item.hit).map((item) => item.label);
  const mandatoryMissing = AI_COMIC_MANDATORY.filter((item) => !checks.find((check) => check.key === item.key)?.hit).map((item) => item.label);
  const score = checks.filter((item) => item.hit).length;
  const bannedHits = findAny(haystack, AI_COMIC_BANNED_PATTERNS);
  const ok = score >= 6 && mandatoryMissing.length === 0 && bannedHits.length === 0;

  return {
    ok,
    score,
    missing,
    warnings: ok
      ? []
      : [
          `核心梗概待补强：${
            bannedHits.length > 0
              ? `包含泛模板 ${bannedHits.join("、")}`
              : mandatoryMissing.length > 0
                ? `缺少 ${mandatoryMissing.join("、")}`
                : `缺少 ${missing.slice(0, 2).join("、")}`
          }`,
        ],
  };
}

export function checkCoreSynopsisQuality(input: CoreSynopsisQualityInput): CoreSynopsisQualityCheck {
  const haystack = makeHaystack(input.plan);
  const base = input.scriptType === "short_drama"
    ? evaluateShortDrama(haystack)
    : evaluateAiComic(haystack);

  return {
    ok: base.ok,
    score: base.score,
    missing: base.missing,
    warnings: base.warnings,
    scriptType: input.scriptType,
  };
}
