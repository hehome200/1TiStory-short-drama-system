import type {
  OriginalDraft,
  OriginalStep,
  StepPayloadMap,
  StepVersion,
  StepVersionHistory,
  VersionSource,
} from "@/lib/types";

export const VERSION_HISTORY_STORAGE_KEY = "storyplay-clone-version-history";

export const EMPTY_VERSION_HISTORY: StepVersionHistory = {
  overview: [],
  characters: [],
  outlines: [],
  script: [],
};

export function loadVersionHistory() {
  if (typeof window === "undefined") return EMPTY_VERSION_HISTORY;

  const cached = window.localStorage.getItem(VERSION_HISTORY_STORAGE_KEY);
  if (!cached) return EMPTY_VERSION_HISTORY;

  try {
    return {
      ...EMPTY_VERSION_HISTORY,
      ...(JSON.parse(cached) as StepVersionHistory),
    };
  } catch {
    return EMPTY_VERSION_HISTORY;
  }
}

export function getStepPayload<TStep extends OriginalStep>(
  draft: OriginalDraft,
  step: TStep,
): StepPayloadMap[TStep] {
  switch (step) {
    case "overview":
      return draft.overview as StepPayloadMap[TStep];
    case "characters":
      return draft.characters as StepPayloadMap[TStep];
    case "outlines":
      return draft.outlines as StepPayloadMap[TStep];
    case "script":
      return draft.script as StepPayloadMap[TStep];
  }
}

export function applyStepPayload<TStep extends OriginalStep>(
  draft: OriginalDraft,
  step: TStep,
  payload: StepPayloadMap[TStep],
) {
  switch (step) {
    case "overview":
      return { ...draft, overview: payload as OriginalDraft["overview"] };
    case "characters":
      return { ...draft, characters: payload as OriginalDraft["characters"] };
    case "outlines":
      return { ...draft, outlines: payload as OriginalDraft["outlines"] };
    case "script":
      return { ...draft, script: payload as OriginalDraft["script"] };
  }
}

export function summarizeStep(step: OriginalStep, payload: StepPayloadMap[OriginalStep]) {
  switch (step) {
    case "overview": {
      const value = payload as OriginalDraft["overview"];
      return value.premise?.slice(0, 48) || `${value.genres} / ${value.coreHooks}`;
    }
    case "characters": {
      const value = payload as OriginalDraft["characters"];
      return value.slice(0, 3).map((item) => item.name).join("、") || "人物卡空白版本";
    }
    case "outlines": {
      const value = payload as OriginalDraft["outlines"];
      return value.macro?.slice(0, 48) || `${value.range} 集纲版本`;
    }
    case "script": {
      const value = payload as OriginalDraft["script"];
      return `${value.episode} · ${value.content.slice(0, 42) || "正文空白版本"}`;
    }
  }
}

export function createVersion<TStep extends OriginalStep>(input: {
  step: TStep;
  payload: StepPayloadMap[TStep];
  source: VersionSource;
}) {
  return {
    id: `${input.step}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    step: input.step,
    createdAt: new Date().toISOString(),
    source: input.source,
    summary: summarizeStep(input.step, input.payload),
    payload: input.payload,
  } satisfies StepVersion<TStep>;
}
