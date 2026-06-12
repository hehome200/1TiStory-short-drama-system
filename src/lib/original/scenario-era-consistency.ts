export type ScenarioEraFamily =
  | "modern"
  | "period"
  | "republic"
  | "ancient"
  | "future"
  | "unknown";

export interface ScenarioEraInstruction {
  rawEra: string;
  normalizedEra: string;
  eraFamily: ScenarioEraFamily;
  mustUseHints: string[];
  forbiddenHardSignals: string[];
  instructionText: string;
}

export interface EraProseValidationResult {
  ok: boolean;
  severity: "pass" | "warn" | "fail";
  detectedConflicts: string[];
  detectedRequiredSignals: string[];
  hasCrossEraHook: boolean;
  normalizedEra: string;
  eraFamily: ScenarioEraFamily;
}

const PERIOD_REQUIRED_SIGNALS = [
  "50年代",
  "60年代",
  "70年代",
  "80年代",
  "90年代",
  "千禧年前后",
  "2000年代",
  "00年代",
  "国营厂",
  "家属院",
  "筒子楼",
  "供销社",
  "知青",
  "下乡",
  "恢复高考",
  "改革开放",
  "万元户",
  "下岗潮",
  "县城",
  "录像厅",
  "乡镇企业",
  "南下打工",
  "老工业城",
  "个体户市场",
  "厂办子弟学校",
];

const PERIOD_HARD_CONFLICTS = [
  "现代都市",
  "当代都市",
  "当代豪门",
  "现代豪门",
  "现代职场",
  "互联网公司",
  "短视频",
  "直播",
  "热搜",
  "网红",
  "公司会议",
  "现代酒会",
  "当代公司",
];

const ANCIENT_REQUIRED_SIGNALS = [
  "王府",
  "侯府",
  "宫廷",
  "朝堂",
  "宅院",
  "宗族",
  "江湖",
  "科举",
  "皇室",
  "府邸",
  "后宅",
  "王朝",
  "古风",
  "皇城",
];

const ANCIENT_HARD_CONFLICTS = [
  "现代都市",
  "当代",
  "公司",
  "职场",
  "互联网",
  "直播",
  "短视频",
  "热搜",
  "现代酒会",
  "手机",
  "APP",
];

const REPUBLIC_REQUIRED_SIGNALS = [
  "民国",
  "军阀",
  "商会",
  "旧上海",
  "租界",
  "报馆",
  "戏院",
  "洋行",
  "码头",
  "家族门第",
];

const REPUBLIC_HARD_CONFLICTS = [
  "现代都市",
  "当代",
  "公司",
  "职场",
  "互联网",
  "手机",
  "直播",
  "短视频",
  "热搜",
  "APP",
];

const FUTURE_REQUIRED_SIGNALS = [
  "近未来",
  "AI",
  "智能城市",
  "赛博",
  "星际",
  "算法",
  "仿生",
  "数据秩序",
  "机械义体",
  "轨道城",
  "未来",
];

const FUTURE_HARD_CONFLICTS = [
  "现代都市",
  "现代职场",
  "当代豪门",
  "豪门恩怨",
  "公司会议",
];

const CROSS_ERA_SIGNALS = [
  "穿越",
  "重生",
  "时空错位",
  "前世今生",
  "现代人",
  "异世归来",
  "回到过去",
  "回到80年代",
  "回到90年代",
  "回到70年代",
  "带着记忆",
  "预知未来",
  "未来信息",
  "未来记忆",
  "二周目",
  "逆天改命",
];

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function textIncludesAny(text: string, candidates: string[]) {
  return candidates.filter((candidate) => text.includes(candidate));
}

function flattenUnknownText(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenUnknownText(item));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) => flattenUnknownText(item));
  }
  return [];
}

export function normalizeScenarioEraLabel(value: string | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized || normalized === "待确认" || normalized === "末世") return "";
  if (normalized === "现代" || normalized === "古代" || normalized === "民国" || normalized === "年代" || normalized === "未来") {
    return normalized;
  }
  if (/^(50|60|70|80|90)年代$/.test(normalized)) return normalized;
  if (/^(千禧年前后|2000年代|00年代)$/.test(normalized)) return normalized;
  if (/(现代|职场现代|豪门现代|现代都市|校园)/.test(normalized)) return "现代";
  if (/(古代|架空古代)/.test(normalized)) return "古代";
  if (normalized.includes("民国")) return "民国";
  if (/(未来|近未来|科幻未来|赛博|星际)/.test(normalized)) return normalized.includes("未来") ? normalized : "未来";
  if (normalized.includes("年代")) return "年代";
  return "";
}

export function getScenarioEraInstruction(label: string): ScenarioEraInstruction {
  const rawEra = typeof label === "string" ? label.trim() : "";
  const normalizedEra = normalizeScenarioEraLabel(rawEra);

  if (!normalizedEra) {
    return {
      rawEra,
      normalizedEra: rawEra || "待确认",
      eraFamily: "unknown",
      mustUseHints: [],
      forbiddenHardSignals: [],
      instructionText: "时代背景待确认。可以保持语义谨慎，不强制锁定时代，但不要擅自把故事写成明确的现代、古代或民国主场景。",
    };
  }

  if (normalizedEra === "现代") {
    return {
      rawEra,
      normalizedEra,
      eraFamily: "modern",
      mustUseHints: ["当代现实", "现代都市", "当代职场", "手机", "互联网", "热搜"],
      forbiddenHardSignals: [],
      instructionText: "时代背景为现代，主叙事应落在当代现实语境，可写现代都市、当代职场、豪门、手机、直播、短视频、互联网公司、热搜、资本与公司秩序。",
    };
  }

  if (
    normalizedEra === "年代" ||
    /^(50|60|70|80|90)年代$/.test(normalizedEra) ||
    /^(千禧年前后|2000年代|00年代)$/.test(normalizedEra)
  ) {
    return {
      rawEra,
      normalizedEra,
      eraFamily: "period",
      mustUseHints: PERIOD_REQUIRED_SIGNALS,
      forbiddenHardSignals: PERIOD_HARD_CONFLICTS,
      instructionText:
        normalizedEra === "年代"
          ? "时代背景为年代，主叙事不是古代，也不是现代都市。必须写出近现代历史阶段的明确年代质感，可以自行落到 50/60/70/80/90年代或千禧年前后，并用国营厂、家属院、供销社、县城、乡镇企业、下岗潮、恢复高考、改革开放等场域承载主剧情。"
          : `时代背景为${normalizedEra}，主叙事必须严格服从该具体年代，不要把故事主体写成现代都市、当代豪门或现代职场，要有明确的${normalizedEra}场域和社会质感。`,
    };
  }

  if (normalizedEra === "民国") {
    return {
      rawEra,
      normalizedEra,
      eraFamily: "republic",
      mustUseHints: REPUBLIC_REQUIRED_SIGNALS,
      forbiddenHardSignals: REPUBLIC_HARD_CONFLICTS,
      instructionText: "时代背景为民国，主叙事必须落在民国社会，可写军阀、商会、旧上海、租界、报馆、戏院、洋行、码头和家族门第，禁止把主体写成现代互联网、手机、短视频或当代公司。",
    };
  }

  if (normalizedEra === "古代") {
    return {
      rawEra,
      normalizedEra,
      eraFamily: "ancient",
      mustUseHints: ANCIENT_REQUIRED_SIGNALS,
      forbiddenHardSignals: ANCIENT_HARD_CONFLICTS,
      instructionText: "时代背景为古代，主叙事必须落在古代社会，可写王朝、宫廷、宅斗、权谋、江湖、王府、侯府、朝堂、科举与宗族，禁止把主体写成现代公司、手机、直播或现代职场。",
    };
  }

  return {
    rawEra,
    normalizedEra,
    eraFamily: "future",
    mustUseHints: FUTURE_REQUIRED_SIGNALS,
    forbiddenHardSignals: FUTURE_HARD_CONFLICTS,
    instructionText: "时代背景为未来，主叙事应有明确未来科技或未来秩序，可写近未来、AI、智能城市、赛博、星际、仿生、算法、数据秩序与阶层规则，不要把主体写成普通当代都市职场。",
  };
}

export function detectCrossEraHook(input: unknown) {
  const text = flattenUnknownText(input).join("\n");
  if (!text) return false;
  return CROSS_ERA_SIGNALS.some((signal) => text.includes(signal));
}

export function validateScenarioProseAgainstEra(input: {
  scriptType: "short_drama" | "ai_comic";
  eraOrWorldType: string;
  title: string;
  coreHighlight: string;
  storyBackground: string;
  worldview: string;
  coreSynopsis: string;
  coreHooks: string[];
  displayTagGroups?: unknown;
  generationHints?: unknown;
  diagnosisText?: string;
}): EraProseValidationResult {
  const eraInstruction = getScenarioEraInstruction(input.eraOrWorldType);
  const crossEraInput = [
    input.coreHooks,
    input.displayTagGroups,
    input.generationHints,
    input.title,
    input.coreHighlight,
    input.storyBackground,
    input.worldview,
    input.coreSynopsis,
    input.diagnosisText,
  ];
  const hasCrossEraHook = detectCrossEraHook(crossEraInput);

  if (input.scriptType !== "short_drama") {
    return {
      ok: true,
      severity: "pass",
      detectedConflicts: [],
      detectedRequiredSignals: [],
      hasCrossEraHook,
      normalizedEra: eraInstruction.normalizedEra,
      eraFamily: eraInstruction.eraFamily,
    };
  }

  const primaryText = uniqueStrings([
    input.storyBackground.trim(),
    input.coreSynopsis.trim(),
    input.coreHighlight.trim(),
  ]).join("\n");
  const detectedRequiredSignals = textIncludesAny(primaryText, eraInstruction.mustUseHints);

  if (eraInstruction.eraFamily === "unknown" || eraInstruction.eraFamily === "modern") {
    return {
      ok: true,
      severity: eraInstruction.eraFamily === "unknown" ? "warn" : "pass",
      detectedConflicts: [],
      detectedRequiredSignals,
      hasCrossEraHook,
      normalizedEra: eraInstruction.normalizedEra,
      eraFamily: eraInstruction.eraFamily,
    };
  }

  const detectedConflicts = textIncludesAny(primaryText, eraInstruction.forbiddenHardSignals);
  const hasRequiredSignal = detectedRequiredSignals.length > 0;

  if (eraInstruction.eraFamily === "period") {
    if (detectedConflicts.length > 0) {
      return {
        ok: false,
        severity: "fail",
        detectedConflicts,
        detectedRequiredSignals,
        hasCrossEraHook,
        normalizedEra: eraInstruction.normalizedEra,
        eraFamily: eraInstruction.eraFamily,
      };
    }
    if (!hasRequiredSignal) {
      return {
        ok: false,
        severity: "fail",
        detectedConflicts: ["missing_period_signal"],
        detectedRequiredSignals,
        hasCrossEraHook,
        normalizedEra: eraInstruction.normalizedEra,
        eraFamily: eraInstruction.eraFamily,
      };
    }
    return {
      ok: true,
      severity: hasCrossEraHook ? "warn" : "pass",
      detectedConflicts: [],
      detectedRequiredSignals,
      hasCrossEraHook,
      normalizedEra: eraInstruction.normalizedEra,
      eraFamily: eraInstruction.eraFamily,
    };
  }

  if (eraInstruction.eraFamily === "ancient" || eraInstruction.eraFamily === "republic") {
    if (detectedConflicts.length > 0) {
      return {
        ok: false,
        severity: "fail",
        detectedConflicts,
        detectedRequiredSignals,
        hasCrossEraHook,
        normalizedEra: eraInstruction.normalizedEra,
        eraFamily: eraInstruction.eraFamily,
      };
    }
    if (!hasRequiredSignal) {
      return {
        ok: true,
        severity: "warn",
        detectedConflicts: [],
        detectedRequiredSignals,
        hasCrossEraHook,
        normalizedEra: eraInstruction.normalizedEra,
        eraFamily: eraInstruction.eraFamily,
      };
    }
    return {
      ok: true,
      severity: hasCrossEraHook ? "warn" : "pass",
      detectedConflicts: [],
      detectedRequiredSignals,
      hasCrossEraHook,
      normalizedEra: eraInstruction.normalizedEra,
      eraFamily: eraInstruction.eraFamily,
    };
  }

  if (detectedConflicts.length > 0) {
    return {
      ok: false,
      severity: hasRequiredSignal ? "warn" : "fail",
      detectedConflicts,
      detectedRequiredSignals,
      hasCrossEraHook,
      normalizedEra: eraInstruction.normalizedEra,
      eraFamily: eraInstruction.eraFamily,
    };
  }

  if (!hasRequiredSignal) {
    return {
      ok: true,
      severity: "warn",
      detectedConflicts: [],
      detectedRequiredSignals,
      hasCrossEraHook,
      normalizedEra: eraInstruction.normalizedEra,
      eraFamily: eraInstruction.eraFamily,
    };
  }

  return {
    ok: true,
    severity: "pass",
    detectedConflicts: [],
    detectedRequiredSignals,
    hasCrossEraHook,
    normalizedEra: eraInstruction.normalizedEra,
    eraFamily: eraInstruction.eraFamily,
  };
}
