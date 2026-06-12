import type { MorphicRenderSpec } from "@/components/workspace/morphic-render/schema";
import {
  getAudienceConsoleSpec,
  getOpeningHookSpec,
  getPaymentHookSpec,
  getTopicDirectionSpec,
  getVillainSpec,
} from "@/components/workspace/morphic-render";
import {
  getAudienceOptionsForScriptType,
  getPresetForScriptType,
  resolvePresetTags,
} from "@/lib/script-tags";
import type { InspirationDiagnosis } from "@/lib/original/story-intent-summary";

export type InspirationStepSupplementKey =
  | "audience"
  | "topicDirection"
  | "openingHook"
  | "villainPreference"
  | "paymentHook";

export type InspirationStepKey = InspirationStepSupplementKey;

export type InspirationStepSource = {
  presetSection: "eras" | "genres" | "coreHooks" | "styleTags";
  categoryIds?: string[];
  groupIds: string[];
  sampleCount: number;
};

export type InspirationStepDefinition = {
  id: number;
  key: InspirationStepKey;
  title: string;
  description: string;
  placeholder: string;
  mapsTo: InspirationStepSupplementKey;
  bucket: "single" | "multi";
  maxSelect: number;
  source?: InspirationStepSource;
  buildSpec?: (args: {
    scriptType: "short_drama" | "ai_comic";
    selectedLabel?: string;
    selectedTargetAudienceLabel?: string;
    diagnosis?: InspirationDiagnosis;
    selectedEraLabels?: string[];
    selectedMustHaveLabels?: string[];
    selectedMustAvoidLabels?: string[];
  }) => MorphicRenderSpec;
};

export type InspirationStepConfig = {
  scriptType: "short_drama" | "ai_comic";
  audienceTagOptions: string[];
  steps: InspirationStepDefinition[];
};

const SHORT_DRAMA_STEP_CONFIG: InspirationStepConfig = {
  scriptType: "short_drama",
  audienceTagOptions: getAudienceOptionsForScriptType("short_drama"),
  steps: [
    {
      id: 1,
      key: "audience",
      title: "第 1 步：开场爆点",
      description: "先看哪种开局最能抓住你，系统会据此锁定主方向。",
      placeholder: "补充第1步偏好，比如：低位反控、关系翻局...",
      mapsTo: "audience",
      bucket: "single",
      maxSelect: 1,
      source: {
        presetSection: "coreHooks",
        groupIds: ["live-action-opening-hook-all"],
        sampleCount: 4,
      },
      buildSpec: ({ scriptType, selectedLabel, selectedTargetAudienceLabel }) =>
        getAudienceConsoleSpec(scriptType, selectedLabel, selectedTargetAudienceLabel),
    },
    {
      id: 2,
      key: "topicDirection",
      title: "第 2 步：人物关系",
      description: "先定人物关系的张力，系统再推后面的情绪走向。",
      placeholder: "补充第2步偏好，比如：隐忍清醒、断情自救...",
      mapsTo: "topicDirection",
      bucket: "single",
      maxSelect: 1,
      source: {
        presetSection: "coreHooks",
        groupIds: ["live-action-relationship-all"],
        sampleCount: 4,
      },
      buildSpec: ({ scriptType, selectedLabel, selectedTargetAudienceLabel }) =>
        getTopicDirectionSpec(scriptType, selectedLabel, selectedTargetAudienceLabel),
    },
    {
      id: 3,
      key: "openingHook",
      title: "第 3 步：主角身份",
      description: "先定主角在局里的身份和起点，系统再推人物弧线。",
      placeholder: "补充第3步偏好，比如：权力压制、真相遮蔽...",
      mapsTo: "openingHook",
      bucket: "single",
      maxSelect: 1,
      source: {
        presetSection: "coreHooks",
        groupIds: ["live-action-identity-all"],
        sampleCount: 4,
      },
      buildSpec: ({ scriptType, selectedLabel, selectedTargetAudienceLabel }) =>
        getOpeningHookSpec(scriptType, selectedLabel, selectedTargetAudienceLabel),
    },
    {
      id: 4,
      key: "villainPreference",
      title: "第 4 步：翻盘机制",
      description: "根据前 3 步自动校准，补上翻盘与确认的走法。",
      placeholder: "补充第4步校准，比如：偏爽感、偏情感、偏脑洞...",
      mapsTo: "villainPreference",
      bucket: "single",
      maxSelect: 1,
      source: {
        presetSection: "coreHooks",
        groupIds: ["live-action-turnaround-all"],
        sampleCount: 4,
      },
      buildSpec: ({ scriptType, selectedLabel, diagnosis, selectedTargetAudienceLabel }) =>
        getVillainSpec(scriptType, selectedLabel, diagnosis, selectedTargetAudienceLabel),
    },
    {
      id: 5,
      key: "paymentHook",
      title: "第 5 步：确认题材 / 时代 / mustHave / mustAvoid / 一句话补充",
      description: "题材与边界最后确认，想要与不要都在这里收口。",
      placeholder: "也可以补一句你的具体要求，比如：现代背景、不要重生、想要复仇、男主少一点。",
      mapsTo: "paymentHook",
      bucket: "multi",
      maxSelect: 6,
      source: {
        presetSection: "eras",
        groupIds: ["live-action-era-background-all"],
        sampleCount: 6,
      },
      buildSpec: ({ scriptType, selectedEraLabels, selectedMustHaveLabels, selectedMustAvoidLabels }) =>
        getPaymentHookSpec(scriptType, selectedMustHaveLabels, selectedMustAvoidLabels, selectedEraLabels),
    },
  ],
};

const AI_COMIC_STEP_CONFIG: InspirationStepConfig = {
  scriptType: "ai_comic",
  audienceTagOptions: getAudienceOptionsForScriptType("ai_comic"),
  steps: [
    {
      id: 1,
      key: "audience",
      title: "第 1 步：题材壳 / 世界类型",
      description: "先定世界壳和视觉类型，系统再据此锁定主方向。",
      placeholder: "补充第1步偏好，比如：都市、悬疑、古代、末世...",
      mapsTo: "audience",
      bucket: "single",
      maxSelect: 1,
      source: {
        presetSection: "genres",
        categoryIds: ["urban-modern", "suspense-supernatural", "history-costume", "apocalypse-disaster"],
        groupIds: ["urban-modern-all", "suspense-supernatural-all", "history-costume-all", "apocalypse-disaster-all"],
        sampleCount: 4,
      },
      buildSpec: ({ scriptType, selectedLabel, selectedTargetAudienceLabel }) =>
        getAudienceConsoleSpec(scriptType, selectedLabel, selectedTargetAudienceLabel),
    },
    {
      id: 2,
      key: "topicDirection",
      title: "第 2 步：主角起点",
      description: "先定主角在世界里的起点，系统再推后面的角色弧线。",
      placeholder: "补充第2步偏好，比如：圣女、仙尊、凡人、大男主...",
      mapsTo: "topicDirection",
      bucket: "single",
      maxSelect: 1,
      source: {
        presetSection: "coreHooks",
        categoryIds: ["identity"],
        groupIds: ["identity-all"],
        sampleCount: 4,
      },
      buildSpec: ({ scriptType, selectedLabel, selectedTargetAudienceLabel }) =>
        getTopicDirectionSpec(scriptType, selectedLabel, selectedTargetAudienceLabel),
    },
    {
      id: 3,
      key: "openingHook",
      title: "第 3 步：核心机制",
      description: "先定世界运行机制，系统再推冲突节奏。",
      placeholder: "补充第3步偏好，比如：系统、异能、身份反转、穿书...",
      mapsTo: "openingHook",
      bucket: "single",
      maxSelect: 1,
      source: {
        presetSection: "coreHooks",
        categoryIds: ["cheat"],
        groupIds: ["cheat-all"],
        sampleCount: 5,
      },
      buildSpec: ({ scriptType, selectedLabel, selectedTargetAudienceLabel }) =>
        getOpeningHookSpec(scriptType, selectedLabel, selectedTargetAudienceLabel),
    },
    {
      id: 4,
      key: "villainPreference",
      title: "第 4 步：爽点风格",
      description: "根据前 3 步自动校准，补上风格和兑现方式。",
      placeholder: "补充第4步校准，比如：升级流、无脑流、强势碾压、轻松喜剧...",
      mapsTo: "villainPreference",
      bucket: "single",
      maxSelect: 1,
      source: {
        presetSection: "coreHooks",
        categoryIds: ["flow"],
        groupIds: ["flow-all"],
        sampleCount: 5,
      },
      buildSpec: ({ scriptType, selectedLabel, diagnosis, selectedTargetAudienceLabel }) =>
        getVillainSpec(scriptType, selectedLabel, diagnosis, selectedTargetAudienceLabel),
    },
    {
      id: 5,
      key: "paymentHook",
      title: "第 5 步：视觉元素 / mustHave / mustAvoid / 一句话补充",
      description: "视觉元素与边界最后确认，想要与不要都在这里收口。",
      placeholder: "也可以补一句你的具体要求，比如：视觉更强、不要重生、想要更高概念。",
      mapsTo: "paymentHook",
      bucket: "multi",
      maxSelect: 6,
      source: {
        presetSection: "styleTags",
        categoryIds: ["style", "element"],
        groupIds: ["style-all", "element-all"],
        sampleCount: 6,
      },
      buildSpec: ({ scriptType, selectedEraLabels, selectedMustHaveLabels, selectedMustAvoidLabels }) =>
        getPaymentHookSpec(scriptType, selectedMustHaveLabels, selectedMustAvoidLabels, selectedEraLabels),
    },
  ],
};

const INSPIRATION_STEP_CONFIGS: Record<"short_drama" | "ai_comic", InspirationStepConfig> = {
  short_drama: SHORT_DRAMA_STEP_CONFIG,
  ai_comic: AI_COMIC_STEP_CONFIG,
};

export function getInspirationStepConfig(scriptType: "short_drama" | "ai_comic") {
  return INSPIRATION_STEP_CONFIGS[scriptType];
}

export function getInspirationStepSourceTags(
  scriptType: "short_drama" | "ai_comic",
  stepKey: InspirationStepKey,
): string[] {
  const config = getInspirationStepConfig(scriptType);
  const step = config.steps.find((item) => item.key === stepKey);
  if (!step?.source) return [];

  const preset = getPresetForScriptType(scriptType);
  return resolvePresetTags({
    preset,
    section: step.source.presetSection,
    categoryIds: step.source.categoryIds,
    groupIds: step.source.groupIds,
    sampleCount: step.source.sampleCount,
    debugLabel: `step:${step.key}`,
  });
}
