import type { ModelProviderConfig } from "@/lib/types";
import { recordModelUsageLog, type ModelUsageContext } from "@/lib/ai/model-usage-log";

// ── Timeout & Error Utilities ──

function isAbortError(e: unknown): boolean {
  return e instanceof Error && (e.name === "AbortError" || (e as DOMException)?.name === "AbortError");
}

function normalizeAIError(e: unknown, context: string): Error {
  if (isAbortError(e)) return new Error("AI 模型请求超时（" + context + "）");
  return e instanceof Error ? e : new Error("AI 请求失败：" + String(e));
}

function normalizeBaseUrl(rawBaseUrl?: string | null) {
  const trimmed = rawBaseUrl?.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(cleaned)) return null;
  try {
    new URL(cleaned);
    return cleaned;
  } catch {
    return null;
  }
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type ChatCompletionStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | Array<{ type?: string; text?: string }>;
      reasoning_content?: string;
      reasoning?: string;
      thinking?: string;
    };
  }>;
};

// Anthropic 格式响应
type AnthropicMessageResponse = {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<{ type: "text"; text: string }>;
  model: string;
  stop_reason?: string;
  stop_sequence?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

type AnthropicStreamEvent =
  | { type: "message_start"; message: AnthropicMessageResponse }
  | { type: "content_block_start"; index: number; content_block: { type: "text"; text: string } }
  | { type: "content_block_delta"; index: number; delta: { type: "text_delta"; text: string } }
  | { type: "content_block_stop"; index: number }
  | { type: "message_delta"; delta: { stop_reason?: string; stop_sequence?: string } }
  | { type: "message_stop" };

export async function createAliyunChatCompletion(input: {
  system: string;
  user: string;
  providerConfig?: ModelProviderConfig;
  useAnthropicFormat?: boolean;
  maxTokens?: number;
  enableThinking?: boolean;
  thinking?: { type: "enabled" | "disabled" };
  responseFormat?: { type: "text" | "json_object" };
  usageContext?: ModelUsageContext;
}) {
  const useAnthropic = input.useAnthropicFormat ?? false; // 默认使用 OpenAI 兼容格式

  if (useAnthropic) {
    return createAnthropicChatCompletion(input);
  }

  // OpenAI 兼容格式
  const apiKey = input.providerConfig?.apiKey || process.env.ALIYUN_API_KEY;
  const baseUrl = normalizeBaseUrl(input.providerConfig?.baseUrl || process.env.ALIYUN_BASE_URL);
  const model = input.providerConfig?.model || process.env.ALIYUN_TEXT_MODEL;

  if (!apiKey) {
    console.warn("[createAliyunChatCompletion] API Key 为空");
    return null;
  }

  if (!baseUrl) {
    console.warn("[createAliyunChatCompletion] Base URL 无效");
    return null;
  }

  if (!model) {
    console.warn("[createAliyunChatCompletion] Model 为空");
    return null;
  }

  // 去除 baseUrl 末尾的斜杠，避免拼接成 //
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const url = `${cleanBaseUrl}/chat/completions`;
  console.log("[createAliyunChatCompletion] 请求 URL:", url);

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: input.maxTokens || 600,
        // Aliyun API 要求 enable_thinking 必须为 true，不传 false
        ...(input.enableThinking === true ? { enable_thinking: true } : {}),
        ...(input.thinking ? { thinking: input.thinking } : {}),
        ...(input.responseFormat ? { response_format: input.responseFormat } : {}),
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(300_000), // 5 min connection timeout
    });
  } catch (e) {
    throw normalizeAIError(e, "5 分钟未返回");
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Aliyun API 调用失败：${response.status} ${errorText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  if (input.usageContext) {
    await recordModelUsageLog({
      context: input.usageContext,
      provider: input.providerConfig?.provider ?? "aliyun",
      model,
      status: "success",
      latencyMs: Date.now() - startedAt,
      promptTokens: data.usage?.prompt_tokens ?? null,
      completionTokens: data.usage?.completion_tokens ?? null,
      totalTokens: data.usage?.total_tokens ?? null,
    });
  }
  return content;
}

// ── Provider 原始响应诊断类型 ──

export type ProviderDiagnostics = {
  content: string;
  httpStatus?: number;
  httpOk?: boolean;
  responseId?: string;
  requestId?: string;
  choicesLength?: number;
  finishReason?: string;
  contentLength?: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  providerError?: string;
  rawBodyPreview?: string;
};

/**
 * 诊断版 OpenAI 兼容 Chat Completions 调用。
 * 增强 createAliyunChatCompletion，返回完整的 provider 原始响应摘要，
 * 用于 Prompt Inspector 诊断。不改动 createAliyunChatCompletion 原有行为。
 *
 * 安全：不输出 API Key、Authorization header、完整 prompt。
 */
export async function createAliyunChatCompletionWithDiagnostics(input: {
  system: string;
  user: string;
  providerConfig?: ModelProviderConfig;
  useAnthropicFormat?: boolean;
  maxTokens?: number;
  enableThinking?: boolean;
  thinking?: { type: "enabled" | "disabled" };
  responseFormat?: { type: "text" | "json_object" };
  usageContext?: ModelUsageContext;
}): Promise<ProviderDiagnostics> {
  const useAnthropic = input.useAnthropicFormat ?? false;
  if (useAnthropic) {
    // Anthropic 格式暂不走诊断路径，退回原调用
    try {
      const content = await createAnthropicChatCompletion(input);
      return {
        content: content ?? "",
        contentLength: content?.length ?? 0,
      };
    } catch (e) {
      return {
        content: "",
        providerError: e instanceof Error ? e.message : String(e),
      };
    }
  }

  const apiKey = input.providerConfig?.apiKey || process.env.ALIYUN_API_KEY;
  const baseUrl = normalizeBaseUrl(input.providerConfig?.baseUrl || process.env.ALIYUN_BASE_URL);
  const model = input.providerConfig?.model || process.env.ALIYUN_TEXT_MODEL;

  if (!apiKey) {
    return { content: "", providerError: "API Key 为空" };
  }
  if (!baseUrl) {
    return { content: "", providerError: "Base URL 无效" };
  }
  if (!model) {
    return { content: "", providerError: "Model 为空" };
  }

  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const url = `${cleanBaseUrl}/chat/completions`;

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: input.maxTokens || 600,
        ...(input.enableThinking === true ? { enable_thinking: true } : {}),
        ...(input.thinking ? { thinking: input.thinking } : {}),
        ...(input.responseFormat ? { response_format: input.responseFormat } : {}),
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
      cache: "no-store",
      // 不设置 internal timeout，由调用方 withPolishTimeout(45s) 统一控制超时
    });
  } catch (e) {
    return {
      content: "",
      providerError: `fetch failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const httpStatus = response.status;
  const httpOk = response.ok;
  const rawText = await response.text();
  const rawBodyPreview = rawText.slice(0, 1000);

  if (!httpOk) {
    return {
      content: "",
      httpStatus,
      httpOk,
      providerError: `HTTP ${httpStatus}: ${rawBodyPreview.slice(0, 500)}`,
      rawBodyPreview,
    };
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return {
      content: "",
      httpStatus,
      httpOk,
      providerError: "JSON parse failed",
      rawBodyPreview,
    };
  }

  const choices = Array.isArray(data.choices) ? data.choices : [];
  const firstChoice = (choices[0] as Record<string, unknown> | undefined) ?? {};
  const finishReason = typeof firstChoice.finish_reason === "string" ? firstChoice.finish_reason : "";
  const message = (firstChoice.message as Record<string, unknown> | undefined) ?? {};
  const content = typeof message.content === "string" ? message.content : "";
  const responseId = typeof data.id === "string" ? data.id : "";

  // Record usage log
  if (input.usageContext) {
    await recordModelUsageLog({
      context: input.usageContext,
      provider: input.providerConfig?.provider ?? "aliyun",
      model,
      status: "success",
      latencyMs: Date.now() - startedAt,
      promptTokens: typeof (data.usage as Record<string, unknown> | undefined)?.prompt_tokens === "number"
        ? (data.usage as Record<string, number>).prompt_tokens : null,
      completionTokens: typeof (data.usage as Record<string, unknown> | undefined)?.completion_tokens === "number"
        ? (data.usage as Record<string, number>).completion_tokens : null,
      totalTokens: typeof (data.usage as Record<string, unknown> | undefined)?.total_tokens === "number"
        ? (data.usage as Record<string, number>).total_tokens : null,
    });
  }

  const usageData = data.usage as Record<string, number> | undefined;

  return {
    content,
    httpStatus,
    httpOk,
    responseId,
    requestId: responseId,
    choicesLength: choices.length,
    finishReason,
    contentLength: content.length,
    usage: usageData ? {
      promptTokens: usageData.prompt_tokens,
      completionTokens: usageData.completion_tokens,
      totalTokens: usageData.total_tokens,
    } : undefined,
    providerError: "",
    rawBodyPreview,
  };
}

async function createAnthropicChatCompletion(input: {
  system: string;
  user: string;
  providerConfig?: ModelProviderConfig;
  maxTokens?: number;
  usageContext?: ModelUsageContext;
}) {
  const apiKey = input.providerConfig?.apiKey || process.env.ALIYUN_API_KEY;
  const baseUrl = normalizeBaseUrl(
    input.providerConfig?.baseUrl ||
    "https://coding.dashscope.aliyuncs.com/apps/anthropic",
  );
  const model =
    input.providerConfig?.model || process.env.ALIYUN_TEXT_MODEL || "qwen3.5-plus";

  if (!apiKey) {
    return null;
  }

  if (!baseUrl) {
    return null;
  }

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "User-Agent": "Claude-Code/2.1.116 (cli)",
        "X-Client-Type": "claude-code",
        "X-Client-Version": "2.1.116",
      },
      body: JSON.stringify({
        model,
        max_tokens: input.maxTokens || 4096,
        temperature: 0.7,
        system: input.system,
        messages: [
          { role: "user", content: input.user },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(300_000), // 5 min connection timeout
    });
  } catch (e) {
    throw normalizeAIError(e, "5 分钟未返回");
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Aliyun Anthropic API 调用失败：${response.status} ${errorText}`);
  }

  const data = (await response.json()) as AnthropicMessageResponse;
  const content = data.content?.[0]?.text ?? "";
  if (input.usageContext) {
    await recordModelUsageLog({
      context: input.usageContext,
      provider: input.providerConfig?.provider ?? "aliyun",
      model,
      status: "success",
      latencyMs: Date.now() - startedAt,
      promptTokens: data.usage?.input_tokens ?? null,
      completionTokens: data.usage?.output_tokens ?? null,
      totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    });
  }
  return content;
}

export async function streamAliyunChatCompletion(
  input: {
    system: string;
    user: string;
    providerConfig?: ModelProviderConfig;
    useAnthropicFormat?: boolean;
    temperature?: number;
    maxTokens?: number;
    enableThinking?: boolean;
    usageContext?: ModelUsageContext;
  },
  onDelta: (chunk: string) => Promise<void> | void,
  onReasoning?: (text: string) => Promise<void> | void,
) {
  const useAnthropic = input.useAnthropicFormat ?? false; // 默认使用 OpenAI 兼容格式

  if (useAnthropic) {
    return streamAnthropicChatCompletion(input, onDelta);
  }

  // OpenAI 兼容流
  const apiKey = input.providerConfig?.apiKey || process.env.ALIYUN_API_KEY;
  const baseUrl = normalizeBaseUrl(input.providerConfig?.baseUrl || process.env.ALIYUN_BASE_URL);
  const model = input.providerConfig?.model || process.env.ALIYUN_TEXT_MODEL;

  console.log("[model config]", {
    provider: input.providerConfig?.provider,
    baseUrl,
    model,
    hasApiKey: Boolean(apiKey),
    useAnthropicFormat: false,
  });

  if (!apiKey) {
    console.warn("[model] API Key 为空");
    return null;
  }

  if (!baseUrl) {
    console.warn("[model] Base URL 无效");
    return null;
  }

  if (!model) {
    console.warn("[model] Model 为空");
    return null;
  }

  // 去除 baseUrl 末尾的斜杠，避免拼接成 //
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const url = `${cleanBaseUrl}/chat/completions`;
  console.log("[model request url]", url);

  // 连接超时：90s 仅用于 fetch 建连/拿 response，拿到后立即清除
  const abortController = new AbortController();
  const connectionTimer = setTimeout(() => { abortController.abort(); }, 90_000);
  const startedAt = Date.now();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens ?? 1200,
        stream: true,
        // Aliyun API 要求 enable_thinking 必须为 true，不传 false
        ...(input.enableThinking === true ? { enable_thinking: true } : {}),
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
      cache: "no-store",
      signal: abortController.signal,
    });
  } catch (e) {
    throw normalizeAIError(e, "90 秒未建立连接或收到响应");
  } finally {
    clearTimeout(connectionTimer);
  }

  console.log("[model response]", response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[model error body]", errorText);
    throw new Error(`模型接口错误：${response.status} ${errorText}`);
  }

  if (!response.body) {
    throw new Error("模型流式响应为空");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let chunkCount = 0;
  let idleTimedOut = false;

  // Inactivity timeout: 60s with no new data → throw, no partial text
  const INACTIVITY_TIMEOUT_MS = 60_000;
  let inactivityTimer: ReturnType<typeof setTimeout> | undefined;
  const resetInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => { idleTimedOut = true; reader.cancel(); }, INACTIVITY_TIMEOUT_MS);
  };
  resetInactivityTimer();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      resetInactivityTimer();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;

        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data) as ChatCompletionStreamChunk;
          const deltaContent = parsed.choices?.[0]?.delta?.content;
          const deltaReasoning =
            parsed.choices?.[0]?.delta?.reasoning_content ??
            parsed.choices?.[0]?.delta?.reasoning ??
            parsed.choices?.[0]?.delta?.thinking;

          // 转发 reasoning，不混入正文内容
          if (typeof deltaReasoning === "string" && deltaReasoning.trim() && onReasoning) {
            await onReasoning(deltaReasoning);
          }

          let chunk = "";
          if (typeof deltaContent === "string") {
            chunk = deltaContent;
          } else if (Array.isArray(deltaContent)) {
            chunk = deltaContent
              .map((item) => item.text ?? "")
              .join("");
          }

          if (!chunk) continue;

          chunkCount++;
          fullText += chunk;
          await onDelta(chunk);
        } catch (err) {
          console.warn("[stream parse failed]", data);
        }
      }
    }
  } finally {
    if (inactivityTimer) clearTimeout(inactivityTimer);
  }

  if (idleTimedOut) {
    throw new Error("AI 流式响应中断：超过 60 秒未收到新内容");
  }

  console.log("[stream complete]", { chunkCount, fullTextLength: fullText.length });
  if (input.usageContext) {
    await recordModelUsageLog({
      context: input.usageContext,
      provider: input.providerConfig?.provider ?? "aliyun",
      model,
      status: "success",
      latencyMs: Date.now() - startedAt,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
    });
  }
  return fullText;
}

async function streamAnthropicChatCompletion(
  input: {
    system: string;
    user: string;
    providerConfig?: ModelProviderConfig;
    usageContext?: ModelUsageContext;
  },
  onDelta: (chunk: string) => Promise<void> | void,
) {
  const apiKey = input.providerConfig?.apiKey || process.env.ALIYUN_API_KEY;
  const baseUrl =
    normalizeBaseUrl(
      input.providerConfig?.baseUrl ||
      "https://coding.dashscope.aliyuncs.com/apps/anthropic",
    );
  const model =
    input.providerConfig?.model || process.env.ALIYUN_TEXT_MODEL || "qwen3.5-plus";

  if (!apiKey) {
    return null;
  }

  if (!baseUrl) {
    return null;
  }

  // 连接超时：90s 仅用于 fetch 建连/拿 response，拿到后立即清除
  const abortController = new AbortController();
  const connectionTimer = setTimeout(() => { abortController.abort(); }, 90_000);

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "User-Agent": "Claude-Code/2.1.116 (cli)",
        "X-Client-Type": "claude-code",
        "X-Client-Version": "2.1.116",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0.7,
        stream: true,
        system: input.system,
        messages: [
          { role: "user", content: input.user },
        ],
      }),
      cache: "no-store",
      signal: abortController.signal,
    });
  } catch (e) {
    throw normalizeAIError(e, "90 秒未建立连接或收到响应");
  } finally {
    clearTimeout(connectionTimer);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Aliyun Anthropic API 调用失败：${response.status} ${errorText}`);
  }

  if (!response.body) {
    throw new Error("模型流式响应为空");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let idleTimedOut = false;

  // Inactivity timeout: 60s with no new data → throw, no partial text
  const INACTIVITY_TIMEOUT_MS = 60_000;
  let inactivityTimer: ReturnType<typeof setTimeout> | undefined;
  const resetInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => { idleTimedOut = true; reader.cancel(); }, INACTIVITY_TIMEOUT_MS);
  };
  resetInactivityTimer();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      resetInactivityTimer();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;

        const data = line.slice(5).trim();
        if (!data) continue;

        try {
          const event = JSON.parse(data) as AnthropicStreamEvent;

          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const chunk = event.delta.text;
            fullText += chunk;
            await onDelta(chunk);
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  } finally {
    if (inactivityTimer) clearTimeout(inactivityTimer);
  }

  if (idleTimedOut) {
    throw new Error("AI 流式响应中断：超过 60 秒未收到新内容");
  }

  if (input.usageContext) {
    await recordModelUsageLog({
      context: input.usageContext,
      provider: input.providerConfig?.provider ?? "aliyun",
      model,
      status: "success",
      latencyMs: Date.now() - startedAt,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
    });
  }

  return fullText;
}

export async function testAliyunConnection(providerConfig: ModelProviderConfig) {
  // 使用 OpenAI 兼容格式测试（与灵感策划保持一致）
  const content = await createAliyunChatCompletion({
    system: "你是一个用于连通性测试的模型。",
    user: "请只回答：ok",
    providerConfig,
    useAnthropicFormat: false, // 使用 OpenAI 兼容格式
  });

  return {
    ok: content?.toLowerCase().includes("ok") ?? false,
    model: providerConfig.model,
  };
}

export function extractJsonBlock(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("模型返回为空");
  }

  // 1. 尝试匹配 ```json 代码块
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  // 2. 尝试匹配任意代码块
  const codeBlockMatch = trimmed.match(/```\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    const codeContent = codeBlockMatch[1].trim();
    // 如果代码块内容看起来像 JSON（包含 { 或 [），直接返回
    if (codeContent.includes("{") || codeContent.includes("[")) {
      return codeContent;
    }
  }

  // 3. 优先处理标准 JSON 对象（以 { 开头，} 结尾）
  const objectStart = trimmed.indexOf("{");
  if (objectStart !== -1) {
    // 找到匹配的 }，处理嵌套结构
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let endIndex = -1;

    for (let i = objectStart; i < trimmed.length; i++) {
      const char = trimmed[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    if (endIndex !== -1) {
      const jsonCandidate = trimmed.slice(objectStart, endIndex + 1);
      return jsonCandidate;
    }
  }

  // 4. 尝试提取数组形式的 JSON
  const arrayStart = trimmed.indexOf("[");
  if (arrayStart !== -1) {
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    let endIndex = -1;

    for (let i = arrayStart; i < trimmed.length; i++) {
      const char = trimmed[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '[') {
          bracketCount++;
        } else if (char === ']') {
          bracketCount--;
          if (bracketCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    if (endIndex !== -1) {
      const jsonCandidate = trimmed.slice(arrayStart, endIndex + 1);
      if (jsonCandidate.trim().startsWith("[") && jsonCandidate.trim().endsWith("]")) {
        return jsonCandidate;
      }
    }
  }

  // 5. 纯文本键值对模式（最后尝试）
  // 例如：audiences: ["男频"], genres: ["奇幻"]
  const hasJsonPattern = /["']?\w+["']?\s*:\s*\[/.test(trimmed);
  if (hasJsonPattern) {
    // 尝试提取所有键值对，包装成 JSON 对象
    const extracted: Record<string, string[]> = {};

    // 提取 audiences - 匹配到 ] 或行尾
    const audiencesMatch = trimmed.match(/audiences["']?\s*:\s*\[([\s\S]*?)\](?:,|$)/);
    if (audiencesMatch) {
      extracted.audiences = audiencesMatch[1].split(",").map((s) => s.trim().replace(/["']/g, "")).filter(Boolean);
    }

    // 提取 genres
    const genresMatch = trimmed.match(/genres["']?\s*:\s*\[([\s\S]*?)\](?:,|$)/);
    if (genresMatch) {
      extracted.genres = genresMatch[1].split(",").map((s) => s.trim().replace(/["']/g, "")).filter(Boolean);
    }

    // 提取 coreHooks
    const coreHooksMatch = trimmed.match(/coreHooks["']?\s*:\s*\[([\s\S]*?)\](?:,|$)/);
    if (coreHooksMatch) {
      extracted.coreHooks = coreHooksMatch[1].split(",").map((s) => s.trim().replace(/["']/g, "")).filter(Boolean);
    }

    // 提取 styleTags
    const styleTagsMatch = trimmed.match(/styleTags["']?\s*:\s*\[([\s\S]*?)\](?:,|$)/);
    if (styleTagsMatch) {
      extracted.styleTags = styleTagsMatch[1].split(",").map((s) => s.trim().replace(/["']/g, "")).filter(Boolean);
    }

    if (Object.keys(extracted).length > 0) {
      return JSON.stringify(extracted);
    }
  }

  // 6. 兜底：返回整个内容，让调用者自行处理
  console.warn("[extractJsonBlock] 未找到标准 JSON 格式，返回原始内容:", trimmed.slice(0, 100));
  return trimmed;
}
