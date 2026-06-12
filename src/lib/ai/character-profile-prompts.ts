import type {
  CharacterFact,
  OutlineFactSheet,
  RelationshipFact,
  RevealFact,
  SourceSections,
  StructuredSummary,
  TimelineNote,
} from "@/lib/types";

type PromptBundle = {
  system: string;
  user: string;
};

// ── 阶段一：角色发现与分级 ──

const DISCOVERY_SCHEMA = `{
  "characters": [
    {
      "canonicalName": "string",
      "displayName": "string",
      "publicAliases": ["string"],
      "hiddenAliases": ["string"],
      "importance": "core | major | supporting | minor",
      "importanceReason": "string (20-40字)",
      "relatedFactIndices": {
        "characterFacts": [number],
        "relationshipFacts": [number],
        "revealFacts": [number]
      }
    }
  ],
  "mergedNames": [
    {
      "mergedInto": "string (canonicalName)",
      "originalNames": ["string"],
      "mergeReason": "string (20-40字)"
    }
  ],
  "warnings": ["string"]
}`;

export function buildCharacterDiscoveryPrompt(
  factSheet: OutlineFactSheet,
  sourceSections?: SourceSections,
): PromptBundle {
  const system = [
    "你是角色发现器。基于事实库中的人物事实，识别所有独立角色，合并同一人物的不同名字，判断角色重要度。",
    "",
    "【任务】",
    "1. 从 characterFacts 中提取所有唯一角色",
    "2. 识别同一人物在不同事实条目中使用的不同名字，合并为一个角色",
    "3. 判断每个角色的 importance",
    "4. 确定每个角色的 displayName（观众认知名）",
    "",
    "【同一人物合并规则】",
    "合并条件（满足任一即可）：",
    "- characterFacts 中有 factCategory=hidden_identity 的条目明确关联两个名字",
    "- revealFacts 中明确说明某个名字是另一个名字的真实身份",
    "- 两个名字在同一条事实中以「A（即B）」「A/B」「A，真名B」等形式出现",
    "",
    "不合并条件：",
    "- 仅仅是同姓或名字相似不构成合并理由",
    "- 没有事实条目明确关联的两个名字，即使你怀疑是同一人也不合并",
    "- 如果不确定，保持为独立角色，在 warnings 中注明「疑似同一人物：A 和 B」",
    "",
    "【displayName 选取规则】",
    "displayName 必须是观众开场认知的名字：",
    "- 从该角色的 characterFacts 中，找到 audienceRevealState=revealed_at_start 且 factCategory=identity 的条目",
    "- 取该条目中使用的角色名作为 displayName",
    "- 如果该角色所有 characterFacts 都使用同一个名字，该名字即为 displayName",
    "- 如果存在隐藏身份（factCategory=hidden_identity），隐藏身份中的名字进入 hiddenAliases，不作为 displayName",
    "- displayName 绝对不可以是观众不知道的名字",
    "",
    "【canonicalName 选取规则】",
    "- 默认 canonicalName = displayName",
    "- 仅当同一角色在事实库中以多个名字出现、且需要稳定索引时，选择出现频率最高的名字",
    "- canonicalName 是内部 ID，不进入观众可见输出",
    "",
    "【importance 分级规则】",
    "- core：满足以下条件中至少 2 项——(a) characterFacts 数量 >= 5；(b) 出现在 eventFacts 的 climax 或 turning_point 中；(c) 有独立的 hidden_identity 或 motive 类事实",
    "- major：满足以下条件中至少 1 项——(a) characterFacts 数量 >= 3；(b) 出现在 3 条以上 relationshipFacts 中；(c) 有独立的 motive 或 personality 类事实",
    "- supporting：有 characterFacts 但不满足 major 条件",
    "- minor：仅在 relationshipFacts 或 eventFacts 中被提及，无独立 characterFacts",
    "",
    "注意：importance 基于事实密度判断，不基于角色名或类型模板。群像剧可能有 3-4 个 core。",
    "",
    "【relatedFactIndices】",
    "为每个角色标注其关联的事实条目索引（从 0 开始）：",
    "- characterFacts：该角色的 characterName 匹配的所有条目索引",
    "- relationshipFacts：personA 或 personB 匹配的所有条目索引",
    "- revealFacts：内容涉及该角色的所有条目索引",
    "",
    "【输出格式】",
    "只返回一个 JSON 对象，顶层必须是 {}，不能是 []。",
    `结构：${DISCOVERY_SCHEMA}`,
    "",
    "禁止输出 Markdown、解释、额外文字。",
  ].join("\n");

  const userParts: string[] = [
    "请分析以下事实库，识别所有独立角色。",
    "",
    `=== characterFacts (${factSheet.characterFacts.length} 项，每项带索引编号) ===`,
    JSON.stringify(
      factSheet.characterFacts.map((f, i) => ({ _index: i, ...f })),
      null,
      2,
    ),
    "",
    `=== relationshipFacts (${factSheet.relationshipFacts.length} 项，每项带索引编号) ===`,
    JSON.stringify(
      factSheet.relationshipFacts.map((f, i) => ({ _index: i, ...f })),
      null,
      2,
    ),
    "",
    `=== revealFacts (${factSheet.revealFacts.length} 项，每项带索引编号) ===`,
    JSON.stringify(
      factSheet.revealFacts.map((f, i) => ({ _index: i, ...f })),
      null,
      2,
    ),
  ];

  if (sourceSections?.characterProfileText?.trim()) {
    userParts.push(
      "",
      "=== 补充参考：人物小传前 3000 字（仅供参考，事实库为主要依据）===",
      sourceSections.characterProfileText.slice(0, 3000),
    );
  }

  return { system, user: userParts.join("\n") };
}

// ── 阶段二：人物卡生成 ──

type DiscoveredCharacter = {
  canonicalName: string;
  displayName: string;
  publicAliases: string[];
  hiddenAliases: string[];
  importance: "core" | "major" | "supporting" | "minor";
};

type RelatedFacts = {
  characterFacts: CharacterFact[];
  relationshipFacts: RelationshipFact[];
  revealFacts: RevealFact[];
  timelineNotes?: TimelineNote[];
};

const PROFILE_FULL_SCHEMA = `{
  "profiles": [
    {
      "canonicalName": "string",
      "displayName": "string",
      "publicAliases": ["string"],
      "hiddenAliases": ["string"],
      "publicIdentity": "string (15-40字)",
      "hiddenIdentity": "string (15-40字，可为空)",
      "occupationTags": ["string"],
      "professionalDomainTags": ["string"],
      "professionalSkillTags": ["string"],
      "professionalBehaviorTags": ["string"],
      "professionalEthicTags": ["string"],
      "personalityTags": ["string"],
      "temperamentTags": ["string"],
      "moralTraitTags": ["string"],
      "flawTags": ["string"],
      "villainyTags": ["string"],
      "dialogueStyleTags": ["string"],
      "dialogueMemoryTags": ["string"],
      "desireTags": ["string"],
      "fearTags": ["string"],
      "woundTags": ["string"],
      "beliefTags": ["string"],
      "bottomLineTags": ["string"],
      "contradictionTags": ["string"],
      "relationshipHookTags": ["string"],
      "memoryPointTags": ["string"],
      "behaviorMemoryTags": ["string"],
      "spoilerTags": ["string"],
      "rolePositionTags": ["string"],
      "narrativeFunctionTags": ["string"],
      "rolePositionSummary": "string (20-50字)",
      "narrativeFunctionSummary": "string (20-60字)",
      "dialogueStyleSummary": "string (20-50字)",
      "importance": "core | major | supporting | minor",
      "appearancePhase": "early | middle | late | full | unknown",
      "sourceVisibility": "explicit_in_source | implicit_in_source | not_in_source",
      "audienceRevealState": "revealed_at_start | not_yet_revealed | gradual_reveal | unknown",
      "spoilerRisk": "high | medium | low | none",
      "sourceTracking": {
        "fieldName": {
          "sourceType": "direct | summarized | inferred",
          "confidence": "high | medium | low",
          "sourceFactIndices": [0],
          "evidence": "string (20-50字)"
        }
      },
      "warnings": ["string"],
      "version": 1
    }
  ],
  "batchWarnings": ["string"]
}`;

const PROFILE_SUPPORTING_SCHEMA = `{
  "profiles": [
    {
      "canonicalName": "string",
      "displayName": "string",
      "publicAliases": ["string"],
      "hiddenAliases": ["string"],
      "publicIdentity": "string",
      "hiddenIdentity": "string",
      "occupationTags": ["string"],
      "rolePositionTags": ["string"],
      "personalityTags": ["string"],
      "temperamentTags": ["string"],
      "relationshipHookTags": ["string"],
      "memoryPointTags": ["string"],
      "importance": "supporting",
      "appearancePhase": "early | middle | late | full | unknown",
      "spoilerRisk": "high | medium | low | none",
      "sourceTracking": {},
      "warnings": ["string"]
    }
  ],
  "batchWarnings": ["string"]
}`;

const PROFILE_MINOR_SCHEMA = `{
  "profiles": [
    {
      "canonicalName": "string",
      "displayName": "string",
      "publicIdentity": "string",
      "occupationTags": ["string"],
      "rolePositionTags": ["string"],
      "importance": "minor",
      "warnings": ["string"]
    }
  ],
  "batchWarnings": ["string"]
}`;

function buildFullProfileSystem(): string {
  return [
    "你是人物卡提炼器。基于事实库中与指定角色相关的事实条目，填充 CharacterProfileCard 的 V1 字段。",
    "",
    "【核心原则】",
    "1. 所有标签字段是开放 string[]，不限于示例词库。优先使用原文中更贴切的表达。",
    "2. 信息不足时宁可留空数组 [] 或空字符串 \"\"，不要为了完整而编造。",
    "3. 每个填充了内容的字段必须在 sourceTracking 中记录来源。",
    "",
    "【audience-safe 规则（最高优先级）——字段级 + 条目级双重判断】",
    "",
    "■ 字段级 audience-safe（整个字段全部内容必须观众可知）：",
    "displayName, publicAliases, publicIdentity, occupationTags, professionalDomainTags,",
    "professionalSkillTags, professionalBehaviorTags, professionalEthicTags, personalityTags,",
    "temperamentTags, dialogueStyleTags, dialogueMemoryTags, beliefTags, bottomLineTags,",
    "contradictionTags, memoryPointTags, behaviorMemoryTags, rolePositionTags,",
    "narrativeFunctionTags, rolePositionSummary, narrativeFunctionSummary, dialogueStyleSummary",
    "",
    "■ 条目级判断（逐条检查来源事实的 audienceRevealState）：",
    "- desireTags：每条检查——revealed_at_start → 保留；not_yet_revealed / gradual_reveal → 移入 spoilerTags（格式「隐藏动机:{内容}」）",
    "- fearTags：同上——not_yet_revealed → 移入 spoilerTags（格式「隐藏恐惧:{内容}」）",
    "- woundTags：同上——not_yet_revealed → 移入 spoilerTags（格式「隐藏创伤:{内容}」）",
    "- villainyTags：每条检查——已发生且观众已知 → 保留；未发生或观众不知 → 移入 spoilerTags（格式「未揭示恶行:{内容}」）",
    "- moralTraitTags：如果来自隐藏动机，观众不可知部分 → 移入 spoilerTags",
    "- flawTags：只保留观众可感知的表面表现，不可暗示隐藏背景",
    "- relationshipHookTags：涉及隐藏关系 → 移入 spoilerTags（格式「隐藏关系:{内容}」）或改写为观众可知的表面关系",
    "",
    "■ 字段级 hidden-only（仅存储/审计/授权揭示）：",
    "canonicalName（当 !== displayName 时）, hiddenAliases, hiddenIdentity, spoilerTags",
    "",
    "■ 禁止出现括号别名格式（如「王世锦（陆见）」「陆见（王世锦）」）",
    "",
    "■ 跨角色隐藏信息禁止——全局扫描（最高优先级）：",
    "- 任何 audience-safe 字段中不得出现事实库 revealFacts（audienceRevealState=not_yet_revealed）中提及的角色名",
    "- 示例：如果 revealFacts 记载「王世锦即陆见」且 not_yet_revealed，则除王世锦本人外的所有角色的 audience-safe 字段中不得出现「陆见」",
    "- 示例：如果角色 A 的 hiddenAliases 包含「陆见」，则角色 B/C/D 的 displayName/publicIdentity/memoryPointTags 等 audience-safe 字段中不得出现「陆见」",
    "",
    "■ 隐藏性别/身份词汇禁止：",
    "- 如果角色的 audienceRevealState 不是 revealed_at_start（即有隐藏身份），其 audience-safe 字段中不得出现暗示隐藏性别的词汇（如「巾帼」「女扮」「男装」「女儿身」「女子」「女性」等）",
    "- 如果角色的 hiddenIdentity 中包含某个身份标签（如「内鬼」「卧底」「私生」），其 audience-safe 字段中不得出现同义或近义表达",
    "",
    "■ 前史真相细节禁止：",
    "- revealFacts 中 audienceRevealState=not_yet_revealed 的条目，其具体描述不得出现在任何 audience-safe 字段中",
    "- 例如 revealFacts 记载「装病避祸」，则 audience-safe 字段中不得出现「装病」「伪装病症」「假病」等表达",
    "- 例如 revealFacts 记载「崔德福之子」，则许铮的 publicIdentity 中不得出现「崔德福」「崔德福之子」，应写为观众所知的表面身份",
    "",
    "【标签生成规则——所有标签为开放 string[]，示例词仅作观察维度】",
    "",
    "身份层：",
    "- publicIdentity（15-40 字）：观众开场认知身份。来源：characterFacts 中 factCategory=identity + audienceRevealState=revealed_at_start",
    "- hiddenIdentity（15-40 字，可为空）：未揭示真实身份。来源：factCategory=hidden_identity + audienceRevealState=not_yet_revealed",
    "",
    "职业层：",
    "- occupationTags（1-3 个）参考维度（不限于此）：医者、捕快、律师、警察、总裁、学生、仙尊、主播、经纪人、将军、赘婿",
    "  来源：characterFacts 中 factCategory=identity 明确记载的职业身份",
    "- professionalDomainTags（1-4 个）参考维度：医术、权谋、刑侦、商业、修仙、娱乐圈、法律、军事、校园",
    "  来源：characterFacts 中 identity/background 类事实明确提及的专业领域",
    "  可从 occupationTags 做弱推断，但 sourceType 必须标 summarized 或 inferred，不可标 direct",
    "- professionalSkillTags（0-5 个）参考维度：诊脉、验伤、审讯、谈判、推理、伪装、用毒、格斗、直播运营",
    "  来源：characterFacts 中有明确行为描述的条目，必须有具体行为记录",
    "  ⚠ 不可从职业名自动推导——「医者」不等于自动拥有诊脉/针灸/验尸能力",
    "  ⚠ sourceType 只能是 direct 或 summarized，不允许 inferred——没有行为记录就填空数组",
    "- professionalBehaviorTags（0-3 个）参考维度：专业谨慎、临危不乱、官腔压人、草率冒进、雷厉风行",
    "  来源：characterFacts 中 personality 类涉及职业行为的描述",
    "- professionalEthicTags（0-3 个）参考维度：医者仁心、唯利是图、守法刚正、权力优先、坚守原则",
    "  来源：characterFacts 中 motive/personality 类涉及职业伦理的描述",
    "",
    "性格层：",
    "- personalityTags（2-6 个）参考维度：冷静、克制、心思缜密、鲁莽、敏感、果断、洒脱、固执",
    "  来源：characterFacts 中 factCategory=personality",
    "  ⚠ 不可按类型模板硬套（不可「男主默认腹黑」「女主默认善良」）",
    "- temperamentTags（1-3 个）参考维度：冷酷霸道、清冷疏离、少年感、疯批感、书卷气、江湖气、贵气",
    "  来源：从 personalityTags + 行为描述综合推断，sourceType 通常为 summarized",
    "- moralTraitTags（0-3 个）参考维度：重情重义、不择手段、明哲保身、公正无私",
    "  来源：characterFacts 中 motive/personality 类涉及道德判断的条目",
    "  ⚠ 条目级判断：如果来自隐藏动机（观众不知），移入 spoilerTags",
    "- flawTags（0-3 个）参考维度：目光短浅、优柔寡断、多疑、控制欲强、感情用事",
    "  来源：characterFacts 中明确记载的负面性格",
    "  ⚠ 不可从正面性格反推（不可因「勇敢」推断「鲁莽」）",
    "  ⚠ 只保留观众可感知的表面表现，不可暗示隐藏背景",
    "- villainyTags（0-4 个）参考维度：心狠手辣、仗势欺人、栽赃陷害、权力压迫、背信弃义",
    "  来源：characterFacts 或 eventFacts 中记载的明确恶行",
    "  ⚠ 非反派角色此字段为空数组",
    "  ⚠ 不可因为是反派就自动填充——必须有明确恶行依据",
    "  ⚠ 条目级判断：未发生或观众不知的恶行 → 移入 spoilerTags",
    "",
    "语言层：",
    "- dialogueStyleTags（1-4 个）参考维度：简洁、犀利、讽刺、官腔、毒舌、含蓄、冷幽默",
    "  来源：characterFacts 中涉及语言描述的条目",
    "- dialogueMemoryTags（0-3 个）参考维度：句句带刺、说话留半句、习惯反问、轻描淡写地威胁",
    "  来源：characterFacts 中有对白特征描述的条目",
    "  ⚠ 鼓励提炼原文中更独特的表达",
    "",
    "动机层：",
    "- desireTags（1-3 个）参考维度：查明真相、复仇、权力、自由、翻身、证明自己",
    "  来源：characterFacts 中 factCategory=motive + audienceRevealState=revealed_at_start",
    "  ⚠ 条目级判断：not_yet_revealed 的隐藏动机 → 移入 spoilerTags（格式「隐藏动机:{内容}」）",
    "- fearTags（0-3 个）参考维度：被背叛、暴露身份、失去权力、重蹈覆辙",
    "  来源：characterFacts 中涉及恐惧/担忧的描述",
    "  ⚠ 不可从 desireTags 反推",
    "  ⚠ 条目级判断：not_yet_revealed → 移入 spoilerTags（格式「隐藏恐惧:{内容}」）",
    "- woundTags（0-3 个）参考维度：师父之死、家族覆灭、信任崩塌、爱人背叛",
    "  来源：characterFacts 中明确记载的过往创伤",
    "  ⚠ 不可从行为反推「可能的创伤」",
    "  ⚠ 条目级判断：not_yet_revealed → 移入 spoilerTags（格式「隐藏创伤:{内容}」）",
    "- beliefTags（0-3 个）参考维度：真相不可妥协、弱肉强食、医者当救人、忠义为先",
    "  来源：characterFacts 中 motive/personality 涉及价值观的条目",
    "- bottomLineTags（0-2 个）参考维度：不伤害无辜、不出卖同伴、宁死不屈",
    "  来源：characterFacts 中明确记载的底线",
    "",
    "冲突层：",
    "- contradictionTags（0-3 个）格式：「{A} vs {B}」",
    "  来源：从 desireTags + fearTags + beliefTags + professionalEthicTags 的内在张力推导",
    "- relationshipHookTags（1-5 个）格式：「与{displayName}:{关系描述}」",
    "  来源：relationshipFacts 直接映射",
    "  ⚠ 条目级判断：涉及隐藏关系 → 移入 spoilerTags 或改写为观众可知的表面关系",
    "",
    "记忆点层：",
    "- memoryPointTags（1-4 个）参考维度：冷面高手、笑面虎、草根逆袭者、疯批反派、双面人",
    "  来源：从 personalityTags + temperamentTags + occupationTags + contradictionTags 综合提炼",
    "  ⚠ 鼓励高创造性输出，优先使用原文中更独特的表达",
    "- behaviorMemoryTags（0-3 个）参考维度：先观察再出手、遇事先验伤、笑着威胁、关键时刻沉默",
    "  来源：characterFacts 中描述角色反复出现的行为模式",
    "  ⚠ 必须是可重复行为，不是一次性事件",
    "",
    "剧透层：",
    "- spoilerTags（0-5 个）格式：「{类型}:{内容}」",
    "  来源：hiddenAliases + hiddenIdentity + 条目级判断移入的隐藏信息",
    "  类型包括：隐藏动机、隐藏恐惧、隐藏创伤、未揭示恶行、隐藏关系、真实身份",
    "",
    "角色定位层：",
    "- rolePositionTags（1-3 个）参考维度：主角、调查者、反派、导师、盟友、工具人、对照组",
    "  来源：从角色在 eventFacts 中的作用 + characterFacts 中的定位推断",
    "- narrativeFunctionTags（1-3 个）参考维度：推动主线、揭示真相、情感锚点、制造障碍",
    "  来源：从角色在故事中的功能推断",
    "- rolePositionSummary（20-50 字）：基于 rolePositionTags 的可读描述",
    "- narrativeFunctionSummary（20-60 字）：基于 narrativeFunctionTags 的可读描述",
    "- dialogueStyleSummary（20-50 字）：基于 dialogueStyleTags 的可读描述",
    "  摘要是标签的可读展开，不替代标签，不包含标签之外的额外信息",
    "",
    "分类字段：",
    "- importance：使用传入值，不要修改",
    "- appearancePhase：从 timelineNotes 和 eventFacts 推断角色首次出场阶段",
    "- sourceVisibility：该角色在原文中的存在方式",
    "- audienceRevealState：如有 hiddenIdentity 则为 gradual_reveal 或 not_yet_revealed，否则为 revealed_at_start",
    "- spoilerRisk：canonicalName !== displayName 或 hiddenAliases 非空 → 至少 medium；涉及核心剧情线 → high",
    "",
    "【sourceTracking 规则】",
    "对每个填充了内容的字段，在 sourceTracking 中记录：",
    "- sourceType：direct（事实库明确对应）/ summarized（多条归纳）/ inferred（推断）",
    "- confidence：high / medium / low",
    "- sourceFactIndices：对应事实条目的索引（可选）",
    "- evidence：简短来源说明（20-50 字）",
    "空数组/空字符串的字段不需要记录 sourceTracking。",
    "所有 sourceType=inferred 的字段名必须同时加入 warnings。",
    "",
    "【防脑补规则】",
    "1. 空数组优于编造——信息不足时填 [] 或 \"\"，标注 inferred + low",
    "2. 禁止从角色名猜测性别、年龄、外貌、职业",
    "3. 禁止跨角色推断——不可因「A 是 B 的对手」就推断 A 性格是 B 的反面",
    "4. 禁止类型模板硬套",
    "5. occupationTags 必须来自事实库明确记载的职业身份",
    "6. professionalSkillTags 不可从职业名自动推导——必须有行为记录",
    "7. flawTags 不可从正面性格反推",
    "8. villainyTags 必须有明确恶行依据",
    "9. woundTags 只取明确记载的创伤",
    "10. memoryPointTags 必须有辨识度依据",
    "11. behaviorMemoryTags 必须是可重复行为",
    "12. 鼓励使用原文原词——如果原文有更独特的表达，优先使用",
    "",
    "【写完后自检清单】",
    "0. 所有 audience-safe 字段中是否出现了 revealFacts（not_yet_revealed）中的角色名？→ 删除",
    "1. displayName / publicIdentity / 字段级 audience-safe 标签中是否包含 hiddenAliases 中的名字？→ 删除",
    "1b. 其他角色的 audience-safe 字段中是否包含了本角色的 hiddenAliases/hiddenIdentity 中的名字？→ 删除",
    "2. 是否出现括号别名格式？→ 删除",
    "2b. 有隐藏身份的角色，其 audience-safe 字段中是否出现暗示性别的词汇（巾帼、女扮、男装、女儿身等）？→ 删除",
    "2c. audience-safe 字段中是否出现 revealFacts（not_yet_revealed）中的前史真相细节（装病、私生子等）？→ 删除",
    "3. desireTags 中是否有来源事实为 not_yet_revealed 的条目？→ 移到 spoilerTags",
    "4. fearTags 中是否有来源事实为 not_yet_revealed 的条目？→ 移到 spoilerTags",
    "5. woundTags 中是否有来源事实为 not_yet_revealed 的条目？→ 移到 spoilerTags",
    "6. villainyTags 中是否有未发生或观众不知的恶行？→ 移到 spoilerTags",
    "7. moralTraitTags / flawTags 中是否暗示了隐藏背景或隐藏动机？→ 改写或移除",
    "8. relationshipHookTags 中是否涉及隐藏关系？→ 移到 spoilerTags 或改写",
    "9. 是否有 sourceType=inferred 的字段未加入 warnings？→ 补充",
    "",
    "【输出格式】",
    "只返回一个 JSON 对象，顶层必须是 {}。",
    `结构：${PROFILE_FULL_SCHEMA}`,
    "",
    "禁止输出 Markdown、解释、额外文字。",
  ].join("\n");
}

function buildSupportingProfileSystem(): string {
  return [
    "你是人物卡提炼器（简版）。为配角生成简版人物卡，只需填充 17 个字段。",
    "",
    "【核心原则】",
    "1. 所有标签字段是开放 string[]，不限于示例词库。",
    "2. 信息不足时填空数组或空字符串。",
    "3. 其余字段由系统自动补齐，不需要你输出。",
    "",
    "【audience-safe 规则】",
    "- displayName / publicIdentity / 所有标签中不可包含 hiddenAliases 或 hiddenIdentity 中的信息",
    "- 禁止括号别名格式",
    "- 不可出现其他角色的隐藏名字（如其他角色的 hiddenAliases/hiddenIdentity 中的名字）",
    "- 不可出现 revealFacts 中未揭示（not_yet_revealed）的真相细节",
    "",
    "【你只需要生成以下 17 个字段】",
    "canonicalName, displayName, publicAliases, hiddenAliases, publicIdentity, hiddenIdentity,",
    "occupationTags, rolePositionTags, personalityTags, temperamentTags,",
    "relationshipHookTags, memoryPointTags,",
    "importance（固定为 supporting）, appearancePhase, spoilerRisk,",
    "sourceTracking, warnings",
    "",
    "标签参考维度：",
    "- occupationTags（1-2 个）：角色职业身份",
    "- rolePositionTags（1-2 个）：角色定位，如 配角、盟友、工具人",
    "- personalityTags（1-3 个）：核心性格",
    "- temperamentTags（1-2 个）：气质印象",
    "- relationshipHookTags（1-3 个）：格式「与{displayName}:{关系描述}」",
    "- memoryPointTags（0-2 个）：观众记忆点",
    "",
    "【防脑补规则】同完整版——信息不足填空，不编造，不从名字猜测。",
    "",
    "【输出格式】",
    "只返回一个 JSON 对象。",
    `结构：${PROFILE_SUPPORTING_SCHEMA}`,
    "",
    "禁止输出 Markdown、解释、额外文字。",
  ].join("\n");
}

function buildMinorProfileSystem(): string {
  return [
    "你是人物卡提炼器（最简版）。为龙套角色生成最简人物卡，只需填充 7 个字段。",
    "",
    "【你只需要生成以下 7 个字段】",
    "canonicalName, displayName, publicIdentity, occupationTags, rolePositionTags, importance（固定为 minor）, warnings",
    "",
    "【audience-safe 规则】同前——不泄露隐藏信息，不用括号别名，不包含其他角色的隐藏名字。",
    "",
    "【输出格式】",
    "只返回一个 JSON 对象。",
    `结构：${PROFILE_MINOR_SCHEMA}`,
    "",
    "禁止输出 Markdown、解释、额外文字。",
  ].join("\n");
}

function formatFactsForUser(
  character: DiscoveredCharacter,
  facts: RelatedFacts,
): string[] {
  const parts: string[] = [
    `角色信息（来自阶段一）：`,
    `- canonicalName: "${character.canonicalName}"`,
    `- displayName: "${character.displayName}"`,
    `- publicAliases: ${JSON.stringify(character.publicAliases)}`,
    `- hiddenAliases: ${JSON.stringify(character.hiddenAliases)}`,
    `- importance: "${character.importance}"`,
    "",
    `=== 该角色的 characterFacts (${facts.characterFacts.length} 项) ===`,
    JSON.stringify(facts.characterFacts, null, 2),
    "",
    `=== 该角色的 relationshipFacts (${facts.relationshipFacts.length} 项) ===`,
    JSON.stringify(facts.relationshipFacts, null, 2),
    "",
    `=== 该角色的 revealFacts (${facts.revealFacts.length} 项) ===`,
    JSON.stringify(facts.revealFacts, null, 2),
  ];

  if (facts.timelineNotes && facts.timelineNotes.length > 0) {
    parts.push(
      "",
      `=== timelineNotes (${facts.timelineNotes.length} 项，仅供参考) ===`,
      JSON.stringify(facts.timelineNotes, null, 2),
    );
  }

  return parts;
}

export function buildCharacterProfilePrompt(
  characters: DiscoveredCharacter[],
  relatedFacts: RelatedFacts[],
  importance: "core" | "major" | "supporting" | "minor",
  structuredSummary?: StructuredSummary,
): PromptBundle {
  let system: string;
  if (importance === "core" || importance === "major") {
    system = buildFullProfileSystem();
  } else if (importance === "supporting") {
    system = buildSupportingProfileSystem();
  } else {
    system = buildMinorProfileSystem();
  }

  const userParts: string[] = [];

  if (characters.length === 1) {
    userParts.push(
      `请为以下角色生成${importance === "core" || importance === "major" ? "完整" : importance === "supporting" ? "简版" : "最简"}人物卡。`,
      "",
    );
    userParts.push(...formatFactsForUser(characters[0], relatedFacts[0]));
  } else {
    userParts.push(
      `请为以下 ${characters.length} 个角色分别生成${importance === "supporting" ? "简版" : importance === "minor" ? "最简" : "完整"}人物卡。`,
      "",
    );
    for (let i = 0; i < characters.length; i++) {
      userParts.push(`=== 角色 ${i + 1}：${characters[i].displayName} ===`, "");
      userParts.push(...formatFactsForUser(characters[i], relatedFacts[i]));
      userParts.push("");
    }
  }

  if (structuredSummary && (importance === "core" || importance === "major")) {
    if (structuredSummary.keyRelationships.length > 0) {
      userParts.push(
        "",
        "=== structuredSummary.keyRelationships（仅供参考）===",
        JSON.stringify(structuredSummary.keyRelationships, null, 2),
      );
    }
  }

  if (importance === "core" || importance === "major") {
    userParts.push(
      "",
      "信息不足的字段填空数组或空字符串，标注 sourceType=inferred。不要为了完整而脑补填满。",
    );
  }

  return { system, user: userParts.join("\n") };
}
