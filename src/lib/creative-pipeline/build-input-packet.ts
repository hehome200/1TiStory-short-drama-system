import type {
  AllowedCreativeOperations,
  CreativeInputPacket,
  ScriptType,
} from "./types";

export type OriginalCommercialMode =
  | "free"
  | "paid"
  | "ad_unlock"
  | "membership"
  | "unknown";

export type BuildOriginalCreativeInputPacketInput = {
  projectId?: string;
  scriptType: ScriptType;
  premise?: string;
  audiences?: string[];
  genres?: string[];
  coreHooks?: string[];
  styleTags?: string[];
  episodeCount?: number;
  commercialMode?: OriginalCommercialMode;
};

function createOriginalAllowedOperations(): AllowedCreativeOperations {
  return {
    canInventCharacters: true,
    canAddScenes: true,
    canReorderEvents: true,
    canChangeEnding: true,
    canChangeGenre: true,
    canCompressSource: true,
    canExpandSource: true,
    canUseReferenceOnly: false,
  };
}

function normalizeStringArray(value: string[] | undefined): string[] {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function normalizeEpisodeCount(value: number | undefined): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  const normalized = Math.floor(value ?? 0);
  return normalized > 0 ? normalized : undefined;
}

function normalizeScriptType(scriptType: ScriptType): ScriptType {
  return scriptType === "ai_comic" ? "ai_comic" : "short_drama";
}

function createPacketId(): string {
  return `creative-input-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildOriginalCreativeInputPacket(
  input: BuildOriginalCreativeInputPacketInput,
): CreativeInputPacket {
  const scriptType = normalizeScriptType(input.scriptType);
  const premise = input.premise?.trim() ?? "";
  const audiences = normalizeStringArray(input.audiences);
  const genres = normalizeStringArray(input.genres);
  const coreHooks = normalizeStringArray(input.coreHooks);
  const styleTags = normalizeStringArray(input.styleTags);
  const episodeCount = normalizeEpisodeCount(input.episodeCount);
  const commercialMode = input.commercialMode ?? "unknown";
  const allowedOperations = createOriginalAllowedOperations();
  const now = new Date().toISOString();

  return {
    id: createPacketId(),
    projectId: input.projectId,
    intent: "original",
    mode: "draft",
    stage: "source_intake",
    scriptType,
    sourceType: "inspiration",
    bindingLevel: "none",
    sourceMaterials: [
      {
        id: "source-inspiration-main",
        type: "inspiration",
        rawText: premise,
        summary: premise || undefined,
        metadata: {
          audiences,
          genres,
          coreHooks,
          styleTags,
        },
        bindingLevel: "none",
        allowedOperations: createOriginalAllowedOperations(),
      },
    ],
    target: {
      scriptType,
      targetAudience: audiences[0],
      targetGenres: genres.length > 0 ? genres : undefined,
      commercialMode,
      episodeCount,
      toneTags: styleTags.length > 0 ? styleTags : undefined,
    },
    allowedOperations,
    createdAt: now,
    updatedAt: now,
  };
}