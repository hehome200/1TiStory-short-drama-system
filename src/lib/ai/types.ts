import type {
  AdaptDraft,
  Character,
  CharacterProfileCard,
  InputVisibility,
  ModelProviderConfig,
  OriginalDraft,
  OriginalStep,
  OutlineExtractionResult,
  OutlineFactSheet,
  OutlineMacroExtraction,
  RewriteDraft,
  RewriteOverviewField,
  RewriteStep,
  SourceSections,
  StructuredSummary,
} from "@/lib/types";

export type GenerateOriginalRequest = {
  step: OriginalStep;
  draft: OriginalDraft;
  providerConfig?: ModelProviderConfig;
  currentEpisode?: number;
  outlineGenerationMode?: "batch_rough_outlines" | "batch_episodes";
  totalEpisodeCount?: number;
  batchIndex?: number;
  startEpisode?: number;
  endEpisode?: number;
  roughOutline?: string;
};

export type GenerateOriginalResponse =
  | {
      step: "overview";
      payload: OriginalDraft["overview"];
      source: "mock" | "aliyun" | "local";
    }
  | {
      step: "characters";
      payload: Character[];
      source: "mock" | "aliyun" | "local";
    }
  | {
      step: "outlines";
      payload: OriginalDraft["outlines"];
      source: "mock" | "aliyun" | "local";
    }
  | {
      step: "script";
      payload: OriginalDraft["script"];
      source: "mock" | "aliyun" | "local";
    };

export type TestProviderRequest = {
  providerConfig: ModelProviderConfig;
};

export type TestProviderResponse = {
  ok: boolean;
  source: "aliyun";
  model: string;
};

export type GenerateRewriteRequest = {
  step: RewriteStep;
  draft: RewriteDraft;
  providerConfig?: ModelProviderConfig;
  overviewField?: RewriteOverviewField;
};

export type GenerateRewriteResponse =
  | {
      step: "infoflow";
      payload: RewriteDraft["infoFlow"];
      source: "mock" | "aliyun" | "local";
    }
  | {
      step: "overview";
      payload: RewriteDraft["overview"];
      source: "mock" | "aliyun" | "local";
    }
  | {
      step: "characters";
      payload: Character[];
      source: "mock" | "aliyun" | "local";
    }
  | {
      step: "outlines";
      payload: RewriteDraft["outlines"];
      source: "mock" | "aliyun" | "local";
    }
  | {
      step: "script";
      payload: RewriteDraft["script"];
      source: "mock" | "aliyun" | "local";
    };

export type GenerateAdaptRequest = {
  step: "chapter" | "overview" | "characters" | "outlines" | "script";
  draft: AdaptDraft;
  providerConfig?: ModelProviderConfig;
};

export type GenerateAdaptResponse =
  | {
      step: "chapter";
      payload: AdaptDraft["chapter"];
      source: "mock" | "aliyun" | "local";
    }
  | {
      step: "overview";
      payload: AdaptDraft["overview"];
      source: "mock" | "aliyun" | "local";
    }
  | {
      step: "characters";
      payload: Character[];
      source: "mock" | "aliyun" | "local";
    }
  | {
      step: "outlines";
      payload: AdaptDraft["outlines"];
      source: "mock" | "aliyun" | "local";
    }
  | {
      step: "script";
      payload: AdaptDraft["script"];
      source: "mock" | "aliyun" | "local";
    };

export type OutlineExtractRequest = {
  mode: "macro" | "extract" | "structured-summary" | "character-profiles";
  cleanedText: string;
  currentMacro: string;
  currentEpisodes: string[];
  targetEpisodeCount?: number;
  episodeGenerationSource?: string;
  inputVisibility?: InputVisibility;
  providerConfig?: ModelProviderConfig;
  factSheet?: OutlineFactSheet;
  sourceSections?: SourceSections;
  structuredSummary?: StructuredSummary;
  overview?: {
    genres?: string[];
    coreHooks?: string[];
    styleTags?: string[];
  };
};

export type StructuredSummaryExtraction = {
  structuredSummary: StructuredSummary;
  fieldConfidence: {
    oneLineSummary: "high" | "medium" | "low";
    coreConflict: "high" | "medium" | "low";
    keyRelationships: "high" | "medium" | "low";
    narrativeStructure: "high" | "medium" | "low";
    longArcNodes: "high" | "medium" | "low";
    hiddenReveals: "high" | "medium" | "low";
  };
  warnings: string[];
  missingFields: string[];
  sourceMode: "factSheet" | "directTextFallback";
};

export type OutlineExtractResponse =
  | {
      mode: "macro";
      payload: OutlineMacroExtraction;
      source: "mock" | "aliyun" | "local";
    }
  | {
      mode: "extract";
      payload: OutlineExtractionResult;
      source: "mock" | "aliyun" | "local";
    }
  | {
      mode: "structured-summary";
      payload: StructuredSummaryExtraction;
      source: "mock" | "aliyun" | "local";
    };

export type CharacterProfileExtractResponse = {
  mode: "character-profiles";
  payload: CharacterProfileExtraction;
  source: "mock" | "aliyun" | "local";
};

export type FactSheetExtractRequest = {
  sourceSections: SourceSections;
  providerConfig?: ModelProviderConfig;
};

export type FactSheetExtractResponse = {
  payload: OutlineFactSheet;
  source: "mock" | "aliyun" | "local";
};

// ── 人物卡提取类型（Phase 6.5b）──

export type CharacterDiscoveryEntry = {
  canonicalName: string;
  displayName: string;
  publicAliases: string[];
  hiddenAliases: string[];
  importance: "core" | "major" | "supporting" | "minor";
  importanceReason: string;
  relatedFactIndices: {
    characterFacts: number[];
    relationshipFacts: number[];
    revealFacts: number[];
  };
};

export type CharacterDiscovery = {
  characters: CharacterDiscoveryEntry[];
  mergedNames: {
    mergedInto: string;
    originalNames: string[];
    mergeReason: string;
  }[];
  warnings: string[];
};

export type CharacterProfileBatch = {
  profiles: CharacterProfileCard[];
  batchWarnings: string[];
};

export type CharacterProfileExtraction = {
  discovery: CharacterDiscovery;
  profiles: CharacterProfileCard[];
  extractionMeta: {
    totalCharacters: number;
    coreCount: number;
    majorCount: number;
    supportingCount: number;
    minorCount: number;
    totalApiCalls: number;
    failedBatches: string[];
  };
  warnings: string[];
};

// ProviderConfig API types (Phase 11A)

export type ProviderConfigResponse = {
  provider: string;
  enabled: boolean;
  hasApiKey: boolean;
  apiKeyLast4: string | null;
  baseUrl: string;
  model: string;
};

export type SaveProviderConfigRequest = {
  provider?: string;
  enabled?: boolean;
  apiKey?: string | null;
  baseUrl?: string;
  model?: string;
};
