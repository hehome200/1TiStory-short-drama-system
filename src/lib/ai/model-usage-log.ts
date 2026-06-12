import type { RouteKey } from "@/lib/types";

export type ModelUsageSource = "platform" | "byok";

export type ModelUsageContext = {
  userId: string;
  projectId?: string;
  routeKey: RouteKey;
  source: ModelUsageSource;
};

export const ROUTE_KEY_COSTS: Record<RouteKey, number> = {
  SCRIPT_GENERATION_DEFAULT: 10,
  OUTLINE_ANALYSIS_DEFAULT: 5,
  EPISODE_SPLIT_DEFAULT: 5,
  REWRITE_DEFAULT: 8,
  ADAPT_DEFAULT: 8,
  TITLE_OPTIMIZE_DEFAULT: 2,
  CHARACTER_POLISH_DEFAULT: 4,
};

type RecordModelUsageInput = {
  context: ModelUsageContext;
  provider: string;
  model: string;
  status: "success" | "error";
  latencyMs: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  pointsCost?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export async function recordModelUsageLog(input: RecordModelUsageInput) {
  void input;
}
