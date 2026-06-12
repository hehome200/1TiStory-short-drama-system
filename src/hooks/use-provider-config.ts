"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadGlobalProviderConfig, saveGlobalProviderConfig } from "@/lib/provider-config";
import { loadLocalProviderConfig, persistLocalProviderConfig } from "@/lib/local-ai/provider-settings";
import { generateWithLocalProvider } from "@/lib/local-ai/generation-service";
import type { ModelProviderConfig } from "@/lib/types";
import type { GenerationPrompt } from "@/lib/local-ai/provider-types";

type UseProviderConfigReturn = {
  config: { provider: string; enabled: boolean; baseUrl: string; model: string };
  apiKeyInput: string;
  setApiKeyInput: (v: string) => void;
  loading: boolean;
  hasApiKey: boolean;
  apiKeyLast4: string | null;
  error: string | null;
  saveConfig: (patch: { provider?: string; enabled?: boolean; baseUrl?: string; model?: string; apiKey?: string | null }) => Promise<boolean>;
  testConnection: (patch?: { provider?: string; enabled?: boolean; baseUrl?: string; model?: string; apiKey?: string | null }) => Promise<{ ok: boolean; model?: string; error?: string }>;
  clearKey: () => Promise<void>;
  refetch: () => void;
  isMigratable: boolean;
  migrateLocalConfig: () => Promise<boolean>;
};

function normalizeConfig(config: ModelProviderConfig) {
  return {
    provider: config.provider,
    enabled: config.enabled,
    baseUrl: config.baseUrl,
    model: config.model,
  };
}

export function useProviderConfig(): UseProviderConfigReturn {
  const [config, setConfig] = useState(() => normalizeConfig(loadGlobalProviderConfig()));
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(Boolean(loadGlobalProviderConfig().apiKey));
  const [apiKeyLast4, setApiKeyLast4] = useState<string | null>(
    loadGlobalProviderConfig().apiKey ? loadGlobalProviderConfig().apiKey.slice(-4) : null,
  );
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const local = await loadLocalProviderConfig();
      const next = normalizeConfig(local);
      setConfig(next);
      setHasApiKey(Boolean(local.apiKey));
      setApiKeyLast4(local.apiKey ? local.apiKey.slice(-4) : null);
      setApiKeyInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载配置失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const saveConfig = useCallback(async (patch: { provider?: string; enabled?: boolean; baseUrl?: string; model?: string; apiKey?: string | null }) => {
    try {
      const current = loadGlobalProviderConfig();
      const next: ModelProviderConfig = {
        provider: (patch.provider ?? current.provider) as ModelProviderConfig["provider"],
        enabled: patch.enabled ?? current.enabled,
        baseUrl: patch.baseUrl ?? current.baseUrl,
        model: patch.model ?? current.model,
        apiKey: patch.apiKey !== undefined
          ? (patch.apiKey ?? "")
          : apiKeyInput || current.apiKey,
      };

      saveGlobalProviderConfig(next);
      await persistLocalProviderConfig(next);
      const normalized = normalizeConfig(next);
      setConfig(normalized);
      setHasApiKey(Boolean(next.apiKey));
      setApiKeyLast4(next.apiKey ? next.apiKey.slice(-4) : null);
      setApiKeyInput("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存配置失败");
      return false;
    }
  }, [apiKeyInput]);

  const testConnection = useCallback(async (patch?: { provider?: string; enabled?: boolean; baseUrl?: string; model?: string; apiKey?: string | null }) => {
    const current = loadGlobalProviderConfig();
    const next: ModelProviderConfig = {
      provider: (patch?.provider ?? current.provider) as ModelProviderConfig["provider"],
      enabled: patch?.enabled ?? current.enabled,
      baseUrl: patch?.baseUrl ?? current.baseUrl,
      model: patch?.model ?? current.model,
      apiKey: patch?.apiKey !== undefined ? (patch?.apiKey ?? "") : apiKeyInput || current.apiKey,
    };

    if (!next.enabled) {
      return { ok: false, error: "当前未启用外部模型配置" };
    }
    if (!next.baseUrl.trim()) {
      return { ok: false, error: "Base URL 不能为空" };
    }
    if (!next.model.trim()) {
      return { ok: false, error: "模型名不能为空" };
    }
    if (!next.apiKey.trim()) {
      return { ok: false, error: "API Key 不能为空" };
    }

    try {
      const prompt: GenerationPrompt = {
        system: "You are a connectivity test assistant.",
        user: "Reply with a single word: ok",
        maxTokens: 8,
        temperature: 0,
      };
      const result = await generateWithLocalProvider(prompt, next);
      return { ok: Boolean(result.text.trim()), model: next.model };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "测试连接失败" };
    }
  }, [apiKeyInput]);

  const clearKey = useCallback(async () => {
    const current = loadGlobalProviderConfig();
    const next: ModelProviderConfig = { ...current, apiKey: "" };
    saveGlobalProviderConfig(next);
    await persistLocalProviderConfig(next);
    setHasApiKey(false);
    setApiKeyLast4(null);
    setApiKeyInput("");
  }, []);

  const isMigratable = useMemo(() => false, []);

  const migrateLocalConfig = useCallback(async () => false, []);

  return {
    config,
    apiKeyInput,
    setApiKeyInput,
    loading,
    hasApiKey,
    apiKeyLast4,
    error,
    saveConfig,
    testConnection,
    clearKey,
    refetch: loadConfig,
    isMigratable,
    migrateLocalConfig,
  };
}
