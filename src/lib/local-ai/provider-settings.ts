import type { ModelProviderConfig } from "@/lib/types";
import { loadProviderSettings, saveProviderSettings } from "@/lib/local-db/settings-repository";

export const DEFAULT_LOCAL_PROVIDER_CONFIG: ModelProviderConfig = {
  provider: "openai",
  enabled: false,
  apiKey: "",
  baseUrl: "",
  model: "",
};

export async function loadLocalProviderConfig(): Promise<ModelProviderConfig> {
  const persisted = await loadProviderSettings();
  if (!persisted) {
    return DEFAULT_LOCAL_PROVIDER_CONFIG;
  }

  return {
    provider: persisted.provider,
    enabled: true,
    apiKey: persisted.apiKey,
    baseUrl: persisted.baseUrl,
    model: persisted.model,
  };
}

export async function persistLocalProviderConfig(config: ModelProviderConfig) {
  await saveProviderSettings({
    provider: "openai",
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
    saveToIndexedDb: true,
  });
}
