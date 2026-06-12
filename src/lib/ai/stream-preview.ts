import type {
  AdaptDraft,
  Character,
  ConfirmedEpisode,
  OutlineExtractionMeta,
  OutlineExtractionResult,
  OutlineMacroExtraction,
  OriginalDraft,
  OriginalStep,
  RewriteDraft,
  RewriteStep,
} from "@/lib/types";

function unescapeJsonString(value: string) {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\")
    .trim();
}

function extractStringField(raw: string, field: string) {
  const pattern = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"])*)`, "s");
  const match = raw.match(pattern);
  return match ? unescapeJsonString(match[1]) : "";
}

function extractStringArray(raw: string, field: string) {
  const blockPattern = new RegExp(`"${field}"\\s*:\\s*\\[([\\s\\S]*?)\\]`, "s");
  const block = raw.match(blockPattern)?.[1] ?? "";
  if (!block) return [];

  const items = [...block.matchAll(/"((?:\\.|[^"])*)/g)].map((match) =>
    unescapeJsonString(match[1]),
  );
  return items.filter(Boolean);
}

function extractCharacterPreview(raw: string) {
  const matches = [
    ...raw.matchAll(
      /"name"\s*:\s*"((?:\\.|[^"])*)[\s\S]*?"role"\s*:\s*"((?:\\.|[^"])*)[\s\S]*?"age"\s*:\s*(\d+)[\s\S]*?"traits"\s*:\s*"((?:\\.|[^"])*)[\s\S]*?"background"\s*:\s*"((?:\\.|[^"])*)/g,
    ),
  ];

  if (!matches.length) {
    const names = [...raw.matchAll(/"name"\s*:\s*"((?:\\.|[^"])*)/g)]
      .map((match) => unescapeJsonString(match[1]))
      .filter(Boolean);
    if (!names.length) return "";
    return names.map((name, index) => `${index + 1}. ${name}`).join("\n");
  }

  return matches
    .map((match, index) => {
      const name = unescapeJsonString(match[1]);
      const role = unescapeJsonString(match[2]);
      const age = match[3];
      const traits = unescapeJsonString(match[4]);
      const background = unescapeJsonString(match[5]);
      return `${index + 1}. ${name}｜${role}｜${age}岁\n性格：${traits}\n背景：${background}`;
    })
    .join("\n\n");
}

function extractCharacterObjects(raw: string): Character[] {
  const matches = [
    ...raw.matchAll(
      /"name"\s*:\s*"((?:\\.|[^"])*)[\s\S]*?"role"\s*:\s*"((?:\\.|[^"])*)[\s\S]*?"age"\s*:\s*(\d+)[\s\S]*?"traits"\s*:\s*"((?:\\.|[^"])*)[\s\S]*?"background"\s*:\s*"((?:\\.|[^"])*)/g,
    ),
  ];

  if (matches.length) {
    return matches.map((match, index) => ({
      id: `stream-character-${index + 1}`,
      name: unescapeJsonString(match[1]),
      role: unescapeJsonString(match[2]),
      gender: "unknown",
      age: Number(match[3]) || 0,
      traits: unescapeJsonString(match[4]),
      background: unescapeJsonString(match[5]),
      relationToMaleLead: "unknown",
      relationToFemaleLead: "unknown",
      relationshipTags: [],
    }));
  }

  return [...raw.matchAll(/"name"\s*:\s*"((?:\\.|[^"])*)/g)].map((match, index) => ({
    id: `stream-character-${index + 1}`,
    name: unescapeJsonString(match[1]),
    role: "",
    gender: "unknown",
    age: 0,
    traits: "",
    background: "",
    relationToMaleLead: "unknown",
    relationToFemaleLead: "unknown",
    relationshipTags: [],
  }));
}

function extractCharacterArrayForInfoFlow(raw: string): { id: string; name: string; age: number; traits: string; background: string }[] {
  const matches = [
    ...raw.matchAll(
      /"name"\s*:\s*"((?:\\.|[^"])*)[\s\S]*?"age"\s*:\s*(\d+)[\s\S]*?"traits"\s*:\s*"((?:\\.|[^"])*)[\s\S]*?"background"\s*:\s*"((?:\\.|[^"])*)/g,
    ),
  ];

  if (matches.length) {
    return matches.map((match, index) => ({
      id: `infoflow-character-${index + 1}`,
      name: unescapeJsonString(match[1]),
      age: Number(match[3]) || 0,
      traits: unescapeJsonString(match[4]),
      background: unescapeJsonString(match[5]),
    }));
  }

  return [...raw.matchAll(/"name"\s*:\s*"((?:\\.|[^"])*)/g)].map((match, index) => ({
    id: `infoflow-character-${index + 1}`,
    name: unescapeJsonString(match[1]),
    age: 0,
    traits: "",
    background: "",
  }));
}

function formatOverviewPreview(raw: string, isRewrite: boolean) {
  const fieldMap = isRewrite
    ? [
        ["目标受众", extractStringField(raw, "audience")],
        ["题材类型", extractStringField(raw, "genre")],
        ["核心设定", extractStringArray(raw, "coreHooks").join("、")],
        ["风格元素", extractStringArray(raw, "styleTags").join("、")],
        ["世界观", extractStringField(raw, "worldview")],
        ["核心亮点", extractStringField(raw, "highlight")],
        ["核心梗概", extractStringField(raw, "premise")],
      ]
    : [
        ["目标受众", extractStringField(raw, "audience")],
        ["题材类型", extractStringField(raw, "genres")],
        ["核心设定", extractStringField(raw, "coreHooks")],
        ["风格元素", extractStringField(raw, "styleTags")],
        ["世界观", extractStringField(raw, "worldview")],
        ["核心亮点", extractStringField(raw, "highlight")],
        ["核心梗概", extractStringField(raw, "premise")],
      ];

  const lines = fieldMap
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}\n${value}`);

  return lines.join("\n\n");
}

function formatOutlinePreview(raw: string, isRewrite: boolean) {
  const macro = extractStringField(raw, "macro");
  const episodes = isRewrite
    ? extractStringArray(raw, "episodes")
    : unescapeJsonString(extractStringField(raw, "episodes"))
        .split(/\n{2,}|\n/)
        .map((item) => item.trim())
        .filter(Boolean);

  const blocks: string[] = [];
  if (macro) {
    blocks.push(`粗纲\n${macro}`);
  }
  if (episodes.length) {
    blocks.push(episodes.join("\n\n"));
  }
  return blocks.join("\n\n");
}

function formatScriptPreview(raw: string) {
  const episode = extractStringField(raw, "episode");
  const content = extractStringField(raw, "content");
  return [episode, content].filter(Boolean).join("\n\n");
}

export function formatOriginalStreamPreview(step: OriginalStep, raw: string) {
  switch (step) {
    case "overview":
      return formatOverviewPreview(raw, false) || raw;
    case "characters":
      return extractCharacterPreview(raw) || raw;
    case "outlines":
      return formatOutlinePreview(raw, false) || raw;
    case "script":
      return formatScriptPreview(raw) || raw;
  }
}

export function formatRewriteStreamPreview(step: RewriteStep, raw: string) {
  switch (step) {
    case "infoflow":
      return [
        ["原素材标题", extractStringField(raw, "sourceTitle")],
        ["原素材梗概", extractStringField(raw, "sourceSynopsis")],
        ["关键信息点", extractStringField(raw, "keyNodes")],
      ]
        .filter(([, value]) => value)
        .map(([label, value]) => `${label}\n${value}`)
        .join("\n\n");
    case "overview":
      return formatOverviewPreview(raw, true) || raw;
    case "characters":
      return extractCharacterPreview(raw) || raw;
    case "outlines":
      return formatOutlinePreview(raw, true) || raw;
    case "script":
      return formatScriptPreview(raw) || raw;
  }
}

export function parseOriginalStreamStep(
  step: OriginalStep,
  raw: string,
): Partial<OriginalDraft> {
  switch (step) {
    case "overview":
      return {
        overview: {
          audience: extractStringField(raw, "audience"),
          audiences: extractStringArray(raw, "audiences"),
          genres: extractStringArray(raw, "genres"),
          coreHooks: extractStringArray(raw, "coreHooks"),
          styleTags: extractStringArray(raw, "styleTags"),
          worldview: extractStringField(raw, "worldview"),
          highlight: extractStringField(raw, "highlight"),
          premise: extractStringField(raw, "premise"),
        },
      };
    case "characters":
      return { characters: extractCharacterObjects(raw) };
    case "outlines":
      return {
        outlines: {
          range: "",
          macro: extractStringField(raw, "macro"),
          characterText: "",
          episodes: extractStringArray(raw, "episodes"),
          stageLabels: extractStringArray(raw, "stageLabels"),
        },
      };
    case "script":
      return {
        script: {
          episode: extractStringField(raw, "episode"),
          content: extractStringField(raw, "content"),
        },
      };
  }
}

export function parseRewriteStreamStep(step: RewriteStep, raw: string): Partial<RewriteDraft> {
  switch (step) {
    case "infoflow":
      return {
        infoFlow: {
          sourceFileName: extractStringField(raw, "sourceFileName"),
          sourceText: extractStringField(raw, "sourceText"),
          uploaded: raw.includes('"uploaded": true'),
          format: raw.includes('"format": "live_action"')
            ? "live_action"
            : raw.includes('"format": "ai_short"')
              ? "ai_short"
              : "",
          sourceTitle: extractStringField(raw, "sourceTitle"),
          sourceSynopsis: extractStringField(raw, "sourceSynopsis"),
          keyNodes: extractStringField(raw, "keyNodes"),
          overview: {
            audience: extractStringField(raw, "audience"),
            genres: extractStringField(raw, "genres"),
            coreHooks: extractStringField(raw, "coreHooks"),
            styleTags: extractStringField(raw, "styleTags"),
            worldview: extractStringField(raw, "worldview"),
            highlight: extractStringField(raw, "highlight"),
            premise: extractStringField(raw, "premise"),
          },
          characters: extractCharacterArrayForInfoFlow(raw),
          macro: {
            content: extractStringField(raw, "macroContent"),
          },
          episodes: {
            episodes: extractStringArray(raw, "episodes"),
          },
        },
      };
    case "overview":
      return {
        overview: {
          audience: extractStringField(raw, "audience"),
          genre: extractStringField(raw, "genre"),
          coreHooks: extractStringArray(raw, "coreHooks"),
          styleTags: extractStringArray(raw, "styleTags"),
          worldview: extractStringField(raw, "worldview"),
          highlight: extractStringField(raw, "highlight"),
          premise: extractStringField(raw, "premise"),
        },
      };
    case "characters":
      return { characters: extractCharacterObjects(raw) };
    case "outlines":
      return {
        outlines: {
          macro: extractStringField(raw, "macro"),
          episodes: extractStringArray(raw, "episodes"),
          stageLabels: extractStringArray(raw, "stageLabels"),
        },
      };
    case "script":
      return {
        script: {
          episode: extractStringField(raw, "episode"),
          content: extractStringField(raw, "content"),
        },
      };
  }
}

export function parseAdaptStreamStep(
  step: "chapter" | "overview" | "characters" | "outlines" | "script",
  raw: string,
): Partial<AdaptDraft> {
  switch (step) {
    case "chapter":
      return {
        chapter: {
          summary: extractStringField(raw, "summary"),
          entries: extractStringArray(raw, "entries"),
          stageLabels: extractStringArray(raw, "stageLabels"),
        },
      };
    case "overview":
      return {
        overview: {
          audience: extractStringField(raw, "audience"),
          genre: extractStringField(raw, "genre"),
          coreHooks: extractStringArray(raw, "coreHooks"),
          styleTags: extractStringArray(raw, "styleTags"),
          worldview: extractStringField(raw, "worldview"),
          highlight: extractStringField(raw, "highlight"),
          premise: extractStringField(raw, "premise"),
        },
      };
    case "characters":
      return { characters: extractCharacterObjects(raw) };
    case "outlines":
      return {
        outlines: {
          macro: extractStringField(raw, "macro"),
          episodes: extractStringArray(raw, "episodes"),
          stageLabels: extractStringArray(raw, "stageLabels"),
        },
      };
    case "script":
      return {
        script: {
          episode: extractStringField(raw, "episode"),
          content: extractStringField(raw, "content"),
        },
      };
  }
}

function extractMetaPreview(raw: string): Partial<OutlineExtractionMeta> {
  const completeness = extractStringField(raw, "completenessLevel");
  const confidenceMatch = raw.match(/"confidence"\s*:\s*(\d+)/);
  const narrativeMode = extractStringField(raw, "narrativeMode");
  const episodeMode = extractStringField(raw, "episodeDetectionMode");
  const sourceType = extractStringField(raw, "sourceType");
  const missingFields = extractStringArray(raw, "missingFields");

  return {
    ...(sourceType ? { sourceType } : {}),
    ...(completeness ? { completenessLevel: completeness as "high" | "medium" | "low" } : {}),
    ...(confidenceMatch ? { confidence: Number(confidenceMatch[1]) } : {}),
    ...(narrativeMode ? { narrativeMode: narrativeMode as "linear" | "nonlinear" } : {}),
    ...(episodeMode ? { episodeDetectionMode: episodeMode as "explicit" | "heuristic" | "none" } : {}),
    ...(missingFields.length > 0 ? { missingFields } : {}),
  };
}

export function parseOutlineMacroExtractionPreview(raw: string): Partial<OutlineMacroExtraction> {
  return {
    meta: {
      sourceType: "",
      episodeDetectionMode: "none",
      narrativeMode: "linear",
      completenessLevel: "low",
      confidence: 0,
      missingFields: [],
      ...extractMetaPreview(raw),
    },
    storySummary: {
      mainline: extractStringField(raw, "mainline"),
      coreConflict: extractStringField(raw, "coreConflict"),
      keyRelationships: extractStringField(raw, "keyRelationships"),
      storyDirection: extractStringField(raw, "storyDirection"),
      styleTone: extractStringField(raw, "styleTone"),
    },
    notes: {
      keptOriginalNarrativeOrder: !raw.includes('"keptOriginalNarrativeOrder": false'),
      warnings: extractStringArray(raw, "warnings"),
      editorSuggestions: extractStringArray(raw, "editorSuggestions"),
    },
  };
}

function extractEpisodeObjects(raw: string): Partial<ConfirmedEpisode>[] {
  const episodeMatches = [
    ...raw.matchAll(
      /"episode"\s*:\s*(\d+)[\s\S]*?"goal"\s*:\s*"((?:\\.|[^"])*)[\s\S]*?"coreEvent"\s*:\s*"((?:\\.|[^"])*)[\s\S]*?"conflictProgress"\s*:\s*"((?:\\.|[^"])*)[\s\S]*?"resultChange"\s*:\s*"((?:\\.|[^"])*)/g,
    ),
  ];

  if (!episodeMatches.length) return [];

  return episodeMatches.map((m) => ({
    episode: Number(m[1]),
    goal: unescapeJsonString(m[2]),
    coreEvent: unescapeJsonString(m[3]),
    conflictProgress: unescapeJsonString(m[4]),
    resultChange: unescapeJsonString(m[5]),
  }));
}

export function parseOutlineExtractionPreview(raw: string): Partial<OutlineExtractionResult> {
  return {
    meta: {
      sourceType: "",
      episodeDetectionMode: "none",
      completenessLevel: "low",
      confidence: 0,
      missingFields: [],
      ...extractMetaPreview(raw),
    },
    confirmedEpisodes: extractEpisodeObjects(raw) as ConfirmedEpisode[],
    notes: {
      keptOriginalNarrativeOrder: !raw.includes('"keptOriginalNarrativeOrder": false'),
      warnings: extractStringArray(raw, "warnings"),
      editorSuggestions: extractStringArray(raw, "editorSuggestions"),
    },
  };
}

export function formatMacroExtractionPreview(raw: string): string {
  const fields = [
    ["故事主线", extractStringField(raw, "mainline")],
    ["核心冲突", extractStringField(raw, "coreConflict")],
    ["关键人物关系", extractStringField(raw, "keyRelationships")],
    ["推进方向", extractStringField(raw, "storyDirection")],
    ["风格基调", extractStringField(raw, "styleTone")],
  ];

  return fields
    .filter(([, v]) => v)
    .map(([label, value]) => `${label}\n${value}`)
    .join("\n\n");
}

export function formatEpisodesExtractionPreview(raw: string): string {
  const episodes = extractEpisodeObjects(raw);
  if (!episodes.length) return "";

  return episodes
    .map(
      (ep) =>
        `第${ep.episode}集\n目标：${ep.goal}\n核心事件：${ep.coreEvent}\n冲突推进：${ep.conflictProgress}\n结果变化：${ep.resultChange}`,
    )
    .join("\n\n");
}
