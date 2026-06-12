import type { ModelProviderConfig } from "@/lib/types";
import { persistLocalProviderConfig } from "@/lib/local-ai/provider-settings";

export const DEFAULT_PROVIDER_CONFIG: ModelProviderConfig = {
  provider: "openai",
  enabled: false,
  apiKey: "",
  baseUrl: "",
  model: "",
};

export const PROVIDER_CONFIG_STORAGE_KEY = "1tistory-community-provider-config";

export function loadGlobalProviderConfig() {
  if (typeof window === "undefined") {
    return DEFAULT_PROVIDER_CONFIG;
  }

  const cached = window.localStorage.getItem(PROVIDER_CONFIG_STORAGE_KEY);
  if (!cached) {
    return DEFAULT_PROVIDER_CONFIG;
  }

  try {
    const parsed = JSON.parse(cached) as Partial<ModelProviderConfig>;
    return {
      ...DEFAULT_PROVIDER_CONFIG,
      ...parsed,
    };
  } catch {
    return DEFAULT_PROVIDER_CONFIG;
  }
}

export function saveGlobalProviderConfig(config: ModelProviderConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROVIDER_CONFIG_STORAGE_KEY, JSON.stringify(config));
  void persistLocalProviderConfig(config).catch((error) => {
    console.warn("[provider-config] persist to IndexedDB failed", error);
  });
}

export function mergeProviderConfig(config?: Partial<ModelProviderConfig>) {
  const globalConfig = loadGlobalProviderConfig();

  return {
    ...DEFAULT_PROVIDER_CONFIG,
    ...globalConfig,
    ...config,
    apiKey: config?.apiKey ?? globalConfig.apiKey ?? DEFAULT_PROVIDER_CONFIG.apiKey,
    baseUrl: config?.baseUrl ?? globalConfig.baseUrl ?? DEFAULT_PROVIDER_CONFIG.baseUrl,
    model: config?.model ?? globalConfig.model ?? DEFAULT_PROVIDER_CONFIG.model,
    enabled:
      typeof config?.enabled === "boolean" ? config.enabled : globalConfig.enabled,
  } satisfies ModelProviderConfig;
}
