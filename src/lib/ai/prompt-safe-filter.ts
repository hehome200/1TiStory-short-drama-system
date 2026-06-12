import type { CharacterProfileCard, OutlineFactSheet, RevealBeat, StructuredSummary } from "@/lib/types";

/**
 * Collect all hidden keywords from factSheet + structuredSummary.
 * Used as deny-list for filtering what goes into generation context.
 */
export function collectHiddenKeywords(
  factSheet: OutlineFactSheet,
  structuredSummary?: StructuredSummary,
): Set<string> {
  const keywords = new Set<string>();

  // characterProfiles hidden fields
  for (const profile of factSheet.characterProfiles ?? []) {
    for (const alias of profile.hiddenAliases ?? []) {
      addKeyword(alias, keywords);
    }
    if (profile.hiddenIdentity) {
      // Add whole identity + Chinese n-grams / English words
      addKeywordWithNgrams(profile.hiddenIdentity, keywords);
    }
    for (const tag of profile.spoilerTags ?? []) {
      addKeyword(tag, keywords);
    }
  }

  // hiddenReveals
  for (const reveal of structuredSummary?.hiddenReveals ?? []) {
    if (reveal.revealContent) {
      addKeywordWithNgrams(reveal.revealContent, keywords);
    }
  }

  return keywords;
}

function addKeyword(value: string, set: Set<string>) {
  if (!value || !value.trim()) return;
  set.add(value.trim());
}

function addKeywordWithNgrams(value: string, set: Set<string>) {
  if (!value || !value.trim()) return;
  const trimmed = value.trim();

  // Add the whole string
  set.add(trimmed);

  // Chinese: extract consecutive segments, add full segment + substrings >= 4 chars
  // Min length 4 avoids short common words / character names (e.g. "公主", "雁回")
  // from matching other profiles' displayName or publicIdentity
  const chineseChars = trimmed.match(/[一-鿿]+/g);
  if (chineseChars) {
    for (const segment of chineseChars) {
      if (segment.length >= 2) {
        set.add(segment);
      }
      // Substrings: only >= 4 chars to avoid false-positive displayName collisions
      for (let len = Math.max(4, segment.length - 1); len >= 4; len--) {
        for (let start = 0; start <= segment.length - len; start++) {
          set.add(segment.slice(start, start + len));
        }
      }
    }
  }

  // English: extract words >= 3 chars
  const englishWords = trimmed.match(/[a-zA-Z]{3,}/g);
  if (englishWords) {
    for (const word of englishWords) {
      set.add(word);
    }
  }
}

/**
 * Filter a single string against hidden keywords.
 * Returns original if safe, or filtered version with hits removed.
 */
export function filterUnsafeText(text: string, hiddenKeywords: Set<string>): string {
  if (!text || hiddenKeywords.size === 0) return text;

  for (const keyword of hiddenKeywords) {
    if (text.includes(keyword)) {
      return "";  // Remove the entire field if it contains a hidden keyword
    }
  }
  return text;
}

/**
 * Filter an array of tag strings against hidden keywords.
 * Returns tags that don't contain any hidden keyword.
 */
export function filterUnsafeTags(tags: string[], hiddenKeywords: Set<string>): string[] {
  if (tags.length === 0 || hiddenKeywords.size === 0) return tags;

  return tags.filter((tag) => {
    if (!tag || !tag.trim()) return false;
    for (const keyword of hiddenKeywords) {
      if (tag.includes(keyword) || keyword.includes(tag)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Build a safe subset of character profile info for generation context.
 * Only includes audience-safe fields, filtered against hidden keywords.
 */
export function buildSafeProfileInfo(
  profile: CharacterProfileCard,
  hiddenKeywords: Set<string>,
): string | null {
  const parts: string[] = [];

  // Basic info (always safe, but check for keyword leaks)
  const name = filterUnsafeText(profile.displayName, hiddenKeywords);
  const identity = filterUnsafeText(profile.publicIdentity ?? "", hiddenKeywords);
  if (!name) return null;  // If name itself is unsafe, skip the whole profile

  parts.push(`${name}｜${profile.importance}`);
  if (identity) {
    parts.push(`  公开身份：${identity}`);
  }

  // Safe tags (direct list, filter each)
  const tagGroups: { label: string; tags: string[] }[] = [
    { label: "职业", tags: profile.occupationTags ?? [] },
    { label: "专业技能", tags: profile.professionalSkillTags ?? [] },
    { label: "职业行为", tags: profile.professionalBehaviorTags ?? [] },
    { label: "职业操守", tags: profile.professionalEthicTags ?? [] },
    { label: "性格", tags: profile.personalityTags ?? [] },
    { label: "气质", tags: profile.temperamentTags ?? [] },
    { label: "对话风格", tags: profile.dialogueStyleTags ?? [] },
    { label: "对话记忆点", tags: profile.dialogueMemoryTags ?? [] },
    { label: "角色定位", tags: profile.rolePositionTags ?? [] },
    { label: "叙事功能", tags: profile.narrativeFunctionTags ?? [] },
    { label: "记忆点", tags: profile.memoryPointTags ?? [] },
    { label: "行为记忆点", tags: profile.behaviorMemoryTags ?? [] },
    // Filtered tags (need keyword filtering)
    { label: "欲望", tags: profile.desireTags ?? [] },
    { label: "恐惧", tags: profile.fearTags ?? [] },
    { label: "缺陷", tags: profile.flawTags ?? [] },
    { label: "道德特质", tags: profile.moralTraitTags ?? [] },
    { label: "关系钩子", tags: profile.relationshipHookTags ?? [] },
    { label: "矛盾点", tags: profile.contradictionTags ?? [] },
    { label: "信念", tags: profile.beliefTags ?? [] },
    { label: "底线", tags: profile.bottomLineTags ?? [] },
  ];

  const tagLines: string[] = [];
  for (const group of tagGroups) {
    const filtered = filterUnsafeTags(group.tags, hiddenKeywords);
    if (filtered.length > 0) {
      tagLines.push(`${group.label}：${filtered.join("、")}`);
    }
  }

  if (tagLines.length > 0) {
    parts.push(`  ${tagLines.join("；")}`);
  }

  return parts.join("\n");
}

/**
 * Build safe structured summary text for generation context.
 * Does not include hiddenReveals, backstoryHint, or relationship descriptions.
 */
export function buildSafeStructuredSummary(
  summary: StructuredSummary,
): string | null {
  const parts: string[] = [];

  if (summary.oneLineSummary) {
    parts.push(`主线：${summary.oneLineSummary}`);
  }

  const conflicts = [
    summary.coreConflict.external ? `外部：${summary.coreConflict.external}` : null,
    summary.coreConflict.internal ? `内部：${summary.coreConflict.internal}` : null,
    summary.coreConflict.relational ? `关系：${summary.coreConflict.relational}` : null,
  ].filter(Boolean);

  if (conflicts.length > 0) {
    parts.push(`冲突：${conflicts.join("；")}`);
  }

  const narrativeModeLabel = summary.narrativeStructure.narrativeMode === "nonlinear"
    ? `非线性`
    : `线性`;
  const openingLabels: Record<string, string> = {
    conflict_first: "冲突开局",
    daily_life: "日常开局",
    backstory: "前史开局",
    mystery_hook: "悬念钩子",
  };
  const openingLabel = openingLabels[summary.narrativeStructure.openingType];
  parts.push(`叙事：${narrativeModeLabel} · ${openingLabel ?? "未知"}`);

  if (summary.longArcNodes.length > 0) {
    const nodeLabels = summary.longArcNodes.map((n) => {
      const arcTypeLabels: Record<string, string> = {
        setup: "铺垫", rising: "上升", climax: "高潮",
        falling: "回落", resolution: "解决", twist: "反转",
      };
      return `${n.nodeLabel}（${n.placementHint}，${arcTypeLabels[n.arcType] ?? n.arcType}）`;
    });
    parts.push(`长线节点：${nodeLabels.join("；")}`);
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

// ── Phase 8c: revealBeat 授权解锁 ──

export type UnlockedHiddenFields = {
  hiddenAliases?: string[];
  hiddenIdentity?: string;
  spoilerTags?: string[];
};

/**
 * Compute which hidden fields are unlocked for a given character profile,
 * based on revealBeats and the current episode number.
 *
 * Unlock conditions (all must be true):
 * - revealBeat.episodeNumber !== null
 * - currentEpisode is a valid number
 * - currentEpisode >= revealBeat.episodeNumber
 * - revealBeat.characterDisplayName matches profile.displayName
 * - revealFields explicitly includes the field
 */
export function computeUnlockedFields(
  profile: CharacterProfileCard,
  revealBeats: RevealBeat[],
  currentEpisode: number,
): UnlockedHiddenFields {
  const unlocked: UnlockedHiddenFields = {};

  for (const beat of revealBeats) {
    // episodeNumber must be set
    if (beat.episodeNumber === null || beat.episodeNumber === undefined) continue;
    if (typeof currentEpisode !== "number" || isNaN(currentEpisode)) continue;

    // Must have reached the reveal episode
    if (currentEpisode < beat.episodeNumber) continue;

    // Hidden field unlocks MUST be bound to a specific character.
    // If characterDisplayName is empty, this beat cannot unlock any profile's hidden fields.
    if (!beat.characterDisplayName) continue;
    if (beat.characterDisplayName !== profile.displayName) continue;

    // revealFields must explicitly include the field
    for (const field of beat.revealFields) {
      if (field === "hiddenAliases" && profile.hiddenAliases?.length) {
        unlocked.hiddenAliases = profile.hiddenAliases;
      } else if (field === "hiddenIdentity" && profile.hiddenIdentity) {
        unlocked.hiddenIdentity = profile.hiddenIdentity;
      } else if (field === "spoilerTags" && profile.spoilerTags?.length) {
        unlocked.spoilerTags = profile.spoilerTags;
      } else if (field.startsWith("spoilerTags:")) {
        const tag = field.slice("spoilerTags:".length);
        if (profile.spoilerTags?.includes(tag)) {
          unlocked.spoilerTags = [...(unlocked.spoilerTags ?? []), tag];
        }
      }
    }
  }

  return unlocked;
}

/**
 * Build injected text for unlocked hidden fields.
 * Only called when unlocked fields are non-empty.
 */
export function buildUnlockedFieldsText(
  profile: CharacterProfileCard,
  unlocked: UnlockedHiddenFields,
  episodeNumber: number,
): string | null {
  const lines: string[] = [];

  if (unlocked.hiddenAliases?.length) {
    lines.push(`  已授权别名（自第 ${episodeNumber} 集起可用）：${unlocked.hiddenAliases.join("、")}`);
  }
  if (unlocked.hiddenIdentity) {
    lines.push(`  已授权隐藏身份（自第 ${episodeNumber} 集起可用）：${unlocked.hiddenIdentity}`);
  }
  if (unlocked.spoilerTags?.length) {
    lines.push(`  已授权剧透标签（自第 ${episodeNumber} 集起可用）：${unlocked.spoilerTags.join("、")}`);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

/**
 * Get the earliest episode at which any field for a profile is unlocked.
 * Used to pick the episode number for the injected text label.
 */
export function getEarliestUnlockedEpisode(
  profile: CharacterProfileCard,
  revealBeats: RevealBeat[],
  currentEpisode: number,
): number | null {
  for (const beat of revealBeats) {
    if (beat.episodeNumber === null) continue;
    if (!beat.characterDisplayName) continue;
    if (beat.characterDisplayName !== profile.displayName) continue;
    if (currentEpisode < beat.episodeNumber) continue;
    if (beat.revealFields.length > 0) {
      return beat.episodeNumber;
    }
  }
  return null;
}
