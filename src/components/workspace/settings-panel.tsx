"use client";

import { useEffect, useState } from "react";
import { useProviderConfig } from "@/hooks/use-provider-config";
import type { ModelProviderConfig } from "@/lib/types";

function ConfigField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  onClear,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
  disabled?: boolean;
  onClear?: () => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-white/50">{label}</span>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 pr-10 text-sm text-white outline-none placeholder:text-white/25 disabled:opacity-70 focus:border-cyan-400/40"
        />
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-full text-white/30 transition-colors hover:bg-white/10 hover:text-white"
            title="清空"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </label>
  );
}

const PROVIDER_PRESETS = [
  { id: "doubao", label: "豆包 (Doubao)", defaultBaseUrl: "https://ark.cn-beijing.volces.com/" + "api/coding/v3", defaultModel: "Doubao-Seed-2.0-pro" },
  { id: "deepseek", label: "DeepSeek", defaultBaseUrl: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat" },
  { id: "qwen", label: "通义千问 (Qwen)", defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", defaultModel: "qwen-plus" },
  { id: "openai", label: "OpenAI", defaultBaseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini" },
];

export function SettingsPanel(props?: {
  config?: ModelProviderConfig;
  onChange?: (config: ModelProviderConfig) => void;
}) {
  const {
    config: hookConfig,
    loading,
    hasApiKey,
    apiKeyLast4,
    error,
    saveConfig,
    testConnection,
    isMigratable,
    migrateLocalConfig,
  } = useProviderConfig();

  // 支持 props（outline-studio.tsx）或 hooks（settings-page-client.tsx）
  const config = props?.config ?? hookConfig;

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [draftProvider, setDraftProvider] = useState(config.provider);
  const [draftEnabled, setDraftEnabled] = useState(config.enabled);
  const [draftBaseUrl, setDraftBaseUrl] = useState(config.baseUrl);
  const [draftModel, setDraftModel] = useState(config.model);
  const [draftApiKey, setDraftApiKey] = useState("");

  useEffect(() => {
    setDraftProvider(config.provider);
    setDraftEnabled(config.enabled);
    setDraftBaseUrl(config.baseUrl);
    setDraftModel(config.model);
    setDraftApiKey("");
  }, [config.provider, config.enabled, config.baseUrl, config.model]);

  const isMaskedApiKey = (value?: string | null) => {
    if (!value) return false;
    return value.includes("•") || value.includes("*");
  };

  const propsApiKey = props?.config?.apiKey;
  const hasStoredApiKey = propsApiKey && !isMaskedApiKey(propsApiKey) ? true : hasApiKey;
  const storedApiKeyLast4 = propsApiKey && !isMaskedApiKey(propsApiKey)
    ? propsApiKey.slice(-4)
    : apiKeyLast4;

  const isValidHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());

  const activePreset = PROVIDER_PRESETS.find((p) => p.id === draftProvider);

  const handleSelectProvider = (presetId: string) => {
    if (draftProvider === presetId) return;
    const preset = PROVIDER_PRESETS.find((p) => p.id === presetId);
    if (!preset) {
      setDraftProvider(presetId);
      return;
    }
    setDraftProvider(preset.id);
    if (!draftBaseUrl.trim()) setDraftBaseUrl(preset.defaultBaseUrl);
    if (!draftModel.trim()) setDraftModel(preset.defaultModel);
  };

  const normalizeDraft = () => ({
    provider: draftProvider.trim(),
    enabled: draftEnabled,
    baseUrl: draftBaseUrl.trim(),
    model: draftModel.trim(),
    apiKey: draftApiKey.trim(),
  });

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const next = normalizeDraft();

    if (!next.provider) {
      setMessage("provider 不能为空");
      setSaving(false);
      return;
    }

    if (next.enabled) {
      if (!next.baseUrl) {
        setMessage("Base URL 不能为空");
        setSaving(false);
        return;
      }
      if (!isValidHttpUrl(next.baseUrl)) {
        setMessage("Base URL 必须以 http:// 或 https:// 开头");
        setSaving(false);
        return;
      }
      if (!next.model) {
        setMessage("模型名不能为空");
        setSaving(false);
        return;
      }
      if (!next.apiKey && !hasStoredApiKey) {
        setMessage("API Key 不能为空");
        setSaving(false);
        return;
      }
    }

    const fullConfig: ModelProviderConfig = {
      provider: next.provider as ModelProviderConfig["provider"],
      enabled: next.enabled,
      apiKey: next.apiKey || (propsApiKey && !isMaskedApiKey(propsApiKey) ? propsApiKey : ""),
      baseUrl: next.baseUrl,
      model: next.model,
    };

    if (props?.onChange) {
      props.onChange(fullConfig);
      setIsSaved(true);
      setMessage(next.enabled ? "配置已保存，模型调用已启用" : "配置已保存，当前使用平台兜底模型");
      setTimeout(() => setIsSaved(false), 2000);
      setSaving(false);
    } else {
      const result = await saveConfig({
        provider: fullConfig.provider,
        enabled: fullConfig.enabled,
        baseUrl: fullConfig.baseUrl,
        model: fullConfig.model,
        apiKey: next.apiKey ? next.apiKey : undefined,
      });
      if (result) {
        setIsSaved(true);
        setMessage(next.enabled ? "配置已保存到本地，模型调用已启用" : "配置已保存到本地，当前使用平台兜底模型");
        setTimeout(() => setIsSaved(false), 2000);
      } else {
        setMessage(error || "保存失败");
      }
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const next = normalizeDraft();
    if (!next.enabled) {
      setMessage("当前未启用外部模型配置，无需测试");
      return;
    }
    if (!next.baseUrl) {
      setMessage("Base URL 不能为空");
      return;
    }
    if (!isValidHttpUrl(next.baseUrl)) {
      setMessage("Base URL 必须以 http:// 或 https:// 开头");
      return;
    }
    if (!next.model) {
      setMessage("模型名不能为空");
      return;
    }
    setTesting(true);
    setMessage("");

    const result = await testConnection({
      provider: next.provider,
      enabled: next.enabled,
      baseUrl: next.baseUrl,
      model: next.model,
      apiKey: next.apiKey || undefined,
    });
    if (result.ok) {
      setMessage(`连接成功，当前模型：${result.model}`);
    } else {
      setMessage(result.error || "测试连接失败");
    }
    setTesting(false);
  };

  const handleMigrate = async () => {
    setMessage("当前版本已改为浏览器本地存储，无需迁移");
    const result = await migrateLocalConfig();
    if (result) {
      setMessage("迁移成功");
    } else {
      setMessage("当前版本不支持迁移");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="text-base text-white/50">加载中...</div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
      {/* ── Left: Provider list ── */}
      <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 self-start">
        <h4 className="mb-2 text-[11px] font-medium text-white/40 uppercase tracking-wider">供应商</h4>
        <div className="space-y-0.5">
          {PROVIDER_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectProvider(p.id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-xs transition ${
                draftProvider === p.id
                  ? "bg-white/10 text-white ring-1 ring-white/15"
                  : "text-white/50 hover:bg-white/[0.05] hover:text-white/70"
              }`}
            >
              <div className="font-medium">{p.label}</div>
              <div className="mt-0.5 text-[10px] text-white/30 truncate">{p.defaultModel}</div>
            </button>
          ))}
        </div>

        {/* Non-authenticated warning */}
        <div className="mt-3 rounded-lg bg-green-500/10 p-2.5 text-[11px] text-green-300/80 leading-relaxed">
          配置保存在浏览器本地，刷新后仍可恢复。
        </div>
      </aside>

      {/* ── Right: Config + actions ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        {/* Provider header */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-white">
            {activePreset?.label || draftProvider || "未选择供应商"}
          </h4>
          <p className="mt-0.5 text-xs text-white/40">
            配置保存在浏览器本地。
          </p>
        </div>

        {/* Migration prompt */}
        {isMigratable && (
          <div className="mb-4 rounded-lg bg-blue-500/10 p-3">
            <p className="text-xs text-blue-300">
              检测到浏览器中保存的模型配置，是否迁移到云端？迁移后 API Key 将加密保存。
            </p>
            <button
              onClick={handleMigrate}
              className="mt-1.5 rounded-md bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-400 transition"
            >
              迁移到云端
            </button>
          </div>
        )}

        {/* Enable toggle card */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium text-white/80">个人模型配置</div>
              <p className="mt-0.5 text-[11px] text-white/45 leading-relaxed">
                关闭后使用平台默认模型；开启后使用你填写的配置。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDraftEnabled((value) => !value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                draftEnabled
                  ? "bg-cyan-400 text-slate-950"
                  : "bg-white/10 text-white/70 hover:bg-white/15"
              }`}
            >
              {draftEnabled ? "已开启" : "已关闭"}
            </button>
          </div>
          {!draftEnabled && (
            <div className="mt-2 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300/80">
              当前使用平台兜底模型
            </div>
          )}
        </div>

        {/* Config fields */}
        <div className="space-y-3">
          <ConfigField
            label="API Key"
            type="password"
            value={draftApiKey}
            onChange={setDraftApiKey}
            onClear={() => setDraftApiKey("")}
            placeholder={hasStoredApiKey ? `已配置（...${storedApiKeyLast4}），输入新 Key 将替换旧 Key` : "sk-..."}
          />
          <ConfigField
            label="Base URL"
            value={draftBaseUrl}
            onChange={setDraftBaseUrl}
            onClear={() => setDraftBaseUrl("")}
            placeholder={activePreset?.defaultBaseUrl || "https://api.openai.com/v1"}
          />
          <ConfigField
            label="模型名"
            value={draftModel}
            onChange={setDraftModel}
            onClear={() => setDraftModel("")}
            placeholder={activePreset?.defaultModel || "gpt-4o-mini"}
          />
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              isSaved
                ? "bg-green-500 text-white"
                : "bg-white text-black hover:bg-slate-100"
            } disabled:opacity-50`}
          >
            {isSaved ? "已保存" : saving ? "保存中..." : draftEnabled ? "保存并启用" : "保存设置"}
          </button>
          <button
            onClick={handleTest}
            disabled={testing}
            className="rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/20 disabled:opacity-50"
          >
            {testing ? "测试中..." : "测试连接"}
          </button>
        </div>

        {/* Status message */}
        {(message || error) && (
          <div className={`mt-3 rounded-lg p-2.5 text-xs ${
            message.startsWith("连接成功") || message.startsWith("配置已保存") || message.startsWith("迁移成功")
              ? "bg-green-500/10 text-green-400"
              : "bg-white/5 text-white/60"
          }`}>
            {message || error}
          </div>
        )}
      </section>
    </div>
  );
}
