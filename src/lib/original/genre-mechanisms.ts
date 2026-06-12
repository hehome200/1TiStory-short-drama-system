export type GenreMechanismType = "rule_tale" | "general_short_drama";

export type GenreMechanismConfig = {
  type: GenreMechanismType;
  mechanismSummary: string;
  worldRules?: string[];
  tabooActions?: string[];
  violationCosts?: string[];
  authorityMechanism?: string;
  loopholeMethod?: string;
};

export const RULE_TALE_MECHANISM: GenreMechanismConfig = {
  type: "rule_tale",
  mechanismSummary: "近现实空间被显性规则和隐性规则共同覆盖，冲突围绕规则解释权、违规代价和规则漏洞展开。",
  worldRules: [
    "显性规则必须可验证，隐性规则会通过反复试错逐步显影。",
    "规则文本、证据口径和人物身份都可能成为被争夺的解释对象。",
    "角色只有在找到规则漏洞后，才可能把局面从被动判定转成主动反击。",
  ],
  tabooActions: [
    "无视规则文本直接行动",
    "在未确认解释权时贸然公开证据",
    "把规则当成普通刑侦线索处理而不考虑其代价",
  ],
  violationCosts: [
    "身份被判定为违规者",
    "证据链被直接否决或反向利用",
    "关系与信任成本迅速上升",
  ],
  authorityMechanism: "对手掌握规则解释权、证据解释权或空间权限，借此把主角推成违规者。",
  loopholeMethod: "通过观察、试错、证据回溯和规则文字拆解，找到规则漏洞并反向利用。",
};

export const GENERAL_SHORT_DRAMA_MECHANISM: GenreMechanismConfig = {
  type: "general_short_drama",
  mechanismSummary: "以人物压力、关系误判、现实压迫和阶段性反击推动短剧主线。",
  authorityMechanism: "资源优势、身份压迫、关系误判和现实阻碍共同构成对手压力。",
  loopholeMethod: "通过选择、反击、证据翻盘和关系兑现完成主线推进。",
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function flattenTextInputs(values: Array<string | string[] | undefined | null>): string {
  const parts: string[] = [];
  for (const value of values) {
    if (typeof value === "string") {
      const text = value.trim();
      if (text) parts.push(text);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) {
          parts.push(item.trim());
        }
      }
    }
  }
  return parts.join(" ");
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function detectGenreMechanism(input: {
  title?: string;
  audience?: string;
  scriptType?: string;
  genres?: string[];
  coreHooks?: string[];
  styleTags?: string[];
  worldview?: string;
  highlight?: string;
  premise?: string;
  projectBriefGenres?: string[];
  projectBriefCoreHooks?: string[];
  scriptPlanGenrePromise?: string;
  scriptPlanMainConflict?: string;
  scriptPlanAntagonistPressure?: string;
  scriptPlanPaymentPointPlan?: string;
}): GenreMechanismConfig {
  const combined = normalizeText(
    flattenTextInputs([
      input.title,
      input.audience,
      input.scriptType,
      input.genres,
      input.coreHooks,
      input.styleTags,
      input.worldview,
      input.highlight,
      input.premise,
      input.projectBriefGenres,
      input.projectBriefCoreHooks,
      input.scriptPlanGenrePromise,
      input.scriptPlanMainConflict,
      input.scriptPlanAntagonistPressure,
      input.scriptPlanPaymentPointPlan,
    ]),
  );

  const strongSignals = [
    "规则怪谈",
    "诡秘规则",
    "规则污染",
    "规则覆盖",
    "规则解释权",
    "异常规则",
    "规则漏洞",
    "违反规则",
  ];

  if (includesAny(combined, strongSignals)) {
    return RULE_TALE_MECHANISM;
  }

  return GENERAL_SHORT_DRAMA_MECHANISM;
}
