import type { ModelProviderConfig } from "@/lib/types";
import { OpenAiCompatibleProvider } from "./openai-compatible-provider";
import type { GenerationPrompt } from "./provider-types";

const provider = new OpenAiCompatibleProvider();

export async function generateWithLocalProvider(
  prompt: GenerationPrompt,
  config: ModelProviderConfig,
) {
  return provider.generate(prompt, config);
}
