import { mergeProviderConfig } from "@/lib/provider-config";
import { localDb } from "@/lib/local-db/database";
import { migrateLegacyStorageToIndexedDb } from "@/lib/local-db/migrations";
import type { OriginalAdaptationDraft, OriginalDraft, OutlineConstraints, ProjectBrief, ProjectRecord, ScriptDraft, ScriptPlan, SourceMode, AdaptationStrategy } from "@/lib/types";
import { EMPTY_VERSION_HISTORY } from "@/lib/version-history";

export const PROJECTS_STORAGE_KEY = "storyplay-clone-projects";
export const CURRENT_PROJECT_ID_STORAGE_KEY = "storyplay-clone-current-project-id";
export const PENDING_ORIGINAL_INSPIRATION_KEY = "storyplay-clone-pending-original-inspiration";
let projectCache: ProjectRecord[] | null = null;
let projectHydrationPromise: Promise<void> | null = null;

export type InspirationAudienceLabel = "男频" | "女频" | "银发";
export type InspirationAudienceParam = "male" | "female" | "senior";

export function audienceLabelToParam(label: string): InspirationAudienceParam | null {
  if (label === "男频") return "male";
  if (label === "女频") return "female";
  if (label === "银发") return "senior";
  return null;
}

export function audienceParamToLabel(
  scriptType: "short_drama" | "ai_comic",
  value?: string | null,
): InspirationAudienceLabel | null {
  if (value === "male") return "男频";
  if (value === "female") return "女频";
  if (value === "senior" && scriptType === "short_drama") return "银发";
  return null;
}

export const DEFAULT_OUTLINE_CONSTRAINTS: OutlineConstraints = {
  strictlyFollowOutline: true,
  allowNewCharacters: false,
  allowAddDetails: true,
  allowReorder: false,
  targetWordsPerEpisode: 1000,
  outputFormat: "standard",
};

export function createDefaultProjectBrief(scriptType?: "short_drama" | "ai_comic"): ProjectBrief {
  return {
    scriptType: scriptType === "ai_comic" ? "ai_comic" : "short_drama",
    audienceType: "general",
    genres: [],
    coreHooks: [],
    styleTags: [],
    episodeCount: 60,
    episodeDuration: "2min",
    targetWordsPerEpisode: 500,
    mainCharactersLimit: 6,
    sceneLimitPerEpisode: 3,
    coreEmotion: "追求爽感",
    productionConstraint: scriptType === "ai_comic" ? "visual_ai_comic" : "low_cost_live",
    complexityLevel: "beginner",
  };
}

export function createDefaultScriptPlan(scriptType?: "short_drama" | "ai_comic"): ScriptPlan {
  return {
    scriptType: scriptType === "ai_comic" ? "ai_comic" : "short_drama",
    logline: "",
    commercialHook: "",
    targetAudience: "",
    genrePromise: "",
    mainConflict: "",
    protagonistGoal: "",
    antagonistPressure: "",
    relationshipEngine: "",
    openingThreeEpisodesHook: "",
    paymentPointPlan: "",
    tone: "",
    productionNotes: "",
    riskNotes: [],
  };
}

export function createDefaultAdaptationDraft(): OriginalAdaptationDraft {
  return {
    targetEpisodeCount: 60,
    targetMarket: "中国",
    adaptationMode: "中文海外化",
    preferredGenre: "auto",
    status: "empty",
  };
}

function normalizeAdaptationStrategy(value: unknown): AdaptationStrategy {
  if (
    value === "auto" ||
    value === "preserve_original" ||
    value === "market_package" ||
    value === "short_drama_boost"
  ) {
    return value;
  }

  if (
    value === "werewolf" ||
    value === "vampire" ||
    value === "billionaire" ||
    value === "royal"
  ) {
    return "market_package";
  }

  if (value === "mixed") {
    return "auto";
  }

  return "auto";
}

function normalizeAdaptationTargetMarket(value: unknown): OriginalAdaptationDraft["targetMarket"] {
  if (
    value === "中国" ||
    value === "北美" ||
    value === "日本" ||
    value === "韩国" ||
    value === "印度" ||
    value === "东南亚"
  ) {
    return value;
  }

  if (value === "\u6b27\u7f8e" || value === "\u62c9\u7f8e") {
    return "北美";
  }

  return "北美";
}

type OriginalScriptType = NonNullable<OriginalDraft["overview"]["scriptType"]>;

function normalizeScriptType(value: unknown): OriginalScriptType {
  return value === "ai_comic" ? "ai_comic" : "short_drama";
}

function normalizeOverviewScriptType(overview: OriginalDraft["overview"]): OriginalDraft["overview"] {
  const projectBriefScriptType = overview.projectBrief?.scriptType;
  const scriptPlanScriptType = overview.scriptPlan?.scriptType;
  const scriptType =
    overview.scriptType === "ai_comic" || overview.scriptType === "short_drama"
      ? overview.scriptType
      : normalizeScriptType(projectBriefScriptType ?? scriptPlanScriptType);

  return {
    ...overview,
    scriptType,
    projectBrief: overview.projectBrief
      ? { ...overview.projectBrief, scriptType }
      : createDefaultProjectBrief(scriptType),
    scriptPlan: overview.scriptPlan
      ? { ...overview.scriptPlan, scriptType }
      : createDefaultScriptPlan(scriptType),
  };
}

function createDefaultScriptDraft(episodeNumber = 1): ScriptDraft {
  return {
    episode: `第${episodeNumber}集`,
    content: "",
    batches: [],
  };
}

function normalizeScriptDraft(value: unknown, fallback = createDefaultScriptDraft()): ScriptDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...fallback, batches: [...(fallback.batches ?? [])] };
  }

  const source = value as Partial<ScriptDraft>;
  return {
    episode: typeof source.episode === "string" && source.episode.trim() ? source.episode : fallback.episode,
    content: typeof source.content === "string" ? source.content : fallback.content,
    batches: Array.isArray(source.batches) ? source.batches : [...(fallback.batches ?? [])],
    currentBatchId: typeof source.currentBatchId === "string" ? source.currentBatchId : fallback.currentBatchId,
    qualityCheck: source.qualityCheck ?? fallback.qualityCheck,
  };
}

function getEpisodeKeyFromScript(script: ScriptDraft) {
  const match = script.episode.match(/(\d+)/);
  return match ? match[1] : "1";
}

function normalizeEpisodeScripts(value: unknown, legacyScript: ScriptDraft): Record<string, ScriptDraft> {
  const legacyKey = getEpisodeKeyFromScript(legacyScript);

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { [legacyKey]: normalizeScriptDraft(legacyScript) };
  }

  const result: Record<string, ScriptDraft> = {};
  for (const [key, script] of Object.entries(value as Record<string, unknown>)) {
    if (/^\d+$/.test(key)) {
      result[key] = normalizeScriptDraft(script, createDefaultScriptDraft(Number(key)));
    }
  }

  if (!result[legacyKey]) {
    result[legacyKey] = normalizeScriptDraft(legacyScript);
  }

  if (!result["1"]) {
    result["1"] = normalizeScriptDraft(legacyScript, createDefaultScriptDraft(1));
  }

  return result;
}

export const INITIAL_DRAFT: OriginalDraft = {
  title: "新建原创项目",
  overview: {
    audience: "通用",
    audiences: [],
    genres: [],
    coreHooks: [],
    styleTags: [],
    worldview: "",
    highlight: "",
    premise: "",
    projectBrief: createDefaultProjectBrief("short_drama"),
    scriptPlan: createDefaultScriptPlan(),
  },
  characters: [],
  outlines: {
    macro: "",
    characterText: "",
    episodes: [],
    stageLabels: ["起\n1", "承\n-", "转\n-", "合\n-"],
    range: "1-10",
    outlineBatches: [],
    lockLevel: 0,
    originalPhaseRanges: [],
    episodesStructured: [],
    beatCards: [],
  },
  script: createDefaultScriptDraft(1),
  adaptation: createDefaultAdaptationDraft(),
  episodeScripts: {
    "1": createDefaultScriptDraft(1),
  },
};

export function createProjectRecord(partial?: Partial<ProjectRecord>): ProjectRecord {
  const title = partial?.title ?? INITIAL_DRAFT.title;
  const draft = partial?.draft ?? { ...INITIAL_DRAFT, title };
  const project = {
    id: partial?.id ?? `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    sourceMode: partial?.sourceMode,
    outlineConstraints: partial?.outlineConstraints,
    sourceMaterial: partial?.sourceMaterial,
    draft,
    versionHistory: partial?.versionHistory ?? EMPTY_VERSION_HISTORY,
    providerConfig: mergeProviderConfig(partial?.providerConfig),
    updatedAt: partial?.updatedAt ?? new Date().toISOString(),
  };

  return migrateProject(project);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateProject(project: any): ProjectRecord {
  const outlines = project.draft?.outlines;
  if (outlines && outlines.lockLevel === undefined) {
    outlines.lockLevel = outlines.isLocked === true ? 1 : 0;
    delete outlines.isLocked;
  }

  const draft = project.draft;
  if (draft?.overview) {
    if (draft.overview.userPremise === undefined) {
      draft.overview.userPremise = draft.overview.premise ?? "";
    }
    draft.overview = normalizeOverviewScriptType(draft.overview);
  }

  if (draft?.outlines) {
    if (draft.outlines.originalPhaseRanges === undefined) {
      draft.outlines.originalPhaseRanges = [];
    }

    if (draft.outlines.outlineBatches === undefined) {
      draft.outlines.outlineBatches = [];
    }

    if (draft.outlines.episodesStructured === undefined) {
      draft.outlines.episodesStructured = [];
    }

    if (draft.outlines.beatCards === undefined) {
      draft.outlines.beatCards = [];
    }
  }

  if (draft) {
    if (!draft.adaptation) {
      draft.adaptation = createDefaultAdaptationDraft();
    } else {
      draft.adaptation.targetMarket = normalizeAdaptationTargetMarket(draft.adaptation.targetMarket);
      draft.adaptation.preferredGenre = normalizeAdaptationStrategy(draft.adaptation.preferredGenre);
    }
    draft.script = normalizeScriptDraft(draft.script);
    draft.episodeScripts = normalizeEpisodeScripts(draft.episodeScripts, draft.script);
    draft.qualityReports = Array.isArray(draft.qualityReports) ? draft.qualityReports : [];
  }

  const outline = project.sourceMaterial?.outline;
  if (outline && outline.sourceText !== undefined && outline.cleanedText === undefined) {
    outline.rawText = outline.sourceText;
    outline.cleanedText = outline.sourceText;
    delete outline.sourceText;
  }

  return project as ProjectRecord;
}

export function normalizeProjectRecord(project: ProjectRecord): ProjectRecord {
  return migrateProject(project);
}

export function loadProjects() {
  if (typeof window === "undefined") {
    return [];
  }

  if (projectCache) {
    return projectCache;
  }

  const cached = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
  if (!cached) {
    return [];
  }

  try {
    const parsed = JSON.parse(cached) as ProjectRecord[];
    const migrated = parsed.map((item) => {
      const migrated = migrateProject({
        ...item,
        providerConfig: mergeProviderConfig(item.providerConfig),
      });
      return migrated;
    });
    projectCache = migrated;
    return migrated;
  } catch {
    return [];
  }
}

export function loadCurrentProjectId(projects: ProjectRecord[]) {
  if (typeof window === "undefined") return projects[0]?.id ?? "";

  const cached = window.localStorage.getItem(CURRENT_PROJECT_ID_STORAGE_KEY);
  if (cached && projects.some((item) => item.id === cached)) {
    return cached;
  }

  return projects[0]?.id ?? "";
}

export function loadProjectWorkspace() {
  const projects = loadProjects();
  const currentProjectId = loadCurrentProjectId(projects);

  return {
    projects,
    currentProjectId,
  };
}

export function loadProjectsByMode(mode: SourceMode | "idea") {
  const all = loadProjects();

  if (mode === "idea") {
    return all.filter((p) => {
      const sm = p.sourceMode as string | undefined;
      return sm !== "outline" && sm !== "outline_studio";
    });
  }

  if (mode === "outline") {
    return all.filter((p) => {
      const sm = p.sourceMode as string | undefined;
      return sm === "outline" || sm === "outline_studio";
    });
  }

  return all.filter((p) => p.sourceMode === mode);
}

function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22)
  );
}

export function safeSetLocalStorageItem(key: string, value: string): boolean {
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

export function saveProjects(projects: ProjectRecord[]) {
  projectCache = projects.map((project) => migrateProject({
    ...project,
    providerConfig: mergeProviderConfig(project.providerConfig),
  }));
  safeSetLocalStorageItem(PROJECTS_STORAGE_KEY, JSON.stringify(projectCache));
  void persistProjectsToIndexedDb(projectCache).catch((error) => {
    console.warn("[projects] persist to IndexedDB failed", error);
  });
}

export function addProject(project: ProjectRecord) {
  const all = loadProjects();
  saveProjects([project, ...all]);
}

export function updateProjectById(
  projectId: string,
  updater: (project: ProjectRecord) => ProjectRecord,
) {
  const all = loadProjects();
  const next = all.map((p) => (p.id === projectId ? updater(p) : p));
  saveProjects(next);
  return next;
}

export function deleteProjectById(projectId: string) {
  const all = loadProjects();
  const next = all.filter((p) => p.id !== projectId);
  saveProjects(next);
  return next;
}

async function persistProjectsToIndexedDb(projects: ProjectRecord[]) {
  if (typeof window === "undefined") return;
  await localDb.transaction("rw", localDb.projects, localDb.projectDrafts, async () => {
    await localDb.projects.where("kind").equals("original").delete();
    await localDb.projectDrafts.where("kind").equals("original").delete();
    for (const project of projects) {
      await localDb.projects.put({
        id: project.id,
        kind: "original",
        title: project.title,
        projectType: project.sourceMode || "original",
        createdAt: project.updatedAt,
        updatedAt: project.updatedAt,
        payload: JSON.stringify(project),
      });
      await localDb.projectDrafts.put({
        id: `${project.id}:draft`,
        projectId: project.id,
        kind: "original",
        updatedAt: project.updatedAt,
        payload: JSON.stringify(project.draft),
      });
    }
  });
}

export async function hydrateProjectsCache() {
  if (typeof window === "undefined") return [];
  if (!projectHydrationPromise) {
    projectHydrationPromise = (async () => {
      await migrateLegacyStorageToIndexedDb();
      const rows = await localDb.projects.where("kind").equals("original").toArray();
      const projects = rows
        .map((row) => {
          try {
            return migrateProject(JSON.parse(row.payload) as ProjectRecord);
          } catch {
            return null;
          }
        })
        .filter((item): item is ProjectRecord => Boolean(item));
      if (projects.length > 0) {
        projectCache = projects;
        safeSetLocalStorageItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      }
    })();
  }
  await projectHydrationPromise;
  return projectCache ?? [];
}
