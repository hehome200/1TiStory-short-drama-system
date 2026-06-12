import type { MorphicRenderSpec } from "./schema";
import { getPresetForScriptType } from "@/lib/script-tags";
import { resolvePresetTags } from "@/lib/script-tags";

type InspirationFunnelDiagnosis = {
  primaryBranch?: "counter_control" | "relation_shift" | "misjudge_reversal" | "anomaly_entry";
  lockStatus?: "locked" | "soft_locked" | "ambiguous";
};

function sortTagsByAudiencePreference(
  tags: string[],
  audienceLabel?: string,
  preference: Record<"male" | "female", string[]> = {
    male: ["凡人", "神豪", "大反派", "废材弟子", "大男主", "小人物", "仙尊", "大师兄"],
    female: ["圣女", "师妹", "女帝", "仙子", "大女主", "小人物", "凡人", "废材弟子"],
  },
) {
  const audience = audienceLabel?.includes("女频")
    ? "female"
    : audienceLabel?.includes("男频")
      ? "male"
      : null;
  if (!audience) return tags;

  const priority = preference[audience];
  const seen = new Set<string>();
  const prioritized = priority.filter((tag) => tags.includes(tag) && !seen.has(tag) && seen.add(tag));
  const rest = tags.filter((tag) => !priority.includes(tag));
  return [...prioritized, ...rest];
}

function option(
  label: string,
  subtitle: string,
  description: string,
  tags: string[],
  scores: string[],
  intentScore: number,
  accent: "blue" | "rose" | "gold",
  selectedLabel?: string,
  compact?: boolean,
  density?: "card" | "chip",
): MorphicRenderSpec["elements"][string] {
  return {
    type: "ChoiceOption",
    props: {
      label,
      subtitle,
      description,
      tags,
      scores,
      intentScore,
      accent,
      selected: selectedLabel === label,
      compact,
      density,
    },
    on: {
      press: {
        action: "selectInspirationChoice",
        params: {
          label,
          tags,
          scores,
          intentScore,
          nextStepId: "project-brief",
          density,
        },
      },
    },
    children: [],
  };
}

function takePresetTags(
  scriptType: "short_drama" | "ai_comic",
  section: "eras" | "genres" | "coreHooks" | "styleTags",
  groupId: string,
  count: number,
  debugLabel?: string,
) {
  return resolvePresetTags({
    preset: getPresetForScriptType(scriptType),
    section,
    groupIds: [groupId],
    sampleCount: count,
    debugLabel,
  });
}

function takePresetTagsFromCategories(
  scriptType: "short_drama" | "ai_comic",
  section: "eras" | "genres" | "coreHooks" | "styleTags",
  categoryIds: string[],
  count?: number,
  debugLabel?: string,
) {
  return resolvePresetTags({
    preset: getPresetForScriptType(scriptType),
    section,
    categoryIds,
    sampleCount: count,
    debugLabel,
  });
}

function buildTagOptions(
  tags: string[],
  selectedLabel: string | undefined,
  descriptions: string[],
  accents: ("blue" | "rose" | "gold")[],
  scorePrefix: string,
) {
  return tags.map((tag, index) =>
    option(
      tag,
      descriptions[index] || tag,
      descriptions[index] || tag,
      [tag],
      [`${scorePrefix} +${5 - Math.min(index, 2)}`],
      10,
      accents[index % accents.length] ?? "blue",
      selectedLabel,
      true,
    ),
  );
}

function debugStepCards(
  scriptType: "short_drama" | "ai_comic",
  stepKey: string,
  resolvedTags: string[],
  cards: MorphicRenderSpec["elements"][string][],
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.log("[InspirationSpec] step cards", {
    scriptType,
    stepKey,
    resolvedTagCount: resolvedTags.length,
    resolvedTagLabels: resolvedTags,
    cardCount: cards.length,
    cardLabels: cards
      .map((card) => {
        const record = card as { props?: { label?: string } };
        return record.props?.label;
      })
      .filter((label): label is string => Boolean(label)),
  });

  if (resolvedTags.length === 0) {
    console.warn("[InspirationSpec] resolved tags empty", {
      scriptType,
      stepKey,
    });
  }
  if (cards.length === 0) {
    console.warn("[InspirationSpec] cards empty", {
      scriptType,
      stepKey,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 第 1 步：题材壳 / 世界类型
// ─────────────────────────────────────────────────────────────────────────────

function createOpeningHookStepSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedLabel?: string,
  selectedTargetAudienceLabel?: string,
): MorphicRenderSpec {
  const isShortDrama = scriptType === "short_drama";
  const root = isShortDrama ? "opening-step-live-root" : "opening-step-ai-root";
  const card = isShortDrama ? "opening-step-live-card" : "opening-step-ai-card";
  const grid = isShortDrama ? "opening-step-live-grid" : "opening-step-ai-grid";
  const title = isShortDrama ? "第 1 步：开场爆点" : "第 1 步：题材壳 / 世界类型";
  const description = isShortDrama
    ? "先看哪种开局最能抓住你，系统会据此锁定主方向。"
    : "先定世界壳和视觉类型，系统会据此锁定主方向。";
  const openingResolvedTags = isShortDrama
    ? takePresetTags(scriptType, "coreHooks", "live-action-opening-hook-all", 4, "short_drama:step1")
    : takePresetTagsFromCategories(
        scriptType,
        "genres",
        ["urban-modern", "suspense-supernatural", "history-costume", "apocalypse-disaster"],
        4,
        "ai_comic:step1",
      );
  const options = isShortDrama
    ? buildTagOptions(
        openingResolvedTags,
        selectedLabel,
        [
          "开局被压制，但立刻反夺主动权。",
          "开局先有背离，关系先碎再翻。",
          "开局先出现误判，后面再反转。",
          "开局先见异常，随后发现更大的局。",
        ],
        ["blue", "rose", "gold", "blue"],
        "开场",
      )
    : buildTagOptions(
        sortTagsByAudiencePreference(
          takePresetTagsFromCategories(scriptType, "genres", ["urban-modern", "suspense-supernatural", "history-costume", "apocalypse-disaster"], undefined, "ai_comic:step1:full"),
          selectedTargetAudienceLabel,
        ).slice(0, 4),
        selectedLabel,
        [
          "城市现实感强，适合落地冲突。",
          "悬疑感更强，适合推理和揭示。",
          "古装氛围更强，适合权谋与关系。",
          "灾变感更强，适合规则和生存。",
        ],
        ["blue", "rose", "gold", "blue"],
        "题材",
      );
  const resolvedOptions = options;
  debugStepCards(
    scriptType,
    isShortDrama ? "short_drama:step1" : "ai_comic:step1",
    openingResolvedTags,
    resolvedOptions,
  );

  return {
    root,
    elements: {
      [root]: {
        type: "Stack",
        props: { gap: "md" },
        children: [card],
      },
      [card]: {
        type: "ChoiceCard",
        props: {
          title,
          description,
          compact: true,
        },
        children: [grid],
      },
      [grid]: {
        type: "Grid",
        props: { columns: 2 },
        children: resolvedOptions.map((_, index) => `opening-option-${index}`),
      },
      ...Object.fromEntries(resolvedOptions.map((item, index) => [`opening-option-${index}`, item])),
    },
  };
}

export function getOpeningHookStepSpec(scriptType: "short_drama" | "ai_comic", selectedLabel?: string, selectedTargetAudienceLabel?: string) {
  return createOpeningHookStepSpec(scriptType, selectedLabel, selectedTargetAudienceLabel);
}

// ─────────────────────────────────────────────────────────────────────────────
// 第 2 步：主角起点
// ─────────────────────────────────────────────────────────────────────────────

function createEmotionalPayoffStepSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedLabel?: string,
  selectedTargetAudienceLabel?: string,
): MorphicRenderSpec {
  const root = "emotional-payoff-root";
  const card = "emotional-payoff-card";
  const grid = "emotional-payoff-grid";
  const isShortDrama = scriptType === "short_drama";
  const title = isShortDrama ? "第 2 步：人物关系" : "第 2 步：主角起点";
  const description = isShortDrama
    ? "先定人物关系的张力，系统再推后面的情绪走向。"
    : "先定主角在世界里的起点，系统再推后面的角色弧线。";

  const emotionalTags = isShortDrama
    ? takePresetTags(scriptType, "coreHooks", "live-action-relationship-all", 4, "short_drama:step2")
    : (() => {
        const resolved = takePresetTagsFromCategories(scriptType, "coreHooks", ["identity"], undefined, "ai_comic:step2:full");
        const malePriority = ["凡人", "神豪", "大反派", "废材弟子", "大男主", "小人物", "仙尊", "大师兄"];
        const femalePriority = ["圣女", "师妹", "女帝", "仙子", "大女主", "小人物", "凡人", "废材弟子"];
        const priority = selectedTargetAudienceLabel?.includes("女频")
          ? femalePriority
          : selectedTargetAudienceLabel?.includes("男频")
            ? malePriority
            : [];
        if (priority.length === 0) {
          return resolved.slice(0, 4);
        }
        const ordered = [
          ...priority.filter((tag) => resolved.includes(tag)),
          ...resolved.filter((tag) => !priority.includes(tag)),
        ];
        return ordered.slice(0, 4);
      })();
  const emotionalOptions = Object.fromEntries(
    buildTagOptions(
      emotionalTags,
      selectedLabel,
      isShortDrama
        ? [
            "人物关系先立住压迫感。",
            "关系断裂后再找回主动权。",
            "误判先发生，再一步步反转。",
            "变量先埋在关系暗线里。",
          ]
        : [
            "角色身份更醒目，开局更好记。",
            "起点更低，后续更容易逆转。",
            "人物反差更明显，情绪更有抓手。",
            "身份更有悬念，适合高概念。",
          ],
      ["blue", "rose", "gold", "blue"],
      isShortDrama ? "关系" : "角色",
    ).map((item, index) => [`emotion-option-${index}`, item]),
  );
  debugStepCards(
    scriptType,
    isShortDrama ? "short_drama:step2" : "ai_comic:step2",
    emotionalTags,
    Object.values(emotionalOptions),
  );

  return {
    root,
    elements: {
      [root]: {
        type: "Stack",
        props: { gap: "md" },
        children: [card],
      },
      [card]: {
        type: "ChoiceCard",
        props: {
          title,
          description,
          compact: true,
        },
        children: [grid],
      },
      [grid]: {
        type: "Grid",
        props: { columns: 2 },
        children: Object.keys(emotionalOptions),
      },
      ...emotionalOptions,
    },
  };
}

export function getEmotionalPayoffStepSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedLabel?: string,
  selectedTargetAudienceLabel?: string,
) {
  return createEmotionalPayoffStepSpec(scriptType, selectedLabel, selectedTargetAudienceLabel);
}

// ─────────────────────────────────────────────────────────────────────────────
// 第 3 步：核心机制
// ─────────────────────────────────────────────────────────────────────────────

function createProtagonistStepSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedLabel?: string,
  selectedTargetAudienceLabel?: string,
): MorphicRenderSpec {
  const root = "protagonist-step-root";
  const card = "protagonist-step-card";
  const grid = "protagonist-step-grid";
  const isShortDrama = scriptType === "short_drama";
  const title = isShortDrama ? "第 3 步：主角身份" : "第 3 步：核心机制";
  const description = isShortDrama
    ? "先定主角在局里的身份和起点，系统再推人物弧线。"
    : "先定世界运行机制，系统再推冲突节奏。";

  const protagonistTags = isShortDrama
    ? takePresetTags(scriptType, "coreHooks", "live-action-identity-all", 4, "short_drama:step3")
    : sortTagsByAudiencePreference(
        takePresetTagsFromCategories(scriptType, "coreHooks", ["cheat"], undefined, "ai_comic:step3:full"),
        selectedTargetAudienceLabel,
        {
          male: ["系统无敌流", "异能觉醒", "身份反转", "传承觉醒", "穿书", "天下无敌", "灵魂互换", "人物逆袭", "赘婿"],
          female: ["身份反转", "穿书", "灵魂互换", "人物逆袭", "系统无敌流", "异能觉醒", "传承觉醒", "天下无敌", "赘婿"],
        },
      ).slice(0, 4);
  const protagonistOptions = Object.fromEntries(
    (isShortDrama
      ? buildTagOptions(
          protagonistTags,
          selectedLabel,
          [
            "身份先压在权力下面。",
            "身份先放进关系裂缝里。",
            "真相先被挡住，再慢慢揭开。",
            "规则先变化，再被适应。",
          ],
          ["blue", "rose", "gold", "blue"],
          "身份",
        )
      : buildTagOptions(
          protagonistTags,
          selectedLabel,
          [
            "身份更突出，利于立住主角。",
            "机制更明显，利于推动剧情。",
            "反转感更强，利于持续推进。",
            "设定更鲜明，利于视觉表达。",
          ],
          ["blue", "rose", "gold", "blue"],
          "机制",
        )
    ).map((item, index) => [`protagonist-option-${index}`, item]),
  );
  debugStepCards(scriptType, isShortDrama ? "short_drama:step3" : "ai_comic:step3", protagonistTags, Object.values(protagonistOptions));

  return {
    root,
    elements: {
      [root]: {
        type: "Stack",
        props: { gap: "md" },
        children: [card],
      },
      [card]: {
        type: "ChoiceCard",
        props: {
          title,
          description,
          compact: true,
        },
        children: [grid],
      },
      [grid]: {
        type: "Grid",
        props: { columns: 2 },
        children: Object.keys(protagonistOptions),
      },
      ...protagonistOptions,
    },
  };
}

export function getProtagonistStepSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedLabel?: string,
  selectedTargetAudienceLabel?: string,
) {
  return createProtagonistStepSpec(scriptType, selectedLabel, selectedTargetAudienceLabel);
}

// ─────────────────────────────────────────────────────────────────────────────
// 第 4 步：爽点风格
// ─────────────────────────────────────────────────────────────────────────────

function createVillainStepSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedLabel?: string,
  diagnosis?: InspirationFunnelDiagnosis,
  selectedTargetAudienceLabel?: string,
): MorphicRenderSpec {
  const isShortDrama = scriptType === "short_drama";
  const root = isShortDrama ? "villain-step-live-root" : "villain-step-ai-root";
  const card = isShortDrama ? "villain-step-live-card" : "villain-step-ai-card";
  const grid = isShortDrama ? "villain-step-live-grid" : "villain-step-ai-grid";
  const title = isShortDrama ? "第 4 步：翻盘机制" : "第 4 步：爽点风格";
  const description = isShortDrama
    ? "根据前 3 步自动校准，补上翻盘与确认的走法。"
    : "根据前 3 步自动校准，补上风格和兑现方式。";

  const primaryBranch = diagnosis?.primaryBranch ?? "counter_control";
  const lockStatus = diagnosis?.lockStatus ?? "ambiguous";
  const isCalibrate = !diagnosis || lockStatus === "ambiguous";
  const branchTitle = isCalibrate
    ? "方向校准"
    : primaryBranch === "counter_control"
      ? "反击写法"
      : primaryBranch === "relation_shift"
        ? "情感写法"
        : primaryBranch === "misjudge_reversal"
          ? "反转写法"
          : "设定写法";
  const villainTags = isShortDrama
    ? takePresetTags(scriptType, "coreHooks", "live-action-turnaround-all", 4, "short_drama:step4")
    : sortTagsByAudiencePreference(
        takePresetTagsFromCategories(scriptType, "coreHooks", ["flow"], undefined, "ai_comic:step4:full"),
        selectedTargetAudienceLabel,
        {
          male: ["升级流", "无脑流", "无敌流", "迪化流", "震惊流", "脑洞流", "反套路"],
          female: ["反套路", "震惊流", "脑洞流", "升级流", "无脑流", "无敌流", "迪化流"],
        },
      ).slice(0, 4);
  const villainOptions = Object.fromEntries(
    (isShortDrama
      ? buildTagOptions(
          villainTags,
          selectedLabel,
          [
            "身份与证据先翻开。",
            "能力与资源先顶上。",
            "真相与局势先反转。",
            "规则与视角先变化。",
          ],
          ["blue", "rose", "gold", "blue"],
          "翻盘",
        )
      : buildTagOptions(
          villainTags,
          selectedLabel,
          [
            "升级路径更清楚。",
            "设定推进更直接。",
            "节奏推进更强。",
            "反套路感更明显。",
          ],
          ["blue", "rose", "gold", "blue"],
          "爽点",
        )
    ).map((item, index) => [`villain-option-${index}`, item]),
  );
  debugStepCards(scriptType, isShortDrama ? "short_drama:step4" : "ai_comic:step4", villainTags, Object.values(villainOptions));

  return {
    root,
    elements: {
      [root]: {
        type: "Stack",
        props: { gap: "md" },
        children: [card],
      },
      [card]: {
        type: "ChoiceCard",
        props: {
          title: branchTitle,
          description: isCalibrate
            ? isShortDrama
              ? "前三问方向还不够统一，先选你更偏哪种翻盘方式。"
              : "前三问方向还不够统一，先选你更偏哪种爽点风格。"
            : description,
          compact: true,
        },
        children: [grid],
      },
      [grid]: {
        type: "Grid",
        props: { columns: 2 },
        children: Object.keys(villainOptions),
      },
      ...villainOptions,
    },
  };
}

export function getVillainStepSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedLabel?: string,
  diagnosis?: InspirationFunnelDiagnosis,
  selectedTargetAudienceLabel?: string,
) {
  return createVillainStepSpec(scriptType, selectedLabel, diagnosis, selectedTargetAudienceLabel);
}

// ─────────────────────────────────────────────────────────────────────────────
// 第 5 步：视觉元素 / mustHave / mustAvoid / 一句话补充
// ─────────────────────────────────────────────────────────────────────────────

function createPaymentHookStepSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedMustHaveLabels: string[] = [],
  selectedMustAvoidLabels: string[] = [],
  selectedEraLabels: string[] = [],
): MorphicRenderSpec {
  const isShortDrama = scriptType === "short_drama";
  const root = isShortDrama ? "payment-step-live-root" : "payment-step-ai-root";
  const grid = isShortDrama ? "payment-step-live-grid" : "payment-step-ai-grid";
  const title = isShortDrama
    ? "第 5 步：确认题材 / 时代 / mustHave / mustAvoid / 一句话补充"
    : "第 5 步：视觉元素 / mustHave / mustAvoid / 一句话补充";
  const description = isShortDrama
    ? "题材与边界最后确认，想要与不要都在这里收口。"
    : "视觉元素与边界最后确认，想要与不要都在这里收口。";
  const selectedMustHaveLabel = (label: string) => (selectedMustHaveLabels.includes(label) ? label : undefined);
  const selectedMustAvoidLabel = (label: string) => (selectedMustAvoidLabels.includes(label) ? label : undefined);
  const selectedEraLabel = (label: string) => (selectedEraLabels.includes(label) ? label : undefined);

  const eraTags = isShortDrama
    ? takePresetTags(scriptType, "eras", "live-action-era-background-all", 10, "short_drama:step5:era")
    : [];
  const eraOptions = Object.fromEntries(
    eraTags.map((label, index) => [
      `payment-live-era-${index}`,
      option(
        label,
        "时代背景",
        "作为结果卡和故事背景的时代背景。",
        ["step5-era"],
        [],
        8,
        index % 3 === 0 ? "blue" : index % 3 === 1 ? "rose" : "gold",
        selectedEraLabel(label),
        true,
        "chip",
      ),
    ]),
  );

  const mustHaveOptions = {
    "payment-live-strong-spark": option(
      "强爽优先",
      "更想看主角反击、打脸、升级。",
      "更想看主角反击、打脸、升级。",
      ["step5-must-have"],
      [],
      8,
      "blue",
      selectedMustHaveLabel("强爽优先"),
      true,
      "chip",
    ),
    "payment-live-emotion-first": option(
      "情感优先",
      "更想看背叛、拉扯、关系选择。",
      "更想看背叛、拉扯、关系选择。",
      ["step5-must-have"],
      [],
      8,
      "rose",
      selectedMustHaveLabel("情感优先"),
      true,
      "chip",
    ),
    "payment-live-suspense-first": option(
      "悬疑优先",
      "更想看误判、证据、真相反转。",
      "更想看误判、证据、真相反转。",
      ["step5-must-have"],
      [],
      8,
      "gold",
      selectedMustHaveLabel("悬疑优先"),
      true,
      "chip",
    ),
    "payment-live-brainstorm-first": option(
      "脑洞优先",
      "更想看异常、规则、设定展开。",
      "更想看异常、规则、设定展开。",
      ["step5-must-have"],
      [],
      8,
      "blue",
      selectedMustHaveLabel("脑洞优先"),
      true,
      "chip",
    ),
    "payment-live-leading-female": option(
      "女主要强",
      "主角要更有主动权、更强判断力。",
      "主角要更有主动权、更强判断力。",
      ["step5-must-have"],
      [],
      8,
      "rose",
      selectedMustHaveLabel("女主要强"),
      true,
      "chip",
    ),
    "payment-live-modern-setting": option(
      "现代背景",
      "想保留现代都市感和现实落地感。",
      "想保留现代都市感和现实落地感。",
      ["step5-must-have"],
      [],
      8,
      "blue",
      selectedMustHaveLabel("现代背景"),
      true,
      "chip",
    ),
  };

  const mustAvoidOptions = {
    "payment-live-no-rebirth": option(
      "不要重生",
      "不想要重生回档或时间倒流。",
      "不想要重生回档或时间倒流。",
      ["step5-must-avoid"],
      [],
      8,
      "blue",
      selectedMustAvoidLabel("不要重生"),
      true,
      "chip",
    ),
    "payment-live-no-system": option(
      "不要系统",
      "不想要系统外挂或任务面板。",
      "不想要系统外挂或任务面板。",
      ["step5-must-avoid"],
      [],
      8,
      "rose",
      selectedMustAvoidLabel("不要系统"),
      true,
      "chip",
    ),
    "payment-live-no-too-much-tragedy": option(
      "不要太虐",
      "希望情绪有起伏，但不要一路太压抑。",
      "希望情绪有起伏，但不要一路太压抑。",
      ["step5-must-avoid"],
      [],
      8,
      "gold",
      selectedMustAvoidLabel("不要太虐"),
      true,
      "chip",
    ),
    "payment-live-no-xianxia": option(
      "不要玄幻",
      "不要玄幻和高空奇观。",
      "不要玄幻和高空奇观。",
      ["step5-must-avoid"],
      [],
      8,
      "blue",
      selectedMustAvoidLabel("不要玄幻"),
      true,
      "chip",
    ),
    "payment-live-no-doomsday": option(
      "不要末世",
      "不要末世灾难方向。",
      "不要末世灾难方向。",
      ["step5-must-avoid"],
      [],
      8,
      "rose",
      selectedMustAvoidLabel("不要末世"),
      true,
      "chip",
    ),
    "payment-live-no-palace": option(
      "不要宫斗",
      "不要宫廷争斗和深宫结构。",
      "不要宫廷争斗和深宫结构。",
      ["step5-must-avoid"],
      [],
      8,
      "gold",
      selectedMustAvoidLabel("不要宫斗"),
      true,
      "chip",
    ),
  };
  debugStepCards(scriptType, isShortDrama ? "short_drama:step5" : "ai_comic:step5", [
    ...Object.values(eraOptions).map((item) => (item as { props?: { label?: string } }).props?.label).filter((label): label is string => Boolean(label)),
    ...Object.values(mustHaveOptions).map((item) => (item as { props?: { label?: string } }).props?.label).filter((label): label is string => Boolean(label)),
    ...Object.values(mustAvoidOptions).map((item) => (item as { props?: { label?: string } }).props?.label).filter((label): label is string => Boolean(label)),
  ], [
    ...Object.values(eraOptions),
    ...Object.values(mustHaveOptions),
    ...Object.values(mustAvoidOptions),
  ]);

  return {
    root,
    elements: {
      [root]: {
        type: "Stack",
        props: { gap: "lg" },
        children: ["payment-group-grid", "payment-note"],
      },
      ["payment-group-grid"]: {
        type: "Grid",
        props: { columns: isShortDrama ? 3 : 2, layout: "wrap" },
        children: isShortDrama ? ["era-panel", "must-have-panel", "must-avoid-panel"] : ["must-have-panel", "must-avoid-panel"],
      },
      ["era-panel"]: {
        type: "Stack",
        props: {
          gap: "sm",
        },
        children: ["era-heading", "era-grid"],
      },
      ["era-heading"]: {
        type: "Heading",
        props: {
          eyebrow: "时代",
          title: "时代背景",
          description: "用于结果卡里的时代背景字段。",
        },
      },
      ["era-grid"]: {
        type: "Grid",
        props: { columns: 2, layout: "wrap" },
        children: Object.keys(eraOptions),
      },
      ["must-have-panel"]: {
        type: "Stack",
        props: {
          gap: "sm",
        },
        children: ["must-have-heading", "must-have-grid"],
      },
      ["must-have-heading"]: {
        type: "Heading",
        props: {
          eyebrow: "想要",
          title: "想要",
          description: "想要的内容可以多选，系统会把它们升权。",
        },
      },
      ["must-have-grid"]: {
        type: "Grid",
        props: { columns: 3, layout: "wrap" },
        children: [
          "payment-live-strong-spark",
          "payment-live-emotion-first",
          "payment-live-suspense-first",
          "payment-live-brainstorm-first",
          "payment-live-leading-female",
          "payment-live-modern-setting",
        ],
      },
      ["must-avoid-panel"]: {
        type: "Stack",
        props: {
          gap: "sm",
        },
        children: ["must-avoid-heading", "must-avoid-grid"],
      },
      ["must-avoid-heading"]: {
        type: "Heading",
        props: {
          eyebrow: "不要",
          title: "不要",
          description: "不要的内容也可以多选，系统会把它们降权并排除。",
        },
      },
      ["must-avoid-grid"]: {
        type: "Grid",
        props: { columns: 3, layout: "wrap" },
        children: [
          "payment-live-no-rebirth",
          "payment-live-no-system",
          "payment-live-no-too-much-tragedy",
          "payment-live-no-xianxia",
          "payment-live-no-doomsday",
          "payment-live-no-palace",
        ],
      },
      ["payment-note"]: {
        type: "Heading",
        props: {
          eyebrow: "补充",
          title: isShortDrama ? "也可以补一句你的具体要求" : "也可以补一句你的视觉或边界要求",
          description,
        },
      },
      ...mustHaveOptions,
      ...mustAvoidOptions,
      ...eraOptions,
    },
  };
}

export function getPaymentHookStepSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedMustHaveLabels: string[] = [],
  selectedMustAvoidLabels: string[] = [],
  selectedEraLabels: string[] = [],
) {
  return createPaymentHookStepSpec(scriptType, selectedMustHaveLabels, selectedMustAvoidLabels, selectedEraLabels);
}

// ─────────────────────────────────────────────────────────────────────────────
// 导出函数（兼容旧接口名称）
// ─────────────────────────────────────────────────────────────────────────────

// 旧的入口函数，现在返回第 1 步
export function getInspirationFirstRoundSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedLabel?: string,
  selectedTargetAudienceLabel?: string,
) {
  return getOpeningHookStepSpec(scriptType, selectedLabel, selectedTargetAudienceLabel);
}

// 旧接口兼容：getAudienceConsoleSpec 现在返回第 1 步（开场选择）
export function getAudienceConsoleSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedLabel?: string,
  selectedTargetAudienceLabel?: string,
) {
  return getOpeningHookStepSpec(scriptType, selectedLabel, selectedTargetAudienceLabel);
}

// 旧接口兼容：getTopicDirectionSpec 现在返回第 2 步（情绪刺激）
export function getTopicDirectionSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedLabel?: string,
  selectedTargetAudienceLabel?: string,
) {
  return getEmotionalPayoffStepSpec(scriptType, selectedLabel, selectedTargetAudienceLabel);
}

// 旧接口兼容：getOpeningHookSpec 现在返回第 3 步（主角代入）
export function getOpeningHookSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedLabel?: string,
  selectedTargetAudienceLabel?: string,
) {
  return getProtagonistStepSpec(scriptType, selectedLabel, selectedTargetAudienceLabel);
}

// 旧接口兼容：getVillainSpec 返回第 4 步（动态确认）
export function getVillainSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedLabel?: string,
  diagnosis?: InspirationFunnelDiagnosis,
  selectedTargetAudienceLabel?: string,
) {
  return getVillainStepSpec(scriptType, selectedLabel, diagnosis, selectedTargetAudienceLabel);
}

// 旧接口兼容：getPaymentHookSpec 返回第 5 步（付费钩子）
export function getPaymentHookSpec(
  scriptType: "short_drama" | "ai_comic",
  selectedMustHaveLabels?: string[],
  selectedMustAvoidLabels?: string[],
  selectedEraLabels?: string[],
) {
  return getPaymentHookStepSpec(scriptType, selectedMustHaveLabels, selectedMustAvoidLabels, selectedEraLabels);
}

// ─────────────────────────────────────────────────────────────────────────────
// 受众推断说明
// ─────────────────────────────────────────────────────────────────────────────
// 受众（男频/女频）不是由用户直接选择的，而是通过以下链路推断：
// 1. 用户选择投射式选项（开场/情绪刺激/主角/反派/付费钩子）
// 2. 每个选项的 tags 数组包含"男频"或"女频"标签
// 3. handleInspirationChoice 等函数将 tags 添加到输入框
// 4. parseTags() 从输入框提取 #男频 #女频 标签到 audiences
// 5. buildSafeProjectBrief/buildSafeScriptPlan 使用 audiences 判断受众类型
//
// AI 漫剧选项的 tags 中只包含"男频"或"女频"，不包含"银发"。
// 真人短剧选项的 tags 中也只包含"男频"或"女频"。
// "银发"受众只出现在用户手动输入 #银发 标签时。
