export type CreativeSourceType =
  | "inspiration"
  | "outline"
  | "novel"
  | "script"
  | "mixed";

export type SourceMaterialType =
  | "inspiration"
  | "outline"
  | "novel"
  | "script"
  | "reference";

export type CreativeIntent =
  | "original"
  | "adapt_novel"
  | "rewrite_outline"
  | "write_from_outline"
  | "rewrite_script"
  | "polish_script"
  | "quality_audit";

export type SourceBindingLevel =
  | "none"
  | "loose"
  | "medium"
  | "strict"
  | "locked";

export type CreativePipelineStage =
  | "source_intake"
  | "type_detection"
  | "planning"
  | "structure_breakdown"
  | "generation"
  | "quality_audit"
  | "revision"
  | "finalization";

export type CreativePipelineMode =
  | "draft"
  | "assist"
  | "audit"
  | "rewrite"
  | "regenerate";

export type ScriptType = "short_drama" | "ai_comic";

export type AllowedCreativeOperations = {
  canInventCharacters: boolean;
  canAddScenes: boolean;
  canReorderEvents: boolean;
  canChangeEnding: boolean;
  canChangeGenre: boolean;
  canCompressSource: boolean;
  canExpandSource: boolean;
  canUseReferenceOnly: boolean;
};

export type CreativeTargetProfile = {
  scriptType: ScriptType;
  targetAudience?: string;
  targetGenres?: string[];
  commercialMode?: string;
  episodeCount?: number;
  wordsPerEpisode?: number;
  productionConstraints?: string[];
  toneTags?: string[];
};

export type SourceMaterialPacket = {
  id: string;
  type: SourceMaterialType;
  title?: string;
  rawText?: string;
  cleanedText?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  bindingLevel: SourceBindingLevel;
  allowedOperations: AllowedCreativeOperations;
};

export type CreativeInputPacket = {
  id: string;
  projectId?: string;
  intent: CreativeIntent;
  mode: CreativePipelineMode;
  stage: CreativePipelineStage;
  scriptType: ScriptType;
  sourceType: CreativeSourceType;
  bindingLevel: SourceBindingLevel;
  sourceMaterials: SourceMaterialPacket[];
  target: CreativeTargetProfile;
  allowedOperations: AllowedCreativeOperations;
  createdAt?: string;
  updatedAt?: string;
};