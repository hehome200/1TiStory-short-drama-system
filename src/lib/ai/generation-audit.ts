import type { CharacterProfileCard, HiddenReveal, OutlineFactSheet, RevealBeat, StructuredSummary } from "@/lib/types";
import { computeUnlockedFields } from "@/lib/ai/prompt-safe-filter";

export type GenerationAuditLeak = {
  type: "hiddenAlias" | "hiddenIdentity" | "spoilerTag" | "hiddenReveal";
  characterName?: string;
  leakedContent: string;
  matchedContext: string;
};

export type GenerationAuditResult = {
  passed: boolean;
  leaks: GenerationAuditLeak[];
  warnings: string[];
};

/**
 * Extract keywords from a string value, splitting into Chinese segments and English words.
 * Filters: empty strings, Chinese < 2 chars, English < 3 chars.
 */
function extractKeywords(value: string): string[] {
  if (!value || !value.trim()) return [];
  const trimmed = value.trim();
  const keywords: string[] = [];

  // Chinese consecutive segments (>= 2 chars)
  const chineseSegments = trimmed.match(/[一-鿿]+/g);
  if (chineseSegments) {
    for (const seg of chineseSegments) {
      if (seg.length >= 2) {
        keywords.push(seg);
      }
    }
  }

  // English words (>= 3 chars)
  const englishWords = trimmed.match(/[a-zA-Z]{3,}/g);
  if (englishWords) {
    for (const word of englishWords) {
      keywords.push(word);
    }
  }

  // Also add the whole trimmed value if it's non-empty and not just punctuation
  if (trimmed.length > 0 && /[一-鿿A-Za-z]/.test(trimmed)) {
    keywords.push(trimmed);
  }

  return keywords;
}

/**
 * Collect all hidden keywords with their metadata for auditing.
 */
type KeywordSource = {
  keyword: string;
  type: GenerationAuditLeak["type"];
  characterName?: string;
};

function collectAuditKeywords(
  factSheet?: OutlineFactSheet,
  structuredSummary?: StructuredSummary,
): KeywordSource[] {
  const sources: KeywordSource[] = [];
  const seen = new Set<string>();

  function add(keyword: string, item: KeywordSource) {
    if (!keyword || !keyword.trim()) return;
    if (seen.has(keyword)) return;
    seen.add(keyword);
    sources.push(item);
  }

  // characterProfiles hidden fields
  for (const profile of factSheet?.characterProfiles ?? []) {
    // hiddenAliases — exact keyword
    for (const alias of profile.hiddenAliases ?? []) {
      add(alias, { keyword: alias, type: "hiddenAlias", characterName: profile.displayName });
      // Also split aliases
      for (const kw of extractKeywords(alias)) {
        add(kw, { keyword: kw, type: "hiddenAlias", characterName: profile.displayName });
      }
    }

    // hiddenIdentity — split into ngrams
    for (const kw of extractKeywords(profile.hiddenIdentity ?? "")) {
      add(kw, { keyword: kw, type: "hiddenIdentity", characterName: profile.displayName });
    }

    // spoilerTags — split each tag
    for (const tag of profile.spoilerTags ?? []) {
      add(tag, { keyword: tag, type: "spoilerTag", characterName: profile.displayName });
      for (const kw of extractKeywords(tag)) {
        add(kw, { keyword: kw, type: "spoilerTag", characterName: profile.displayName });
      }
    }
  }

  // hiddenReveals
  for (const reveal of structuredSummary?.hiddenReveals ?? []) {
    for (const kw of extractKeywords(reveal.revealContent ?? "")) {
      add(kw, { keyword: kw, type: "hiddenReveal" });
    }
    // Also use revealLabel
    for (const kw of extractKeywords(reveal.revealLabel ?? "")) {
      add(kw, { keyword: kw, type: "hiddenReveal" });
    }
  }

  return sources;
}

/**
 * Find the context around a keyword match (±50 chars).
 */
function getMatchedContext(content: string, keyword: string): string {
  const index = content.indexOf(keyword);
  if (index < 0) return "";
  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + keyword.length + 50);
  let ctx = content.slice(start, end);
  if (start > 0) ctx = "…" + ctx;
  if (end < content.length) ctx += "…";
  return ctx;
}

/**
 * Collect authorized keywords from revealBeats — these should NOT trigger leaks.
 * Only counts fields that are actually unlocked for the current episode.
 */
function collectAuthorizedKeywords(
  factSheet?: OutlineFactSheet,
  revealBeats?: RevealBeat[],
  currentEpisode?: number,
): Set<string> {
  const authorized = new Set<string>();
  if (!revealBeats?.length || typeof currentEpisode !== "number") return authorized;

  for (const profile of factSheet?.characterProfiles ?? []) {
    const unlocked = computeUnlockedFields(profile, revealBeats, currentEpisode);
    if (unlocked.hiddenAliases) {
      for (const alias of unlocked.hiddenAliases) {
        authorized.add(alias);
        for (const kw of extractKeywords(alias)) authorized.add(kw);
      }
    }
    if (unlocked.hiddenIdentity) {
      for (const kw of extractKeywords(unlocked.hiddenIdentity)) authorized.add(kw);
      authorized.add(unlocked.hiddenIdentity);
    }
    if (unlocked.spoilerTags) {
      for (const tag of unlocked.spoilerTags) {
        authorized.add(tag);
        for (const kw of extractKeywords(tag)) authorized.add(kw);
      }
    }
  }

  return authorized;
}

/**
 * Audit AI-generated content for hidden information leaks.
 * Uses hiddenAliases, hiddenIdentity, spoilerTags, and hiddenReveals as deny-list.
 * Keywords that have been explicitly unlocked via revealBeats are whitelisted.
 *
 * Returns warnings only — does not prevent writes, rewrite, or delete.
 */
export function auditGenerationOutput(params: {
  generatedContent: string;
  factSheet?: OutlineFactSheet;
  structuredSummary?: StructuredSummary;
  revealBeats?: RevealBeat[];
  currentEpisode?: number;
}): GenerationAuditResult {
  const { generatedContent, factSheet, structuredSummary, revealBeats, currentEpisode } = params;

  if (!generatedContent) {
    return { passed: true, leaks: [], warnings: [] };
  }

  // No data → no audit needed
  if (!factSheet?.characterProfiles?.length && !structuredSummary?.hiddenReveals?.length) {
    return { passed: true, leaks: [], warnings: [] };
  }

  const keywordSources = collectAuditKeywords(factSheet, structuredSummary);
  if (keywordSources.length === 0) {
    return { passed: true, leaks: [], warnings: [] };
  }

  // Phase 8c: Whitelist authorized keywords from revealBeats
  const authorizedKeywords = collectAuthorizedKeywords(factSheet, revealBeats, currentEpisode);

  const leaks: GenerationAuditLeak[] = [];

  for (const source of keywordSources) {
    if (authorizedKeywords.has(source.keyword)) continue;
    if (generatedContent.includes(source.keyword)) {
      leaks.push({
        type: source.type,
        characterName: source.characterName,
        leakedContent: source.keyword,
        matchedContext: getMatchedContext(generatedContent, source.keyword),
      });
    }
  }

  if (leaks.length === 0) {
    return { passed: true, leaks: [], warnings: [] };
  }

  // Build warnings
  const warnings: string[] = [];
  warnings.push(`检测到 ${leaks.length} 处可能提前泄露隐藏信息，请人工确认。`);

  const typeLabel: Record<string, string> = {
    hiddenAlias: "隐藏别名",
    hiddenIdentity: "隐藏身份",
    spoilerTag: "剧透内容",
    hiddenReveal: "不可提前揭示",
  };

  for (const leak of leaks) {
    const charInfo = leak.characterName ? `：可能泄露${leak.characterName}的${typeLabel[leak.type] || leak.type}` : "";
    warnings.push(`[${typeLabel[leak.type] || leak.type}] 命中「${leak.leakedContent}」${charInfo}`);
  }

  return { passed: false, leaks, warnings };
}
