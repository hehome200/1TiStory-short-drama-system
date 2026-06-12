import type {
  GenerateAdaptResponse,
  GenerateOriginalResponse,
  GenerateRewriteResponse,
  OutlineExtractResponse,
  OutlineExtractRequest,
  StructuredSummaryExtraction,
  FactSheetExtractResponse,
  CharacterProfileExtractResponse,
  GenerateAdaptRequest,
  GenerateOriginalRequest,
  GenerateRewriteRequest,
} from "@/lib/ai/types";
import type {
  AdaptDraft,
  Character,
  ModelProviderConfig,
  OriginalDraft,
  RewriteDraft,
  SourceMaterialExtraction,
  SourceSections,
} from "@/lib/types";
import { generateWithLocalProvider } from "./generation-service";
import type { GenerationPrompt } from "./provider-types";

const MISSING_PROVIDER_MESSAGE =
  "尚未配置模型服务。请前往设置页填写 Base URL、API Key 和 Model。";

function stripJsonFence(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/, "")
      .trim();
  }
  return trimmed;
}

function parseJson<T>(text: string): T {
  const normalized = stripJsonFence(text);
  return JSON.parse(normalized) as T;
}

function assertProviderConfig(config?: Partial<ModelProviderConfig> | null): ModelProviderConfig {
  const apiKey = config?.apiKey?.trim();
  const baseUrl = config?.baseUrl?.trim();
  const model = config?.model?.trim();
  if (!apiKey || !baseUrl || !model) {
    throw new Error(MISSING_PROVIDER_MESSAGE);
  }
  return {
    provider: config?.provider ?? "openai",
    enabled: true,
    apiKey,
    baseUrl,
    model,
  };
}

async function generateJson<T>(
  prompt: GenerationPrompt,
  config?: Partial<ModelProviderConfig> | null,
): Promise<T> {
  const providerConfig = assertProviderConfig(config);
  const result = await generateWithLocalProvider(prompt, providerConfig);
  return parseJson<T>(result.text);
}

function baseSystemPrompt(domain: string) {
  return [
    "你是 1TiStory Community Edition 的本地生成助手。",
    "只输出 JSON，不要输出 Markdown 解释，不要输出前后缀说明。",
    `当前任务域：${domain}。`,
  ].join("\n");
}

function buildOriginalUserPrompt(input: GenerateOriginalRequest) {
  return JSON.stringify({
    task: "original",
    step: input.step,
    outlineGenerationMode: input.outlineGenerationMode ?? null,
    totalEpisodeCount: input.totalEpisodeCount ?? null,
    batchIndex: input.batchIndex ?? null,
    startEpisode: input.startEpisode ?? null,
    endEpisode: input.endEpisode ?? null,
    currentEpisode: input.currentEpisode ?? null,
    roughOutline: input.roughOutline ?? "",
    draft: input.draft,
  }, null, 2);
}

function buildRewriteUserPrompt(input: GenerateRewriteRequest) {
  return JSON.stringify(
    {
      task: "rewrite",
      step: input.step,
      overviewField: input.overviewField ?? null,
      draft: input.draft,
    },
    null,
    2,
  );
}

function buildAdaptUserPrompt(input: GenerateAdaptRequest) {
  return JSON.stringify(
    {
      task: "adapt",
      step: input.step,
      draft: input.draft,
    },
    null,
    2,
  );
}

function buildOutlineExtractUserPrompt(input: OutlineExtractRequest) {
  return JSON.stringify(input, null, 2);
}

function syntheticCharactersFromDraft(draft: OriginalDraft | RewriteDraft | AdaptDraft): Character[] {
  const sourceCharacters =
    "characters" in draft ? (draft.characters as Character[] | undefined) : undefined;
  if (Array.isArray(sourceCharacters) && sourceCharacters.length > 0) {
    return sourceCharacters;
  }
  return [
    {
      id: "local-character-1",
      name: "主角",
      role: "主角",
      gender: "unknown",
      age: 0,
      traits: "待完善",
      background: "由本地生成器补全",
      relationToMaleLead: "unknown",
      relationToFemaleLead: "unknown",
      relationshipTags: [],
    },
  ];
}

export async function generateOriginalPayload(
  input: GenerateOriginalRequest,
): Promise<GenerateOriginalResponse> {
  const data = await generateJson<Record<string, unknown>>(
    {
      system: baseSystemPrompt("original"),
      user: buildOriginalUserPrompt(input),
      responseFormat: { type: "json_object" },
      temperature: 0.5,
      maxTokens: 1800,
    },
    input.providerConfig,
  );

  if (input.step === "overview") {
    return { step: "overview", payload: data as OriginalDraft["overview"], source: "local" };
  }
  if (input.step === "characters") {
    return { step: "characters", payload: data as unknown as Character[], source: "local" };
  }
  if (input.step === "outlines") {
    return { step: "outlines", payload: data as OriginalDraft["outlines"], source: "local" };
  }
  return { step: "script", payload: data as OriginalDraft["script"], source: "local" };
}

export async function generateRewritePayload(
  input: GenerateRewriteRequest,
): Promise<GenerateRewriteResponse> {
  const data = await generateJson<Record<string, unknown>>(
    {
      system: baseSystemPrompt("rewrite"),
      user: buildRewriteUserPrompt(input),
      responseFormat: { type: "json_object" },
      temperature: 0.5,
      maxTokens: 1800,
    },
    input.providerConfig,
  );

  if (input.step === "infoflow") {
    return { step: "infoflow", payload: data as RewriteDraft["infoFlow"], source: "local" };
  }
  if (input.step === "overview") {
    return { step: "overview", payload: data as RewriteDraft["overview"], source: "local" };
  }
  if (input.step === "characters") {
    return { step: "characters", payload: data as unknown as Character[], source: "local" };
  }
  if (input.step === "outlines") {
    return { step: "outlines", payload: data as RewriteDraft["outlines"], source: "local" };
  }
  return { step: "script", payload: data as RewriteDraft["script"], source: "local" };
}

export async function generateAdaptPayload(
  input: GenerateAdaptRequest,
): Promise<GenerateAdaptResponse> {
  const data = await generateJson<Record<string, unknown>>(
    {
      system: baseSystemPrompt("adapt"),
      user: buildAdaptUserPrompt(input),
      responseFormat: { type: "json_object" },
      temperature: 0.5,
      maxTokens: 1800,
    },
    input.providerConfig,
  );

  if (input.step === "chapter") {
    return { step: "chapter", payload: data as AdaptDraft["chapter"], source: "local" };
  }
  if (input.step === "overview") {
    return { step: "overview", payload: data as AdaptDraft["overview"], source: "local" };
  }
  if (input.step === "characters") {
    return { step: "characters", payload: data as unknown as Character[], source: "local" };
  }
  if (input.step === "outlines") {
    return { step: "outlines", payload: data as AdaptDraft["outlines"], source: "local" };
  }
  return { step: "script", payload: data as AdaptDraft["script"], source: "local" };
}

export async function extractSourceMaterialPayload(
  sourceSections: SourceSections,
  providerConfig?: Partial<ModelProviderConfig> | null,
): Promise<SourceMaterialExtraction> {
  const data = await generateJson<SourceMaterialExtraction>(
    {
      system: baseSystemPrompt("original-source-material"),
      user: JSON.stringify({ task: "source-material-extraction", sourceSections }, null, 2),
      responseFormat: { type: "json_object" },
      temperature: 0.3,
      maxTokens: 2200,
    },
    providerConfig,
  );
  return data;
}

export async function extractOutlinePayload(
  input: OutlineExtractRequest,
): Promise<OutlineExtractResponse> {
  const data = await generateJson<Record<string, unknown>>(
    {
      system: baseSystemPrompt("outline-extract"),
      user: buildOutlineExtractUserPrompt(input),
      responseFormat: { type: "json_object" },
      temperature: 0.3,
      maxTokens: 2400,
    },
    input.providerConfig,
  );

  if (input.mode === "macro") {
    return { mode: "macro", payload: data as any, source: "local" };
  }
  if (input.mode === "structured-summary") {
    return { mode: "structured-summary", payload: data as StructuredSummaryExtraction, source: "local" };
  }
  return { mode: "extract", payload: data as any, source: "local" };
}

export async function extractFactSheetPayload(
  input: { sourceSections: SourceSections; providerConfig?: Partial<ModelProviderConfig> | null },
): Promise<FactSheetExtractResponse> {
  const data = await generateJson<Record<string, unknown>>(
    {
      system: baseSystemPrompt("outline-factsheet"),
      user: JSON.stringify(input, null, 2),
      responseFormat: { type: "json_object" },
      temperature: 0.2,
      maxTokens: 1600,
    },
    input.providerConfig,
  );
  return { payload: data as FactSheetExtractResponse["payload"], source: "local" };
}

export async function extractCharacterProfilesPayload(
  input: OutlineExtractRequest,
): Promise<CharacterProfileExtractResponse> {
  const data = await generateJson<Record<string, unknown>>(
    {
      system: baseSystemPrompt("outline-character-profiles"),
      user: buildOutlineExtractUserPrompt(input),
      responseFormat: { type: "json_object" },
      temperature: 0.2,
      maxTokens: 2200,
    },
    input.providerConfig,
  );
  return { mode: "character-profiles", payload: data as CharacterProfileExtractResponse["payload"], source: "local" };
}

export function toLocalCharactersFromDraft(draft: OriginalDraft | RewriteDraft | AdaptDraft) {
  return syntheticCharactersFromDraft(draft);
}
