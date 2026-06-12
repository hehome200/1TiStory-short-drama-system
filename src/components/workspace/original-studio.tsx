"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { SettingsPanel } from "@/components/workspace/settings-panel";
import { WorkspaceFrame } from "@/components/workspace/workspace-frame";
import { PromptDebugPanel } from "@/components/workspace/prompt-debug-panel";
import { EpisodeTracePanel } from "@/components/workspace/episode-trace-panel";
import { ScriptThinkingPanel } from "@/components/workspace/script-thinking-panel";
import { PhasePlannerPanel } from "@/components/workspace/phase-planner-panel";
import {
  ScriptTypeSelector,
  type ScriptType,
} from "@/components/workspace/script-type-selector";
import {
  buildRequiredCharacterSlots,
  getTargetCharacterCount,
  resolveCharacterIdentityState,
  resolveCharacterLeadAnchors,
  resolveCharacterNarrativeState,
  resolveCharacterRosterInfo,
  normalizeCharacterNarrativeByGender,
  normalizeCharacterNarrativeByMarket,
  normalizeShortDramaCharacterRole,
  resolveLocalizedCharacterName,
  resolveCharacterDisplayName,
  SHORT_DRAMA_CHARACTER_ROLE_OPTIONS,
} from "@/lib/ai/context";
import { parseOriginalStreamStep } from "@/lib/ai/stream-preview";
import { selectQualityAssetsForOriginal } from "@/lib/quality-os/select-assets";
import { QualityReportSummary } from '@/components/workspace/quality-report-summary';
import { ExportProjectPopover } from "@/components/workspace/export-project-popover";
import { buildScriptQualityReport, convertSseReviewToQualityReport } from "@/lib/quality-os/apply-script-report";
import { buildLocalScriptAudit } from "@/lib/quality-os/build-local-script-audit";
import type { GenerateOriginalResponse } from "@/lib/ai/types";
import type { GenerationQualityReport } from "@/lib/quality-os/types";
import { mergeProviderConfig } from "@/lib/provider-config";
import { extractSourceMaterialPayload, generateOriginalPayload } from "@/lib/local-ai/creative-generation";
import type {
  Character,
  MacroStage,
  ModelProviderConfig,
  OriginalDraft,
  OriginalPhaseRange,
  OriginalStep,
  OutlineBatch,
  OutlineDraft,
  ProjectBrief,
  ProjectRecord,
  ScriptDraft,
  SourceMaterialExtraction,
  SourceSections,
  StepVersionHistory,
  VersionSource,
} from "@/lib/types";
import { adaptOriginalOutlineToViewModel } from "@/components/workspace/shared-outline/adapters/original-outline-adapter";
import { normalizeShortDramaEraDisplay } from "@/lib/original/selected-scenario-plan";
import { countScriptChineseChars, stripGeneratedWordCountFooter } from "@/lib/original/script-word-count";
import { MultiTagDropdown } from "@/components/workspace/story-setting/multi-tag-dropdown";
import { CategorizedMultiDropdown } from "@/components/workspace/story-setting/categorized-multi-dropdown";
import { ProjectConstraintControl } from "@/components/workspace/project-brief/project-constraint-control";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const ENABLE_QUALITY_REFERENCE_PANEL =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_QUALITY_OS_UI_V1 === "1" ||
  process.env.NEXT_PUBLIC_QUALITY_OS_V1 === "1";

const ENABLE_QUALITY_REPORTS_UI =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_QUALITY_REPORTS_UI_V1 === '1';
const ORIGINAL_DATA_FLOW_DEBUG_KEY = "sboard:original-data-flow-debug";

type OriginalDataFlowSnapshot = {
  scriptType: "short_drama" | "ai_comic";
  currentGenres: string[];
  promptBundleGenres: string[];
  currentResultScenarioPlanGenres: string[];
  currentResultScenarioPlanProjectBriefGenres: string[];
  currentResultScenarioPlanDisplayTagGenres: string[];
  selectedGenres: string[];
  overviewDataGenres: string[];
  projectBriefGenres: string[];
  draftOverviewGenres: string[];
  overviewReadField: string;
};


// ── Overview field safety helpers ──
function safeStr(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === "string").join("、");
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const pick = obj.text ?? obj.value ?? obj.content ?? "";
    return typeof pick === "string" ? pick : "";
  }
  return String(value);
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === "string");
  if (typeof value === "string") {
    return value.split(/[,，、\n#]+/).map(s => s.trim()).filter(Boolean);
  }
  if (value != null && typeof value === "object") {
    const vals = Object.values(value as Record<string, unknown>);
    return vals.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function pickStringArray(next: unknown, previous: unknown): string[] {
  const nextArr = normalizeStringArray(next);
  if (nextArr.length > 0) return nextArr;
  const prevArr = normalizeStringArray(previous);
  if (prevArr.length > 0) return prevArr;
  return [];
}

function isEpisodeListText(text: unknown): boolean {
  if (typeof text !== "string") return false;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const episodeLineCount = lines.filter((line) => /^第\s*\d+\s*集[:：]/.test(line)).length;
  if (lines.length > 1 && episodeLineCount >= 2) return true;

  const markerCount = text.match(/第\s*\d+\s*集[:：]/g)?.length ?? 0;
  return markerCount >= 2;
}

function isStageRangeListText(text: unknown): boolean {
  if (typeof text !== "string") return false;
  const rangeLinePattern = /(?:[起承转合]\s*)?\d+\s*[-~—–]\s*\d+\s*集/;
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rangeLineCount = lines.filter((line) => rangeLinePattern.test(line)).length;
  if (lines.length > 1 && rangeLineCount >= 2) return true;

  const rangeCount = text.match(/(?:[起承转合]\s*)?\d+\s*[-~—–]\s*\d+\s*集/g)?.length ?? 0;
  return rangeCount >= 2;
}

function sanitizeOutlineMacro(text: unknown): string {
  if (typeof text !== "string") return "";
  if (isEpisodeListText(text) || isStageRangeListText(text)) return "";
  return text.trim();
}

function getOutlineBatchKey(batch: Pick<OutlineBatch, "batchIndex" | "startEpisode" | "endEpisode">) {
  return `${batch.batchIndex}:${batch.startEpisode}:${batch.endEpisode}`;
}

const QUALITY_RISK_LABELS: Record<string, string> = {
  copyright_risk: "版权风险",
  ip_similarity_risk: "IP 相似风险",
  over_template_risk: "同质化风险",
  compliance_risk: "合规风险",
  ai_visual_risk: "AI 视觉风险",
  religious_or_mythic_ip_risk: "神话/宗教 IP 风险",
  low_taste_risk: "低趣味风险",
  violence_risk: "暴力风险",
};

function getRuleRiskTags(item: { antiTemplateRisk?: number; wateringRisk?: number; complianceRisk?: number }): string[] {
  const tags: string[] = [];
  if ((item.complianceRisk ?? 0) >= 3) tags.push("compliance_risk");
  if ((item.antiTemplateRisk ?? 0) >= 3) tags.push("ip_similarity_risk");
  if ((item.wateringRisk ?? 0) >= 3) tags.push("over_template_risk");
  return tags;
}

function normalizeCharacterRole(role?: string) {
  return normalizeShortDramaCharacterRole({ roleType: role });
}

const CHARACTER_ROLE_OPTIONS = SHORT_DRAMA_CHARACTER_ROLE_OPTIONS;

const CHARACTER_GENDER_OPTIONS: Array<{ value: "male" | "female" | "unknown"; label: string }> = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "unknown", label: "未知" },
];

const RELATION_TAG_LABELS: Record<string, string> = {
  被误判: "被误判",
  低位反控: "低位反控",
  身份反转: "身份反转",
  男主: "男主",
  女主: "女主",
  助攻: "助攻",
  贵人: "贵人",
  亲友: "亲友",
  家族压力: "家族压力",
  组织压力: "组织压力",
  信息角色: "信息角色",
  "炮灰 / 垫脚石": "炮灰 / 垫脚石",
  "旁白 / 叙述者": "旁白 / 叙述者",
  "对手 / 情敌": "对手 / 情敌",
  "女主候选": "女主候选",
  "关系压力": "关系压力",
  "家族施压": "家族施压",
  "组织施压": "组织施压",
  "误判男主": "误判男主",
  "救男主": "救男主",
  "给资源": "给资源",
  "爆秘密": "爆秘密",
  "制造误会": "制造误会",
  "背刺反转": "背刺反转",
  "身份见证": "身份见证",
  "爽点垫脚": "爽点垫脚",
  "规则见证": "规则见证",
  "终局压力": "终局压力",
  "喜欢男主": "喜欢男主",
  "喜欢女主": "喜欢女主",
  "男主贵人": "男主贵人",
  "男主反派": "男主反派",
  "女主贵人": "女主贵人",
  "女主反派": "女主反派",
  "女主对手": "女主对手",
  opponent: "对手 / 情敌",
  likes_male_lead: "喜欢男主",
  likes_female_lead: "喜欢女主",
  male_lead_backer: "男主贵人",
  male_lead_antagonist: "男主反派",
  female_lead_backer: "女主贵人",
  female_lead_antagonist: "女主反派",
  female_lead_rival: "女主对手",
  family_pressure: "家族压力",
  faction_pressure: "组织压力",
  family_pressure_tags: "家族施压",
  faction_pressure_tags: "组织施压",
  relationship_pressure: "关系压力",
  misread_male_lead: "误判男主",
  rescue_male_lead: "救男主",
  resource_giver: "给资源",
  secret_reveal: "爆秘密",
  create_misunderstanding: "制造误会",
  betrayal_reversal: "背刺反转",
  identity_witness: "身份见证",
  payoff_standby: "爽点垫脚",
  rule_witness: "规则见证",
  ultimate_pressure: "终局压力",
  male_character: "",
  female_character: "",
  unknown: "",
};

function getGenderBadgeLabel(gender?: Character["gender"]) {
  switch (gender) {
    case "male":
      return "男";
    case "female":
      return "女";
    default:
      return "未知";
  }
}

function getRelationshipLabels(character: Character) {
  const labels: string[] = [];
  if (character.relationToMaleLead && character.relationToMaleLead !== "unknown") {
    const maleLabel =
      character.relationToMaleLead === "self"
        ? "男主"
        : RELATION_TAG_LABELS[character.relationToMaleLead] ?? "";
    if (maleLabel) labels.push(maleLabel);
  }
  if (character.relationToFemaleLead && character.relationToFemaleLead !== "unknown") {
    const nextLabel =
      character.relationToFemaleLead === "self"
        ? "女主"
        : RELATION_TAG_LABELS[character.relationToFemaleLead] ?? "";
    if (nextLabel && !labels.includes(nextLabel)) labels.push(nextLabel);
  }
  return labels;
}

function getRelationshipTagLabels(character: Character) {
  const labels: string[] = [];
  for (const tag of character.relationshipTags ?? []) {
    const label = RELATION_TAG_LABELS[tag] ?? (/[一-龥]/.test(tag) ? tag : "");
    if (label && !labels.includes(label)) {
      labels.push(label);
    }
  }
  return labels;
}

import {
  createProjectRecord,
  createDefaultProjectBrief,
  createDefaultScriptPlan,
  DEFAULT_OUTLINE_CONSTRAINTS,
  CURRENT_PROJECT_ID_STORAGE_KEY,
  INITIAL_DRAFT,
  loadProjectWorkspace,
  PENDING_ORIGINAL_INSPIRATION_KEY,
  PROJECTS_STORAGE_KEY,
  loadProjects,
  normalizeProjectRecord,
  saveProjects,
} from "@/lib/projects";
import { createProject as apiCreateProject, deleteProject as apiDeleteProject, updateProject as apiUpdateProject, loadProjectDraft, saveProjectDraft } from "@/lib/api-projects";
import { useWorkspaceShell } from "@/components/workspace/workspace-shell-context";
import {
  getCurrentCoreHooks,
  getCurrentGenres,
  getCurrentStyleTags,
  getAudienceOptionsForScriptType,
  setPresetLibrary,
  normalizeOverviewSelectionFields,
} from "@/lib/script-tags";
import { buildEpisodeBatches } from "@/lib/outline/phase-utils";
import {
  applyStepPayload,
  createVersion,
  EMPTY_VERSION_HISTORY,
  getStepPayload,
} from "@/lib/version-history";

type WorkspaceSection = OriginalStep | "settings";

const tabs: { id: OriginalStep; label: string }[] = [
  { id: "overview", label: "故事梗概" },
  { id: "characters", label: "人物小传" },
  { id: "outlines", label: "分集大纲" },
  { id: "script", label: "剧本正文" },
];

const steps = [
  "目标受众",
  "题材类型",
  "核心设定",
  "风格元素",
  "世界观",
  "核心亮点",
  "核心梗概",
];

const TARGET_WORD_OPTIONS = [300, 500, 700] as const;
const MAIN_CHARACTER_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10] as const;
const SCENE_LIMIT_OPTIONS = [1, 2, 3, 4] as const;
const SHORT_DRAMA_ERA_OPTIONS = [
  "现代都市",
  "古代",
  "民国",
  "年代",
  "乡村",
  "职场现代",
  "豪门现代",
  "校园",
  "末世",
  "架空古代",
] as const;

const SHORT_DRAMA_ERA_OPTION_SET = new Set<string>(SHORT_DRAMA_ERA_OPTIONS);

function nearestOption<T extends number>(value: number, options: readonly T[], fallback: T): T {
  if (!Number.isFinite(value)) return fallback;
  return options.reduce((best, current) => {
    return Math.abs(current - value) < Math.abs(best - value) ? current : best;
  }, fallback);
}

function normalizeEpisodeCountValue(value: number | undefined, fallback = 60) {
  const baseValue = Number.isFinite(value) ? Number(value) : fallback;
  const rounded = Math.round(baseValue);
  return Math.min(200, Math.max(10, rounded));
}

/** 滑动值吸附到最近预设档位 */
function snapToPreset(value: number, presets: number[]): number {
  return presets.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
  );
}

/**
 * 按 1:2:2:1 生成起承转合四阶段范围。
 * 示例：
 *   30 集 → 起 1-5  承 6-15  转 16-25  合 26-30
 *   60 集 → 起 1-10 承 11-30 转 31-50  合 51-60
 *  120 集 → 起 1-20 承 21-60 转 61-100 合 101-120
 * task/emotion 字段留空，由后续手工或 AI 编辑填充。
 */
function buildPhaseRanges(totalEpisodeCount: number): OriginalPhaseRange[] {
  const n = Math.max(10, Math.trunc(totalEpisodeCount));
  const qiCount = Math.round(n / 6);
  const chengCount = Math.round((2 * n) / 6);
  const zhuanCount = Math.round((2 * n) / 6);
  const heCount = n - qiCount - chengCount - zhuanCount;
  const phases: { phase: MacroStage; count: number }[] = [
    { phase: "起", count: qiCount },
    { phase: "承", count: chengCount },
    { phase: "转", count: zhuanCount },
    { phase: "合", count: heCount },
  ];
  let cursor = 1;
  return phases.map(({ phase, count }) => {
    const start = cursor;
    const end = cursor + count - 1;
    cursor = end + 1;
    return {
      phase,
      startEpisode: start,
      endEpisode: end,
      stageTask: "",
      relationshipTask: "",
      emotionTask: "",
      mustHaveCardTypes: [],
    };
  });
}

function parseEpisodeDurationMinutes(value: string | undefined) {
  const normalized = String(value ?? "").trim();
  if (normalized === "1min") return 1;
  if (normalized === "1-2min" || normalized === "2min") return 2;
  if (normalized === "2-3min" || normalized === "3min") return 3;
  if (normalized === "4min") return 4;
  if (normalized === "3-5min" || normalized === "5min") return 5;
  return 2;
}

function toEpisodeDurationValue(minutes: number): "1min" | "2min" | "3min" | "4min" | "5min" {
  if (minutes <= 1) return "1min";
  if (minutes === 2) return "2min";
  if (minutes === 3) return "3min";
  if (minutes === 4) return "4min";
  return "5min";
}

function normalizeAudienceTypeLabel(value: string | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized === "男频" || normalized === "女频" ? normalized : "";
}

function resolveStoryAudienceDisplayValue(args: {
  audiences?: string[];
  audience?: string;
  audienceType?: "male" | "female" | "general";
  targetAudience?: string;
  scriptType: "short_drama" | "ai_comic";
}): string {
  const { audiences, audience, audienceType, targetAudience, scriptType } = args;
  const allowedLabels = scriptType === "ai_comic"
    ? ["男频", "女频"]
    : ["男频", "女频", "银发"];

  // 1. 优先从 audiences 数组找合法值
  const fromAudiences = audiences?.find((label) => allowedLabels.includes(label.trim()));
  if (fromAudiences) return fromAudiences.trim();

  // 2. 其次从 audience 字段找合法值
  if (audience && allowedLabels.includes(audience.trim())) {
    return audience.trim();
  }

  // 3. 再从 audienceType 映射
  if (audienceType === "male") return "男频";
  if (audienceType === "female") return "女频";

  // 4. 仅在明确受众值时读取 targetAudience，避免从市场描述误判“银发”
  if (targetAudience) {
    const trimmed = targetAudience.trim();
    if (trimmed === "男频" || trimmed === "女频" || (scriptType === "short_drama" && trimmed === "银发")) {
      return trimmed;
    }
  }

  // 5. 无明确受众，返回空字符串
  return "";
}

function normalizeProjectBriefForStudio(projectBrief: ProjectBrief) {
  return {
    ...projectBrief,
    episodeCount: normalizeEpisodeCountValue(projectBrief.episodeCount),
    episodeDuration: toEpisodeDurationValue(parseEpisodeDurationMinutes(projectBrief.episodeDuration)),
    targetWordsPerEpisode: nearestOption(projectBrief.targetWordsPerEpisode, TARGET_WORD_OPTIONS, 500),
    mainCharactersLimit: nearestOption(projectBrief.mainCharactersLimit, MAIN_CHARACTER_OPTIONS, 6),
    sceneLimitPerEpisode: nearestOption(projectBrief.sceneLimitPerEpisode, SCENE_LIMIT_OPTIONS, 3),
  };
}

function inferStudioScriptType(overview: Partial<OriginalDraft["overview"]>, fallback: ScriptType): ScriptType {
  if (overview.scriptType === "ai_comic" || overview.scriptType === "short_drama") {
    return overview.scriptType;
  }

  if (overview.projectBrief?.scriptType === "ai_comic" || overview.projectBrief?.scriptType === "short_drama") {
    return overview.projectBrief.scriptType;
  }

  if (overview.scriptPlan?.scriptType === "ai_comic" || overview.scriptPlan?.scriptType === "short_drama") {
    return overview.scriptPlan.scriptType;
  }

  const hasShortDramaSignals = Boolean(
    (overview.eraOrWorldType ?? "").trim() ||
    overview.displayTagGroups?.era?.some((item) => item.trim()) ||
    (overview.storyBackground ?? "").trim(),
  );

  return hasShortDramaSignals ? "short_drama" : fallback;
}

function inferShortDramaEraFromText(text: string): string {
  const normalized = text.trim();
  if (!normalized) return "";

  if (/(职场|公司|集团|企业|办公室|白领|上班|销售|销冠|客户|会议|合同|KPI|商务)/.test(normalized)) return "职场现代";
  if (/(校园|学院|学校|大学)/.test(normalized)) return "校园";
  if (/(豪门|财阀|继承人|总裁|CEO)/.test(normalized)) return "豪门现代";
  if (/(现代|当代|城市|都市|手机|互联网|高铁|地铁|现代生活|现代世界|系统|穿越到异世界|现代低位主角)/.test(normalized)) return "现代都市";
  if (/(乡村|村里|山村|县城|农庄|田园)/.test(normalized)) return "乡村";
  if (/(末世|废土|灾变|丧尸)/.test(normalized)) return "末世";
  if (/(民国|军阀|租界|旧上海|报馆|戏院|洋行)/.test(normalized)) return "民国";
  if (/(古代|王朝|皇帝|朝堂|宫廷|古装)/.test(normalized)) return "古代";
  if (/(宗门|修者|灵气|道门|异世界|异界|魔法世界|西方奇幻|架空)/.test(normalized)) return "架空古代";

  const normalizedEra = normalizeShortDramaEraDisplay(normalized);
  if (normalizedEra === "古代") return "古代";
  if (normalizedEra === "民国") return "民国";
  if (normalizedEra === "年代") return "年代";

  return "";
}

function resolveShortDramaEraDisplayValue(args: {
  eraOrWorldType?: string;
  displayEras?: string[];
  storyBackground?: string;
  worldview?: string;
}) {
  const candidates = [
    args.eraOrWorldType,
    args.displayEras?.[0],
    inferShortDramaEraFromText(args.storyBackground ?? ""),
    inferShortDramaEraFromText(args.worldview ?? ""),
  ];

  for (const candidate of candidates) {
    const normalized = (candidate ?? "").trim();
    if (!normalized || normalized === "待确认") continue;
    if (SHORT_DRAMA_ERA_OPTION_SET.has(normalized)) return normalized;

    const inferred = inferShortDramaEraFromText(normalized);
    if (inferred && SHORT_DRAMA_ERA_OPTION_SET.has(inferred)) {
      return inferred;
    }
  }

  return "";
}

function summarizeWorldviewFromStoryBackground(storyBackground: string): string {
  const normalized = storyBackground.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.length <= 120 ? normalized : `${normalized.slice(0, 120)}...`;
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="grid gap-3">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-32 rounded-3xl border border-white/10 bg-white/4 px-4 py-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 rounded-2xl border border-white/10 bg-white/4 px-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
        />
      )}
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  className,
  readOnly,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="grid gap-3">
      {label ? <span className="text-sm font-medium text-slate-200">{label}</span> : null}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={className ?? "hide-scrollbar w-full rounded-md border-0 bg-[#18181b] px-3 py-2 text-base font-normal leading-6 text-white outline transition placeholder:text-slate-400/50 hover:outline-white/65 focus:outline-white/65"}
      />
    </label>
  );
}

function loadInitialOriginalStudioState(projectId?: string) {
  const workspace = loadProjectWorkspace();
  const initialProjectId =
    projectId && workspace.projects.some((item) => item.id === projectId)
      ? projectId
      : workspace.currentProjectId;

  let nextProjects = workspace.projects;

  if (typeof window !== "undefined") {
    const pendingRaw = window.localStorage.getItem(PENDING_ORIGINAL_INSPIRATION_KEY);

    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw) as {
          projectId?: string;
          title?: string;
          overview?: OriginalDraft["overview"];
        };

        if (pending.projectId && pending.overview) {
          let applied = false;
          nextProjects = workspace.projects.map((item) => {
            if (item.id !== pending.projectId) {
              return item;
            }

            applied = true;
            return {
              ...item,
              title: pending.title || item.title,
              draft: {
                ...item.draft,
                title: pending.title || item.draft.title,
                overview: {
                  ...item.draft.overview,
                  ...pending.overview,
                },
              },
              updatedAt: new Date().toISOString(),
            };
          });

          if (applied) {
            safeSetLocalStorageItem(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
            window.localStorage.removeItem(PENDING_ORIGINAL_INSPIRATION_KEY);
          }
        }
      } catch {
        window.localStorage.removeItem(PENDING_ORIGINAL_INSPIRATION_KEY);
      }
    }
  }

  return {
    projects: nextProjects,
    currentProjectId: initialProjectId,
  };
}

// ── Safe localStorage helper (quota-safe) ──
function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      (error as DOMException).code === 22)
  );
}

function safeSetLocalStorageItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn("[storage] localStorage quota exceeded, skip local cache write", { key });
    } else {
      console.warn("[storage] localStorage write failed", { key, error });
    }
    return false;
  }
}

export function OriginalStudio({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const { isAuthenticated, sessionUser } = useWorkspaceShell();
  const [activeStep, setActiveStep] = useState<WorkspaceSection>("overview");
  const [projects, setProjects] = useState<ProjectRecord[]>(
    () => loadInitialOriginalStudioState(projectId).projects,
  );
  const [currentProjectId, setCurrentProjectId] = useState<string>(
    () => loadInitialOriginalStudioState(projectId).currentProjectId,
  );
  const [debugInspectorEnabled, setDebugInspectorEnabled] = useState(false);
  const [dataFlowSnapshot, setDataFlowSnapshot] = useState<OriginalDataFlowSnapshot | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [saveLabel, setSaveLabel] = useState("本地草稿已加载");
  const [isGenerating, setIsGenerating] = useState<OriginalStep | null>(null);
  const [generationSource, setGenerationSource] = useState<"mock" | "aliyun" | "local" | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [outlinesErrorMessage, setOutlinesErrorMessage] = useState("");
  const [streamPreview, setStreamPreview] = useState("");
  const [outlineGenerationTask, setOutlineGenerationTask] = useState<"rough" | "episodes" | null>(null);
  const [outlineGenerationPhase, setOutlineGenerationPhase] = useState("");

  // 批量生成 script 状态
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentEpisode: number }>({ current: 0, total: 0, currentEpisode: 0 });
  const [batchResult, setBatchResult] = useState<{ error?: string; success?: string } | null>(null);

  // DB save state
  const [isDbSaving, setIsDbSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Project title editing state
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [savedTitle, setSavedTitle] = useState<string>("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ── Product error messages (never expose raw technical errors to user) ──
  const toProductErrorMessage = (error: unknown): string => {
    const raw =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";
    const normalized = raw.toLowerCase();

    if (normalized.includes("insufficient aura")) {
      return "灵气不足，请充值后再试（ERR_AURA_001）";
    }
    if (
      normalized.includes("unauthorized") ||
      normalized.includes("unauthenticated") ||
      normalized.includes("session")
    ) {
      return "登录已过期，请重新登录（ERR_AUTH_001）";
    }
    if (
      normalized.includes("provider") ||
      normalized.includes("model config") ||
      normalized.includes("api key")
    ) {
      return "模型配置异常，请检查设置（ERR_MODEL_001）";
    }
    if (
      normalized.includes("network") ||
      normalized.includes("fetch failed") ||
      normalized.includes("socket") ||
      normalized.includes("stream")
    ) {
      return "网络不稳定，请重试（ERR_NET_001）";
    }
    if (
      normalized.includes("parse") ||
      normalized.includes("json") ||
      normalized.includes("empty")
    ) {
      return "生成结果异常，请重试（ERR_PARSE_001）";
    }

    if (raw) {
      return `生成失败，请稍后重试（ERR_GEN_001）。${raw}`;
    }
    return "操作失败，请稍后重试（ERR_UNKNOWN）";
  };

  const [currentFormat, setCurrentFormat] = useState<ScriptType>("short_drama");
  // 新建项目剧本类型选择
  const [showScriptTypeModal, setShowScriptTypeModal] = useState(false);
  const [newProjectScriptType, setNewProjectScriptType] = useState<ScriptType>("short_drama");
  const [selectedScriptEpisode, setSelectedScriptEpisode] = useState(1);
  const [tracePanelState, setTracePanelState] = useState<{
    open: boolean;
    episodeNumber: number;
  } | null>(null);
  const [episodeReasoning, setEpisodeReasoning] = useState<Record<number, string>>({});
  const episodeReasoningRef = useRef<Record<number, string>>({});
  const [thinkingPanelOpen, setThinkingPanelOpen] = useState(false);
  const [selectedArcIndex, setSelectedArcIndex] = useState(0);
  const [isOutlineMacroExpanded, setIsOutlineMacroExpanded] = useState(true);

  useEffect(() => {
    setPresetLibrary(currentFormat === "ai_comic" ? "ai-short-drama" : "live-action");
  }, [currentFormat]);

  // 类型切换 - 同时保存到 overview
  const handleFormatChange = (scriptType: ScriptType) => {
    setCurrentFormat(scriptType);
    updateDraft((current) => ({
      ...current,
      overview: { ...current.overview, scriptType },
    }), { userEdited: true });
  };

  // 受众切换
  const handleAudienceClick = (audience: string) => {
    updateDraft((current) => ({
      ...current,
      overview: {
        ...current.overview,
        audience,
        audiences: audience ? [audience] : [],
        projectBrief: {
          ...(current.overview.projectBrief ?? createDefaultProjectBrief(current.overview.scriptType)),
          audienceType: audience === "男频" ? "male" : audience === "女频" ? "female" : "general",
        },
      },
    }), { userEdited: true });
  };

  // 题材标签切换
  const handleGenreTagsChange = (nextGenres: string[]) => {
    updateDraft((current) => {
      const normalized = Array.from(new Set(nextGenres.map((item) => item.trim()).filter(Boolean))).slice(0, 3);
      return {
        ...current,
        overview: {
          ...current.overview,
          genres: normalized,
          projectBrief: {
            ...(current.overview.projectBrief ?? createDefaultProjectBrief(current.overview.scriptType)),
            genres: normalized,
          },
        },
      };
    }, { userEdited: true });
  };

  // 核心设定标签切换
  const handleCoreHookTagsChange = (nextCoreHooks: string[]) => {
    updateDraft((current) => {
      const normalized = Array.from(new Set(nextCoreHooks.map((item) => item.trim()).filter(Boolean))).slice(0, 5);
      return {
        ...current,
        overview: {
          ...current.overview,
          coreHooks: normalized,
          projectBrief: {
            ...(current.overview.projectBrief ?? createDefaultProjectBrief(current.overview.scriptType)),
            coreHooks: normalized,
          },
        },
      };
    }, { userEdited: true });
  };

  // 风格标签切换
  const handleStyleTagsChange = (nextStyleTags: string[]) => {
    updateDraft((current) => {
      const normalized = Array.from(new Set(nextStyleTags.map((item) => item.trim()).filter(Boolean)));
      return {
        ...current,
        overview: {
          ...current.overview,
          styleTags: normalized,
          projectBrief: {
            ...(current.overview.projectBrief ?? createDefaultProjectBrief(current.overview.scriptType)),
            styleTags: normalized,
          },
        },
      };
    }, { userEdited: true });
  };

  const handleEraValueChange = (nextEras: string[]) => {
    const normalizedEras = normalizeShortDramaEraSelectionValues(nextEras);
    updateDraft((current) => ({
      ...current,
      overview: {
        ...current.overview,
        eraOrWorldType: normalizedEras[0] ?? "",
        displayTagGroups: {
          ...current.overview.displayTagGroups,
          audience: current.overview.displayTagGroups?.audience ?? [],
          era: normalizedEras,
          genres: current.overview.displayTagGroups?.genres ?? [],
          coreSettings: current.overview.displayTagGroups?.coreSettings ?? [],
          styleElements: current.overview.displayTagGroups?.styleElements ?? [],
        },
      },
    }), { userEdited: true });
  };

  // 客户端加载项目数据
  useEffect(() => {
    const workspace = loadProjectWorkspace();
    const initialProjectId =
      projectId && workspace.projects.some((item) => item.id === projectId)
        ? projectId
        : workspace.currentProjectId;

    let nextProjects = workspace.projects;
    const pendingRaw = window.localStorage.getItem(PENDING_ORIGINAL_INSPIRATION_KEY);

    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw) as {
          projectId?: string;
          title?: string;
          overview?: OriginalDraft["overview"];
        };

        if (pending.projectId && pending.overview) {
          let applied = false;
          nextProjects = workspace.projects.map((item) => {
            if (item.id !== pending.projectId) {
              return item;
            }

            applied = true;
            return {
              ...item,
              title: pending.title || item.title,
              draft: {
                ...item.draft,
                title: pending.title || item.draft.title,
                overview: {
                  ...item.draft.overview,
                  ...pending.overview,
                },
              },
              updatedAt: new Date().toISOString(),
            };
          });

          if (applied) {
            safeSetLocalStorageItem(PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
            window.localStorage.removeItem(PENDING_ORIGINAL_INSPIRATION_KEY);
          }
        }
      } catch {
        window.localStorage.removeItem(PENDING_ORIGINAL_INSPIRATION_KEY);
      }
    }

    setProjects(nextProjects);
    setCurrentProjectId(initialProjectId);
  }, [projectId]);

  // ── DB overview shell detection ──
  const hasMeaningfulOverview = (overview: Record<string, unknown> | null | undefined): boolean => {
    if (!overview || typeof overview !== "object") return false;
    const o = overview;
    if (typeof o.premise === "string" && o.premise.trim().length > 0) return true;
    if (typeof o.userPremise === "string" && o.userPremise.trim().length > 0) return true;
    if (typeof o.highlight === "string" && o.highlight.trim().length > 0) return true;
    if (typeof o.worldview === "string" && o.worldview.trim().length > 0) return true;
    if (typeof o.storyBackground === "string" && o.storyBackground.trim().length > 0) return true;
    if (Array.isArray(o.genres) && o.genres.length > 0) return true;
    if (Array.isArray(o.coreHooks) && o.coreHooks.length > 0) return true;
    return false;
  };

  const isEmptyOverviewShell = (overview: Record<string, unknown> | null | undefined): boolean => {
    if (!overview || typeof overview !== "object") return true;
    const o = overview;
    const premiseEmpty = typeof o.premise !== "string" || o.premise.trim().length === 0;
    const userPremiseEmpty = typeof o.userPremise !== "string" || o.userPremise.trim().length === 0;
    const highlightEmpty = typeof o.highlight !== "string" || o.highlight.trim().length === 0;
    const worldviewEmpty = typeof o.worldview !== "string" || o.worldview.trim().length === 0;
    const storyBgEmpty = typeof o.storyBackground !== "string" || o.storyBackground.trim().length === 0;
    const genresEmpty = !Array.isArray(o.genres) || o.genres.length === 0;
    const coreHooksEmpty = !Array.isArray(o.coreHooks) || o.coreHooks.length === 0;
    return premiseEmpty && userPremiseEmpty && highlightEmpty && worldviewEmpty && storyBgEmpty && genresEmpty && coreHooksEmpty;
  };

  // ── DB hydrate: load draft from server on mount ──
  const dbHydratedRef = useRef<string>(""); // tracks "projectId:version"
  const dbSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressDbSaveRef = useRef(false); // suppress save during hydrate
  const latestProjectRef = useRef<ProjectRecord | null>(null);
  const baselineDraftRef = useRef<string>(""); // baseline snapshot for dirty check
  const userEditedDraftRef = useRef(false); // true only when user manually edited the draft
  const shouldConfirmRef = useRef(false); // for beforeunload to avoid stale closure
  const lastScriptQualityFailReasonRef = useRef<string>(""); // 暂存 applyGeneration 质量校验失败具体原因，供批量生成透出
  const lastScriptAttemptRef = useRef<{ attemptId: string; projectId: string; currentEpisode: number; ruleKey: string } | null>(null); // 正文生成 attempt 上下文，供失败退款
  const pendingReviewReportRef = useRef<GenerationQualityReport | null>(null); // P1-ClientBridge: SSE review → onFinal 桥接

  // ── 正文生成失败退款 ──
  const generateAttemptId = (episodeNumber: number): string => {
    const project = latestProjectRef.current;
    const pid = project?.id ?? currentProject?.id ?? "unknown";
    try {
      return crypto.randomUUID();
    } catch {
      return `${pid}-${episodeNumber}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  };

  const refundFailedScriptGeneration = async (reason: string, failureType: string) => {
    const ctx = lastScriptAttemptRef.current;
    if (!ctx) return;
    // 防止重复退款（同一次 attempt 只退一次）
    if ((ctx as { _refundSent?: boolean })._refundSent) return;
    (ctx as { _refundSent?: boolean })._refundSent = true;
    const attemptCtx = ctx;
    setErrorMessage(`第 ${attemptCtx.currentEpisode} 集生成失败，正文未保存。` + (reason ? `\n原因：${reason}` : ""));
  };

  // ── DB save helpers ──
  const DB_SAVE_DEBOUNCE_MS = 1200;

  // Helper: create stable snapshot string for dirty check
  // P1-ClientBridge: qualityReports 已纳入持久化，不再从 snapshot 剔除
  const createDraftSnapshot = (draft: OriginalDraft): string => {
    return JSON.stringify(draft);
  };

  // Resolve current project early to avoid TDZ in helper functions
  const resolvedProjectId =
    projectId && projects.some((item) => item.id === projectId)
      ? projectId
      : currentProjectId;
  const currentProject =
    projects.find((item) => item.id === resolvedProjectId) ??
    projects[0];

  // Helper: check if current draft has unsaved changes
  const hasUnsavedDraftChange = (): boolean => {
    if (!currentProject?.draft) return false;
    const snapshot = createDraftSnapshot(currentProject.draft);
    return snapshot !== baselineDraftRef.current;
  };

  // Helper: should confirm before tab switching (only user-edited unsaved changes)
  const shouldConfirmTabChange = (): boolean => {
    return userEditedDraftRef.current;
  };

  // Helper: should confirm before leaving the page (unsaved changes, saving in progress, or save error)
  const shouldConfirmBeforeLeaving = (): boolean => {
    return userEditedDraftRef.current || isDbSaving || saveError !== null;
  };

  // Keep shouldConfirmRef in sync for beforeunload handler
  shouldConfirmRef.current = shouldConfirmBeforeLeaving();

  const flushDraftSave = async (project: ProjectRecord): Promise<boolean> => {
    if (!isAuthenticated) return false;
    if (!project?.id) return false;
    const d = project.draft;
    if (!d || typeof d !== "object" || !(d as Record<string, unknown>).overview) {
      console.warn("[flushDraftSave] draft malformed, skipping");
      return false;
    }
    // Dirty check: skip if draft unchanged from baseline
    const snapshot = createDraftSnapshot(d);
    if (snapshot === baselineDraftRef.current) {
      return true; // nothing to save, consider success
    }
    setIsDbSaving(true);
    try {
      await saveProjectDraft(project.id, d, "original");
      // Update baseline after successful save
      baselineDraftRef.current = snapshot;
      setSaveError(null);
      return true;
    } catch {
      setSaveError("自动保存失败");
      return false;
    } finally {
      setIsDbSaving(false);
    }
  };

  const scheduleDraftSave = (project: ProjectRecord) => {
    if (!isAuthenticated) return;
    if (suppressDbSaveRef.current) return;
    if (!project?.id) return;
    if (dbSaveTimerRef.current) {
      clearTimeout(dbSaveTimerRef.current);
    }
    dbSaveTimerRef.current = setTimeout(() => {
      dbSaveTimerRef.current = null;
      // Use latestProjectRef if available (avoids stale closure)
      const target = latestProjectRef.current ?? project;
      flushDraftSave(target);
    }, DB_SAVE_DEBOUNCE_MS);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    // Prefer URL projectId even if not in local projects (DB hydrate can create it)
    const targetId = projectId || currentProjectId;
    if (!targetId) return;

    let cancelled = false;
    suppressDbSaveRef.current = true;

    (async () => {
      try {
        const result = await loadProjectDraft(targetId, "original");
        // Cancelled: hydrate request is stale, do not touch any state
        if (cancelled) {
          return;
        }

        if (!result) {
          // Set baseline from current draft when no result
          const currentProj = projects.find((item) => item.id === targetId);
          if (currentProj?.draft) {
            baselineDraftRef.current = createDraftSnapshot(currentProj.draft);
            userEditedDraftRef.current = false;
          }
          suppressDbSaveRef.current = false;
          return;
        }

        // No DB draft — keep localStorage as-is, set baseline from current draft
        if (result.draft === null || result.draft === undefined) {
          const currentProj = projects.find((item) => item.id === targetId);
          if (currentProj?.draft) {
            baselineDraftRef.current = createDraftSnapshot(currentProj.draft);
            userEditedDraftRef.current = false;
          }
          suppressDbSaveRef.current = false;
          return;
        }

        // Basic shape guard: draft must be a non-null object
        if (typeof result.draft !== "object" || Array.isArray(result.draft)) {
          console.warn("[DB hydrate] draft is not an object, skipping");
          const currentProj = projects.find((item) => item.id === targetId);
          if (currentProj?.draft) {
            baselineDraftRef.current = createDraftSnapshot(currentProj.draft);
            userEditedDraftRef.current = false;
          }
          suppressDbSaveRef.current = false;
          return;
        }

        const dbDraft = result.draft as Record<string, unknown>;
        // Minimum sanity: must have an overview field
        if (!dbDraft.overview || typeof dbDraft.overview !== "object") {
          console.warn("[DB hydrate] draft.overview missing or invalid, skipping");
          const currentProj = projects.find((item) => item.id === targetId);
          if (currentProj?.draft) {
            baselineDraftRef.current = createDraftSnapshot(currentProj.draft);
            userEditedDraftRef.current = false;
          }
          suppressDbSaveRef.current = false;
          return;
        }

        // Avoid re-hydrating same version
        const hydrateKey = `${targetId}:${result.version ?? 0}`;
        if (dbHydratedRef.current === hydrateKey) {
          // Already hydrated this version — still ensure baseline is set
          const currentProj = projects.find((item) => item.id === targetId);
          if (currentProj?.draft) {
            baselineDraftRef.current = createDraftSnapshot(currentProj.draft);
            userEditedDraftRef.current = false;
          }
          suppressDbSaveRef.current = false;
          return;
        }

        // Merge DB draft into project record
        setProjects((prev) => {
          const idx = prev.findIndex((item) => item.id === targetId);

          if (idx !== -1) {
            // Project exists locally — merge DB draft into it
            const existing = prev[idx];
            const localOverview = existing.draft.overview as Record<string, unknown> | undefined;
            const dbOverview = dbDraft.overview as Record<string, unknown> | undefined;
            const resolvedOverview = hasMeaningfulOverview(localOverview) && isEmptyOverviewShell(dbOverview)
              ? existing.draft.overview
              : ({ ...existing.draft.overview, ...(dbOverview ?? {}) } as OriginalDraft["overview"]);
            const merged: ProjectRecord = {
              ...existing,
              title: (dbDraft.title as string) ?? existing.title,
              draft: {
                ...existing.draft,
                ...(dbDraft as unknown as OriginalDraft),
                overview: resolvedOverview,
              },
              updatedAt: result.updatedAt ?? existing.updatedAt,
            };
            const safeMerged = normalizeProjectRecord(merged);
            // Set baseline directly inside updater where we have the draft
            baselineDraftRef.current = createDraftSnapshot(safeMerged.draft);
            userEditedDraftRef.current = false;
            const next = [...prev];
            next[idx] = safeMerged;
            safeSetLocalStorageItem(PROJECTS_STORAGE_KEY, JSON.stringify(next));
            return next;
          }

          // Project NOT in localStorage — create from DB draft
          const restored: ProjectRecord = createProjectRecord({
            id: targetId,
            title: (dbDraft.title as string) ?? "未命名项目",
            sourceMode: "idea",
            draft: {
              ...(dbDraft as unknown as OriginalDraft),
            },
            updatedAt: result.updatedAt ?? new Date().toISOString(),
          });
          // Set baseline directly inside updater where we have the draft
          baselineDraftRef.current = createDraftSnapshot(restored.draft);
          const next = [restored, ...prev];
          safeSetLocalStorageItem(PROJECTS_STORAGE_KEY, JSON.stringify(next));
          // Also set as current project
          setCurrentProjectId(targetId);
          safeSetLocalStorageItem(CURRENT_PROJECT_ID_STORAGE_KEY, targetId);
          return next;
        });

        dbHydratedRef.current = hydrateKey;
        setSaveLabel("已从云端同步");
        // Allow DB saves after hydrate settles
        setTimeout(() => { suppressDbSaveRef.current = false; }, 2000);
      } catch (err) {
        console.warn(
          "[DB hydrate] failed:",
          err instanceof Error ? err.message : String(err),
        );
        // Cancelled: do not touch any state
        if (cancelled) {
          return;
        }
        // Set baseline from current draft on failure
        const currentProj = projects.find((item) => item.id === targetId);
        if (currentProj?.draft) {
          baselineDraftRef.current = createDraftSnapshot(currentProj.draft);
        }
        suppressDbSaveRef.current = false;
      }
    })();

    return () => { cancelled = true; };
  }, [projectId, currentProjectId, isAuthenticated, projects]);

  // Hydrate episodeReasoning from draft generationTrace on project load
  useEffect(() => {
    const traceThinking = currentProject?.draft?.generationTrace?.episodeThinking;
    if (traceThinking && Object.keys(traceThinking).length > 0) {
      const parsed: Record<number, string> = {};
      for (const [k, v] of Object.entries(traceThinking)) {
        const ep = Number(k);
        if (Number.isFinite(ep) && v) parsed[ep] = v;
      }
      setEpisodeReasoning((prev) => {
        // Only hydrate if empty (don't overwrite in-flight generation data)
        if (Object.keys(prev).length > 0) return prev;
        return parsed;
      });
      episodeReasoningRef.current = parsed;
    }
  }, [currentProject?.draft?.generationTrace?.episodeThinking]);

  // Auto-show thinking panel when generating
  useEffect(() => {
    if (isGenerating === "script" || isBatchGenerating) {
      setThinkingPanelOpen(true);
    }
  }, [isGenerating, isBatchGenerating]);

  const draft = currentProject?.draft ?? { ...INITIAL_DRAFT, title: "未命名项目" };

  // Keep latestProjectRef in sync for DB save
  latestProjectRef.current = currentProject ?? null;
  const versionHistory: StepVersionHistory =
    currentProject?.versionHistory ?? EMPTY_VERSION_HISTORY;
  const providerConfig: ModelProviderConfig = mergeProviderConfig(
    currentProject?.providerConfig,
  );

  useEffect(() => {
    let cancelled = false;
    if (!sessionUser?.email) {
      setDebugInspectorEnabled(false);
      return;
    }

    if (!cancelled) {
      setDebugInspectorEnabled(false);
    }

    return () => {
      cancelled = true;
    };
  }, [sessionUser?.email]);

  const updateProject = (
    updater: (current: ProjectRecord) => ProjectRecord,
    label?: string,
    opts?: { userEdited?: boolean },
  ) => {
    if (!currentProject) return;
    // Mark user-edited flag before state update so shouldConfirmBeforeLeaving reads latest
    if (opts?.userEdited) {
      userEditedDraftRef.current = true;
    }
    let updatedProject: ProjectRecord | null = null;

    setProjects((current) => {
      const nextProjects = current.map((item) => {
        if (item.id === currentProject.id) {
          updatedProject = updater(item);
          return updatedProject;
        }
        return item;
      });
      return nextProjects;
    });

    if (updatedProject) {
      scheduleDraftSave(updatedProject);
    }

    if (label) {
      setSaveLabel(label);
    } else {
      setSaveLabel(
        `项目已保存 · ${new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      );
    }
  };

  const updateDraft = (updater: (current: OriginalDraft) => OriginalDraft, opts?: { userEdited?: boolean }) => {
    updateProject((current) => {
      const nextDraft = updater(current.draft);
      // Only sync project.title when draft.title actually changed,
      // to avoid overwriting a user-edited project title with a stale draft.title.
      const nextTitle = nextDraft.title !== current.draft.title ? nextDraft.title : current.title;

      return {
        ...current,
        draft: nextDraft,
        title: nextTitle,
        updatedAt: new Date().toISOString(),
      };
    }, undefined, opts?.userEdited ? { userEdited: true } : undefined);
  };

  // Persist only the project title (not the full draft)
  const persistTitle = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    if (!currentProject) return;

    // Update local state
    setProjects((current) =>
      current.map((item) =>
        item.id === currentProject.id
          ? { ...item, title: trimmed, draft: { ...item.draft, title: trimmed }, updatedAt: new Date().toISOString() }
          : item,
      ),
    );
    setSavedTitle(trimmed);

    // Update project title via API (don't trigger full draft save)
    if (isAuthenticated) {
      try {
        await apiUpdateProject(currentProject.id, { title: trimmed });
      } catch {
        setSaveError("标题保存失败");
      }
    }
  };

  const handleTitleBlur = async () => {
    const trimmed = editingTitle.trim();
    if (!trimmed || trimmed === savedTitle) {
      setEditingTitle(savedTitle);
      return;
    }
    await persistTitle(trimmed);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setEditingTitle(savedTitle);
      (e.target as HTMLInputElement).blur();
    }
  };

  const buildAndUpsertScriptQualityReport = (
    sourceDraft: OriginalDraft,
    options: {
      projectId?: string;
      now?: string;
      maxIssues?: number;
      maxReports?: number;
      source?: "dev_manual" | "manual" | "auto" | "server";
      mode?: "local_static_rules" | "model_assisted" | "server_audit";
    } = {},
  ) => {
    const report = buildScriptQualityReport({
      projectId: options.projectId,
      scriptType:
        sourceDraft.overview.scriptType === "ai_comic"
          ? "ai_comic"
          : "short_drama",
      overview: {
        title: sourceDraft.title,
        premise: sourceDraft.overview.premise,
        projectBrief: sourceDraft.overview.projectBrief,
        scriptPlan: sourceDraft.overview.scriptPlan,
      },
      outlines: {
        episodesStructured: sourceDraft.outlines.episodesStructured,
        beatCards: sourceDraft.outlines.beatCards,
        originalPhaseRanges: sourceDraft.outlines.originalPhaseRanges,
      },
      script: {
        currentText: sourceDraft.script.content,
        batches: sourceDraft.script.batches,
      },
      maxIssues: options.maxIssues,
      now: options.now,
      source: options.source,
      mode: options.mode,
    });

    const priorReports = Array.isArray(sourceDraft.qualityReports)
      ? sourceDraft.qualityReports
      : [];
    const retainedReports = priorReports.filter(
      (item) => item.stage !== report.stage,
    );
    const nextQualityReports = [report, ...retainedReports]
      .slice()
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      )
      .slice(0, options.maxReports ?? 8);

    return {
      ...sourceDraft,
      qualityReports: nextQualityReports,
    };
  };

  const handleGenerateQualityHint = () => {
    if (!currentProject) return;

    const nextDraft = buildAndUpsertScriptQualityReport(draft, {
      projectId: currentProject.id,
      now: new Date().toISOString(),
      maxIssues: 8,
      maxReports: 8,
      source: "dev_manual",
      mode: "local_static_rules",
    });

    updateDraft(() => nextDraft);
  };

  // ── Safe normalized overview for rendering ──
  const safeOverview = {
    ...draft.overview,
    audience: safeStr(draft.overview.audience),
    genres: normalizeStringArray(draft.overview.genres),
    coreHooks: normalizeStringArray(draft.overview.coreHooks),
    styleTags: normalizeStringArray(draft.overview.styleTags),
    audiences: normalizeStringArray(draft.overview.audiences),
    storyBackground: safeStr(draft.overview.storyBackground),
    worldview: safeStr(draft.overview.worldview),
    highlight: safeStr(draft.overview.highlight),
    premise: safeStr(draft.overview.premise),
    eraOrWorldType: safeStr(draft.overview.eraOrWorldType),
  };

  useEffect(() => {
    if (!debugInspectorEnabled || typeof window === "undefined") {
      setDataFlowSnapshot(null);
      return;
    }
    try {
      const raw = window.localStorage.getItem(ORIGINAL_DATA_FLOW_DEBUG_KEY);
      setDataFlowSnapshot(raw ? JSON.parse(raw) as OriginalDataFlowSnapshot : null);
    } catch {
      setDataFlowSnapshot(null);
    }
  }, [debugInspectorEnabled, currentProjectId, draft.overview.genres, draft.overview.projectBrief?.genres]);

  const inheritedScenarioTitle = draft.title;

  useEffect(() => {
    safeSetLocalStorageItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    safeSetLocalStorageItem(CURRENT_PROJECT_ID_STORAGE_KEY, resolvedProjectId);
  }, [resolvedProjectId]);

  // ── Tab change confirmation ──
  const handleChangeStep = async (nextStep: OriginalStep) => {
    if (nextStep === activeStep) return;
    if (!shouldConfirmTabChange()) {
      setActiveStep(nextStep);
      return;
    }
    if (!window.confirm("当前有未保存的修改，是否保存并切换？")) {
      return;
    }
    const project = latestProjectRef.current ?? currentProject;
    if (!project?.id) {
      setActiveStep(nextStep);
      return;
    }
    const saved = await flushDraftSave(project);
    if (saved) {
      // Clear dirty state after successful save, then switch
      userEditedDraftRef.current = false;
      const latest = latestProjectRef.current ?? project;
      if (latest?.draft) {
        baselineDraftRef.current = createDraftSnapshot(latest.draft);
      }
      setActiveStep(nextStep);
    }
    // On save failure: keep dirty state, don't switch tab
    // saveError is already set by flushDraftSave
  };

  // ── Navigation confirmation (return to list, new project, etc.) ──
  const confirmAndNavigate = (action: () => void) => {
    if (!shouldConfirmBeforeLeaving()) {
      action();
      return;
    }
    let message = "当前有未保存的修改，是否离开？";
    if (isDbSaving) {
      message = "正在保存中，离开可能丢失修改，是否继续？";
    } else if (saveError) {
      message = "自动保存失败，离开可能丢失修改，是否继续？";
    }
    if (window.confirm(message)) {
      action();
    }
  };

  // ── beforeunload: page close/refresh confirmation ──
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Read from ref to avoid stale closure
      if (!shouldConfirmRef.current) return;
      e.preventDefault();
      // Modern browsers ignore custom message, but legacy requires it
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ── Cleanup: flush pending DB save on unmount ──
  useEffect(() => {
    return () => {
      if (dbSaveTimerRef.current) {
        clearTimeout(dbSaveTimerRef.current);
        dbSaveTimerRef.current = null;
      }
      // Best-effort flush on unmount
      const latest = latestProjectRef.current;
      if (isAuthenticated && latest?.id) {
        flushDraftSave(latest);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCharacter = useMemo(
    () =>
      draft.characters.find((item) => item.id === selectedCharacterId) ??
      draft.characters[0],
    [draft.characters, selectedCharacterId],
  );

  const overviewDone = [
    safeOverview.audience,
    safeOverview.genres.length > 0 ? "filled" : "",
    safeOverview.coreHooks.length > 0 ? "filled" : "",
    safeOverview.styleTags.length > 0 ? "filled" : "",
    safeOverview.worldview,
    safeOverview.highlight,
    safeOverview.premise,
  ].filter(Boolean).length;
  const adaptation = draft.adaptation?.status === "applied" ? draft.adaptation : null;
  const adaptationSourceSections = draft.outlines.sourceSections;
  const canGenerateFromSourceOutline = Boolean(adaptation && adaptationSourceSections);
  const isAdaptationProject = Boolean(adaptation);
  const adaptationTargetMarket = adaptation?.targetMarket ?? "北美";
  const adaptationMarketBadgeText = isAdaptationProject
    ? adaptationTargetMarket === "中国"
      ? "[改编版 · 中国]"
      : `[海外版 · ${adaptationTargetMarket}]`
    : "";
  const characterGenerationButtonLabel = isAdaptationProject
    ? adaptationTargetMarket === "中国"
      ? "生成改编版人物"
      : "生成区域版人物"
    : "生成人物小传";
  const adaptationCharacterHint = isAdaptationProject
    ? adaptationTargetMarket === "中国"
      ? "当前为中国短剧正常改编：人物生成将默认保留原角色名和原设定，只强化短剧人物欲望、关系张力、冲突功能和阶段成长。"
      : "当前为上传大纲改编项目：人物生成将优先保留原大纲角色功能，并根据目标市场生成命名、身份、阵营和关系钩子。"
    : "";

  const patchCharacter = (patch: Partial<Character>) => {
    if (!selectedCharacter) return;

    updateDraft((current) => ({
      ...attachLeadAnchorsIfNeeded({
        ...current,
        characters: current.characters.map((item) =>
          item.id === selectedCharacter.id ? { ...item, ...patch } : item,
        ),
      }),
    }), { userEdited: true });
  };

  const createEmptyCharacter = (): Character => ({
    id: `character-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    role: "信息角色",
    gender: "unknown",
    age: 0,
    traits: "",
    background: "",
    relationToMaleLead: "unknown",
    relationToFemaleLead: "unknown",
    relationshipTags: [],
  });

  const attachLeadAnchorsIfNeeded = (nextDraft: OriginalDraft): OriginalDraft => {
    if (nextDraft.adaptation?.status !== "applied") return nextDraft;
    return {
      ...nextDraft,
      adaptation: {
        ...nextDraft.adaptation,
        leadAnchors: resolveCharacterLeadAnchors(nextDraft),
      },
    };
  };

  const hasCharacterContent = (character: Character) =>
    [character.name, character.role, character.traits, character.background].some(
      (value) => String(value ?? "").trim().length > 0,
    ) || Number(character.age) > 0;

  const addCharacter = () => {
    const nextCharacter = createEmptyCharacter();
    updateDraft((current) => ({
      ...attachLeadAnchorsIfNeeded({
        ...current,
        characters: [...current.characters, nextCharacter],
      }),
    }), { userEdited: true });
    setSelectedCharacterId(nextCharacter.id);
  };

  const deleteCharacter = (characterId: string) => {
    const target = draft.characters.find((item) => item.id === characterId);
    if (!target) return;

    if (hasCharacterContent(target)) {
      const confirmed = window.confirm("确定要删除这个角色吗？删除后无法恢复。");
      if (!confirmed) return;
    }

    let nextSelectedId = "";
    updateDraft((current) => {
      const currentCharacters = current.characters;
      const currentIndex = currentCharacters.findIndex((item) => item.id === characterId);
      const nextCharacters = currentCharacters.filter((item) => item.id !== characterId);
      const resolvedCharacters = nextCharacters.length > 0 ? nextCharacters : [createEmptyCharacter()];
      nextSelectedId =
        resolvedCharacters[currentIndex]?.id ??
        resolvedCharacters[Math.max(0, currentIndex - 1)]?.id ??
        resolvedCharacters[0]?.id ??
        "";

      return {
        ...attachLeadAnchorsIfNeeded({
          ...current,
          characters: resolvedCharacters,
        }),
      };
    }, { userEdited: true });
    setSelectedCharacterId(nextSelectedId);
  };

  const currentVersionStep: OriginalStep =
    activeStep === "settings" ? "overview" : activeStep;
  const streamingPatch =
    isGenerating && streamPreview ? parseOriginalStreamStep(isGenerating, streamPreview) : null;
  const previewOverview =
    isGenerating === "overview" && streamingPatch?.overview
      ? {
          ...safeOverview,
          ...streamingPatch.overview as Partial<typeof safeOverview>,
          genres: normalizeStringArray((streamingPatch.overview as Record<string, unknown>)?.genres ?? safeOverview.genres),
          coreHooks: normalizeStringArray((streamingPatch.overview as Record<string, unknown>)?.coreHooks ?? safeOverview.coreHooks),
          styleTags: normalizeStringArray((streamingPatch.overview as Record<string, unknown>)?.styleTags ?? safeOverview.styleTags),
          audiences: normalizeStringArray((streamingPatch.overview as Record<string, unknown>)?.audiences ?? safeOverview.audiences),
          audience: safeStr((streamingPatch.overview as Record<string, unknown>)?.audience ?? safeOverview.audience),
          storyBackground: safeStr((streamingPatch.overview as Record<string, unknown>)?.storyBackground ?? safeOverview.storyBackground),
          worldview: safeStr((streamingPatch.overview as Record<string, unknown>)?.worldview ?? safeOverview.worldview),
          highlight: safeStr((streamingPatch.overview as Record<string, unknown>)?.highlight ?? safeOverview.highlight),
          premise: safeStr((streamingPatch.overview as Record<string, unknown>)?.premise ?? safeOverview.premise),
          eraOrWorldType: safeStr((streamingPatch.overview as Record<string, unknown>)?.eraOrWorldType ?? safeOverview.eraOrWorldType),
        }
      : safeOverview;
  const resolvedOverviewScriptType = inferStudioScriptType(previewOverview, currentFormat);
  const projectBrief = previewOverview.projectBrief ?? createDefaultProjectBrief(resolvedOverviewScriptType);
  const normalizedStudioProjectBrief = normalizeProjectBriefForStudio(projectBrief);
  const projectBriefEpisodeCount = normalizeEpisodeCountValue(projectBrief.episodeCount);
  const projectBriefEpisodeDurationMinutes = parseEpisodeDurationMinutes(projectBrief.episodeDuration);
  const projectBriefWordTarget = nearestOption(projectBrief.targetWordsPerEpisode, TARGET_WORD_OPTIONS, 500);
  const studioCharacterRosterInfo = draft.adaptation?.status === "applied" ? resolveCharacterRosterInfo(draft) : null;
  const projectBriefCharacterLimit = studioCharacterRosterInfo?.requiredCharacterCount
    ?? nearestOption(projectBrief.mainCharactersLimit, MAIN_CHARACTER_OPTIONS, 6);
  const projectBriefCharacterLimitLabel = studioCharacterRosterInfo
    ? `主要人物上限（原文识别 ${studioCharacterRosterInfo.requiredCharacterCount} 人）`
    : "主要人物上限";
  const projectBriefSceneLimit = nearestOption(projectBrief.sceneLimitPerEpisode, SCENE_LIMIT_OPTIONS, 3);
  const currentGenres = getCurrentGenres();
  const currentCoreHooks = getCurrentCoreHooks();
  const currentStyleTags = getCurrentStyleTags();
  const emptyText = "暂未生成";
  const overviewPageTitle =
    inheritedScenarioTitle?.trim() ||
    draft.title?.trim() ||
    currentProject?.title?.trim() ||
    "当前草稿";

  // projectTitle: the authoritative project name for the top bar.
  // currentProject.title is the source of truth; fallback to draft.title only when unset.
  const projectTitle =
    currentProject?.title?.trim() ||
    draft.title?.trim() ||
    "未命名项目";

  // Sync editingTitle with savedTitle when project changes
  useEffect(() => {
    setSavedTitle(projectTitle);
    setEditingTitle(projectTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // Generate a local candidate title based on current draft fields
  const generateProjectTitleCandidate = (
    draft: OriginalDraft,
    scriptType: ScriptType,
    currentTitle: string,
  ): string => {
    const clean = (s: string): string =>
      s
        .replace(/主标题[：:]\s*/g, "")
        .replace(/副标题[：:]\s*/g, "")
        .replace(/剧名[：:]\s*/g, "")
        .replace(/标题[：:]\s*/g, "")
        .replace(/[""「」『』]/g, "")
        .replace(/待确认|未填写|通用/g, "")
        .replace(/[\n\r]+/g, "")
        .trim();

    const extractTitle = (text: string): string | null => {
      const m = text.match(/(?:主标题|剧名|标题)[：:]\s*(.+?)(?:[。，,.\n]|$)/);
      if (m?.[1]) return clean(m[1]);
      return null;
    };

    const isGood = (s: string): boolean => {
      const len = [...s].length; // unicode-aware length
      return len >= 2 && len <= 24 && !/^(待确认|未填写|通用|暂无|无)$/.test(s);
    };

    const trimToMax = (s: string, max: number): string => {
      const chars = [...s];
      if (chars.length <= max) return s;
      return chars.slice(0, max).join("");
    };

    const candidates: string[] = [];

    // 1. Extract title from premise / highlight / userPremise
    const premiseSources = [
      draft.overview.premise,
      draft.overview.coreSynopsis,
      draft.overview.highlight,
      draft.overview.userPremise,
    ];
    for (const src of premiseSources) {
      if (typeof src === "string" && src.trim()) {
        const extracted = extractTitle(src);
        if (extracted && isGood(extracted)) candidates.push(extracted);
      }
    }

    // 2. Compose from coreHooks + genres
    const hooks = Array.isArray(draft.overview.coreHooks) ? draft.overview.coreHooks.filter((h): h is string => typeof h === "string" && h.trim().length > 0) : [];
    const genres = Array.isArray(draft.overview.genres) ? draft.overview.genres.filter((g): g is string => typeof g === "string" && g.trim().length > 0) : [];

    if (hooks.length > 0 && genres.length > 0) {
      const combo = `${hooks[0]} · ${genres[0]}`;
      if (isGood(combo)) candidates.push(combo);
    }

    if (hooks.length > 0) {
      if (isGood(hooks[0])) candidates.push(hooks[0]);
    }

    // 3. eraBackground / worldview short field
    const worldview = typeof draft.overview.worldview === "string" ? draft.overview.worldview.trim() : "";
    if (worldview && isGood(worldview)) candidates.push(worldview);

    const storyBackground = typeof draft.overview.storyBackground === "string" ? draft.overview.storyBackground.trim() : "";
    if (storyBackground && isGood(storyBackground)) candidates.push(storyBackground);

    // 4. character name
    const chars = draft.characters ?? [];
    if (Array.isArray(chars) && chars.length > 0) {
      const firstChar = chars[0];
      const name = typeof firstChar?.name === "string" ? firstChar.name.trim() : "";
      if (name && isGood(name)) candidates.push(name);
    }

    if (candidates.length === 0) {
      return currentTitle || "未命名项目";
    }

    // Pick based on scriptType flavor — but just pick the first valid candidate
    const picked = candidates.find((c) => {
      const len = [...c].length;
      return len >= 2 && len <= 24;
    }) ?? candidates[0];

    return trimToMax(picked, 24);
  };

  const handleRegenerateTitle = async () => {
    const candidate = generateProjectTitleCandidate(draft, resolvedOverviewScriptType, savedTitle);
    setEditingTitle(candidate);
    await persistTitle(candidate);
  };
  const appliedAdaptation = draft.adaptation?.status === "applied" ? draft.adaptation : null;
  const scriptBodyLabel = appliedAdaptation
    ? `剧本正文 [${appliedAdaptation.targetMarket === "中国" ? "改编版 · 中国" : `海外版 · ${appliedAdaptation.targetMarket}`}]`
    : "剧本正文";

  // 分集标题来源优先级：
  // 1. episodesStructured[ep].title
  // 2. 正文第一行 "第N集：标题" 或 "第N集 标题"
  // 3. outlines.episodes[ep-1] 解析标题
  // 4. "未命名"
  const getEpisodeTitle = (ep: number): string => {
    const epPlan = draft.outlines.episodesStructured?.find(
      (e) => e.episodeNumber === ep,
    );
    if (epPlan?.title?.trim()) return epPlan.title.trim();

    const content =
      draft.episodeScripts?.[String(ep)]?.content
      ?? (ep === 1 ? draft.script.content : "");
    if (content?.trim()) {
      const firstLine = content.trim().split(/\n/)[0].trim();
      const m1 = firstLine.match(/^第\s*\d+\s*集[：:]\s*(.+)/);
      if (m1?.[1]?.trim()) return m1[1].trim();
      const m2 = firstLine.match(/^第\s*\d+\s*集\s+(.+)/);
      if (m2?.[1]?.trim() && m2[1].trim().length <= 30) return m2[1].trim();
    }

    const epOutline = draft.outlines.episodes?.[ep - 1];
    if (epOutline?.trim()) {
      const m1 = epOutline.match(/^第\s*\d+\s*集[：:]\s*(.+)/);
      if (m1?.[1]?.trim()) return m1[1].trim();
      const firstLine = epOutline.trim().split(/\n/)[0].trim();
      if (firstLine && firstLine.length <= 20) return firstLine;
    }

    return "未命名";
  };
  const overviewWorldField = resolvedOverviewScriptType === "ai_comic"
    ? (previewOverview.worldview.trim() || summarizeWorldviewFromStoryBackground(previewOverview.storyBackground))
    : (previewOverview.storyBackground.trim() || previewOverview.worldview.trim());
  const overviewWorldFieldLabel = resolvedOverviewScriptType === "ai_comic" ? "世界观（选填）" : "故事背景（选填）";
  const audienceOptions = getAudienceOptionsForScriptType(resolvedOverviewScriptType);
  const storyAudienceDisplayValue = resolveStoryAudienceDisplayValue({
    audiences: previewOverview.audiences,
    audience: previewOverview.audience,
    audienceType: previewOverview.projectBrief?.audienceType,
    targetAudience: previewOverview.scriptPlan?.targetAudience,
    scriptType: resolvedOverviewScriptType,
  });
  const storyEraValue = resolvedOverviewScriptType === "short_drama"
    ? resolveShortDramaEraDisplayValue({
        eraOrWorldType: previewOverview.eraOrWorldType,
        displayEras: previewOverview.displayTagGroups?.era,
        storyBackground: previewOverview.storyBackground,
        worldview: previewOverview.worldview,
      })
    : "";
  const normalizeShortDramaEraSelectionValues = (items?: Array<string | undefined | null>) =>
    Array.from(
      new Set(
        (items ?? [])
          .map((item) => normalizeShortDramaEraDisplay((item ?? "").trim()))
          .filter(Boolean),
      ),
    ).slice(0, 3);
  const storyEraValues = resolvedOverviewScriptType === "short_drama"
    ? normalizeShortDramaEraSelectionValues(
        previewOverview.displayTagGroups?.era?.length
          ? previewOverview.displayTagGroups.era
          : storyEraValue
            ? [storyEraValue]
            : [],
      )
    : [];
  const storyGenreOptions = currentGenres.flatMap((category) => category.groups.flatMap((group) => group.tags));
  const storyGenreValues = previewOverview.genres;
  const storyCoreHookValues = previewOverview.coreHooks;
  const storyStyleValues = previewOverview.styleTags;
  const storyStyleOptions = currentStyleTags.flatMap((category) => category.groups.flatMap((group) => group.tags));
  useEffect(() => {
    setCurrentFormat(resolvedOverviewScriptType);
  }, [resolvedOverviewScriptType]);
  useEffect(() => {
    if (!currentProject || resolvedOverviewScriptType !== "short_drama") return;
    const nextWorldview = previewOverview.worldview.trim() || summarizeWorldviewFromStoryBackground(previewOverview.storyBackground);
    const nextEra = storyEraValues;
    const currentDisplayEra = normalizeShortDramaEraSelectionValues(currentProject.draft.overview.displayTagGroups?.era);
    const currentEraValue = normalizeShortDramaEraDisplay(currentProject.draft.overview.eraOrWorldType ?? "");
    const shouldPatchWorldview = Boolean(nextWorldview && !currentProject.draft.overview.worldview?.trim());
    const shouldPatchEra = Boolean(
      nextEra.length > 0 && (
        !currentEraValue ||
        currentEraValue !== nextEra[0] ||
        currentDisplayEra.length !== nextEra.length ||
        currentDisplayEra.some((item, index) => item !== nextEra[index])
      ),
    );
    if (!shouldPatchWorldview && !shouldPatchEra) return;

    updateProject((current) => ({
      ...current,
      draft: {
        ...current.draft,
        overview: {
          ...current.draft.overview,
          worldview: shouldPatchWorldview ? nextWorldview : current.draft.overview.worldview,
          eraOrWorldType: shouldPatchEra ? (nextEra[0] ?? "") : current.draft.overview.eraOrWorldType,
          displayTagGroups: shouldPatchEra
            ? {
                audience: current.draft.overview.displayTagGroups?.audience ?? [],
                era: nextEra,
                genres: current.draft.overview.displayTagGroups?.genres ?? [],
                coreSettings: current.draft.overview.displayTagGroups?.coreSettings ?? [],
                styleElements: current.draft.overview.displayTagGroups?.styleElements ?? [],
              }
            : current.draft.overview.displayTagGroups,
        },
      },
      updatedAt: new Date().toISOString(),
    }));
  }, [
    currentProject,
    previewOverview.storyBackground,
    previewOverview.worldview,
    resolvedOverviewScriptType,
    storyEraValues,
    updateProject,
  ]);
  useEffect(() => {
    if (!currentProject) return;
    const serializedCurrent = JSON.stringify(projectBrief);
    const serializedNormalized = JSON.stringify(normalizedStudioProjectBrief);
    if (serializedCurrent === serializedNormalized) return;
    updateProject((current) => ({
      ...current,
      draft: {
        ...current.draft,
        overview: {
          ...current.draft.overview,
          projectBrief: normalizedStudioProjectBrief,
        },
      },
      title: current.draft.title,
      updatedAt: new Date().toISOString(),
    }));
  }, [currentProject, normalizedStudioProjectBrief, projectBrief]);
  useEffect(() => {
    if (!currentProject) return;
    const currentTarget = currentProject.outlineConstraints?.targetEpisodeCount;
    if (currentTarget === projectBriefEpisodeCount) return;

    updateProject((current) => ({
      ...current,
      outlineConstraints: {
        ...(current.outlineConstraints ?? DEFAULT_OUTLINE_CONSTRAINTS),
        targetEpisodeCount: projectBriefEpisodeCount,
      },
      title: current.draft.title,
      updatedAt: new Date().toISOString(),
    }));
  }, [currentProject, projectBriefEpisodeCount]);
  const commitEpisodeCount = (nextEpisodeCount: number) => {
    const normalizedEpisodeCount = normalizeEpisodeCountValue(nextEpisodeCount);
    updateProject((current) => {
      const currentDraft = current.draft;
      const currentProjectBrief =
        currentDraft.overview.projectBrief ?? createDefaultProjectBrief(currentDraft.overview.scriptType);

      return {
        ...current,
        outlineConstraints: {
          ...(current.outlineConstraints ?? DEFAULT_OUTLINE_CONSTRAINTS),
          targetEpisodeCount: normalizedEpisodeCount,
        },
        draft: {
          ...currentDraft,
          overview: {
            ...currentDraft.overview,
            projectBrief: {
              ...currentProjectBrief,
              episodeCount: normalizedEpisodeCount,
            },
          },
        },
        title: currentDraft.title,
        updatedAt: new Date().toISOString(),
      };
    }, `集数已更新为 ${normalizedEpisodeCount} 集`, { userEdited: true });
  };
  const commitProjectBriefField = <
    K extends "episodeDuration" | "targetWordsPerEpisode" | "mainCharactersLimit" | "sceneLimitPerEpisode"
  >(key: K, value: NonNullable<ProjectRecord["draft"]["overview"]["projectBrief"]>[K], saveText: string) => {
    updateProject((current) => {
      const currentDraft = current.draft;
      const currentProjectBrief =
        currentDraft.overview.projectBrief ?? createDefaultProjectBrief(currentDraft.overview.scriptType);
      return {
        ...current,
        draft: {
          ...currentDraft,
          overview: {
            ...currentDraft.overview,
            projectBrief: {
              ...currentProjectBrief,
              [key]: value,
            },
          },
        },
        title: currentDraft.title,
        updatedAt: new Date().toISOString(),
      };
    }, saveText, { userEdited: true });
  };
  const qualityReferenceAssets = useMemo(() => {
    if (!ENABLE_QUALITY_REFERENCE_PANEL) return null;

    return selectQualityAssetsForOriginal({
      scriptType: projectBrief.scriptType,
      genres: Array.isArray(projectBrief.genres) ? projectBrief.genres : [],
      commercialMode: "unknown",
      riskTolerance: "low",
    });
  }, [projectBrief.genres, projectBrief.scriptType]);
  const aggregatedQualityRiskTags = useMemo(() => {
    if (!qualityReferenceAssets) return [];
    const seen = new Set<string>();
    const tags: string[] = [];

    const pushTags = (values: string[] | undefined) => {
      for (const tag of values ?? []) {
        if (!seen.has(tag)) {
          seen.add(tag);
          tags.push(tag);
        }
      }
    };

    for (const item of qualityReferenceAssets.recommendations.slice(0, 3)) pushTags(item.riskTags);
    for (const item of qualityReferenceAssets.rules.slice(0, 5)) pushTags(getRuleRiskTags(item));
    for (const item of qualityReferenceAssets.breakdowns.slice(0, 3)) pushTags(item.riskTags);

    return tags.slice(0, 3);
  }, [qualityReferenceAssets]);
  const previewCharacters =
    isGenerating === "characters" && streamingPatch?.characters?.length
      ? streamingPatch.characters
      : draft.characters;
  const previewSelectedCharacter =
    previewCharacters.find((item) => item.id === selectedCharacterId) ?? previewCharacters[0];
  const rawPreviewOutlines =
    isGenerating === "outlines" && streamingPatch?.outlines
      ? { ...draft.outlines, ...streamingPatch.outlines, range: draft.outlines.range }
      : draft.outlines;
  const previewOutlines = {
    ...rawPreviewOutlines,
    macro: sanitizeOutlineMacro(rawPreviewOutlines.macro),
  };
  const episodeCountForScript =
    typeof projectBriefEpisodeCount === "number" && Number.isFinite(projectBriefEpisodeCount)
      ? Math.max(1, Math.trunc(projectBriefEpisodeCount))
      : 60;
  const clampedSelectedScriptEpisode = Math.min(
    Math.max(1, selectedScriptEpisode),
    episodeCountForScript,
  );
  const selectedScriptKey = String(clampedSelectedScriptEpisode);
  const fallbackSelectedScript = {
    episode: `第${clampedSelectedScriptEpisode}集`,
    content: "",
    batches: [],
  };
  const selectedEpisodeScript =
    draft.episodeScripts?.[selectedScriptKey]
    ?? (clampedSelectedScriptEpisode === 1 ? draft.script : undefined)
    ?? fallbackSelectedScript;
  const previewScript =
    (isGenerating === "script" || isBatchGenerating) && streamingPatch?.script
      ? { ...selectedEpisodeScript, ...streamingPatch.script }
      : selectedEpisodeScript;

  const hasCurrentEpisodeScript =
    (selectedEpisodeScript.content?.trim()?.length ?? 0) > 0;

  // ── 批量生成辅助：计算待生成正文的集数（最多 count 集）──
  const getNextPendingScriptEpisodes = (d: OriginalDraft, count = 5): number[] => {
    const outlineEpisodeCount = d.outlines.episodes?.length ?? 0;
    if (outlineEpisodeCount === 0) return [];
    const maxEpisode = Math.min(episodeCountForScript, outlineEpisodeCount);
    const result: number[] = [];
    for (let ep = 1; ep <= maxEpisode && result.length < count; ep++) {
      const key = String(ep);
      const script = d.episodeScripts?.[key] ?? (ep === 1 ? d.script : undefined);
      const hasContent = (script?.content?.trim()?.length ?? 0) > 0;
      if (!hasContent) result.push(ep);
    }
    return result;
  };

  const createNewProject = () => {
    setNewProjectScriptType("short_drama");
    setShowScriptTypeModal(true);
  };

  const confirmCreateNewProject = async () => {
    setShowScriptTypeModal(false);
    const title = `新剧本项目 ${projects.length + 1}`;
    if (isAuthenticated) {
      try {
        const apiProject = await apiCreateProject(title);
        const project = createProjectRecord({
          id: apiProject.id,
          title,
          draft: {
            ...INITIAL_DRAFT,
            title,
            overview: {
              ...INITIAL_DRAFT.overview,
              scriptType: newProjectScriptType,
            },
          },
        });
        // 立即写入 ProjectDraft，确保换设备可恢复
        const saved = await saveProjectDraft(apiProject.id, project.draft, "original");
        if (!saved) {
          console.error("[original-studio] saveProjectDraft failed for new project", apiProject.id);
          setErrorMessage("项目创建成功，但草稿保存失败，请稍后重试");
          return;
        }
        const all = loadProjects();
        safeSetLocalStorageItem(PROJECTS_STORAGE_KEY, JSON.stringify([project, ...all]));
        setProjects((current) => [project, ...current]);
        setCurrentProjectId(project.id);
        setActiveStep("overview");
        setSelectedCharacterId("");
        setSaveLabel("新项目已创建");
        setGenerationSource(null);
        setErrorMessage("");
        router.push(`/workspace/${project.id}`);
        return;
      } catch (e) {
        console.warn("[original-studio] create project failed", e);
        setErrorMessage(toProductErrorMessage(e));
        return;
      }
    }
    const project = createProjectRecord({
      title,
      draft: {
        ...INITIAL_DRAFT,
        title,
        overview: {
          ...INITIAL_DRAFT.overview,
          scriptType: newProjectScriptType,
        },
      },
    });
    setProjects((current) => [project, ...current]);
    setCurrentProjectId(project.id);
    setActiveStep("overview");
    setSelectedCharacterId("");
    setSaveLabel("新项目已创建");
    setGenerationSource(null);
    setErrorMessage("");
    router.push(`/workspace/${project.id}`);
  };

  const saveVersionSnapshot = <TStep extends OriginalStep>(
    step: TStep,
    source: VersionSource,
    nextDraft?: OriginalDraft,
  ) => {
    const payload = getStepPayload(nextDraft ?? draft, step);
    const version = createVersion({ step, payload, source });

    updateProject((current) => ({
      ...current,
      versionHistory: {
        ...current.versionHistory,
        [step]: [version, ...current.versionHistory[step]].slice(0, 12),
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const saveCurrentStepVersion = (step: OriginalStep) => {
    saveVersionSnapshot(step, "manual");
    setSaveLabel("当前步骤已保存为版本");
  };

  const rollbackVersion = (step: OriginalStep, versionId: string) => {
    const version = versionHistory[step].find((item) => item.id === versionId);
    if (!version) return;

    const nextDraft = applyStepPayload(draft, step, version.payload);
    const resolvedDraft = step === "characters" ? attachLeadAnchorsIfNeeded(nextDraft) : nextDraft;
    updateProject((current) => ({
      ...current,
      draft: resolvedDraft,
      title: resolvedDraft.title,
      updatedAt: new Date().toISOString(),
    }));
    setSaveLabel(`已回滚到 ${new Date(version.createdAt).toLocaleString("zh-CN")} 的版本`);
    setGenerationSource(version.source === "manual" ? null : version.source);

    if (step === "characters" && Array.isArray(version.payload) && version.payload[0]) {
      setSelectedCharacterId(version.payload[0].id);
    }
  };

  const applyGeneration = (
    result: GenerateOriginalResponse,
    draftOverride?: OriginalDraft,
    options?: { outlineTask?: "rough" | "episodes"; scriptEpisode?: number; batchStartEpisode?: number; batchEndEpisode?: number },
  ) => {
    setGenerationSource(result.source);
    setErrorMessage("");

    if (result.step === "characters" && result.payload[0]) {
      setSelectedCharacterId((current) => current || result.payload[0].id);
    }

    // 使用传入的 draftOverride 或闭包中的 draft
    const baseDraft = draftOverride ?? draft;
    let nextDraft: OriginalDraft;

    switch (result.step) {
      case "overview": {
        const p = result.payload as Record<string, unknown>;
        const prev = baseDraft.overview as Record<string, unknown>;
        const scriptType: "ai_comic" | "short_drama" =
          (p.scriptType === "ai_comic" || p.scriptType === "short_drama") ? p.scriptType
          : (baseDraft.overview.scriptType === "ai_comic" || baseDraft.overview.scriptType === "short_drama") ? baseDraft.overview.scriptType
          : "short_drama";
        // 标签限额裁剪 + 标签库匹配归一
        const normalized = normalizeOverviewSelectionFields(
          { genres: p.genres, coreHooks: p.coreHooks, styleTags: p.styleTags, audiences: p.audiences },
          { scriptType },
        );
        // 候选标签 warning 输出到 console（非 production），方便前端验收
        if (normalized.warnings.length > 0 && process.env.NODE_ENV !== "production") {
          console.warn("[标签归一] 候选标签：", normalized.warnings);
        }
        nextDraft = {
          ...baseDraft,
          overview: {
            ...baseDraft.overview,
            ...(p as typeof baseDraft.overview),
            audience: safeStr(p.audience ?? prev.audience),
            genres: normalized.genres,
            coreHooks: normalized.coreHooks,
            styleTags: normalized.styleTags,
            audiences: normalized.audiences.length > 0 ? normalized.audiences : pickStringArray(p.audiences, prev.audiences),
            worldview: safeStr(p.worldview ?? prev.worldview),
            highlight: safeStr(p.highlight ?? prev.highlight),
            premise: safeStr(p.premise ?? prev.premise),
            projectBrief: (p.projectBrief as typeof baseDraft.overview.projectBrief) ?? baseDraft.overview.projectBrief,
            scriptPlan: (p.scriptPlan as typeof baseDraft.overview.scriptPlan) ?? baseDraft.overview.scriptPlan,
            scriptType: (p.scriptType as ScriptType) ?? baseDraft.overview.scriptType ?? "short_drama",
            candidateTags: normalized.candidateTags,
          },
        };
        break;
      }
      case "characters": {
        const rosterInfo = baseDraft.adaptation?.status === "applied" ? resolveCharacterRosterInfo(baseDraft) : null;
        const targetCharacterCount = rosterInfo?.requiredCharacterCount ?? getTargetCharacterCount(baseDraft);
        const requiredCharacterSlots = buildRequiredCharacterSlots(baseDraft);
        const expectedCharacterCount =
          requiredCharacterSlots.length > 0
            ? requiredCharacterSlots.length
            : rosterInfo?.requiredCharacterCount ?? getTargetCharacterCount(baseDraft);
        const leadAnchors = baseDraft.adaptation?.status === "applied" ? resolveCharacterLeadAnchors(baseDraft) : undefined;
        const safeStr = (v: unknown): string => {
          if (typeof v === "string") return v;
          if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string").join("、");
          if (v != null && typeof v === "object") {
            const obj = v as Record<string, unknown>;
            const pick = obj.text ?? obj.value ?? obj.content ?? JSON.stringify(obj);
            return typeof pick === "string" ? pick : JSON.stringify(v);
          }
          return String(v ?? "");
        };
        const adaptation = baseDraft.adaptation?.status === "applied" ? baseDraft.adaptation : null;
        type CharacterAdaptationMeta = NonNullable<Character["adaptationMeta"]>;
        const resolveGeneratedBy = (value: unknown): CharacterAdaptationMeta["generatedBy"] =>
          safeStr(value) === "scaffold" ? "scaffold" : "model";
        const usedLocalizedNames = new Set<string>();
        const normalizeOne = (c: Record<string, unknown>, index: number) => {
          const rawAdaptationMeta =
            c.adaptationMeta && typeof c.adaptationMeta === "object" && !Array.isArray(c.adaptationMeta)
              ? (c.adaptationMeta as Record<string, unknown>)
              : undefined;
          const rawSlotId = safeStr(rawAdaptationMeta?.slotId ?? c.id);
          const slotEntry =
            requiredCharacterSlots.find((slot) => slot.slotId === rawSlotId) ??
            requiredCharacterSlots[index];
          const roleFunctionEntry =
            adaptation?.extraction?.roleFunctionMap?.find((item) => safeStr(item.sourceName) === safeStr(slotEntry?.sourceName)) ??
            adaptation?.extraction?.roleFunctionMap?.[index];
          const nameMapEntry =
            adaptation?.overseasMapping?.nameMap?.find((item) => safeStr(item.sourceName) === safeStr(slotEntry?.sourceName)) ??
            adaptation?.overseasMapping?.nameMap?.[index];
          const factionMapEntry =
            adaptation?.overseasMapping?.factionMap?.[index] ?? adaptation?.overseasMapping?.factionMap?.[0];
          const publicIdentity = safeStr(rawAdaptationMeta?.publicIdentity ?? roleFunctionEntry?.publicIdentity);
          const hiddenIdentity = safeStr(rawAdaptationMeta?.hiddenIdentity ?? roleFunctionEntry?.hiddenIdentity);
          const roleFunction = safeStr(rawAdaptationMeta?.roleFunction ?? roleFunctionEntry?.roleFunction ?? c.role);
          const sourceName = safeStr(
            rawAdaptationMeta?.sourceName ??
              slotEntry?.sourceName ??
              nameMapEntry?.sourceName ??
              roleFunctionEntry?.sourceName ??
              c.name,
          );
          const adaptedName = safeStr(rawAdaptationMeta?.adaptedName ?? slotEntry?.adaptedName ?? nameMapEntry?.adaptedName ?? c.name);
          // 由 adaptedName 生成中文音译显示名（Ethan → 伊森），无法音译时回退现有逻辑
          const displayName = adaptation && adaptedName
            ? resolveCharacterDisplayName({ adaptedName, sourceName }) || undefined
            : undefined;
          const originalProfileSummary = safeStr(rawAdaptationMeta?.originalProfileSummary ?? slotEntry?.cleanProfileSummary);
          const targetMarket = adaptation?.targetMarket ?? "北美";
          const localizationNote = safeStr(
            rawAdaptationMeta?.localizationNote ??
              (targetMarket === "中国"
                ? "中国市场：保留原角色功能优先，短剧表达层增强。"
                : `目标市场：${targetMarket}`),
          );
          const factionOrSpecies = safeStr(
            rawAdaptationMeta?.factionOrSpecies ??
              factionMapEntry?.adaptedTerm ??
              roleFunctionEntry?.publicIdentity ??
              "",
          );
          const relationshipHook = safeStr(rawAdaptationMeta?.relationshipHook ?? roleFunctionEntry?.relationshipHook);
          const slotId = safeStr(rawAdaptationMeta?.slotId ?? slotEntry?.slotId);
          const rawName = safeStr(c.name);
          const identityState = resolveCharacterIdentityState({
            rawGender: c.gender,
            sourceName,
            adaptedName,
            originalProfileSummary,
            requiredFunction: roleFunction,
            roleType: safeStr(c.role) || slotEntry?.roleType || "",
            relationshipHook,
            slotId,
            characterId: safeStr(c.id) || slotId,
            leadAnchors,
          });
          const rawRelationToMaleLead = safeStr(c.relationToMaleLead);
          const rawRelationToFemaleLead = safeStr(c.relationToFemaleLead);
          const relationToMaleLead = rawRelationToMaleLead && rawRelationToMaleLead !== "unknown"
            ? rawRelationToMaleLead
            : identityState.relationToMaleLead;
          const relationToFemaleLead = rawRelationToFemaleLead && rawRelationToFemaleLead !== "unknown"
            ? rawRelationToFemaleLead
            : identityState.relationToFemaleLead;
          const relationshipTags = Array.isArray(c.relationshipTags) && c.relationshipTags.length > 0
            ? c.relationshipTags.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
            : identityState.relationshipTags;
          const sourceGenderHint = rawAdaptationMeta?.sourceGenderHint === "male" || rawAdaptationMeta?.sourceGenderHint === "female" || rawAdaptationMeta?.sourceGenderHint === "unknown"
            ? rawAdaptationMeta.sourceGenderHint
            : identityState.sourceGenderHint;
          const rawTraits = safeStr(c.traits);
          const rawBackground = safeStr(c.background);
          const normalizedTraits = adaptation
            ? normalizeCharacterNarrativeByGender(rawTraits, identityState.gender)
            : rawTraits;
          const normalizedBackground = adaptation
            ? normalizeCharacterNarrativeByGender(rawBackground, identityState.gender)
            : rawBackground;
          const normalizedRelationshipHook = adaptation
            ? normalizeCharacterNarrativeByGender(relationshipHook, identityState.gender)
            : relationshipHook;
          const localizedName = adaptation
            ? resolveLocalizedCharacterName({
                targetMarket,
                sourceName,
                adaptedName,
                rawName,
                originalProfileSummary,
                requiredFunction: roleFunction,
                roleType: safeStr(c.role) || slotEntry?.roleType || "",
                slotId,
                index,
                usedNames: usedLocalizedNames,
                genderHint: identityState.gender,
              })
            : rawName;
          const normalizedName = adaptation ? localizedName : rawName;
          const normalizedAdaptedName = adaptation ? localizedName : "";
          const narrativeState = adaptation
            ? resolveCharacterNarrativeState({
                slotId,
                sourceName,
                adaptedName: normalizedAdaptedName || normalizedName,
                gender: identityState.gender,
                roleType: safeStr(c.role) || slotEntry?.roleType || "",
                requiredFunction: roleFunction,
                originalProfileSummary,
                relationshipHook: normalizedRelationshipHook,
                publicIdentity,
                hiddenIdentity,
              })
            : resolveCharacterNarrativeState({
                slotId,
                sourceName,
                adaptedName: normalizedName,
                gender: identityState.gender,
                roleType: safeStr(c.role) || slotEntry?.roleType || "",
                requiredFunction: roleFunction,
                originalProfileSummary,
                relationshipHook: normalizedRelationshipHook,
                publicIdentity,
                hiddenIdentity,
              });
          const normalizedRole = normalizeShortDramaCharacterRole({
            slotId,
            roleType: safeStr(c.role) || slotEntry?.roleType || "",
            requiredFunction: roleFunction,
            sourceName,
            gender: identityState.gender,
            relationshipTags,
            relationToMaleLead,
            relationToFemaleLead,
          });

          return {
            id: typeof c.id === "string" ? c.id : `character-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: displayName || normalizedName,
            role: normalizedRole,
            gender: identityState.gender,
            age: typeof c.age === "number" ? c.age : 0,
            traits: normalizedTraits,
            background: normalizedBackground,
            relationToMaleLead,
            relationToFemaleLead,
            relationshipTags,
            adaptationMeta: adaptation
                ? ({
                  slotId: slotId || undefined,
                  sourceName,
                  adaptedName,
                  originalProfileSummary: originalProfileSummary || undefined,
                  targetMarket,
                  roleFunction,
                  publicIdentity,
                  hiddenIdentity: hiddenIdentity || undefined,
                  factionOrSpecies: factionOrSpecies || undefined,
                  relationshipHook: normalizedRelationshipHook || undefined,
                  sourceGenderHint,
                  genderConfidence: identityState.genderConfidence,
                  misreadIdentity: narrativeState.misreadIdentity,
                  trueMotivation: narrativeState.trueMotivation,
                  reversalTags: narrativeState.reversalTags,
                  revealStage: narrativeState.revealStage,
                  localizationNote,
                  needsRefine: Boolean(rawAdaptationMeta?.needsRefine),
                  generatedBy: resolveGeneratedBy(rawAdaptationMeta?.generatedBy),
                } as CharacterAdaptationMeta)
                : rawAdaptationMeta
                ? ({
                    slotId: safeStr(rawAdaptationMeta.slotId) || undefined,
                    sourceName: safeStr(rawAdaptationMeta.sourceName),
                    adaptedName: safeStr(rawAdaptationMeta.adaptedName),
                    originalProfileSummary: safeStr(rawAdaptationMeta.originalProfileSummary) || undefined,
                    targetMarket: safeStr(rawAdaptationMeta.targetMarket),
                    roleFunction: safeStr(rawAdaptationMeta.roleFunction),
                    publicIdentity: safeStr(rawAdaptationMeta.publicIdentity),
                    hiddenIdentity: safeStr(rawAdaptationMeta.hiddenIdentity) || undefined,
                    factionOrSpecies: safeStr(rawAdaptationMeta.factionOrSpecies) || undefined,
                    relationshipHook: normalizeCharacterNarrativeByGender(safeStr(rawAdaptationMeta.relationshipHook), identityState.gender) || undefined,
                    sourceGenderHint: safeStr(rawAdaptationMeta.sourceGenderHint) as CharacterAdaptationMeta["sourceGenderHint"] | undefined,
                    genderConfidence: typeof rawAdaptationMeta.genderConfidence === "number" ? rawAdaptationMeta.genderConfidence : undefined,
                    localizationNote: safeStr(rawAdaptationMeta.localizationNote),
                    needsRefine: Boolean(rawAdaptationMeta.needsRefine),
                    generatedBy: resolveGeneratedBy(rawAdaptationMeta.generatedBy),
                  }) as CharacterAdaptationMeta
                : undefined,
          };
        };

        const isCharacterLike = (v: unknown): v is Record<string, unknown> =>
          v != null && typeof v === "object" && !Array.isArray(v) &&
          ["name", "role", "background", "traits", "motivation", "goal", "arc", "relation"].some(
            (k) => k in (v as Record<string, unknown>)
          );

        const extractCharacterCandidates = (raw: unknown): unknown[] => {
          // 1) raw is an array — flatten each item
          if (Array.isArray(raw)) {
            const out: unknown[] = [];
            for (const item of raw) {
              if (isCharacterLike(item)) {
                out.push(item);
              } else if (Array.isArray(item)) {
                out.push(...extractCharacterCandidates(item));
              } else if (item && typeof item === "object") {
                // item might be a wrapper containing character-like values
                out.push(...extractCharacterCandidates(item));
              }
            }
            return out;
          }

          // 2) raw is a non-null object
          if (raw && typeof raw === "object") {
            const obj = raw as Record<string, unknown>;

            // Named array fields that commonly hold characters
            const arrayKeys = [
              "characters", "items", "data",
              "mainCharacters", "supportingCharacters",
              "protagonists", "antagonists", "villains",
              "leads", "roles", "characterList",
            ] as const;
            const fromArrayKeys: unknown[] = [];
            for (const key of arrayKeys) {
              if (Array.isArray(obj[key])) {
                fromArrayKeys.push(...extractCharacterCandidates(obj[key]));
              }
            }
            if (fromArrayKeys.length > 0) return fromArrayKeys;

            // obj.characters is an object with character-like values (e.g. {protagonist:{…}, antagonist:{…}})
            if (obj.characters && typeof obj.characters === "object" && !Array.isArray(obj.characters)) {
              const inner = Object.values(obj.characters as Record<string, unknown>);
              const fromInner = inner.filter(isCharacterLike);
              if (fromInner.length > 0) return fromInner;
              // deeper: each value might itself be an array of characters
              const deeper = inner.flatMap((v) => Array.isArray(v) ? extractCharacterCandidates(v) : []);
              if (deeper.length > 0) return deeper;
            }

            // Named singular fields that hold a single character object
            const singularKeys = ["protagonist", "antagonist", "hero", "villain", "lead"] as const;
            const fromSingular: unknown[] = [];
            for (const key of singularKeys) {
              if (isCharacterLike(obj[key])) fromSingular.push(obj[key]);
            }
            if (fromSingular.length > 0) return fromSingular;

            // raw itself is character-like
            if (isCharacterLike(raw)) return [raw];

            // Last resort: scan top-level values for character-like objects or arrays
            const scanned: unknown[] = [];
            for (const val of Object.values(obj)) {
              if (isCharacterLike(val)) {
                scanned.push(val);
              } else if (Array.isArray(val)) {
                scanned.push(...extractCharacterCandidates(val));
              }
            }
            if (scanned.length > 0) return scanned;
          }

          return [];
        };

        const raw = result.payload as unknown;
        const rawList = extractCharacterCandidates(raw);
        if (rawList.length === 0) {
          const preview =
            typeof raw === "string"
              ? raw.slice(0, 800)
              : JSON.stringify(raw).slice(0, 800);
          console.warn("[OriginalStudio] characters extracted empty, keeping existing", {
            payloadType: typeof raw,
            payloadPreview: preview,
          });
          setErrorMessage("人物生成结果为空：模型没有返回可解析的人物数组，已保留原有人物列表。本次结果未保存。");
          return;
        }
        const normalizedCharacters = (rawList as Record<string, unknown>[]).map((item, index) => normalizeOne(item, index));

        // 安全归一：处理可确定的占位词替换
        // 规则：优先使用当前角色自己的上下文，再使用全局上下文
        // 从 adaptation 获取额外上下文（仅作为全局兜底）
        const adaptationContext = adaptation ? {
          sourceText: adaptation.sourceText ?? "",
          extraction: adaptation.extraction,
        } : null;

        // 对每个角色进行安全归一
        normalizedCharacters.forEach((char) => {
          const meta = char.adaptationMeta && typeof char.adaptationMeta === "object" ? char.adaptationMeta as Record<string, unknown> : null;
          if (!meta) return;

          const sourceName = typeof meta.sourceName === "string" ? meta.sourceName : "";
          const charSourceAliases = Array.isArray(meta.sourceAliases) ? meta.sourceAliases as string[] : [];
          const charRelationshipFacts = typeof meta.relationshipFacts === "string" ? meta.relationshipFacts : "";

          // 收集当前角色自己的上下文字段（用于优先判断）
          const charOwnContext = [
            charRelationshipFacts,
            typeof char.background === "string" ? char.background : "",
            typeof meta.relationshipHook === "string" ? meta.relationshipHook as string : "",
            typeof meta.publicIdentity === "string" ? meta.publicIdentity as string : "",
            typeof meta.hiddenIdentity === "string" ? meta.hiddenIdentity as string : "",
            typeof meta.misreadIdentity === "string" ? meta.misreadIdentity as string : "",
            typeof meta.trueMotivation === "string" ? meta.trueMotivation as string : "",
          ].join(" ");

          // 查找当前角色对应的 slot，获取 slot 级别的上下文
          const currentSlot = requiredCharacterSlots.find((s) => {
            if (meta.slotId && s.slotId === meta.slotId) return true;
            if (s.sourceAliases && s.sourceAliases.includes(sourceName)) return true;
            return false;
          });
          const slotContext = [
            currentSlot?.relationshipFacts ?? "",
            currentSlot?.backgroundFacts ?? "",
          ].join(" ");

          // 合并当前角色的完整上下文
          const fullCharContext = `${charOwnContext} ${slotContext} ${charSourceAliases.join(" ")} ${sourceName}`;

          // 推断隐藏身份的具体名称（当前角色上下文优先）
          let hiddenIdentityReplacement = "";

          // 第一优先级：当前角色自己的上下文包含"卢兆天"
          if (fullCharContext.includes("卢兆天")) {
            hiddenIdentityReplacement = "车小贤的分身身份卢兆天";
          }
          // 第二优先级：当前角色自己的上下文包含"常胜"
          else if (fullCharContext.includes("常胜")) {
            hiddenIdentityReplacement = "车小贤伪装成常胜";
          }
          // 第三优先级：当前角色无具体身份线索，查全局但要谨慎
          else {
            // 根据角色 sourceName 决定倾向
            if (sourceName === "满春" || charSourceAliases.includes("满春")) {
              // 满春与常胜婚约有关，优先常胜
              hiddenIdentityReplacement = "车小贤伪装成常胜";
            } else if (sourceName === "玲珑" || charSourceAliases.includes("玲珑")) {
              // 玲珑与卢兆天/白浪分身相关，不使用常胜
              hiddenIdentityReplacement = "车小贤的分身身份";
            } else {
              // 不能确定时，使用中性表述
              hiddenIdentityReplacement = "男主的另一重身份";
            }
          }

          // 对正文字段进行替换
          // background 在 char 顶层
          const bgValue = typeof char.background === "string" ? char.background : "";
          if (bgValue.includes("男主的隐藏身份")) {
            char.background = bgValue.replace(/男主的隐藏身份/g, hiddenIdentityReplacement);
          }

          // 其他字段在 adaptationMeta 中
          if (meta) {
            const metaFieldsToNormalize = ["publicIdentity", "hiddenIdentity", "misreadIdentity", "trueMotivation", "relationshipHook"];
            for (const field of metaFieldsToNormalize) {
              const value = typeof meta[field] === "string" ? meta[field] as string : "";
              if (value.includes("男主的隐藏身份")) {
                meta[field] = value.replace(/男主的隐藏身份/g, hiddenIdentityReplacement);
              }
            }

            // 特殊清洗：relationshipHook 命中内部功能短语时，尝试改写或清空
            const relationshipHookValue = typeof meta.relationshipHook === "string" ? meta.relationshipHook as string : "";
            const internalPhrases = ["推动误会升级", "关系钩子", "高位背书者", "制度性压力", "制度或家族权力的承载者"];
            const hitsInternalPhrase = internalPhrases.some((phrase) => relationshipHookValue.includes(phrase));
            if (hitsInternalPhrase) {
              // 尝试用当前角色的具体关系事实改写
              const charRelationshipFacts = typeof meta.relationshipFacts === "string" ? meta.relationshipFacts as string : "";
              const charBackgroundFacts = typeof meta.backgroundFacts === "string" ? meta.backgroundFacts as string : "";
              const defaultTags = Array.isArray(meta.defaultRelationshipTags) ? (meta.defaultRelationshipTags as string[]).join("、") : "";

              // 优先用 relationshipFacts，其次用 backgroundFacts + defaultRelationshipTags
              let cleanedHook = "";
              if (charRelationshipFacts && charRelationshipFacts.length > 10) {
                cleanedHook = charRelationshipFacts;
              } else if (charBackgroundFacts && charBackgroundFacts.length > 10) {
                cleanedHook = defaultTags ? `${defaultTags}：${charBackgroundFacts}` : charBackgroundFacts;
              } else if (defaultTags) {
                cleanedHook = defaultTags;
              }
              // 如果改写成功则替换，否则清空
              meta.relationshipHook = cleanedHook || "";
            }
          }
        });

        // 检测 scaffold 补位角色：如果存在则不保存
        const scaffoldCharacters = normalizedCharacters.filter((char) => {
          const meta = char.adaptationMeta;
          if (!meta) return false;
          // 检测 generatedBy="scaffold"
          if (meta.generatedBy === "scaffold") return true;
          // 检测 localizationNote 包含补位标记
          const note = typeof meta.localizationNote === "string" ? meta.localizationNote : "";
          if (note.includes("补齐待细化草稿") || note.includes("模型返回结果不足")) return true;
          return false;
        });

        if (scaffoldCharacters.length > 0) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[OriginalStudio] characters generation contains scaffold placeholders", {
              scaffoldCount: scaffoldCharacters.length,
              scaffoldNames: scaffoldCharacters.map((c) => c.name),
              totalCount: normalizedCharacters.length,
              targetCount: targetCharacterCount,
            });
          }
          setErrorMessage(`人物生成未完整返回，存在 ${scaffoldCharacters.length} 个待细化补位角色，已保留原有人物列表，请重试。本次结果未保存。`);
          return;
        }

        // 检测内部占位词/模板词污染
        const forbiddenPatterns = [
          "男主的隐藏身份",
          "关系钩子",
          "高位背书者",
          "推动误会升级",
          "模型返回结果",
          "固定槽位",
          "待细化",
          "代表家族、组织、阶层或制度性压力",
          "伪装成名为",
          "补齐待细化",
          "与主角形成关系牵引或冲突张力",
          "资源背书者或制度压力来源",
          "关键关系人或关键协助者",
          "第二关键关系人或关键协助者",
          "关系变量或次级压力来源",
          "次级压力或次级信息来源",
          "制度或家族权力的承载者",
          "制度性压力",
        ];
        // 核心展示字段：命中必须拦截
        const coreFieldsToCheck = [
          "traits",
          "background",
        ] as const;
        // adaptationMeta 字段：命中时先清洗，不直接拦截
        const metaFieldsToClean = [
          "publicIdentity",
          "hiddenIdentity",
          "misreadIdentity",
          "trueMotivation",
          "relationshipHook",
        ] as const;
        // 关系字段：命中时重置为 unknown/[]，不拦截
        const relationFieldsToReset = [
          "relationToMaleLead",
          "relationToFemaleLead",
        ] as const;

        type ForbiddenMatch = {
          characterIndex: number;
          characterId: string;
          characterName: string;
          sourceName: string;
          field: string;
          bannedTerm: string;
          valuePreview: string;
        };

        const coreMatches: ForbiddenMatch[] = [];
        const cleanedMetaFields: ForbiddenMatch[] = [];
        const localizationNoteMatches: ForbiddenMatch[] = [];

        // 在进入 coreMatches 检测前，对核心展示字段做可清洗内部短语替换
        const cleanablePhrases: Record<string, string> = {
          "代表家族、组织、阶层或制度性压力": "代表高位秩序压力",
          "制度或家族权力的承载者": "高位秩序压力来源",
          "制度性压力": "高位秩序压力",
        };

        normalizedCharacters.forEach((char, index) => {
          const charName = String(char.name || "未知角色");
          const charId = String(char.id || "未知ID");
          const meta = char.adaptationMeta && typeof char.adaptationMeta === "object" ? char.adaptationMeta as Record<string, unknown> : null;
          const sourceName = meta && typeof meta.sourceName === "string" ? meta.sourceName : "";

          // 核心展示字段清洗：替换可清洗的内部短语，避免因 Prompt 自身喂词导致误杀
          for (const field of coreFieldsToCheck) {
            let value = typeof char[field] === "string" ? (char[field] as string) : "";
            if (value) {
              for (const [from, to] of Object.entries(cleanablePhrases)) {
                value = value.split(from).join(to);
              }
              (char as Record<string, unknown>)[field] = value;
            }
          }

          // 检查核心展示字段（命中必须拦截）
          for (const field of coreFieldsToCheck) {
            const value = typeof char[field] === "string" ? char[field] : "";
            for (const pattern of forbiddenPatterns) {
              if (value.includes(pattern)) {
                coreMatches.push({
                  characterIndex: index + 1,
                  characterId: charId,
                  characterName: charName,
                  sourceName,
                  field,
                  bannedTerm: pattern,
                  valuePreview: value.slice(0, 80),
                });
              }
            }
          }

          // 检查关系字段（命中时重置为 unknown，不拦截）
          for (const field of relationFieldsToReset) {
            const value = typeof char[field] === "string" ? char[field] : "";
            for (const pattern of forbiddenPatterns) {
              if (value.includes(pattern)) {
                (char as Record<string, unknown>)[field] = "unknown";
                break;
              }
            }
          }

          // 检查 relationshipTags（命中时移除该 tag，不拦截）
          const tags = Array.isArray(char.relationshipTags) ? [...char.relationshipTags] as string[] : [];
          const cleanedTags = tags.filter((tag) => {
            if (typeof tag !== "string") return true;
            for (const pattern of forbiddenPatterns) {
              if (tag.includes(pattern)) return false;
            }
            return true;
          });
          char.relationshipTags = cleanedTags;

          // 检查 adaptationMeta 字段（命中时清空或用其他字段替换，不拦截）
          if (meta) {
            for (const field of metaFieldsToClean) {
              const value = typeof meta[field] === "string" ? meta[field] as string : "";
              for (const pattern of forbiddenPatterns) {
                if (value.includes(pattern)) {
                  // 记录清洗操作
                  cleanedMetaFields.push({
                    characterIndex: index + 1,
                    characterId: charId,
                    characterName: charName,
                    sourceName,
                    field: `adaptationMeta.${field}`,
                    bannedTerm: pattern,
                    valuePreview: value.slice(0, 80),
                  });
                  // 尝试用其他字段替换
                  const cleanProfileSummary = typeof meta.cleanProfileSummary === "string" ? meta.cleanProfileSummary as string : "";
                  const backgroundFacts = typeof meta.backgroundFacts === "string" ? meta.backgroundFacts as string : "";
                  const relationshipFacts = typeof meta.relationshipFacts === "string" ? meta.relationshipFacts as string : "";

                  if (field === "publicIdentity" || field === "hiddenIdentity") {
                    // 身份字段优先用 cleanProfileSummary 或 backgroundFacts
                    meta[field] = cleanProfileSummary || backgroundFacts || "";
                  } else if (field === "relationshipHook") {
                    // relationshipHook 优先用 relationshipFacts
                    meta[field] = relationshipFacts || "";
                  } else {
                    // 其他字段直接清空
                    meta[field] = "";
                  }
                  break;
                }
              }
            }

            // 单独处理 localizationNote
            const locNote = typeof meta.localizationNote === "string" ? meta.localizationNote : "";
            for (const pattern of forbiddenPatterns) {
              if (locNote.includes(pattern)) {
                localizationNoteMatches.push({
                  characterIndex: index + 1,
                  characterId: charId,
                  characterName: charName,
                  sourceName,
                  field: "adaptationMeta.localizationNote",
                  bannedTerm: pattern,
                  valuePreview: locNote.slice(0, 80),
                });
              }
            }
          }
        });

        // 正文字段命中：必须拦截
        if (coreMatches.length > 0) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[OriginalStudio] characters contain forbidden template words in core fields", {
              count: coreMatches.length,
              matches: coreMatches,
            });
          }
          const first = coreMatches[0];
          const displayName = first.sourceName ? `${first.sourceName} / ${first.characterName}` : first.characterName;
          setErrorMessage(`人物卡包含内部占位词：第 ${first.characterIndex} 个 ${displayName} 的 ${first.field} 命中"${first.bannedTerm}"。已保留原有人物列表，请重试。本次结果未保存。`);
          return;
        }

        // adaptationMeta 字段命中：已清洗，记录日志但不拦截
        if (cleanedMetaFields.length > 0) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[OriginalStudio] characters contain forbidden words in adaptationMeta fields, cleaned", {
              count: cleanedMetaFields.length,
              matches: cleanedMetaFields,
            });
          }
        }

        // localizationNote 命中：清空该字段，不拦截
        if (localizationNoteMatches.length > 0) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[OriginalStudio] characters contain forbidden words in localizationNote, clearing", {
              count: localizationNoteMatches.length,
              matches: localizationNoteMatches,
            });
          }
          // 清空命中角色的 localizationNote
          normalizedCharacters.forEach((char) => {
            const meta = char.adaptationMeta;
            if (meta && typeof meta === "object") {
              const metaRecord = meta as Record<string, unknown>;
              const locNote = typeof metaRecord.localizationNote === "string" ? metaRecord.localizationNote : "";
              for (const pattern of forbiddenPatterns) {
                if (locNote.includes(pattern)) {
                  metaRecord.localizationNote = "";
                  break;
                }
              }
            }
          });
        }

        if (normalizedCharacters.length < expectedCharacterCount) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[OriginalStudio] characters generation returned too few characters", {
              extractedCount: rawList.length,
              normalizedCount: normalizedCharacters.length,
              targetCount: expectedCharacterCount,
              existingCount: baseDraft.characters.length,
            });
          }
          setErrorMessage(`人物生成结果不完整：返回 ${normalizedCharacters.length}/${expectedCharacterCount} 个，已保留原有人物列表，请重试。本次结果未保存。`);
          return;
        }
        const narrativeReferences = normalizedCharacters.map((character) => ({
          sourceName: safeStr(character.adaptationMeta?.sourceName),
          adaptedName: safeStr(character.name),
          roleLabel: safeStr(character.role),
        }));
      const normalizedCharactersForDisplay = normalizedCharacters.map((character) => ({
          ...character,
          traits: normalizeCharacterNarrativeByMarket({
            value: character.traits,
            gender: character.gender,
            targetMarket: baseDraft.adaptation?.status === "applied" ? baseDraft.adaptation.targetMarket : "中国",
            currentSourceName: safeStr(character.adaptationMeta?.sourceName),
            currentLocalizedName: safeStr(character.name),
            references: narrativeReferences,
          }),
          background: normalizeCharacterNarrativeByMarket({
            value: character.background,
            gender: character.gender,
            targetMarket: baseDraft.adaptation?.status === "applied" ? baseDraft.adaptation.targetMarket : "中国",
            currentSourceName: safeStr(character.adaptationMeta?.sourceName),
            currentLocalizedName: safeStr(character.name),
            references: narrativeReferences,
          }),
          adaptationMeta: character.adaptationMeta
            ? {
                ...character.adaptationMeta,
                ...resolveCharacterNarrativeState({
                  slotId: safeStr(character.adaptationMeta.slotId),
                  sourceName: safeStr(character.adaptationMeta.sourceName),
                  adaptedName: safeStr(character.name),
                  gender: character.gender,
                  roleType: safeStr(character.role),
                  requiredFunction: safeStr(character.adaptationMeta.roleFunction),
                  originalProfileSummary: safeStr(character.adaptationMeta.originalProfileSummary),
                  relationshipHook: safeStr(character.adaptationMeta.relationshipHook),
                  publicIdentity: safeStr(character.adaptationMeta.publicIdentity),
                  hiddenIdentity: safeStr(character.adaptationMeta.hiddenIdentity),
                }),
                relationshipHook: normalizeCharacterNarrativeByMarket({
                  value: character.adaptationMeta.relationshipHook,
                  gender: character.gender,
                  targetMarket: baseDraft.adaptation?.status === "applied" ? baseDraft.adaptation.targetMarket : "中国",
                  currentSourceName: safeStr(character.adaptationMeta.sourceName),
                  currentLocalizedName: safeStr(character.name),
                  references: narrativeReferences,
                }) || undefined,
              }
            : character.adaptationMeta,
          role: normalizeShortDramaCharacterRole({
            slotId: safeStr(character.adaptationMeta?.slotId),
            roleType: safeStr(character.role),
            requiredFunction: safeStr(character.adaptationMeta?.roleFunction),
            sourceName: safeStr(character.adaptationMeta?.sourceName),
            gender: character.gender,
            relationshipTags: character.relationshipTags,
            relationToMaleLead: character.relationToMaleLead,
            relationToFemaleLead: character.relationToFemaleLead,
          }),
        }));
        nextDraft = attachLeadAnchorsIfNeeded({
          ...baseDraft,
          characters: normalizedCharactersForDisplay.slice(0, targetCharacterCount),
        });
        if (normalizedCharactersForDisplay[0]) {
          setSelectedCharacterId((current) => current || normalizedCharactersForDisplay[0].id);
        }
        break;
      }
      case "outlines": {
        const outlinePayload = result.payload as Partial<OutlineDraft>;
        const outlinePayloadRecord = result.payload as Record<string, unknown>;
        // Use explicitly passed outlineTask (not React state which may be stale/null).
        const isRough = (options?.outlineTask ?? outlineGenerationTask) === "rough";
        const pickNonEmpty = <T,>(next: T[] | undefined, prev: T[] | undefined): T[] => {
          if (Array.isArray(next) && next.length > 0) return next;
          if (Array.isArray(prev) && prev.length > 0) return prev;
          return next ?? prev ?? [];
        };
        const pickMacro = (...values: unknown[]) => {
          for (const value of values) {
            const safeValue = sanitizeOutlineMacro(value);
            if (safeValue) return safeValue;
          }
          return "";
        };
        const oPrev = baseDraft.outlines;
        const finalMacro =
          pickMacro(
            outlinePayload.macro,
            outlinePayloadRecord.roughOutline,
            outlinePayloadRecord.outlineText,
            outlinePayloadRecord.summary,
            outlinePayloadRecord.overview,
          ) || sanitizeOutlineMacro(oPrev.macro);
        // 当生成 batch episodes 时，按 episodeNumber 精确 merge，不覆盖其他批次
        const rawEpisodes = outlinePayload.episodes as string[] | undefined;
        const batchStart = options?.batchStartEpisode;
        const batchEnd = options?.batchEndEpisode;
        const shouldBatchMerge = !isRough && typeof batchStart === "number" && typeof batchEnd === "number" && Array.isArray(rawEpisodes);
        const mergedEpisodes = shouldBatchMerge
          ? (() => {
              const next = [...oPrev.episodes];
              while (next.length < batchEnd!) next.push("");
              for (const text of rawEpisodes!) {
                const match = /^第(\d+)集/.exec(text);
                if (match) {
                  const epNum = parseInt(match[1], 10);
                  if (epNum >= batchStart! && epNum <= batchEnd!) {
                    next[epNum - 1] = text;
                  }
                }
              }
              return next;
            })()
          : oPrev.episodes;
        // 粗纲生成后确定性填充 originalPhaseRanges（仅当为空或集数已变）
        const targetEpisodeCount = normalizeEpisodeCountValue(
          baseDraft.overview.projectBrief?.episodeCount as number | undefined,
        );
        const oPrevPhases = oPrev.originalPhaseRanges ?? [];
        const lastPhaseEnd = oPrevPhases.length > 0 ? oPrevPhases[oPrevPhases.length - 1].endEpisode : undefined;
        const shouldComputePhases =
          oPrevPhases.length === 0 || (typeof lastPhaseEnd === "number" && lastPhaseEnd !== targetEpisodeCount);
        const phaseRanges = isRough && shouldComputePhases
          ? buildPhaseRanges(targetEpisodeCount)
          : oPrevPhases;

        nextDraft = {
          ...baseDraft,
          outlines: {
            ...baseDraft.outlines,
            macro: finalMacro,
            ...(isRough
              ? {
                  outlineBatches: Array.isArray(outlinePayload.outlineBatches)
                    ? outlinePayload.outlineBatches
                    : oPrev.outlineBatches,
                  originalPhaseRanges: phaseRanges,
                }
              : {}),
            episodes: mergedEpisodes,
            ...(isRough
              ? {}
              : {
                  stageLabels: pickNonEmpty(outlinePayload.stageLabels as string[] | undefined, oPrev.stageLabels),
                  originalPhaseRanges: pickNonEmpty(outlinePayload.originalPhaseRanges, oPrev.originalPhaseRanges),
                  episodesStructured: pickNonEmpty(outlinePayload.episodesStructured, oPrev.episodesStructured),
                  beatCards: pickNonEmpty(outlinePayload.beatCards, oPrev.beatCards),
                }),
          },
        };
        break;
      }
      case "script": {
        // 剧本正文生成：优先使用显式传入的 scriptEpisode，不依赖可能滞后的 React state
        const targetEpisode = typeof options?.scriptEpisode === "number"
          ? Math.max(1, Math.min(options.scriptEpisode, episodeCountForScript))
          : clampedSelectedScriptEpisode;
        const key = String(targetEpisode);
        const previousEpisodeScript =
          baseDraft.episodeScripts?.[key]
          ?? (targetEpisode === 1 ? baseDraft.script : undefined)
          ?? { episode: `第${targetEpisode}集`, content: "", batches: [] };
        const scriptPayload = result.payload as typeof baseDraft.script;
        const rawContent = stripGeneratedWordCountFooter(
          typeof scriptPayload.content === "string" ? scriptPayload.content : "",
        );

        // ── 保存前质量校验：防止短稿/空稿覆盖旧正文 ──
        if (!rawContent.trim()) {
          lastScriptQualityFailReasonRef.current = "生成结果为空，模型未返回有效正文";
          setErrorMessage("生成结果异常，请重试（ERR_PARSE_001）");
          return;
        }
        // 统计中文字符数（统一使用中文字符计数，不含标点空格英文）
        const chineseCharCount = countScriptChineseChars(rawContent);
        // 校验阈值跟随 projectBrief.targetWordsPerEpisode（权威来源），与 prompt 约束一致
        const minChars = Math.max(300, Math.floor(projectBriefWordTarget * 0.75));
        if (chineseCharCount < minChars) {
          lastScriptQualityFailReasonRef.current = `字数不足：当前 ${chineseCharCount} 字，要求至少 ${minChars} 字（项目目标 ${projectBriefWordTarget} 字 × 75%）`;
          setErrorMessage(`正文过短，实际 ${chineseCharCount} 字 / 最低 ${minChars} 字，本次未保存。（ERR_SCRIPT_001）`);
          console.warn("[original-studio] script validation failed", {
            reason: "too_short",
            contentLength: chineseCharCount,
            minLength: minChars,
            sceneCount: 0,
            sceneLimitPerEpisode: projectBriefSceneLimit,
            targetWordsPerEpisode: projectBriefWordTarget,
          });
          return;
        }
        // 统计场景数：优先投稿模板头（1-1 日 外 地点），兼容旧格式
        const countScriptScenes = (content: string): number => {
          const templateMatches = content.match(/^\s*\d+-\d+\s+(日|夜|晨|清晨|黄昏|傍晚|凌晨)\s+(内|外|内外)\s+.+$/gm) ?? [];
          const legacyMatches = content.match(/[【「]场景/g) ?? [];
          return Math.max(templateMatches.length, legacyMatches.length);
        };
        const sceneCount = countScriptScenes(rawContent);
        // 场景数为 0：拦截（未识别到合法场景头）
        if (sceneCount === 0) {
          lastScriptQualityFailReasonRef.current = "未识别到合法场景头，需要「X-Y 日/夜 内/外 地点」格式的场景标记";
          setErrorMessage(`未识别到合法场景头，本次未保存。请使用如「5-1 日 外 地点」的场景格式。（ERR_SCRIPT_002）`);
          console.warn("[original-studio] script validation failed", {
            reason: "zero_scenes",
            contentLength: chineseCharCount,
            minLength: minChars,
            sceneCount,
            sceneLimitPerEpisode: projectBriefSceneLimit,
            targetWordsPerEpisode: projectBriefWordTarget,
          });
          return;
        }
        // sceneCount=1 且字数达标：允许保存，仅 warning
        if (sceneCount === 1) {
          console.warn("[original-studio] script only 1 scene detected, saving with warning", {
            contentLength: chineseCharCount,
            sceneCount,
            sceneLimitPerEpisode: projectBriefSceneLimit,
          });
        }
        // sceneCount > sceneLimitPerEpisode：场景数超上限，硬失败
        if (sceneCount > projectBriefSceneLimit) {
          lastScriptQualityFailReasonRef.current = `场景数超上限：当前 ${sceneCount} 场，项目上限 ${projectBriefSceneLimit} 场`;
          setErrorMessage(`场景数超过项目上限，当前 ${sceneCount} 场 / 上限 ${projectBriefSceneLimit} 场，本次未保存。（ERR_SCRIPT_003）`);
          console.warn("[original-studio] script validation failed", {
            reason: "too_many_scenes",
            contentLength: chineseCharCount,
            minLength: minChars,
            sceneCount,
            sceneLimitPerEpisode: projectBriefSceneLimit,
            targetWordsPerEpisode: projectBriefWordTarget,
          });
          return;
        }

        // ── 当前集大纲（story drift + 完整性校验共用）──
        const epIndex = targetEpisode - 1;
        const episodeOutline = baseDraft.outlines.episodes?.[epIndex]?.trim() ?? "";

        // ── story drift 校验：防止正文严重偏离当前集大纲 ──
        {
          const charNames = baseDraft.characters?.map((c) => c.name?.trim()).filter(Boolean) ?? [];

          // 1. 从当前集大纲提取实体/人物锚点
          const entitySet = new Set<string>();
          // 提取大纲中出现的角色名
          for (const cn of charNames) {
            if (cn && episodeOutline.includes(cn)) entitySet.add(cn);
          }
          // 提取大纲中的中文名词片段（2-4字）作为候选实体
          const nounPattern = /[\u4e00-\u9fff]{2,4}/g;
          let m: RegExpExecArray | null;
          while ((m = nounPattern.exec(episodeOutline)) !== null) {
            entitySet.add(m[0]);
          }
          const outlineAnchors = Array.from(entitySet);

          // 2. 动作/结果词（大纲中常见动作词）
          const actionWords = ["挑衅","质疑","打赌","嘴炮","退让","赚得","点头","催促","修炼",
            "监视","试探","求援","对峙","密谋","拆穿","拦路","决斗","出战","应战","出手",
            "解围","相助","谈判","威胁","警告","宣布","命令","提议","拒绝","接受",
            "偷袭","反击","撤退","追击","埋伏","包围","围攻","挑战","妥协"];
          const resultWords = ["资源","退让","崇拜","考验","好感","期待","感激","目睹","醋意",
            "徘徊","隐藏","消失","出现","意外","发现","误认","达成","失败","成功",
            "胜利","败退","受伤","昏迷","觉醒","突破","进化","蜕变"];

          // 3. 计算正文命中
          const matchedAnchors = outlineAnchors.filter((a) => rawContent.includes(a));
          const matchedActions = actionWords.filter((w) => rawContent.includes(w));
          const matchedResults = resultWords.filter((w) => rawContent.includes(w));
          const matchedGroups =
            (matchedAnchors.length >= 2 ? 1 : 0) +
            (matchedActions.length >= 2 ? 1 : 0) +
            (matchedResults.length >= 2 ? 1 : 0);

          // 4. 禁止词检测（项目内合法词豁免）
          const bannedTerms = ["叶家","赘婿","退婚","婚礼","灵根","系统绑定","豪门继承"];
          // 收集项目内所有已有文本，用于判断禁止词是否为本项目合法剧情事件
          const _projectParts: string[] = [];
          for (const ep of (baseDraft.outlines.episodes ?? [])) {
            if (ep?.trim()) _projectParts.push(ep);
          }
          for (const ep of (baseDraft.outlines.episodesStructured ?? [])) {
            _projectParts.push(ep.title, ep.plotTask, ep.conflict, ep.hook, (ep as { summary?: string }).summary ?? "");
          }
          for (const bc of (baseDraft.outlines.beatCards ?? [])) {
            _projectParts.push(bc.title, bc.function, bc.expectation, bc.break, bc.newQuestion);
          }
          for (const batch of (baseDraft.outlines.outlineBatches ?? [])) {
            if (batch.roughOutline?.trim()) _projectParts.push(batch.roughOutline);
          }
          {
            const ss = baseDraft.outlines.sourceSections;
            if (ss) {
              _projectParts.push(ss.characterProfileText ?? "", ss.storyBackgroundText ?? "", ss.storySynopsisText ?? "", ss.worldSettingText ?? "", ss.backstoryText ?? "");
              for (const epText of (ss.episodeOutlineText ?? [])) {
                if (epText?.trim()) _projectParts.push(epText);
              }
            }
          }
          const _macroText = baseDraft.outlines.macro;
          if (_macroText?.trim()) _projectParts.push(_macroText);
          const projectSourceText = _projectParts.filter(Boolean).join("\n");
          // 项目内已出现的词从禁止词中豁免
          const effectiveBannedTerms = bannedTerms.filter((term) => !projectSourceText.includes(term));
          const bannedTermsHit = effectiveBannedTerms.filter((t) => rawContent.includes(t));

          // 5. 判断是否拦截
          const coreEntityHit = matchedAnchors.filter((a) => charNames.includes(a) || a.length >= 3).length;
          const hasCoreEntity = coreEntityHit >= 2;
          const hasActionOrResult = matchedActions.length >= 2 || matchedResults.length >= 2;
          const hasBannedTerm = bannedTermsHit.length > 0;
          const totalHit = matchedAnchors.length + matchedActions.length + matchedResults.length;

          const shouldBlock =
            hasBannedTerm ||
            (!hasCoreEntity && totalHit === 0) ||
            (matchedGroups === 0 && !hasCoreEntity);

          if (shouldBlock) {
            const reason = hasBannedTerm
              ? `正文包含非本项目套路词：${bannedTermsHit.join("、")}`
              : !hasCoreEntity && totalHit === 0
                ? "正文与当前集大纲完全无关联"
                : "正文与当前集大纲事件组匹配不足";
            lastScriptQualityFailReasonRef.current = `故事漂移校验不通过：${reason}`;
            setErrorMessage(`${reason}，本次未保存。（ERR_SCRIPT_STORY_DRIFT）`);
            console.warn("[original-studio] script story drift blocked", {
              episode: targetEpisode,
              outlineAnchors: outlineAnchors.slice(0, 20),
              matchedAnchors,
              matchedActions,
              matchedResults,
              matchedGroups,
              bannedTermsHit,
              effectiveBannedTerms,
              allowedByProjectSource: bannedTerms.filter((t) => projectSourceText.includes(t)),
              reason,
            });
            return;
          }
        }

        // ── 正文完整性校验：防止截断/未完成内容覆盖旧正文 ──
        {
          const tailLen = 120;
          const tailText = rawContent.slice(-tailLen);
          // 1. 结尾必须有完整句结束符
          const sentenceEnders = /[。？！……」》）】\.?!]/;
          const lastLine = rawContent.split("\n").filter(Boolean).pop() ?? "";
          const hasSentenceEnder = sentenceEnders.test(tailText);
          // 2. 最后一行是明显未完成动作或台词（冒号结尾）
          const isUnfinishedLine =
            (/^[\u4e00-\u9fff]{2,4}[：:]$/.test(lastLine.trim())) ||
            (lastLine.trim().endsWith("：") || lastLine.trim().endsWith(":"));
          // 3. 当前集大纲有钩子时，检查正文末尾是否命中钩子核心词
          const epPlan = baseDraft.outlines.episodesStructured?.find((e) => e.episodeNumber === targetEpisode);
          const outlineHookMatch = episodeOutline.match(/钩子[:：]\s*([^\n]+)/);
          const outlineHookText = outlineHookMatch?.[1]?.trim() ?? "";
          const hookText = epPlan?.hook?.trim() || outlineHookText;
          let matchedHookTerms: string[] = [];
          if (hookText) {
            // 从钩子文本中提取中文二字词作为关键词（滑动窗口，避免4字贪婪分块导致边界断裂词）
            const hookBigrams: string[] = [];
            for (let i = 0; i < hookText.length - 1; i++) {
              const bigram = hookText.slice(i, i + 2);
              if (/^[\u4e00-\u9fff]{2}$/.test(bigram)) hookBigrams.push(bigram);
            }
            const uniqueHookTerms = [...new Set(hookBigrams)];
            const bodyTail = rawContent.slice(-200);
            matchedHookTerms = uniqueHookTerms.filter((t) => bodyTail.includes(t));
          }
          const hasHookMatch = !hookText || matchedHookTerms.length >= 1;
          // 4. 结构化闪回必须配套闪出/回到现实
          // 只检测行首结构化标记，不误伤普通叙述中的"回忆/想起/闪过"
          const _collectIndices = (text: string, regexes: RegExp[]): number[] => {
            const idx: number[] = [];
            for (const r of regexes) for (const m of text.matchAll(r)) idx.push(m.index!);
            return idx;
          };
          const fbStarts = _collectIndices(rawContent, [
            /^【闪回】/gm, /^闪回\s*[：:]/gm, /^闪回开始/gm, /^闪回画面\s*[：:]/gm,
            /^回忆画面\s*[：:]/gm, /^FLASHBACK/gim,
          ]).sort((a, b) => a - b);
          const fbEnds = _collectIndices(rawContent, [
            /^【闪出】/gm, /^闪出/gm, /^闪回结束/gm, /^回到现实/gm,
            /^回到当前/gm, /^现实中/gm, /^END FLASHBACK/gim,
          ]).sort((a, b) => a - b);
          // 配对：每个开始标记后面需要一个结束标记
          let unmatchedStarts = 0;
          let endPtr = 0;
          for (const startPos of fbStarts) {
            while (endPtr < fbEnds.length && fbEnds[endPtr] <= startPos) endPtr++;
            if (endPtr < fbEnds.length) { endPtr++; }
            else { unmatchedStarts++; }
          }
          const hasUnclosedFlashback = unmatchedStarts > 0;
          // 5. 最后一行 △ 动作行截断检测：以未完成动作/连接词/非句尾标点收尾
          const trimmedLastLine = lastLine.trim();
          const hasTerminalPunctuation = /[。？！……」》）】.!?]$/.test(trimmedLastLine);
          const danglingTailPattern =
            /(重新打开|继续打开|刚要|正要|准备|试图|开始|继续|重新|突然|忽然|接着|然后|把|将|向|朝|对|在|从|被|给|让)$/;
          const isDanglingActionLine =
            /^△/.test(trimmedLastLine) &&
            !hasTerminalPunctuation &&
            (danglingTailPattern.test(trimmedLastLine) || /[，、：；]$/.test(trimmedLastLine));

          const isIncomplete =
            !hasSentenceEnder ||
            isUnfinishedLine ||
            !hasHookMatch ||
            hasUnclosedFlashback ||
            isDanglingActionLine;

          if (isIncomplete) {
            const reasons: string[] = [];
            if (!hasSentenceEnder) reasons.push("结尾无完整句结束符");
            if (isUnfinishedLine) reasons.push("最后一行疑似未完成（人名+冒号结尾）");
            if (!hasHookMatch && hookText) reasons.push("结尾未命中钩子核心词");
            if (hasUnclosedFlashback) reasons.push("检测到结构化闪回段落，但未检测到配套的「闪出/闪回结束/回到现实」");
            if (isDanglingActionLine) reasons.push("最后动作行疑似截断");
            console.warn("[original-studio] script incomplete check", {
              episode: targetEpisode,
              reason: "incomplete_ending",
              tailText,
              hookText,
              matchedHookTerms,
              reasons,
              hasSentenceEnder,
              isUnfinishedLine,
              hasHookMatch,
              hasUnclosedFlashback,
              isDanglingActionLine,
            });
            const reasonDetail = reasons.join("；");
            lastScriptQualityFailReasonRef.current = `正文完整性校验不通过：${reasonDetail}`;
            setErrorMessage(`正文疑似未完整生成（${reasonDetail}），本次未保存。请重试。（ERR_SCRIPT_INCOMPLETE）`);
            return;
          }
        }

        const nextEpisodeScript = {
          episode: `第${targetEpisode}集`,
          content: rawContent,
          batches: scriptPayload.batches ?? previousEpisodeScript.batches ?? [],
          currentBatchId: scriptPayload.currentBatchId ?? previousEpisodeScript.currentBatchId,
          qualityCheck: scriptPayload.qualityCheck ?? previousEpisodeScript.qualityCheck,
        };
        nextDraft = {
          ...baseDraft,
          episodeScripts: {
            ...(baseDraft.episodeScripts ?? {}),
            [key]: nextEpisodeScript,
          },
        };

        // P1-ClientBridge: merge pending review report from SSE review event
        if (pendingReviewReportRef.current) {
          const report = pendingReviewReportRef.current;
          pendingReviewReportRef.current = null;
          const prevReports = Array.isArray(nextDraft.qualityReports) ? nextDraft.qualityReports : [];
          nextDraft = {
            ...nextDraft,
            qualityReports: [report, ...prevReports].slice(0, 8),
          };
        }

        // Persist thinking (via ref) into draft generationTrace
        const currentThinking = episodeReasoningRef.current[targetEpisode];
        if (currentThinking) {
          nextDraft = {
            ...nextDraft,
            generationTrace: {
              ...(nextDraft.generationTrace ?? {}),
              episodeThinking: {
                ...(nextDraft.generationTrace?.episodeThinking ?? {}),
                [key]: currentThinking,
              },
            },
          };
        }

        break;
      }
    }

    const payload = getStepPayload(nextDraft, result.step);
    const version = createVersion({
      step: result.step,
      payload,
      source: result.source,
    });

    updateProject(
      (current) => ({
        ...current,
        draft: nextDraft,
        title: nextDraft.title,
        versionHistory: {
          ...current.versionHistory,
          [result.step]: [version, ...current.versionHistory[result.step]].slice(0, 12),
        },
        updatedAt: new Date().toISOString(),
      }),
      `AI 已生成并保存版本 · ${new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    );

    // Immediately persist to localStorage after generation applies
    // (useEffect may not flush before page close)
    try {
      const updatedProjects = projects.map((item) =>
        item.id === currentProject?.id
          ? {
              ...item,
              draft: nextDraft,
              title: nextDraft.title,
              versionHistory: {
                ...item.versionHistory,
                [result.step]: [version, ...item.versionHistory[result.step]].slice(0, 12),
              },
              updatedAt: new Date().toISOString(),
            }
          : item,
      );
      safeSetLocalStorageItem(PROJECTS_STORAGE_KEY, JSON.stringify(updatedProjects));
    } catch {}

    // Flush DB save immediately after generation completes
    if (currentProject) {
      const flushProject: ProjectRecord = {
        ...currentProject,
        draft: nextDraft,
        title: nextDraft.title,
        versionHistory: {
          ...currentProject.versionHistory,
          [result.step]: [version, ...currentProject.versionHistory[result.step]].slice(0, 12),
        },
        updatedAt: new Date().toISOString(),
      };
      flushDraftSave(flushProject);
    }
  };

  // ── script 正文质量校验（独立函数，供 applyGeneration 和 generateStep 共用）──
  const validateScriptContent = (
    rawContent: string,
    projectBriefWordTarget: number,
    projectBriefSceneLimit: number,
  ): { ok: true; sceneCount: number; warn?: "single_scene" } | { ok: false; reason: "too_short" | "zero_scenes" | "too_many_scenes"; contentLength: number; minLength: number; sceneCount: number } => {
    // 统计中文字符数（统一使用中文字符计数，不含标点空格英文）
    const chineseCharCount = countScriptChineseChars(rawContent);
    const minChars = Math.max(300, Math.floor(projectBriefWordTarget * 0.75));
    if (chineseCharCount < minChars) {
      return { ok: false, reason: "too_short", contentLength: chineseCharCount, minLength: minChars, sceneCount: 0 };
    }
    // 统计场景数：优先投稿模板头（1-1 日 外 地点），兼容旧格式
    const countScriptScenes = (content: string): number => {
      const templateMatches = content.match(/^\d+-\d+\s+[日夜]\s+[内外]\s+.+$/gm);
      const legacyMatches = content.match(/^第\d+场/gm);
      return Math.max(templateMatches?.length ?? 0, legacyMatches?.length ?? 0);
    };
    const sceneCount = countScriptScenes(rawContent);
    if (sceneCount === 0) {
      return { ok: false, reason: "zero_scenes", contentLength: chineseCharCount, minLength: minChars, sceneCount: 0 };
    }
    // sceneCount > sceneLimitPerEpisode：超上限，硬失败
    if (sceneCount > projectBriefSceneLimit) {
      return { ok: false, reason: "too_many_scenes", contentLength: chineseCharCount, minLength: minChars, sceneCount };
    }
    // sceneCount=1 且字数达标：允许保存，warning
    if (sceneCount === 1) {
      return { ok: true, sceneCount, warn: "single_scene" };
    }
    return { ok: true, sceneCount };
  };

  const generateAllOutlineBatches = async () => {
    if (!isAuthenticated) return;
    const generationTask = "rough" as const;
    setIsGenerating("outlines");
    setOutlineGenerationTask(generationTask);
    setOutlineGenerationPhase("");
    setErrorMessage("");
    setOutlinesErrorMessage("");
    setStreamPreview("");

    try {
      const requestDraft = {
        ...draft,
        outlines: {
          ...draft.outlines,
          macro: sanitizeOutlineMacro(draft.outlines.macro),
        },
      };

      const result = await generateOriginalPayload({
        step: "outlines",
        outlineGenerationMode: "batch_rough_outlines",
        totalEpisodeCount: projectBriefEpisodeCount,
        draft: requestDraft,
        providerConfig,
      });
      setStreamPreview(JSON.stringify(result.payload, null, 2));
      applyGeneration(result, undefined, { outlineTask: generationTask });
      window.dispatchEvent(new Event("sboard:aura-refresh"));
    } catch (error) {
      console.warn("[original-studio] rough outlines generation failed", error);
      const msg = toProductErrorMessage(error);
      setErrorMessage(msg);
      setOutlinesErrorMessage(msg);
    } finally {
      setIsGenerating(null);
      setOutlineGenerationTask(null);
      setOutlineGenerationPhase("");
      setTimeout(() => setStreamPreview(""), 1200);
    }
  };

  const generateCurrentBatchEpisodes = async () => {
    if (!isAuthenticated) return;
    const configuredTargetEpisodeCount = Math.max(
      1,
      Math.trunc(projectBriefEpisodeCount ?? 60),
    );
    const totalEpisodeCount = Math.max(
      configuredTargetEpisodeCount,
      draft.outlines.episodes.length,
      previewOutlines.episodes.length,
      0,
    );
    const episodeBatches = buildEpisodeBatches(
      totalEpisodeCount,
      previewOutlines.episodes.length > 0 ? previewOutlines.episodes : draft.outlines.episodes,
    );
    const selectedBatch = episodeBatches[selectedArcIndex] ?? episodeBatches[0];
    const selectedOutlineBatch =
      previewOutlines.outlineBatches?.find((batch) =>
        getOutlineBatchKey(batch) === getOutlineBatchKey(selectedBatch) ||
        batch.batchIndex === selectedBatch.batchIndex ||
        (batch.startEpisode === selectedBatch.startEpisode && batch.endEpisode === selectedBatch.endEpisode),
      ) ?? null;
    const roughOutline = selectedOutlineBatch?.roughOutline?.trim() ?? "";

    if (!roughOutline) {
      setOutlinesErrorMessage("请先生成并保存粗纲，再生成分集大纲");
      return;
    }

    const generationTask = "episodes" as const;
    setIsGenerating("outlines");
    setOutlineGenerationTask(generationTask);
    setErrorMessage("");
    setOutlinesErrorMessage("");
    setStreamPreview("");

    try {
      const requestDraft = {
        ...draft,
        outlines: {
          ...draft.outlines,
          macro: sanitizeOutlineMacro(draft.outlines.macro),
        },
      };

      const result = await generateOriginalPayload({
        step: "outlines",
        outlineGenerationMode: "batch_episodes",
        batchIndex: selectedBatch.batchIndex,
        startEpisode: selectedBatch.startEpisode,
        endEpisode: selectedBatch.endEpisode,
        roughOutline,
        totalEpisodeCount,
        draft: requestDraft,
        providerConfig,
      });
      setStreamPreview(JSON.stringify(result.payload, null, 2));
      applyGeneration(result, undefined, { outlineTask: generationTask, batchStartEpisode: selectedBatch.startEpisode, batchEndEpisode: selectedBatch.endEpisode });
      window.dispatchEvent(new Event("sboard:aura-refresh"));
    } catch (error) {
      console.warn("[original-studio] episodes generation failed", error);
      const msg = toProductErrorMessage(error);
      setErrorMessage(msg);
      setOutlinesErrorMessage(msg);
    } finally {
      setIsGenerating(null);
      setOutlineGenerationTask(null);
      setTimeout(() => setStreamPreview(""), 1200);
    }
  };

  /**
   * 按上传大纲生成人物：先识别原文结构，再生成人物小传
   * 只在 adaptation.status === "applied" 且 sourceSections 存在时可用
   */
  const handleGenerateCharactersFromSourceOutline = async () => {
    if (!isAuthenticated) return;

    // 前置条件检查
    const adaptation = draft.adaptation?.status === "applied" ? draft.adaptation : null;
    const sourceSections = draft.outlines.sourceSections;
    if (!adaptation || !sourceSections) {
      setErrorMessage("当前项目不是改编项目或缺少原文分段数据");
      return;
    }

    setIsGenerating("characters");
    setErrorMessage("");
    setStreamPreview("");

    let workingDraft = draft;

    try {
      // 检查是否已有 sourceMaterialExtraction，避免重复扣费
      const hasExtraction = (adaptation.sourceMaterialExtraction?.characters?.length ?? 0) > 0;

      if (!hasExtraction) {
        // 需要先调用 source-material-extraction API
        setStreamPreview("正在识别原文人物与设定...");

        const extraction = await extractSourceMaterialPayload(sourceSections);

        if (!extraction || !extraction.characters?.length) {
          throw new Error("原文结构识别失败，未能识别出人物信息。可改用「按故事梗概生成人物」。");
        }

        // 保存 extraction 到 draft.adaptation.sourceMaterialExtraction
        workingDraft = {
          ...draft,
          adaptation: {
            ...adaptation,
            sourceMaterialExtraction: extraction,
          },
        };

        // 更新本地 draft
        updateDraft((current) => ({
          ...current,
          adaptation: {
            ...current.adaptation!,
            sourceMaterialExtraction: extraction,
          },
        }));

        setStreamPreview("识别完成，正在生成人物小传...");
      } else {
        setStreamPreview("已有原文识别结果，正在生成人物小传...");
      }

      // 调用 characters 生成
      const draftForGeneration = workingDraft;
      const result = await generateOriginalPayload({ step: "characters", draft: draftForGeneration, providerConfig });
      setStreamPreview(JSON.stringify(result.payload, null, 2));
      applyGeneration(result, draftForGeneration);
      window.dispatchEvent(new Event("sboard:aura-refresh"));
    } catch (error) {
      console.warn("[original-studio] characters generation failed", error);
      const msg = toProductErrorMessage(error);
      setErrorMessage(msg);
    } finally {
      setIsGenerating(null);
      setTimeout(() => setStreamPreview(""), 1200);
    }
  };

  const generateStep = async (step: OriginalStep, options?: { scriptEpisode?: number }) => {
    setIsGenerating(step);
    setOutlineGenerationTask(step === "outlines" ? "rough" : null);
    setErrorMessage("");
    if (step === "outlines") setOutlinesErrorMessage("");
    setStreamPreview("");
    const targetEpisode = step === "script" && typeof options?.scriptEpisode === "number"
      ? Math.max(1, Math.min(options.scriptEpisode, episodeCountForScript))
      : clampedSelectedScriptEpisode;
    const capturedScriptEpisode = step === "script" ? targetEpisode : undefined;

    try {
      if (step === "script" && capturedScriptEpisode) {
        lastScriptAttemptRef.current = {
          attemptId: generateAttemptId(capturedScriptEpisode),
          projectId: currentProject?.id ?? "unknown",
          currentEpisode: capturedScriptEpisode,
          ruleKey: "generate_full_script",
        };
      }
      const result = await generateOriginalPayload({
        step,
        draft,
        providerConfig,
        currentEpisode: capturedScriptEpisode,
      });
      setStreamPreview(JSON.stringify(result.payload, null, 2));
      applyGeneration(result, undefined, { scriptEpisode: capturedScriptEpisode });
      window.dispatchEvent(new Event("sboard:aura-refresh"));

      if (step === "script" && capturedScriptEpisode) {
        const scriptText = (result.payload as ScriptDraft)?.content ?? "";
        if (scriptText.trim()) {
          const localAudit = buildLocalScriptAudit({
            projectId: currentProject?.id,
            episodeNumber: capturedScriptEpisode,
            scriptText,
            targetWordCount: projectBriefWordTarget,
          });
          updateDraft((d) => {
            const prevReports = Array.isArray(d.qualityReports) ? d.qualityReports : [];
            const withoutOldLocal = prevReports.filter(
              (r) => !(r.source === "local_static" && r.episodeNumber === capturedScriptEpisode),
            );
            return { ...d, qualityReports: [localAudit, ...withoutOldLocal].slice(0, 8) };
          });
        }
        lastScriptAttemptRef.current = null;
      }
    } catch (error) {
      console.warn("[original-studio] step generation failed", error);
      if (step === "script" && capturedScriptEpisode) {
        await refundFailedScriptGeneration(error instanceof Error ? error.message : String(error ?? ""), "generation_rejected");
        window.dispatchEvent(new Event("sboard:aura-refresh"));
        lastScriptAttemptRef.current = null;
      }
      const msg = toProductErrorMessage(error);
      setErrorMessage(msg);
      if (step === "outlines") setOutlinesErrorMessage(msg);
    } finally {
      setIsGenerating(null);
      setOutlineGenerationTask(null);
      setTimeout(() => setStreamPreview(""), 1200);
    }
  };

  // ── 批量生成正文：从最早缺集开始串行生成最多 5 集 ──
  const handleBatchGenerateScripts = async () => {
    if (!isAuthenticated || !currentProject) return;

    const outlineCount = draft.outlines.episodes?.length ?? 0;
    if (outlineCount === 0) {
      setErrorMessage("请先生成分集大纲，再生成正文");
      return;
    }

    const episodes = getNextPendingScriptEpisodes(draft, 5);
    if (episodes.length === 0) {
      setErrorMessage("暂无待生成正文的集数，所有已有分集大纲的集数均已完成正文生成");
      return;
    }

    setIsBatchGenerating(true);
    setIsGenerating("script");
    setBatchProgress({ current: 0, total: episodes.length, currentEpisode: episodes[0] });
    setBatchResult(null);
    setErrorMessage("");
    setStreamPreview("");
    lastScriptQualityFailReasonRef.current = "";

    let completed = 0;

    for (const epNumber of episodes) {
      setBatchProgress({ current: completed, total: episodes.length, currentEpisode: epNumber });
      setSelectedScriptEpisode(epNumber);
      setStreamPreview("");

      try {
        // 每次请求使用 latestProjectRef 获取最新 draft，确保前情上下文准确
        const latestDraft = latestProjectRef.current?.draft ?? draft;
        const attemptId = generateAttemptId(epNumber);
        const body: Record<string, unknown> = {
          step: "script",
          draft: latestDraft,
          providerConfig,
          currentEpisode: epNumber,
          attemptId,
        };
        lastScriptAttemptRef.current = {
          attemptId,
          projectId: currentProject?.id ?? "unknown",
          currentEpisode: epNumber,
          ruleKey: "generate_full_script",
        };
        const result = await generateOriginalPayload({
          step: "script",
          draft: latestDraft,
          providerConfig,
          currentEpisode: epNumber,
        });
        setStreamPreview(JSON.stringify(result.payload, null, 2));
        const draftForApply = latestProjectRef.current?.draft ?? latestDraft;
        applyGeneration(result, draftForApply, { scriptEpisode: epNumber });

        // 等待 React state 更新 + DB flush save 完成
        await new Promise((r) => setTimeout(r, 200));

        // 验证当前集正文已成功写入
        const updatedDraft = latestProjectRef.current?.draft;
        const key = String(epNumber);
        const savedScript =
          updatedDraft?.episodeScripts?.[key] ??
          (epNumber === 1 ? updatedDraft?.script : undefined);
        if ((savedScript?.content?.trim()?.length ?? 0) === 0) {
          // applyGeneration 已通过 setErrorMessage 告知用户具体失败原因
          throw new Error(`第 ${epNumber} 集正文未通过质量校验`);
        }

        completed++;
      } catch (error) {
        console.warn("[original-studio] batch script generation failed", error);
        // 优先使用 applyGeneration 质量校验内部暂存的具体失败原因
        const qualityFailReason = lastScriptQualityFailReasonRef.current;
        // 已完成集范围描述
        const completedRange =
          completed === 0
            ? "尚未完成任何集。"
            : `已完成第 ${episodes[0]}-${episodes[0] + completed - 1} 集并保存；`;
        const continueHint = `下次点击"批量生成 5 集"将从第 ${epNumber} 集继续。`;
        let detailMsg: string;
        if (qualityFailReason) {
          // 质量校验失败：展示具体校验原因
          detailMsg = `第 ${epNumber} 集生成失败：正文未通过质量校验。${completedRange}第 ${epNumber} 集尚未生成。${continueHint}\n校验原因：${qualityFailReason}`;
        } else {
          // 非质量校验失败：根据 error message 分类展示
          const rawMsg = error instanceof Error ? error.message : String(error ?? "");
          const rawLower = rawMsg.toLowerCase();

          if (rawLower.includes("ai_json_truncated") || rawLower.includes("疑似被截断") || rawLower.includes("截断")) {
            // 截断：直接展示 API 返回的详细文案（已含建议）
            detailMsg = `第 ${epNumber} 集生成失败。${completedRange}第 ${epNumber} 集尚未生成。${continueHint}\n${rawMsg}`;
          } else if (rawLower.includes("err_parse_001") || rawLower.includes("生成结果异常") || rawLower.includes("ai_json_parse_failed") || rawLower.includes("ai_json_no_object_found")) {
            // 解析失败：明确说明非质量校验问题
            detailMsg = `第 ${epNumber} 集生成失败。${completedRange}第 ${epNumber} 集尚未生成。${continueHint}\n生成结果解析失败，正文未保存。请重试生成；如果连续失败，可能是模型返回格式不完整。`;
          } else {
            // 其他错误：兜底展示
            const productMsg = toProductErrorMessage(error);
            detailMsg = `第 ${epNumber} 集生成失败。${completedRange}第 ${epNumber} 集尚未生成。${continueHint}\n错误：${productMsg}`;
          }
          // 输出完整 error 对象到 console，供排查（不打印正文全文）
          console.error("[original-studio] batch script error (non-quality)", { episode: epNumber, error: rawMsg.slice(0, 300) });
        }
        setBatchResult({ error: detailMsg });
        setErrorMessage(`第 ${epNumber} 集失败，已完成 ${completed}/${episodes.length} 集`);
        // 退款：在清 ref 前调用
        if (qualityFailReason) {
          await refundFailedScriptGeneration(qualityFailReason, "quality_check_failed");
        } else {
          const rawMsgForRefund = error instanceof Error ? error.message : String(error ?? "");
          const rawLowerForRefund = rawMsgForRefund.toLowerCase();
          const failureType =
            rawLowerForRefund.includes("ai_json_truncated") || rawLowerForRefund.includes("截断") ? "json_truncated"
            : rawLowerForRefund.includes("err_parse_001") || rawLowerForRefund.includes("生成结果异常") || rawLowerForRefund.includes("ai_json_parse") ? "parse_failed"
            : "generation_rejected";
          await refundFailedScriptGeneration(rawMsgForRefund, failureType);
        }
        window.dispatchEvent(new Event("sboard:aura-refresh"));
        lastScriptAttemptRef.current = null;
        // 重置 ref 防止泄漏到下一轮
        lastScriptQualityFailReasonRef.current = "";
        break;
      }
    }

    setIsBatchGenerating(false);
    setIsGenerating(null);
    setBatchProgress({ current: completed, total: episodes.length, currentEpisode: 0 });
    setTimeout(() => setStreamPreview(""), 1200);

    if (completed === episodes.length && completed > 0) {
      setBatchResult({ success: `已成功生成 ${completed} 集正文` });
      setErrorMessage("");
      window.dispatchEvent(new Event("sboard:aura-refresh"));
    }
  };

  const activeTabIndex = Math.max(
    tabs.findIndex((tab) => tab.id === activeStep),
    0,
  );

  return (
    <WorkspaceFrame
      primaryItems={[
        { key: "original", label: "剧本原创", href: "/workspace/original", icon: "original", active: activeStep !== "settings" },
        { key: "rewrite", label: "剧本改写", href: "/workspace/rewrite", icon: "rewrite" },
      ]}
      contentClassName="p-5 md:p-8"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-slate-400 tracking-wide">剧本原创</p>
          <div className="mt-1 flex items-center gap-2">
            <input
              ref={titleInputRef}
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value.slice(0, 48))}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              placeholder="未命名项目"
              className="text-4xl md:text-5xl font-bold tracking-tight bg-transparent text-white placeholder:text-slate-600 outline-none border-b-2 border-transparent hover:border-white/20 focus:border-white/40 transition-colors w-full max-w-2xl"
            />
            <button
              onClick={handleRegenerateTitle}
              aria-label="重新取名"
              title="重新取名"
              className="shrink-0 rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white hover:bg-white/6 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>
            <div className="relative shrink-0">
              <button
                onClick={() => setThinkingPanelOpen((v) => !v)}
                aria-label="查看生成思路"
                title="查看生成思路"
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  thinkingPanelOpen
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 text-slate-400 hover:text-white hover:bg-white/6"
                }`}
              >
                💭 思路
              </button>
              {/* 生成思路悬浮框 */}
              {thinkingPanelOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 w-[560px] max-w-[calc(100vw-2rem)] max-h-[280px]">
                  <ScriptThinkingPanel
                    reasoningText={episodeReasoning[clampedSelectedScriptEpisode]}
                    isGenerating={isGenerating === "script" || isBatchGenerating}
                    episodeNumber={clampedSelectedScriptEpisode}
                  />
                </div>
              )}
            </div>
          </div>
          {generationSource && (
            <p className="mt-1.5 text-sm text-slate-400">
              当前生成来源：{generationSource === "aliyun" ? "阿里模型" : "本地 mock"}
            </p>
          )}
          {/* Data Flow Inspector JSX removed; debug data available via console.info only */}
          {/* ORIGINAL_DEBUG_INSPECTOR=true + admin -> console.info("[OriginalStudioDataFlow]", ...) */}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {activeStep === "settings" ? (
          <SettingsPanel />
            ) : (
              <>
                {errorMessage && (
                  <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {errorMessage}
                  </div>
                )}
                <Tabs value={activeStep as string} onValueChange={(val: string) => { if (val !== activeStep) void handleChangeStep(val as OriginalStep); }}>
                  <TabsList className="relative grid h-9 w-[520px] max-w-full grid-cols-4 items-center rounded-full border border-white/[0.08] bg-white/[0.035] p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    {/* Absolute sliding indicator */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-0.5 top-0.5 rounded-full bg-white/[0.11] shadow-[0_6px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-300 ease-out"
                      style={{
                        left: "0.125rem",
                        width: "calc((100% - 0.25rem) / 4)",
                        transform: `translateX(${activeTabIndex * 100}%)`,
                      }}
                    />
                    {tabs.map((tab) => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="relative z-10 h-8 min-w-0 rounded-full px-2 text-center text-sm font-medium leading-none text-white/50 transition-colors duration-200 hover:text-white/80 data-active:bg-transparent data-active:text-white data-active:shadow-none after:hidden"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {activeStep === "overview" && (
                <div className="grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <section className="min-h-0 overflow-hidden">
                    <div className="mb-4 flex items-center justify-between gap-2 pr-1">
                      <div>
                        <h2 className="text-lg font-semibold text-white">故事设定</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => router.push(`/workspace/original/inspiration?projectId=${resolvedProjectId}`)}
                          disabled={!isAuthenticated}
                          className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3.5 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/15 disabled:opacity-60"
                        >
                          {!isAuthenticated ? "需要登录后使用" : overviewDone > 0 ? "重新策划" : "开始策划"}
                        </button>
                        <button
                          onClick={() => generateStep("overview")}
                          disabled={!isAuthenticated || isGenerating === "overview"}
                          className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                            !isAuthenticated || isGenerating === "overview"
                              ? "cursor-not-allowed bg-white/10 text-slate-500"
                              : "bg-linear-to-r from-cyan-400 to-violet-500 text-slate-950 hover:opacity-90"
                          }`}
                        >
                          {isGenerating === "overview" ? "生成中..." : "AI 重新生成"}
                        </button>
                      </div>
                    </div>

                    <ScrollArea className="h-[calc(100vh-300px)] pr-3">
                    <div className="space-y-4 pr-3">
                      {resolvedOverviewScriptType === "ai_comic" ? (
                        <>
                          <div className="grid gap-3 lg:grid-cols-2">
                            <div className="space-y-1.5">
                              <div className="text-xs font-medium text-slate-300">目标受众*</div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleAudienceClick("男频")}
                                  className={`flex h-8 items-center justify-center rounded-full border px-3 text-xs font-medium transition ${
                                    storyAudienceDisplayValue === "男频"
                                      ? "border-cyan-300/70 bg-cyan-400/12 text-cyan-50"
                                      : "border-slate-700/80 bg-[#111317] text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-white"
                                  }`}
                                >
                                  男频
                                </button>
                                <button
                                  onClick={() => handleAudienceClick("女频")}
                                  className={`flex h-8 items-center justify-center rounded-full border px-3 text-xs font-medium transition ${
                                    storyAudienceDisplayValue === "女频"
                                      ? "border-cyan-300/70 bg-cyan-400/12 text-cyan-50"
                                      : "border-slate-700/80 bg-[#111317] text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-white"
                                  }`}
                                >
                                  女频
                                </button>
                              </div>
                            </div>

                            <CategorizedMultiDropdown
                              label="核心设定*（不超3个）"
                              placeholder=""
                              categories={currentCoreHooks}
                              value={storyCoreHookValues}
                              onChange={handleCoreHookTagsChange}
                              maxCount={3}
                              menuColumns={2}
                              customInputPlacement="trigger"
                              hidePlaceholderText
                            />
                          </div>

                          <div className="grid gap-3 lg:grid-cols-2">
                            <MultiTagDropdown
                              label="题材类型*（不超3个）"
                              placeholder=""
                              options={storyGenreOptions}
                              value={storyGenreValues}
                              onChange={handleGenreTagsChange}
                              maxCount={3}
                              menuColumns={4}
                              customInputPlacement="trigger"
                              hidePlaceholderText
                            />

                            <CategorizedMultiDropdown
                              label="风格元素（不超5个）"
                              placeholder="选择或自定义输入风格"
                              categories={currentStyleTags}
                              value={storyStyleValues}
                              onChange={handleStyleTagsChange}
                              maxCount={5}
                              customInputPlacement="trigger"
                              hidePlaceholderText
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid gap-3 lg:grid-cols-2">
                            <div className="space-y-1.5">
                              <div className="text-xs font-medium text-slate-300">目标受众*</div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleAudienceClick("男频")}
                                  className={`flex h-8 items-center justify-center rounded-full border px-3 text-xs font-medium transition ${
                                    storyAudienceDisplayValue === "男频"
                                      ? "border-cyan-300/70 bg-cyan-400/12 text-cyan-50"
                                      : "border-slate-700/80 bg-[#111317] text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-white"
                                  }`}
                                >
                                  男频
                                </button>
                                <button
                                  onClick={() => handleAudienceClick("女频")}
                                  className={`flex h-8 items-center justify-center rounded-full border px-3 text-xs font-medium transition ${
                                    storyAudienceDisplayValue === "女频"
                                      ? "border-cyan-300/70 bg-cyan-400/12 text-cyan-50"
                                      : "border-slate-700/80 bg-[#111317] text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-white"
                                  }`}
                                >
                                  女频
                                </button>
                                <button
                                  onClick={() => handleAudienceClick("银发")}
                                  className={`flex h-8 items-center justify-center rounded-full border px-3 text-xs font-medium transition ${
                                    storyAudienceDisplayValue === "银发"
                                      ? "border-cyan-300/70 bg-cyan-400/12 text-cyan-50"
                                      : "border-slate-700/80 bg-[#111317] text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-white"
                                  }`}
                                >
                                  银发
                                </button>
                              </div>
                            </div>

                            <MultiTagDropdown
                              label="题材类型*（不超3个）"
                              placeholder=""
                              options={storyGenreOptions}
                              value={storyGenreValues}
                              onChange={handleGenreTagsChange}
                              maxCount={3}
                              menuColumns={4}
                              customInputPlacement="trigger"
                              hidePlaceholderText
                            />
                          </div>

                          <div className="grid gap-3 lg:grid-cols-2">
                            <MultiTagDropdown
                              label="时代背景*（不超3个）"
                              placeholder=""
                              options={[...SHORT_DRAMA_ERA_OPTIONS]}
                              value={storyEraValues}
                              onChange={handleEraValueChange}
                              maxCount={3}
                              allowCustom={false}
                              menuColumns={4}
                              customInputPlacement="trigger"
                              hidePlaceholderText
                            />

                            <CategorizedMultiDropdown
                              label="核心设定*（不超5个）"
                              placeholder=""
                              categories={currentCoreHooks}
                              value={storyCoreHookValues}
                              onChange={handleCoreHookTagsChange}
                              maxCount={5}
                              menuColumns={2}
                              customInputPlacement="trigger"
                              hidePlaceholderText
                            />
                          </div>

                        </>
                      )}

                      {/* 候选标签警告：AI 生成后，未匹配标签库的标签 */}
                      {(previewOverview.candidateTags?.genres.length ||
                        previewOverview.candidateTags?.coreHooks.length ||
                        previewOverview.candidateTags?.styleTags.length) ? (
                        <div className="rounded-xl border border-amber-400/25 bg-amber-500/5 px-4 py-3">
                          <div className="flex items-start gap-2">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0 text-amber-400">
                              <path d="M7 1L12.5 12H1.5L7 1Z" stroke="currentColor" strokeWidth="1.2" />
                              <path d="M7 5V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                              <circle cx="7" cy="10.5" r="0.6" fill="currentColor" />
                            </svg>
                            <div className="min-w-0 text-xs text-amber-200/80">
                              <p className="font-medium text-amber-300">检测到候选标签（待治理）</p>
                              <p className="mt-1">
                                以下标签未匹配当前标签库，暂不写入正式字段。请前往
                                <a href="/admin/content-governance/tags" target="_blank" className="mx-1 underline underline-offset-2 hover:text-amber-200">标签治理工作台</a>
                                进行标签入库后重新生成。
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {previewOverview.candidateTags?.genres.map((t) => (
                                  <span key={`c-genre-${t}`} className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200/70">
                                    [{t.length > 10 ? t.slice(0, 10) + "…" : t}]
                                  </span>
                                ))}
                                {previewOverview.candidateTags?.coreHooks.map((t) => (
                                  <span key={`c-hook-${t}`} className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200/70">
                                    [{t.length > 10 ? t.slice(0, 10) + "…" : t}]
                                  </span>
                                ))}
                                {previewOverview.candidateTags?.styleTags.map((t) => (
                                  <span key={`c-style-${t}`} className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200/70">
                                    [{t.length > 10 ? t.slice(0, 10) + "…" : t}]
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="group">
                        <h3 className="relative mb-[6px] text-sm font-medium leading-5 text-white/75">
                          {overviewWorldFieldLabel}
                          <span className="absolute right-0 top-[-5px] hidden group-hover:block">
                            <button
                              onClick={() => generateStep("overview")}
                              disabled={!isAuthenticated || isGenerating === "overview"}
                              className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-[4px] transition ${
                                !isAuthenticated || isGenerating === "overview"
                                  ? "cursor-not-allowed opacity-40"
                                  : "cursor-pointer hover:bg-[#18181b]"
                              }`}
                              aria-label="AI 生成"
                              title="AI 生成"
                            >
                              {isGenerating === "overview" ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M8 1.5L9.64 5.36L13.5 7L9.64 8.64L8 12.5L6.36 8.64L2.5 7L6.36 5.36L8 1.5Z" fill="white" fillOpacity="0.85" />
                                </svg>
                              )}
                            </button>
                          </span>
                        </h3>
                        <textarea
                          value={overviewWorldField}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              overview: resolvedOverviewScriptType === "ai_comic"
                                ? { ...current.overview, worldview: event.target.value }
                                : { ...current.overview, storyBackground: event.target.value, worldview: current.overview.worldview || event.target.value },
                            }), { userEdited: true })
                          }
                          placeholder={resolvedOverviewScriptType === "ai_comic"
                            ? "待确认"
                            : "待确认"}
                          className={`hide-scrollbar w-full rounded-xl border-0 bg-[#18181b] px-4 py-3 text-base font-normal leading-7 text-white outline transition placeholder:text-slate-400/50 min-h-[120px] ${
                            isGenerating === "overview"
                              ? "outline outline-1 outline-white/65"
                              : "outline-transparent hover:outline-white/65 focus:outline-white/65"
                          }`}
                        />
                      </div>

                      <div className="group">
                        <h3 className="relative mb-[6px] text-sm font-medium leading-5 text-white/75">
                          核心亮点（选填）
                          <span className="absolute right-0 top-[-5px] hidden group-hover:block">
                            <button
                              onClick={() => generateStep("overview")}
                              disabled={!isAuthenticated || isGenerating === "overview"}
                              className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-[4px] transition ${
                                !isAuthenticated || isGenerating === "overview"
                                  ? "cursor-not-allowed opacity-40"
                                  : "cursor-pointer hover:bg-[#18181b]"
                              }`}
                              aria-label="AI 生成"
                              title="AI 生成"
                            >
                              {isGenerating === "overview" ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M8 1.5L9.64 5.36L13.5 7L9.64 8.64L8 12.5L6.36 8.64L2.5 7L6.36 5.36L8 1.5Z" fill="white" fillOpacity="0.85" />
                                </svg>
                              )}
                            </button>
                          </span>
                        </h3>
                        <textarea
                          value={previewOverview.highlight}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              overview: {
                                ...current.overview,
                                highlight: event.target.value,
                              },
                            }), { userEdited: true })
                          }
                          placeholder="待确认"
                          className={`hide-scrollbar w-full rounded-xl border-0 bg-[#18181b] px-4 py-3 text-base font-normal leading-7 text-white outline transition placeholder:text-slate-400/50 min-h-[100px] ${
                            isGenerating === "overview"
                              ? "outline outline-1 outline-white/65"
                              : "outline-transparent hover:outline-white/65 focus:outline-white/65"
                          }`}
                        />
                      </div>

                      <div className="group">
                        <h3 className="relative mb-[6px] text-sm font-medium leading-5 text-white/75">
                          核心梗概*
                          <span className="absolute right-0 top-[-5px] hidden group-hover:block">
                            <button
                              onClick={() => generateStep("overview")}
                              disabled={!isAuthenticated || isGenerating === "overview"}
                              className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-[4px] transition ${
                                !isAuthenticated || isGenerating === "overview"
                                  ? "cursor-not-allowed opacity-40"
                                  : "cursor-pointer hover:bg-[#18181b]"
                              }`}
                              aria-label="AI 生成"
                              title="AI 生成"
                            >
                              {isGenerating === "overview" ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M8 1.5L9.64 5.36L13.5 7L9.64 8.64L8 12.5L6.36 8.64L2.5 7L6.36 5.36L8 1.5Z" fill="white" fillOpacity="0.85" />
                                </svg>
                              )}
                            </button>
                          </span>
                        </h3>
                        <textarea
                          value={previewOverview.premise}
                          onChange={(event) =>
                            updateDraft((current) => ({
                              ...current,
                              overview: {
                                ...current.overview,
                                premise: event.target.value,
                              },
                            }), { userEdited: true })
                          }
                          placeholder="待确认"
                          className={`hide-scrollbar w-full rounded-xl border-0 bg-[#18181b] px-4 py-3 text-base font-normal leading-7 text-white outline transition placeholder:text-slate-400/50 min-h-[180px] ${
                            isGenerating === "overview"
                              ? "outline outline-1 outline-white/65"
                              : "outline-transparent hover:outline-white/65 focus:outline-white/65"
                          }`}
                        />
                      </div>
                    </div>
                  </ScrollArea>
                  </section>

                  <aside className="xl:sticky xl:top-24 h-fit max-h-[calc(100vh-140px)] overflow-hidden">
                    <h2 className="mb-3 text-lg font-semibold text-white">项目约束</h2>
                    <div className="space-y-2">
                      <ProjectConstraintControl
                        label="总集数"
                        value={projectBriefEpisodeCount}
                        unit="集"
                        min={30}
                        max={120}
                        step={10}
                        normalizeValue={(next) => snapToPreset(next, [30, 40, 60, 80, 100, 120])}
                        onChange={(next) => commitEpisodeCount(next)}
                        ticks={[
                          { value: 30, label: "30" },
                          { value: 40, label: "40" },
                          { value: 60, label: "60" },
                          { value: 80, label: "80" },
                          { value: 100, label: "100" },
                          { value: 120, label: "120" },
                        ]}
                      />
                      <ProjectConstraintControl
                        label="单集时长"
                        value={projectBriefEpisodeDurationMinutes}
                        unit="分钟"
                        min={1}
                        max={5}
                        step={1}
                        onChange={(next) => commitProjectBriefField("episodeDuration", toEpisodeDurationValue(next), `单集时长已更新为 ${next} 分钟`)}
                        ticks={[
                          { value: 1, label: "1" },
                          { value: 3, label: "3" },
                          { value: 5, label: "5" },
                        ]}
                      />
                      <ProjectConstraintControl
                        label="单集字数"
                        value={projectBriefWordTarget}
                        unit="字"
                        min={300}
                        max={700}
                        step={200}
                        normalizeValue={(next) => nearestOption(next, TARGET_WORD_OPTIONS, 500)}
                        onChange={(next) => commitProjectBriefField("targetWordsPerEpisode", next, `单集字数已更新为 ${next} 字`)}
                        ticks={[
                          { value: 300, label: "300" },
                          { value: 500, label: "500" },
                          { value: 700, label: "700" },
                        ]}
                      />
                      <ProjectConstraintControl
                        label={projectBriefCharacterLimitLabel}
                        value={projectBriefCharacterLimit}
                        unit="人"
                        min={3}
                        max={10}
                        step={1}
                        onChange={(next) => commitProjectBriefField("mainCharactersLimit", next, `主要人物上限已更新为 ${next} 人`)}
                        ticks={[
                          { value: 3, label: "3" },
                          { value: 6 },
                          { value: 8 },
                          { value: 10, label: "10" },
                        ]}
                      />
                      <ProjectConstraintControl
                        label="单集场景上限"
                        value={projectBriefSceneLimit}
                        unit="场"
                        min={1}
                        max={4}
                        step={1}
                        onChange={(next) => commitProjectBriefField("sceneLimitPerEpisode", next, `单集场景上限已更新为 ${next} 场`)}
                        ticks={[
                          { value: 1, label: "1" },
                          { value: 2 },
                          { value: 3 },
                          { value: 4, label: "4" },
                        ]}
                      />
                    </div>
                  </aside>
                </div>
              )}

                  {ENABLE_QUALITY_REFERENCE_PANEL && qualityReferenceAssets ? (
                    <details className="rounded-[24px] border border-white/10 bg-white/[0.02] p-6">
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h2 className="text-xl font-bold text-white">创作参考</h2>
                            <p className="mt-1 text-xs text-slate-400">基于静态质量资产库的只读参考，不是审计结论。</p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                            点击展开
                          </span>
                        </div>
                      </summary>
                      <div className="mt-5 space-y-5">
                        <section className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">编辑推荐</h3>
                            <span className="text-xs text-slate-500">最多 3 条</span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            {qualityReferenceAssets.recommendations.slice(0, 3).map((item) => (
                              <div key={item.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                <div className="text-sm font-medium text-white">{item.title}</div>
                                <div className="mt-1 text-xs text-cyan-200">{item.category}</div>
                                <p className="mt-3 text-sm leading-6 text-slate-300">{item.whyRecommended}</p>
                                {item.riskTags.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {item.riskTags.slice(0, 3).map((tag) => (
                                      <span key={tag} className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                                        {QUALITY_RISK_LABELS[tag] ?? tag}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">质量规则</h3>
                            <span className="text-xs text-slate-500">最多 5 条</span>
                          </div>
                          <div className="grid gap-3 lg:grid-cols-2">
                            {qualityReferenceAssets.rules.slice(0, 5).map((item) => {
                              const riskTags = getRuleRiskTags(item);

                              return (
                                <div key={item.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="text-sm font-medium text-white">{item.title}</div>
                                    <div className="shrink-0 rounded-full bg-white/8 px-2.5 py-1 text-xs text-slate-300">
                                      {item.recommendationStrength ?? "medium"}
                                    </div>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {item.useMode}
                                    {item.applicableGenres?.length ? ` · ${item.applicableGenres.join(" / ")}` : ""}
                                  </div>
                                  <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
                                  {riskTags.length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {riskTags.map((tag) => (
                                        <span key={tag} className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                                          {QUALITY_RISK_LABELS[tag] ?? tag}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </section>

                        <section className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">可借鉴结构</h3>
                            <span className="text-xs text-slate-500">最多 3 条</span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            {qualityReferenceAssets.breakdowns.slice(0, 3).map((item) => (
                              <div key={item.id} className="rounded-2xl border border-white/8 bg-black/10 p-4">
                                <div className="text-sm font-medium text-white">{item.title}</div>
                                <div className="mt-2 text-sm leading-6 text-slate-300">{item.reusablePattern}</div>
                                <div className="mt-2 text-xs text-slate-500">避免照抄：{item.avoidCopying}</div>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
                          <div className="text-sm font-medium text-white">风险提醒</div>
                          <p className="mt-1 text-xs text-slate-400">以下标签仅提示参考风险，请不要把推荐样本当成仿写模板。</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {aggregatedQualityRiskTags.length > 0 ? (
                              aggregatedQualityRiskTags.map((tag) => (
                                <span key={tag} className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                                  {QUALITY_RISK_LABELS[tag] ?? tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-300">暂无风险提示</span>
                            )}
                          </div>
                        </section>
                      </div>
                    </details>
                  ) : null}

                  {activeStep === "characters" && (
                <div className="grid gap-5 xl:grid-cols-[minmax(560px,1fr)_minmax(380px,440px)]">
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-6">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold text-white">人物小传</h2>
                          {adaptation ? (
                            <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-2.5 py-1 text-[11px] font-medium text-cyan-100">
                              {adaptationMarketBadgeText}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">Character Profiles — 主要人物设定与背景信息</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {canGenerateFromSourceOutline && (
                          <button
                            onClick={handleGenerateCharactersFromSourceOutline}
                            disabled={!isAuthenticated || isGenerating === "characters"}
                            className="rounded-full bg-linear-to-r from-emerald-400 to-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                          >
                            {!isAuthenticated
                              ? "需要登录后使用"
                              : isGenerating === "characters"
                                ? "AI 生成中..."
                                : "按上传大纲生成人物"}
                          </button>
                        )}
                        <button
                          onClick={() => generateStep("characters")}
                          disabled={!isAuthenticated || isGenerating === "characters"}
                          className="rounded-full bg-linear-to-r from-cyan-400 to-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
                        >
                          {!isAuthenticated
                            ? "需要登录后使用"
                            : isGenerating === "characters"
                              ? "AI 生成中..."
                              : `${characterGenerationButtonLabel} 50`}
                        </button>
                        <PromptDebugPanel
                          draft={draft}
                          step="characters"
                        />
                      </div>
                    </div>
                    {previewSelectedCharacter ? (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,220px)_110px_minmax(0,260px)_100px] md:items-end">
                          <label className="grid gap-3 min-w-0">
                            <span className="text-sm font-medium text-slate-200">姓名</span>
                            <input
                              value={String(previewSelectedCharacter.name ?? "")}
                              onChange={(event) => patchCharacter({ name: event.target.value })}
                              className="h-12 w-full rounded-md border-0 bg-[#18181b] px-3 py-2 text-base font-normal leading-6 text-white outline transition placeholder:text-slate-400/50 hover:outline-white/65 focus:outline-white/65"
                              />
                          </label>
                          <label className="grid gap-3 min-w-0">
                            <span className="text-sm font-medium text-slate-200">性别</span>
                            <select
                              value={previewSelectedCharacter.gender ?? "unknown"}
                              onChange={(event) =>
                                patchCharacter({ gender: event.target.value as Character["gender"] })
                              }
                              className="h-12 w-full rounded-md border-0 bg-[#18181b] px-3 py-2 text-base font-normal leading-6 text-white outline transition hover:outline-white/65 focus:outline-white/65"
                            >
                              {CHARACTER_GENDER_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-3 min-w-0">
                            <span className="text-sm font-medium text-slate-200">人物位</span>
                            <select
                              value={normalizeCharacterRole(previewSelectedCharacter.role)}
                              onChange={(event) => patchCharacter({ role: event.target.value })}
                              className="h-12 w-full rounded-md border-0 bg-[#18181b] px-3 py-2 text-base font-normal leading-6 text-white outline transition hover:outline-white/65 focus:outline-white/65"
                            >
                              {CHARACTER_ROLE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-3 min-w-0">
                            <span className="text-sm font-medium text-slate-200">年龄</span>
                            <input
                              value={String(previewSelectedCharacter.age)}
                              onChange={(event) =>
                                patchCharacter({ age: Number(event.target.value) || 0 })
                              }
                              className="h-12 w-full rounded-md border-0 bg-[#18181b] px-3 py-2 text-base font-normal leading-6 text-white outline transition placeholder:text-slate-400/50 hover:outline-white/65 focus:outline-white/65"
                            />
                          </label>
                        </div>
                        <label className="grid gap-3 min-w-0">
                          <span className="text-sm font-medium text-slate-200">性格：</span>
                          <input
                            value={String(previewSelectedCharacter.traits ?? "")}
                            onChange={(event) => patchCharacter({ traits: event.target.value })}
                            placeholder="输入性格标签，用逗号分隔"
                            className="h-12 w-full rounded-md border-0 bg-[#18181b] px-3 py-2 text-base font-normal leading-6 text-white outline transition placeholder:text-slate-400/50 hover:outline-white/65 focus:outline-white/65"
                          />
                        </label>
                        <TextareaField
                          label="背景"
                          value={String(previewSelectedCharacter.background ?? "")}
                          onChange={(value) => patchCharacter({ background: value })}
                          className="hide-scrollbar w-full min-h-32 rounded-md border-0 bg-[#18181b] px-3 py-2 text-base font-normal leading-6 text-white outline transition placeholder:text-slate-400/50 hover:outline-white/65 focus:outline-white/65"
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 xl:grid xl:grid-cols-[repeat(2,minmax(160px,180px))] xl:justify-center xl:overflow-visible">
                    {previewCharacters.map((character, index) => {
                      const traits = String(character.traits ?? "")
                        .split(/[、,，\n#]+/)
                        .map((item) => item.trim())
                        .filter(Boolean)
                        .slice(0, 3);
                      const role = normalizeCharacterRole(character.role);
                      const genderLabel = getGenderBadgeLabel(character.gender);
                      const age = Number(character.age) > 0 ? `${character.age} 岁` : "年龄待补充";
                      const isSelected = previewSelectedCharacter?.id === character.id;
                      const relationshipLabels = getRelationshipLabels(character);
                      const relationshipTagLabels = getRelationshipTagLabels(character);
                      const accentClass = [
                        "from-cyan-500/35 via-slate-950 to-violet-500/35",
                        "from-fuchsia-500/30 via-slate-950 to-amber-500/25",
                        "from-emerald-500/30 via-slate-950 to-sky-500/30",
                        "from-rose-500/30 via-slate-950 to-orange-500/25",
                      ][index % 4];
                      const silhouetteClass = [
                        "bg-gradient-to-br from-white/12 to-transparent",
                        "bg-gradient-to-br from-cyan-300/15 to-transparent",
                        "bg-gradient-to-br from-violet-300/15 to-transparent",
                        "bg-gradient-to-br from-amber-200/15 to-transparent",
                      ][index % 4];
                      const topGlowClass = [
                        "bg-cyan-300/20",
                        "bg-fuchsia-300/20",
                        "bg-emerald-300/20",
                        "bg-rose-300/20",
                      ][index % 4];
                      const visibleTraits = traits.length > 0 ? traits : ["性格待补充"];
                      const visibleRelationshipTags = relationshipTagLabels.slice(0, 4);
                      return (
                        <div
                          key={character.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedCharacterId(character.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedCharacterId(character.id);
                            }
                          }}
                          className={`group relative flex aspect-[3/4] w-[172px] shrink-0 flex-col overflow-hidden rounded-[32px] border text-left transition outline-none xl:w-[180px] ${
                            isSelected
                              ? "border-cyan-300/80 bg-white/8 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_0_40px_rgba(34,211,238,0.12)]"
                              : "border-white/8 bg-white/4 hover:border-cyan-200/30 hover:bg-white/8"
                          }`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-b ${accentClass}`} />
                          <div className={`absolute inset-0 opacity-85 ${silhouetteClass}`} />
                          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/18 via-white/6 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                          <div className={`absolute left-1/2 top-12 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl ${topGlowClass}`} />
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.12),transparent_36%),radial-gradient(circle_at_50%_78%,rgba(255,255,255,0.08),transparent_42%)]" />

                          <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              deleteCharacter(character.id);
                            }}
                            className="absolute right-2 top-2 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-slate-950/65 text-sm text-slate-200 backdrop-blur transition hover:border-rose-300/60 hover:bg-rose-500/15 hover:text-rose-100"
                            aria-label={`删除${String(character.name ?? "").trim() || "角色"}`}
                          >
                            ×
                          </button>

                          <div className="relative z-10 flex h-full flex-col p-5">
                            <div className="flex items-start justify-between gap-3 pr-10">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-white/12 bg-slate-950/30 px-3 py-1 text-xs font-medium text-cyan-100 backdrop-blur">
                                  {role}
                                </span>
                                <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-white/12 bg-slate-950/30 px-3 py-1 text-xs text-slate-200 backdrop-blur">
                                  {genderLabel}
                                </span>
                                <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-white/12 bg-slate-950/30 px-3 py-1 text-xs text-slate-200 backdrop-blur">
                                  {age}
                                </span>
                              </div>
                            </div>

                            <div className="mt-auto space-y-4 pb-1">
                              <div className="space-y-1">
                                <div className="line-clamp-2 text-[2rem] font-semibold leading-tight text-white drop-shadow-[0_2px_12px_rgba(15,23,42,0.45)] sm:text-[2.15rem]">
                                  {String(character.name ?? "").trim() || "未命名角色"}
                                </div>
                              </div>

                              <div className="text-[11px] text-slate-400">性格</div>
                              <div className="flex max-w-full items-center gap-1 overflow-hidden">
                                {visibleTraits.map((trait) => (
                                  <span key={trait} className="inline-flex min-w-0 max-w-[48px] shrink items-center justify-center truncate whitespace-nowrap rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[11px] leading-none text-white/85 backdrop-blur">
                                    {trait}
                                  </span>
                                ))}
                              </div>

                              {visibleRelationshipTags.length > 0 ? (
                                <>
                                  <div className="text-[11px] text-slate-400">作用标签</div>
                                  <div className="flex max-w-full flex-wrap gap-1.5">
                                    {visibleRelationshipTags.map((label) => (
                                      <span
                                        key={label}
                                        className="inline-flex max-w-full items-center rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2.5 py-1 text-[11px] leading-none text-cyan-100"
                                      >
                                        {label}
                                      </span>
                                    ))}
                                  </div>
                                </>
                              ) : null}

                              <div className="text-[11px] text-slate-400">稳定关系</div>
                              <div className="flex flex-wrap gap-1.5">
                                {relationshipLabels.slice(0, 3).map((label) => (
                                  <span
                                    key={label}
                                    className="inline-flex max-w-full items-center rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2.5 py-1 text-[11px] leading-none text-cyan-100"
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={addCharacter}
                      className="group relative flex aspect-[3/4] w-[172px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[32px] border border-dashed border-white/10 bg-white/4 p-5 text-slate-300 transition hover:border-cyan-300/40 hover:bg-white/8 hover:text-white xl:w-[180px]"
                      aria-label="新增角色"
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-slate-950/30" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(34,211,238,0.18),transparent_40%),radial-gradient(circle_at_50%_75%,rgba(168,85,247,0.12),transparent_44%)]" />
                      <span className="relative z-10 text-6xl leading-none">+</span>
                      <span className="relative z-10 mt-5 text-sm font-medium tracking-[0.18em] uppercase">新增角色</span>
                    </button>

                  </div>
                </div>
              )}

              {activeStep === "outlines" && (
                <div className="flex h-[calc(100vh-280px)] flex-col">
                  <div className="shrink-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-white">分集大纲</h2>
                      {adaptation ? (
                        <span className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-2.5 py-1 text-[11px] font-medium text-cyan-100">
                          {adaptationMarketBadgeText}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {outlinesErrorMessage && (
                        <div className="flex w-full items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200">
                          <span className="shrink-0">⚠</span>
                          <span>{outlinesErrorMessage}</span>
                          <button
                            onClick={() => setOutlinesErrorMessage("")}
                            className="ml-auto shrink-0 text-rose-300 hover:text-rose-100"
                            aria-label="关闭"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      {isGenerating === "outlines" && (
                        <div className="flex w-full flex-col gap-1.5 rounded-xl border border-white/8 bg-white/4 px-4 py-2.5">
                          <span className="text-xs text-cyan-300/80">
                            {outlineGenerationPhase
                              || (outlineGenerationTask === "episodes"
                                ? "正在生成当前批次分集…"
                                : outlineGenerationTask === "rough"
                                  ? "正在生成全部粗纲…"
                                  : streamPreview.trim().length > 0
                                    ? "正在接收模型输出…"
                                    : "正在准备上下文…")}
                          </span>
                          {outlineGenerationTask === "rough" && outlineGenerationPhase === "正在调用AI模型生成批次粗纲…" && streamPreview.trim().length > 0 && (
                            <span className="text-[10px] text-slate-500">
                              已接收 {streamPreview.length.toLocaleString()} 字符流式输出
                            </span>
                          )}
                          {outlineGenerationTask === "rough" && outlineGenerationPhase && (
                            <span className="text-[10px] text-slate-500">
                              批次粗纲生成中，请耐心等待，不要重复点击
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={generateAllOutlineBatches}
                          disabled={!isAuthenticated || isGenerating === "outlines"}
                          className={`rounded-full px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60 ${
                            outlinesErrorMessage
                              ? "bg-linear-to-r from-rose-400 to-orange-400"
                              : "bg-linear-to-r from-cyan-400 to-violet-500"
                          }`}
                        >
                          {!isAuthenticated
                            ? "需要登录后使用"
                            : isGenerating === "outlines"
                              ? "生成中..."
                              : outlinesErrorMessage
                                ? "重试生成粗纲"
                                : previewOutlines.outlineBatches?.some((batch) => (batch.roughOutline ?? "").trim().length > 0)
                                  ? "重新生成粗纲"
                                  : "AI 生成粗纲"}
                        </button>
                        <PromptDebugPanel
                          draft={draft}
                          step="outlines"
                          outlineGenerationMode="batch_rough_outlines"
                          totalEpisodeCount={projectBriefEpisodeCount}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1">
                  {(() => {
                    const outlineView = adaptOriginalOutlineToViewModel(previewOutlines);
                    type OutlineEpisodeView = (typeof outlineView.episodes)[number];
                    type OutlinePhaseView = (typeof outlineView.phases)[number];
                    const configuredEpisodeTotal =
                      typeof projectBrief.episodeCount === "number" && Number.isFinite(projectBrief.episodeCount)
                        ? Math.max(1, Math.trunc(projectBrief.episodeCount))
                        : 0;
                    const totalEpisodeCount = configuredEpisodeTotal > 0 ? configuredEpisodeTotal : 60;
                    const displayEpisodeTotal = totalEpisodeCount;
                    const episodeBatches = buildEpisodeBatches(displayEpisodeTotal, previewOutlines.episodes);
                    const displayEpisodes: OutlineEpisodeView[] = Array.from(
                      { length: displayEpisodeTotal },
                      (_, index) => {
                        const episodeNumber = index + 1;
                        const existing = outlineView.episodes.find(
                          (episode) => episode.episodeNumber === episodeNumber,
                        );
                        if (existing) return existing;
                        return {
                          id: `ep-${episodeNumber}`,
                          episodeNumber,
                          title: `第${episodeNumber}集`,
                          summary: "暂无内容 / 待生成",
                          goal: "待生成",
                          coreEvent: "待生成",
                          conflictProgress: "",
                          resultChange: "",
                          warnings: ["暂无内容 / 待生成"],
                        };
                      },
                    );
                    const selectedBatch =
                      episodeBatches[selectedArcIndex] ?? episodeBatches[0];
                    if (!selectedBatch) {
                      return (
                        <div className="mx-auto w-full max-w-[1500px] px-4">
                          <div className="rounded-lg border border-white/10 bg-slate-950/50 px-4 py-6 text-sm text-slate-500 text-center">
                            暂无可用批次，请重新生成批次粗纲
                          </div>
                        </div>
                      );
                    }
                    const selectedOutlineBatch =
                      previewOutlines.outlineBatches?.find((batch) =>
                        getOutlineBatchKey(batch) === getOutlineBatchKey(selectedBatch) ||
                        batch.batchIndex === selectedBatch.batchIndex ||
                        (batch.startEpisode === selectedBatch.startEpisode && batch.endEpisode === selectedBatch.endEpisode),
                      ) ?? null;
                    const currentBatchRoughOutline = selectedOutlineBatch?.roughOutline ?? "";
                    const displayRoughOutline =
                      isGenerating === "outlines" && outlineGenerationTask === "rough" && streamPreview.trim().length > 0
                        ? streamPreview
                        : currentBatchRoughOutline;
                    const isRoughOutlinePreviewing =
                      isGenerating === "outlines" && outlineGenerationTask === "rough";
                    const selectedBatchEpisodes = displayEpisodes.filter(
                      (episode) =>
                        episode.episodeNumber >= selectedBatch.startEpisode &&
                        episode.episodeNumber <= selectedBatch.endEpisode,
                    );

                    // ---- 空占位过滤：只保留真实已生成集纲 + 至多一条 pending placeholder ----
                    const hasMeaningfulEpisodeContent = (ep: OutlineEpisodeView) => {
                      return Boolean(
                        (ep.summary && ep.summary !== "暂无内容 / 待生成" && ep.summary !== "待生成") ||
                        (ep.goal && ep.goal !== "待生成") ||
                        (ep.coreEvent && ep.coreEvent !== "待生成") ||
                        (ep.conflictProgress && ep.conflictProgress.trim().length > 0) ||
                        (ep.resultChange && ep.resultChange.trim().length > 0)
                      );
                    };
                    const realBatchEpisodes = selectedBatchEpisodes.filter(hasMeaningfulEpisodeContent);
                    const nextPendingNumber = realBatchEpisodes.length > 0
                      ? Math.max(...realBatchEpisodes.map((ep) => ep.episodeNumber)) + 1
                      : selectedBatch.startEpisode;
                    const shouldShowPending = nextPendingNumber <= selectedBatch.endEpisode;
                    const finalBatchEpisodes = [
                      ...realBatchEpisodes,
                      ...(shouldShowPending
                        ? [selectedBatchEpisodes.find((ep) => ep.episodeNumber === nextPendingNumber)!]
                        : []),
                    ];

                    const renderEpisodeDetails = (episode: (typeof outlineView.episodes)[number]) => {
                      const isPlaceholder = !hasMeaningfulEpisodeContent(episode);
                      if (isPlaceholder) {
                        return (
                          <article
                            key={episode.id}
                            className="rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm shadow-sm"
                          >
                            <div className="text-sm font-semibold text-white/80">第{episode.episodeNumber}集</div>
                            <div className="mt-1 text-xs text-slate-500">待生成</div>
                          </article>
                        );
                      }
                      const titleText = episode.title?.trim() || "";
                      const summaryText = episode.summary.trim();
                      // 事件正文：summary / goal / coreEvent / conflictProgress，合并为内容行
                      const bodyText = [
                        summaryText,
                        episode.goal,
                        episode.coreEvent,
                        episode.conflictProgress,
                      ]
                        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
                        .map((item) => item.trim())
                        .join("\u3000");
                      // 钩子：优先取 resultChange，否则尝试从 summary 中提取
                      const hookText = episode.resultChange?.trim() || "";
                      return (
                        <article
                          key={episode.id}
                          title={[titleText, summaryText, hookText].filter(Boolean).join("\n")}
                          className="rounded-lg border border-white/10 bg-slate-950/50 px-4 py-3 text-sm shadow-sm group/card hover:border-white/20 transition-colors"
                        >
                          {/* 行1：第N集 + 标题 */}
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="text-sm font-semibold text-white/80 shrink-0">第{episode.episodeNumber}集</span>
                            {titleText && (
                              <span className="text-xs text-slate-400 truncate">{titleText}</span>
                            )}
                          </div>
                          {/* 正文事件内容，最多 4 行 */}
                          <div className="mt-1.5 text-xs text-slate-300/90 leading-[1.55] line-clamp-4">
                            {bodyText || "\u6682\u65e0\u5185\u5bb9 / \u5f85\u751f\u6210"}
                          </div>
                          {/* 钩子独立一行 */}
                          {hookText && (
                            <div className="mt-1.5 border-t border-white/5 pt-1.5 text-xs text-amber-400/70 leading-[1.35] line-clamp-1">
                              {hookText}
                            </div>
                          )}
                        </article>
                      );
                    };

                    return (
                      <div className="mx-auto w-full max-w-[1500px] px-4">
                        <div className="grid grid-cols-[minmax(0,1fr)_220px] gap-5 items-start">
                          <ScrollArea className="max-h-[calc(100vh-280px)] pr-3">
                          <div className="min-w-0 space-y-5">
                            <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/50 shadow-sm">
                              <button
                                type="button"
                                onClick={() => setIsOutlineMacroExpanded((current) => !current)}
                                className="flex w-full items-center justify-between px-4 py-3 text-left"
                              >
                                <span className="text-sm font-semibold text-white">粗纲</span>
                                <span
                                  className={`text-slate-400 transition-transform ${isOutlineMacroExpanded ? "rotate-180" : ""}`}
                                >
                                  ▾
                                </span>
                              </button>
                              {isOutlineMacroExpanded && (
                                <div className="px-4 pb-4">
                                <TextareaField
                                  label=""
                                  value={displayRoughOutline}
                                  onChange={(value) =>
                                    updateDraft((current) => ({
                                      ...current,
                                      outlines: {
                                          ...current.outlines,
                                          outlineBatches: (() => {
                                            const batches = Array.isArray(current.outlines.outlineBatches)
                                              ? [...current.outlines.outlineBatches]
                                              : [];
                                            const nextBatch = {
                                              ...(selectedOutlineBatch ?? {
                                                batchIndex: selectedBatch.batchIndex,
                                                startEpisode: selectedBatch.startEpisode,
                                                endEpisode: selectedBatch.endEpisode,
                                                episodeNumbers: selectedBatch.episodeNumbers,
                                                generatedEpisodeCount: selectedBatch.generatedEpisodeCount,
                                                summary: selectedBatch.summary,
                                              }),
                                              roughOutline: value,
                                              status: value.trim() ? "rough_ready" as const : "empty" as const,
                                            };
                                            const index = batches.findIndex((batch) =>
                                              getOutlineBatchKey(batch) === getOutlineBatchKey(selectedBatch) ||
                                              batch.batchIndex === selectedBatch.batchIndex ||
                                              (batch.startEpisode === selectedBatch.startEpisode && batch.endEpisode === selectedBatch.endEpisode),
                                            );
                                            if (index >= 0) {
                                              batches[index] = nextBatch;
                                            } else {
                                              batches.push(nextBatch);
                                            }
                                            return batches;
                                          })(),
                                        },
                                    }), { userEdited: true })
                                  }
                                  placeholder="请输入内容，3000 字以内"
                                  readOnly={isRoughOutlinePreviewing}
                                  className="w-full min-h-[200px] rounded-lg border border-white/10 bg-slate-950/30 px-4 py-3 text-[15px] leading-7 text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/50 resize-y"
                                    />
                                  <div className="mt-3 flex justify-end">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={generateCurrentBatchEpisodes}
                                        disabled={
                                          !isAuthenticated ||
                                          isGenerating === "outlines" ||
                                          !currentBatchRoughOutline.trim()
                                        }
                                        className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        按粗纲生成本批分集
                                      </button>
                                      <PromptDebugPanel
                                        draft={draft}
                                        step="outlines"
                                        outlineGenerationMode="batch_episodes"
                                        batchIndex={selectedBatch.batchIndex}
                                        startEpisode={selectedBatch.startEpisode}
                                        endEpisode={selectedBatch.endEpisode}
                                        roughOutline={currentBatchRoughOutline}
                                        totalEpisodeCount={totalEpisodeCount}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-3">
                              <h3 className="text-sm font-semibold text-white">集纲</h3>
                              {finalBatchEpisodes.length === 0 ? (
                                <div className="rounded-lg border border-white/10 bg-slate-950/50 px-4 py-6 text-sm text-slate-500">
                                  暂无内容 / 待生成
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {finalBatchEpisodes.map(renderEpisodeDetails)}
                                </div>
                              )}
                            </div>
                          </div>
                          </ScrollArea>

                          <aside className="sticky top-24 self-start max-h-[calc(100vh-300px)] overflow-y-auto">
                            <PhasePlannerPanel
                              turningPoints={draft.outlines.extractionResult?.turningPoints ?? []}
                              totalEpisodes={totalEpisodeCount}
                              selectedArcIndex={selectedArcIndex}
                              onSelectArcIndex={setSelectedArcIndex}
                            />
                          </aside>
                        </div>
                      </div>
                    );
                  })()}
                  </div>
                </div>
              )}

              {activeStep === 'script' && (
                <div className="relative flex flex-col gap-3 h-[calc(100vh-120px)]">
                  <QualityReportSummary
                    reports={draft.qualityReports}
                    showEmptyState={ENABLE_QUALITY_REPORTS_UI}
                  />
                  {ENABLE_QUALITY_REPORTS_UI && (
                    <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-cyan-300/30 bg-cyan-300/5 px-4 py-3 text-sm text-cyan-50">
                      <div className="space-y-1">
                        <div className="font-medium text-cyan-100">生成质量提示</div>
                        <div className="text-xs text-cyan-100/80">
                          开发调试：基于本地静态规则生成轻量提示，不代表正式审计结论。
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateQualityHint}
                        disabled={!currentProject}
                        className="rounded-lg border border-cyan-200/40 bg-cyan-200/10 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-200/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        生成质量提示
                      </button>
                    </div>
                  )}
                  {/* 标题行 */}
                  <h2 className="shrink-0 text-lg font-bold text-white">第 {clampedSelectedScriptEpisode} 集 {scriptBodyLabel}</h2>
                  {/* 批量生成进度条 */}
                  {isBatchGenerating && batchProgress.total > 0 && (
                    <div className="shrink-0">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                        <span>批量生成进度</span>
                        <span>{batchProgress.current} / {batchProgress.total} 集</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-cyan-400 to-violet-500 transition-all duration-500"
                          style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {/* 批量生成结果提示 */}
                  {batchResult?.success && !isBatchGenerating && (
                    <div className="shrink-0 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
                      {batchResult.success}
                    </div>
                  )}
                  {batchResult?.error && !isBatchGenerating && (
                    <div className="shrink-0 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200 whitespace-pre-line">
                      {batchResult.error}
                    </div>
                  )}
                  {/* 主内容区：左侧正文 + 右侧目录 */}
                  <div className="min-h-0 flex-1 grid gap-4 xl:grid-cols-[minmax(420px,1fr)_280px] lg:grid-cols-[minmax(360px,1fr)_minmax(220px,280px)]">
                    <div className="min-h-0 flex flex-col gap-2 min-w-0">
                      {/* 正文框顶部工具栏 */}
                      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex shrink-0 flex-wrap items-center gap-2 ml-auto">
                          <button
                            onClick={() => generateStep("script", { scriptEpisode: clampedSelectedScriptEpisode })}
                            disabled={!isAuthenticated || isGenerating === "script" || isBatchGenerating}
                            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            {!isAuthenticated ? "需要登录后使用" : isGenerating === "script" && !isBatchGenerating ? "生成中..." : isBatchGenerating ? "批量生成中..." : hasCurrentEpisodeScript ? "重新生成正文" : "生成正文"}
                          </button>
                          <button
                            onClick={handleBatchGenerateScripts}
                            disabled={!isAuthenticated || isGenerating === "script" || isBatchGenerating}
                            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/6 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            {!isAuthenticated ? "需要登录后使用" : isBatchGenerating ? `正在生成第 ${batchProgress.currentEpisode} 集（${batchProgress.current}/${batchProgress.total}）` : "批量生成 5 集"}
                          </button>
                          <ExportProjectPopover
                            draft={draft}
                            projectTitle={draft.title}
                            className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/6 whitespace-nowrap"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const content = previewScript.content?.trim() ?? "";
                              if (!content) {
                                setErrorMessage("当前集暂无正文可复制");
                                return;
                              }
                              navigator.clipboard.writeText(stripGeneratedWordCountFooter(content)).then(
                                () => setSaveLabel("已复制当前集正文"),
                                () => setErrorMessage("复制失败，请手动复制"),
                              );
                            }}
                            className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white hover:bg-white/6 transition"
                            title="复制当前集正文"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          </button>
                          {/* 开发调试 Prompt 入口 — 仅 dev/debug 条件可见 */}
                          <PromptDebugPanel
                            draft={draft}
                            step="script"
                            currentEpisode={clampedSelectedScriptEpisode}
                          />
                        </div>
                      </div>
                      <ScrollArea className="min-h-0 flex-1 rounded-lg border border-white/10 bg-slate-950/50">
                        <div className="p-5 text-base leading-8 text-slate-200 whitespace-pre-line">
                          {(() => {
                            const displayContent = previewScript.content ? stripGeneratedWordCountFooter(previewScript.content) : "";
                            return displayContent || `第 ${clampedSelectedScriptEpisode} 集尚未生成，点击上方按钮开始生成`;
                          })()}
                        </div>
                      </ScrollArea>
                    </div>

                    <ScrollArea className="max-h-full min-w-0">
                      <div className="space-y-1.5 pr-2">
                        <h3 className="text-sm font-semibold text-white/70 mb-2 truncate">正文目录</h3>
                        {Array.from({ length: episodeCountForScript }, (_, index) => {
                          const episodeNumber = index + 1;
                          const content =
                            draft.episodeScripts?.[String(episodeNumber)]?.content
                            ?? (episodeNumber === 1 ? draft.script.content : "");
                          const trimmedContent = content.trim();
                          const isGenerated = trimmedContent.length > 0;
                          const isSelected = episodeNumber === clampedSelectedScriptEpisode;
                          const episodeTitle = getEpisodeTitle(episodeNumber);

                          return (
                            <div
                              key={episodeNumber}
                              onClick={() => setSelectedScriptEpisode(episodeNumber)}
                              className={`w-full rounded-lg border transition cursor-pointer ${
                                isSelected
                                  ? "border-cyan-300/60 bg-cyan-300/12"
                                  : "border-white/10 bg-slate-950/30 hover:border-white/20"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 px-3 py-2">
                                {/* 左侧：集数 + 标题 */}
                                <div className="min-w-0 flex-1 space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedScriptEpisode(episodeNumber)}
                                    className="text-left block"
                                  >
                                    <span className={`text-xs font-semibold ${isSelected ? "text-white" : "text-slate-300"}`}>
                                      第 {episodeNumber} 集
                                    </span>
                                  </button>
                                  <span className="block text-[13px] text-slate-300 truncate w-full">
                                    {episodeTitle}
                                  </span>
                                </div>

                                {/* 右侧：生成轨迹按钮 + 字数/状态 */}
                                <div className="shrink-0 flex flex-col items-end gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedScriptEpisode(episodeNumber);
                                      setTracePanelState({ open: true, episodeNumber });
                                    }}
                                    className="rounded-md border border-cyan-400/40 bg-cyan-400/8 px-2 py-1 text-[11px] text-cyan-200/80 hover:bg-cyan-400/15 hover:text-cyan-100 hover:border-cyan-400/60 transition shrink-0"
                                  >
                                    生成轨迹
                                  </button>
                                  <div className="flex items-center gap-1">
                                    {isGenerated && (
                                      <span className="text-[10px] text-slate-500">
                                        {countScriptChineseChars(trimmedContent)}字
                                      </span>
                                    )}
                                    {isGenerated && <span className="text-[10px] text-slate-600">·</span>}
                                    <span
                                      className={`text-[10px] ${
                                        isGenerated ? "text-emerald-400/80" : "text-slate-600"
                                      }`}
                                    >
                                      {isGenerated ? "已生成" : "未生成"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </>
          )}
      </div>

      {/* 生成轨迹面板 */}
      {tracePanelState && (
        <EpisodeTracePanel
          open={tracePanelState.open}
          onClose={() => setTracePanelState(null)}
          draft={draft}
          episodeNumber={tracePanelState.episodeNumber}
          episodeTitle={getEpisodeTitle(tracePanelState.episodeNumber)}
          reasoningText={episodeReasoning[tracePanelState.episodeNumber]}
          scriptContent={draft.episodeScripts?.[String(tracePanelState.episodeNumber)]?.content ?? (tracePanelState.episodeNumber === 1 ? draft.script?.content : "")}
        />
      )}

      {/* 剧本类型选择 Modal */}
      {showScriptTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[400px] rounded-3xl border border-white/10 bg-[#18181b] p-8">
            <h2 className="text-xl font-bold text-white">选择剧本类型</h2>
            <p className="mt-2 text-sm text-slate-400">请选择要创建的项目类型</p>
            <div className="mt-6">
              <ScriptTypeSelector
                value={newProjectScriptType}
                onChange={setNewProjectScriptType}
                variant="card"
              />
            </div>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  setShowScriptTypeModal(false);
                  setNewProjectScriptType("short_drama");
                }}
                className="flex-1 rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                取消
              </button>
              <button
                onClick={confirmCreateNewProject}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 text-sm font-semibold text-slate-950"
              >
                创建项目
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceFrame>
  );
}
