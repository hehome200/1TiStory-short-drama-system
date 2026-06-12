export type StreamEventHandlers<TFinal> = {
  onPreview?: (chunk: string) => void;
  onStatus?: (data: { status: string; phase?: string }) => void;
  onPhaseChange?: (data: { from?: string; to?: string }) => void;
  onRevisePreview?: (chunk: string) => void;
  onReasoning?: (data: { text: string; episodeNumber?: number }) => void;
  onReview?: (data: { summary: string; issueCount: number; safeToRevise: boolean; noMajorIssue: boolean; issues: Array<{ type: string; severity: string; lineRef: string }> }) => void;
  onFinal: (payload: TFinal) => void;
  onError?: (message: string, code?: string, details?: unknown) => void;
};

export type StreamDebugContext = {
  prefix: string;
  step?: string;
  outlineGenerationMode?: string | null;
};

export async function consumeEventStream<TFinal>(
  response: Response,
  handlers: StreamEventHandlers<TFinal>,
  options?: {
    inactivityTimeoutMs?: number;
    totalTimeoutMs?: number;
    debugContext?: StreamDebugContext;
  },
) {
  if (!response.ok) {
    const fallbackText = await response.text();
    throw new Error(fallbackText || "流式请求失败");
  }

  if (!response.body) {
    throw new Error("流式响应为空");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const inactivityTimeoutMs = options?.inactivityTimeoutMs ?? 120_000;
  const totalTimeoutMs = options?.totalTimeoutMs ?? 210_000; // 默认总超时 210 秒
  let inactivityTimer: ReturnType<typeof setTimeout> | undefined;
  let totalTimer: ReturnType<typeof setTimeout> | undefined;
  let idleTimedOut = false;
  let totalTimedOut = false;
  const debugContext = options?.debugContext;
  const logPrefix = debugContext
    ? `[${debugContext.prefix}:${debugContext.step ?? "unknown"}:${debugContext.outlineGenerationMode || "default"}]`
    : "[outline-generate]";

  // 总超时保护
  totalTimer = setTimeout(() => {
    totalTimedOut = true;
    reader.cancel();
  }, totalTimeoutMs);

  const resetTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => { idleTimedOut = true; reader.cancel(); }, inactivityTimeoutMs);
  };
  resetTimer();

  const handleFrame = (frame: string) => {
    const trimmed = frame.trim();
    if (!trimmed) return;

    const lines = trimmed.split("\n");
    let eventName = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    const rawData = dataLines.join("\n");
    if (!rawData) return;

    // 开发态日志：SSE 事件解析（仅 localhost dev，跳过高频 preview/ping）
    const shouldLogSse =
      typeof window !== "undefined" &&
      window.location?.hostname === "localhost";
    if (shouldLogSse && eventName !== "preview" && eventName !== "ping") {
      let logInfo: Record<string, unknown> = { eventType: eventName, hasData: !!rawData };
      try {
        if (eventName === "final") {
          const parsed = JSON.parse(rawData) as Record<string, unknown>;
          const payload = parsed.payload as Record<string, unknown> | unknown[] | undefined;
          const confirmedEpisodes = !Array.isArray(payload) ? (payload?.confirmedEpisodes as unknown[] | undefined) : undefined;
          const characters = Array.isArray(payload) ? payload : undefined;
          const episodes = !Array.isArray(payload) ? (payload?.episodes as unknown[] | undefined) : undefined;
          const outlineBatches = !Array.isArray(payload) ? (payload?.outlineBatches as unknown[] | undefined) : undefined;
          logInfo = {
            ...logInfo,
            hasExtractionResult: !!payload,
            ...(debugContext?.step === "characters"
              ? {
                  charactersIsArray: Array.isArray(characters),
                  charactersCount: Array.isArray(characters) ? characters.length : 0,
                }
              : debugContext?.step === "outlines" && debugContext.outlineGenerationMode === "batch_rough_outlines"
                ? {
                    outlineBatchesIsArray: Array.isArray(outlineBatches),
                    outlineBatchesCount: Array.isArray(outlineBatches) ? outlineBatches.length : 0,
                  }
                : debugContext?.step === "outlines" && debugContext.outlineGenerationMode === "batch_episodes"
                  ? {
                      episodesIsArray: Array.isArray(episodes),
                      episodesCount: Array.isArray(episodes) ? episodes.length : 0,
                    }
                  : {}),
            ...(Array.isArray(confirmedEpisodes)
              ? {
                  confirmedEpisodesIsArray: true,
                  confirmedEpisodesCount: confirmedEpisodes.length,
                }
              : {}),
          };
        } else if (eventName === "error") {
          const parsed = JSON.parse(rawData) as { error: string; code?: string };
          logInfo = { ...logInfo, hasError: true, errorMessage: parsed.error };
        }
      } catch {
        // ignore parse error for log
      }
      console.log(`${logPrefix} sse event:`, logInfo);
    }

    if (eventName === "ping") {
      // Heartbeat: only refresh the inactivity timer, no business logic
      resetTimer();
      // 打印 ping 的 requestId（如果有的话）
      try {
        const parsed = JSON.parse(rawData) as { requestId?: string; ts?: number };
        if (parsed.requestId) {
          console.log(`${logPrefix} ping:`, { requestId: parsed.requestId });
        }
      } catch {
        // ignore parse error
      }
      return;
    }

    if (eventName === "status") {
      const parsed = JSON.parse(rawData) as { status: string; phase?: string };
      handlers.onStatus?.(parsed);
      return;
    }

    if (eventName === "phase-change") {
      const parsed = JSON.parse(rawData) as { from?: string; to?: string };
      handlers.onPhaseChange?.(parsed);
      return;
    }

    if (eventName === "preview") {
      const parsed = JSON.parse(rawData) as { chunk: string };
      handlers.onPreview?.(parsed.chunk);
      return;
    }

    if (eventName === "revise-preview") {
      const parsed = JSON.parse(rawData) as { chunk?: string };
      handlers.onRevisePreview?.(parsed.chunk ?? "");
      return;
    }

    if (eventName === "final") {
      handlers.onFinal(JSON.parse(rawData) as TFinal);
      return;
    }

    if (eventName === "review") {
      const parsed = JSON.parse(rawData) as { summary: string; issueCount: number; safeToRevise: boolean; noMajorIssue: boolean; issues: Array<{ type: string; severity: string; lineRef: string }> };
      handlers.onReview?.(parsed);
      return;
    }

    if (eventName === "reasoning") {
      const parsed = JSON.parse(rawData) as { text: string; episodeNumber?: number };
      handlers.onReasoning?.(parsed);
      return;
    }

    if (eventName === "error") {
      const parsed = JSON.parse(rawData) as { error: string; code?: string; requestId?: string; debugReason?: string; debugInfo?: unknown };
      console.error(`${logPrefix} SSE error payload:`, parsed);
      const handler = handlers.onError;
      if (handler) {
        handler(parsed.error, parsed.code, parsed);
      } else {
        throw new Error(parsed.error);
      }
      return;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      resetTimer();
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        handleFrame(frame);
      }
    }
  } finally {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (totalTimer) clearTimeout(totalTimer);
  }

  if (totalTimedOut) {
    throw new Error("AI 提炼超时，请重试。");
  }

  if (idleTimedOut) {
    throw new Error("生成中断：超过 120 秒未收到服务端消息，请重试");
  }

  if (buffer.trim()) {
    handleFrame(buffer);
  }
}
