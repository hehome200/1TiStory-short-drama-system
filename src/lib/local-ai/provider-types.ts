import type { ModelProviderConfig } from "@/lib/types";

export type GenerationPrompt = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: "text" | "json_object" };
};

export type GenerationProviderErrorCode =
  | "missing-config"
  | "invalid-base-url"
  | "request-failed"
  | "empty-response";

export type GenerationProviderResult = {
  text: string;
  raw?: unknown;
};

export interface GenerationProvider {
  name: "openai-compatible";
  generate(prompt: GenerationPrompt, config: ModelProviderConfig): Promise<GenerationProviderResult>;
}

export function isOpenAiCompatibleConfig(config?: Partial<ModelProviderConfig> | null) {
  const apiKey = config?.apiKey?.trim();
  const baseUrl = config?.baseUrl?.trim();
  const model = config?.model?.trim();
  return Boolean(apiKey && baseUrl && model);
}
