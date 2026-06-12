import type { ModelProviderConfig } from "@/lib/types";
import type { GenerationProvider, GenerationProviderResult, GenerationPrompt } from "./provider-types";

function normalizeBaseUrl(rawBaseUrl?: string | null) {
  const trimmed = rawBaseUrl?.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

export class OpenAiCompatibleProvider implements GenerationProvider {
  name = "openai-compatible" as const;

  async generate(prompt: GenerationPrompt, config: ModelProviderConfig): Promise<GenerationProviderResult> {
    const apiKey = config.apiKey.trim();
    const baseUrl = normalizeBaseUrl(config.baseUrl);
    const model = config.model.trim();

    if (!apiKey || !baseUrl || !model) {
      throw new Error("未配置模型，请先填写 Base URL、API Key 和 Model");
    }

    const url = `${baseUrl}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: prompt.temperature ?? 0.7,
        max_tokens: prompt.maxTokens ?? 1024,
        ...(prompt.responseFormat ? { response_format: prompt.responseFormat } : {}),
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`模型请求失败：${response.status}${text ? ` ${text}` : ""}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      throw new Error("模型返回为空");
    }
    return { text, raw: data };
  }
}
