import type { SourceSections } from "@/lib/types";

type PromptBundle = {
  system: string;
  user: string;
};

// Schema 模板（多行格式，方便维护）
const FACT_SHEET_FIELD_DESC = `
{
  "characterFacts": [
    {
      "content": "string",
      "description": "string (optional)",
      "sourceSection": "characterProfile | storyBackground | storySynopsis | episodeOutline | worldSetting | backstory | unknown",
      "sourceType": "direct | summarized | inferred",
      "confidence": "high | medium | low",
      "spoilerRisk": "high | medium | low | none",
      "sourceVisibility": "explicit_in_source | implicit_in_source | not_in_source",
      "audienceRevealState": "revealed_at_start | not_yet_revealed | gradual_reveal | unknown",
      "characterName": "string",
      "factCategory": "identity | personality | background | hidden_identity | motive | other"
    }
  ],
  "eventFacts": [
    {
      "content": "string",
      "description": "string (optional)",
      "sourceSection": "characterProfile | storyBackground | storySynopsis | episodeOutline | worldSetting | backstory | unknown",
      "sourceType": "direct | summarized | inferred",
      "confidence": "high | medium | low",
      "spoilerRisk": "high | medium | low | none",
      "sourceVisibility": "explicit_in_source | implicit_in_source | not_in_source",
      "audienceRevealState": "revealed_at_start | not_yet_revealed | gradual_reveal | unknown",
      "eventCategory": "incident | turning_point | climax | setup | backstory | other"
    }
  ],
  "relationshipFacts": [
    {
      "content": "string",
      "description": "string (optional)",
      "sourceSection": "characterProfile | storyBackground | storySynopsis | episodeOutline | worldSetting | backstory | unknown",
      "sourceType": "direct | summarized | inferred",
      "confidence": "high | medium | low",
      "spoilerRisk": "high | medium | low | none",
      "sourceVisibility": "explicit_in_source | implicit_in_source | not_in_source",
      "audienceRevealState": "revealed_at_start | not_yet_revealed | gradual_reveal | unknown",
      "personA": "string",
      "personB": "string",
      "relationshipType": "亲情 | 爱情 | 友情 | 敌对 | 利用 | 竞争 | 其他",
      "arcDirection": "恶化 | 缓和 | 破裂 | 修复 | 反转 | unknown (optional)"
    }
  ],
  "revealFacts": [
    {
      "content": "string",
      "description": "string (optional)",
      "sourceSection": "characterProfile | storyBackground | storySynopsis | episodeOutline | worldSetting | backstory | unknown",
      "sourceType": "direct | summarized | inferred",
      "confidence": "high | medium | low",
      "spoilerRisk": "high | medium | low | none",
      "sourceVisibility": "explicit_in_source | implicit_in_source | not_in_source",
      "audienceRevealState": "revealed_at_start | not_yet_revealed | gradual_reveal | unknown",
      "revealLabel": "string",
      "plannedRevealPhase": "前期 | 中期 | 后期 | 终局 | unknown (optional)"
    }
  ],
  "timelineNotes": [
    {
      "note": "string",
      "sourceSection": "characterProfile | storyBackground | storySynopsis | episodeOutline | worldSetting | backstory | unknown",
      "sourceType": "direct | summarized | inferred",
      "confidence": "high | medium | low",
      "isTimelineStart": true,
      "hasBackstory": false,
      "backstoryHint": "string (optional)",
      "nonlinearHint": "string (optional)"
    }
  ],
  "warnings": ["string"]
}`.trim();

export function buildFactSheetExtractionPrompt(
  sourceSections: SourceSections,
): PromptBundle {
  const system = [
    "你是一个大纲事实库提炼器，负责从粗筛后的文本分区中提取结构化的事实项。",
    "",
    "你的任务：",
    "1. 阅读给定的文本分区（人物小传、故事梗概、分集大纲等）",
    "2. 从中提取人物事实、事件事实、关系事实、揭示事实、时间线笔记",
    "3. 为每个事实项标注来源区块、来源类型、置信度、剧透风险、来源可见性、观众揭示状态",
    "",
    "核心原则：",
    "- 忠于原文，不擅自编造原文没有的设定",
    "- 信息不足时返回空数组，不要硬编",
    "- 每个事实项必须标注 sourceSection（来源区块）",
    "- 区分 direct（原文直接陈述）、summarized（归纳总结）、inferred（推断得出）",
    "",
    "关键语义区分——sourceVisibility vs audienceRevealState：",
    "",
    "sourceVisibility 表示该信息是否出现在源材料中（编剧视角）：",
    "- explicit_in_source：源材料/大纲中明确写出",
    "- implicit_in_source：源材料中暗示但未直接陈述",
    "- not_in_source：源材料中未提及，由推断得出",
    "",
    "audienceRevealState 表示该信息在故事叙事中对观众/剧中角色的揭示状态（观众视角）：",
    "- revealed_at_start：故事开头观众就已知晓的公开信息（如角色的公开身份、已知的社会背景）",
    "- not_yet_revealed：故事中尚未向观众揭示的秘密（隐藏身份、隐藏动机、未揭开的真相）",
    "- gradual_reveal：在故事进程中逐步揭示的信息（分集大纲中明确写到某集揭露）",
    "- unknown：无法从现有材料判断揭示时机",
    "",
    "判定规则：",
    "- 人物小传中写的隐藏身份（如A其实是B、女扮男装）→ sourceVisibility=explicit_in_source, audienceRevealState=not_yet_revealed",
    "- 人物小传中写的真实动机、隐藏目的 → sourceVisibility=explicit_in_source, audienceRevealState=not_yet_revealed",
    "- 前史真相（如某人之死的真相、冤案真相）→ sourceVisibility=explicit_in_source, audienceRevealState=not_yet_revealed",
    "- 分集大纲明确写到\"第X集揭露某身份/真相\" → audienceRevealState=gradual_reveal",
    "- 角色的公开身份、公开职业、外在性格 → audienceRevealState=revealed_at_start",
    "- 无法判断何时揭示 → audienceRevealState=unknown",
    "- 注意：大纲/人物小传是写给编剧看的，其中的隐藏信息不等于已向观众揭示！",
    "",
    "只返回 JSON，不要 Markdown，不要解释，不要额外说明。",
    "",
    "返回结构：",
    FACT_SHEET_FIELD_DESC,
  ].join("\n");

  const parts: string[] = [];

  if (sourceSections.characterProfileText?.trim()) {
    parts.push("【人物小传】\n" + sourceSections.characterProfileText);
  }
  if (sourceSections.storySynopsisText?.trim()) {
    parts.push("【故事梗概】\n" + sourceSections.storySynopsisText);
  }
  if (sourceSections.storyBackgroundText?.trim()) {
    parts.push("【故事背景】\n" + sourceSections.storyBackgroundText);
  }
  if (sourceSections.worldSettingText?.trim()) {
    parts.push("【世界观设定】\n" + sourceSections.worldSettingText);
  }
  if (sourceSections.backstoryText?.trim()) {
    parts.push("【前史信息】\n" + sourceSections.backstoryText);
  }
  if (
    sourceSections.episodeOutlineText &&
    sourceSections.episodeOutlineText.length > 0
  ) {
    parts.push("【分集大纲】\n" + sourceSections.episodeOutlineText.join("\n"));
  }

  const user = [
    "请从以下文本分区中提取事实库。",
    "",
    "=== 提取要求 ===",
    "",
    "1. characterFacts（人物事实）：",
    "   - 从人物小传和梗概中提取每个角色的身份信息、性格特征、背景故事",
    "   - 身份隐藏类角色标注 factCategory=hidden_identity，并设置 spoilerRisk=high",
    "   - sourceVisibility：该信息在源材料中的可见性（几乎所有提取项都是 explicit_in_source）",
    "   - audienceRevealState：该信息在故事叙事中对观众的揭示状态",
    "     · 隐藏身份（A其实是B、女扮男装等）→ not_yet_revealed",
    "     · 隐藏动机、真实目的 → not_yet_revealed",
    "     · 公开的身份、职业、外在性格 → revealed_at_start",
    "     · 分集大纲写到某集揭露 → gradual_reveal",
    "",
    "2. eventFacts（事件事实）：",
    "   - 提取关键事件：突发事件、转折点、高潮、铺垫事件、前史事件",
    "   - 标注 eventCategory：incident/turning_point/climax/setup/backstory",
    "   - 前史事件（十年前的火灾、旧案真相等）→ audienceRevealState=not_yet_revealed",
    "",
    "3. relationshipFacts（关系事实）：",
    "   - 提取人物之间的关系（3-8 条关键关系）",
    "   - 标注 relationshipType：亲情/爱情/友情/敌对/利用/竞争/其他",
    "   - 如有关系变化趋势，标注 arcDirection：恶化/缓和/破裂/修复/反转",
    "",
    "4. revealFacts（揭示事实）：",
    "   - 提取需要在故事中逐步揭示的隐藏信息（身份反转、秘密、真相等）",
    "   - 标注 plannedRevealPhase：前期/中期/后期/终局",
    "   - 所有 revealFacts 的 audienceRevealState 默认应为 not_yet_revealed 或 gradual_reveal",
    "   - 只有分集大纲明确写到某集揭露时才可标 gradual_reveal",
    "",
    "5. timelineNotes（时间线笔记）：",
    "   - 判断是否从故事起点开始（isTimelineStart）",
    "   - 是否存在前史需要追溯（hasBackstory + backstoryHint）",
    "   - 是否有非线性叙事提示（nonlinearHint：倒叙/插叙等）",
    "",
    "=== 文本分区 ===",
    "",
    ...parts,
    "",
    "如果没有足够信息提取某类事实，返回空数组即可，不要硬编。",
    "信息不足时请在 warnings 数组中说明原因。",
  ].join("\n");

  return { system, user };
}
