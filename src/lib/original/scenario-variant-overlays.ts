export type ScenarioVariantId = "commercial_stable" | "character_contrast" | "high_concept";

export type ScenarioVariantOverlay = {
  variantId: ScenarioVariantId;
  variantName: string;
  focus: string;
  overlayTags: string[];
  titleAngle: string;
  highlightAngle: string;
  synopsisAngle: string;
  requiredSignals: string[];
  forbiddenSignals: string[];
};

export type ScenarioBaseStepTags = {
  audiences: string[];
  genres: string[];
  coreHooks: string[];
  styleTags: string[];
};

export type ScenarioTagBundle = {
  baseStepTags: ScenarioBaseStepTags;
  variantTags: string[];
  scenarioTagBundle: string[];
};

export type ScenarioDisplayTagGroups = {
  audience: string[];
  era?: string[];
  genres: string[];
  coreSettings: string[];
  styleElements?: string[];
};

export type ScenarioGenerationHints = {
  variantId: ScenarioVariantId;
  variantName: string;
  focus: string;
  title: string[];
  coreHighlight: string[];
  storyBackground: string[];
  worldview: string[];
  coreSynopsis: string[];
  requiredSignals: string[];
  forbiddenSignals: string[];
};

const VARIANT_OVERLAYS: ScenarioVariantOverlay[] = [
  {
    variantId: "commercial_stable",
    variantName: "商业稳态款",
    focus: "稳定爆款",
    overlayTags: ["variant:commercial_stable", "signal:steady_hook", "signal:commercial_pacing"],
    titleAngle: "稳态反击",
    highlightAngle: "稳定爽点",
    synopsisAngle: "连续回收",
    requiredSignals: ["稳态", "连续爽点", "清晰钩子"],
    forbiddenSignals: ["空转", "过度奇观", "设定漂移"],
  },
  {
    variantId: "character_contrast",
    variantName: "强人设反差款",
    focus: "人物反差",
    overlayTags: ["variant:character_contrast", "signal:relational_pressure", "signal:character_focus"],
    titleAngle: "不装了",
    highlightAngle: "人物反差",
    synopsisAngle: "情绪回弹",
    requiredSignals: ["人物反差", "关系压力", "情绪回弹"],
    forbiddenSignals: ["设定空转", "大场面堆砌", "弱关系"],
  },
  {
    variantId: "high_concept",
    variantName: "脑洞差异化款",
    focus: "高概念设定",
    overlayTags: ["variant:high_concept", "signal:world_rule", "signal:concept_memory"],
    titleAngle: "高概念翻盘",
    highlightAngle: "设定记忆点",
    synopsisAngle: "规则兑现",
    requiredSignals: ["高概念", "规则变化", "记忆点"],
    forbiddenSignals: ["同质化", "低频弱钩子", "纯模板爽点"],
  },
];

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

export function getScenarioVariantOverlay(index: number): ScenarioVariantOverlay {
  return VARIANT_OVERLAYS[index] ?? VARIANT_OVERLAYS[0];
}

export function getScenarioVariantOverlays(): ScenarioVariantOverlay[] {
  return VARIANT_OVERLAYS.slice();
}

export function buildScenarioTagBundle(
  baseStepTags: ScenarioBaseStepTags,
  variant: ScenarioVariantOverlay,
): ScenarioTagBundle {
  const variantTags = uniqueStrings(variant.overlayTags);
  const scenarioTagBundle = uniqueStrings([
    ...baseStepTags.audiences,
    ...baseStepTags.genres,
    ...baseStepTags.coreHooks,
    ...baseStepTags.styleTags,
    ...variantTags,
  ]);

  return {
    baseStepTags: {
      audiences: uniqueStrings(baseStepTags.audiences),
      genres: uniqueStrings(baseStepTags.genres),
      coreHooks: uniqueStrings(baseStepTags.coreHooks),
      styleTags: uniqueStrings(baseStepTags.styleTags),
    },
    variantTags,
    scenarioTagBundle,
  };
}

export function buildVariantAngleLead(variant: ScenarioVariantOverlay, scriptType: "short_drama" | "ai_comic") {
  if (scriptType === "ai_comic") {
    switch (variant.variantId) {
      case "commercial_stable":
        return "商业稳态款强调开局强、反击快、追更钩子直给。";
      case "character_contrast":
        return "强人设反差款强调身份误判、关系错位和不装了。";
      case "high_concept":
        return "脑洞差异化款强调规则反转、机制代价和局中局。";
      default:
        return "变体款强调高概念设定和视觉兑现。";
    }
  }

  switch (variant.variantId) {
    case "commercial_stable":
      return "商业稳态款强调开局强、反击快、钩子直给。";
    case "character_contrast":
      return "强人设反差款强调身份误判、关系错位和不装了。";
    case "high_concept":
      return "脑洞差异化款强调现实切口和差异化记忆点。";
    default:
      return "变体款强调现实冲突和记忆点。";
  }
}
