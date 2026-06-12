/**
 * 短剧题材标签库
 * 供灵感策划、项目创建等页面复用
 *
 * 预设标签库切换功能预留
 * - 当前默认使用 "default" 预设库
 * - 未来可以添加更多预设库（如：男频专用、女频专用、短剧爆款标签等）
 * - 通过 setPresetLibrary() 切换不同预设
 */

// 预设库类型
export type TagPresetLibrary = "default" | string; // 未来可扩展更多预设

// 当前使用的预设库（默认为 default）
let currentPresetLibrary: TagPresetLibrary = "default";

export interface TagCategory {
  id: string;
  name: string;
  groups: TagGroup[];
}

export interface TagGroup {
  id: string;
  name: string;
  tags: string[];
}

/**
 * 获取当前使用的预设库名称
 */
export function getCurrentPresetLibrary(): TagPresetLibrary {
  return currentPresetLibrary;
}

/**
 * 切换预设标签库（未来扩展用）
 * @param preset - 预设库名称
 */
export function setPresetLibrary(preset: TagPresetLibrary): void {
  currentPresetLibrary = preset;
  // TODO: 未来可以在这里加载不同预设库的标签数据
  console.log(`[标签库] 已切换到预设：${preset}`);
}

/**
 * 题材类型 - 9 个大类（default 预设）
 * 未来可以为不同预设定义不同的标签集合
 */
export const GENRE_CATEGORIES: TagCategory[] = [
  {
    id: "fantasy-xianxia",
    name: "玄幻仙侠",
    groups: [
      {
        id: "fantasy-xianxia-all",
        name: "玄幻仙侠",
        tags: ["玄幻", "修仙", "仙侠", "神话", "洪荒"],
      },
    ],
  },
  {
    id: "urban-modern",
    name: "都市现代",
    groups: [
      {
        id: "urban-modern-all",
        name: "都市现代",
        tags: ["都市", "现代职场", "职场", "商战", "娱乐圈", "校园", "乡村"],
      },
    ],
  },
  {
    id: "suspense-supernatural",
    name: "悬疑灵异",
    groups: [
      {
        id: "suspense-supernatural-all",
        name: "悬疑灵异",
        tags: ["悬疑", "推理", "刑侦", "灵异", "民俗怪谈", "规则怪谈"],
      },
    ],
  },
  {
    id: "history-costume",
    name: "历史古装",
    groups: [
      {
        id: "history-costume-all",
        name: "历史古装",
        tags: ["古代", "架空历史", "朝堂权谋", "宫廷", "三国", "大明", "唐朝"],
      },
    ],
  },
  {
    id: "apocalypse-disaster",
    name: "末世灾变",
    groups: [
      {
        id: "apocalypse-disaster-all",
        name: "末世灾变",
        tags: ["末世", "废土", "天灾", "灾难", "异变"],
      },
    ],
  },
  {
    id: "sci-fi-future",
    name: "科幻未来",
    groups: [
      {
        id: "sci-fi-future-all",
        name: "科幻未来",
        tags: ["科幻", "未来世界", "赛博朋克", "星际", "机甲", "时空"],
      },
    ],
  },
  {
    id: "game-sports",
    name: "游戏竞技",
    groups: [
      {
        id: "game-sports-all",
        name: "游戏竞技",
        tags: ["游戏", "电竞", "无限游戏", "虚拟世界", "第四天灾"],
      },
    ],
  },
  {
    id: "war-military",
    name: "战争军事",
    groups: [
      {
        id: "war-military-all",
        name: "战争军事",
        tags: ["军事", "战争", "军工", "谍战", "国战"],
      },
    ],
  },
  {
    id: "fantasy-otherworld",
    name: "奇幻异界",
    groups: [
      {
        id: "fantasy-otherworld-all",
        name: "奇幻异界",
        tags: ["西方奇幻", "魔法世界", "异世界", "异界大陆", "御兽"],
      },
    ],
  },
];

/**
 * 核心设定 - 4 个大类
 */
export const CORE_HOOK_CATEGORIES: TagCategory[] = [
  {
    id: "flow",
    name: "流派",
    groups: [
      {
        id: "flow-all",
        name: "流派",
        tags: ["升级流", "无脑流", "无敌流", "迪化流", "震惊流", "脑洞流", "反套路"],
      },
    ],
  },
  {
    id: "identity",
    name: "身份",
    groups: [
      {
        id: "identity-all",
        name: "身份",
        tags: ["圣女", "仙尊", "大师兄", "师妹", "女帝", "凡人", "神豪", "大反派", "仙子", "废材弟子", "大男主", "大女主", "小人物"],
      },
    ],
  },
  {
    id: "cheat",
    name: "金手指",
    groups: [
      {
        id: "cheat-all",
        name: "金手指",
        tags: ["系统无敌流", "异能觉醒", "身份反转", "赘婿", "传承觉醒", "穿书", "天下无敌", "灵魂互换", "人物逆袭"],
      },
    ],
  },
  {
    id: "plot",
    name: "情节",
    groups: [
      {
        id: "plot-all",
        name: "情节",
        tags: ["仙魔大战", "多女主", "多男主", "高手下山", "强强联合", "战神归来", "强者回归", "家国情怀", "基建种田", "求生种田", "经营势力"],
      },
    ],
  },
];

/**
 * 风格元素 - 2 个大类
 */
export const STYLE_CATEGORIES: TagCategory[] = [
  {
    id: "style",
    name: "风格",
    groups: [
      {
        id: "style-all",
        name: "风格",
        tags: ["爽文虐渣", "打脸复仇", "强势碾压", "沙雕搞笑", "幽默风趣", "玩梗搞笑", "轻松喜剧", "甜宠恋爱", "紧张悬疑", "惊悚诡秘", "热血成长", "温馨治愈"],
      },
    ],
  },
  {
    id: "element",
    name: "元素",
    groups: [
      {
        id: "element-all",
        name: "元素",
        tags: ["妖魔", "克苏鲁", "萌宠", "诡秘", "特效", "古神", "赛博机械", "炫酷异能", "神战遗迹", "读心", "外挂", "天命", "黑道", "暴富", "玄学", "病娇", "白月光", "马甲流", "全村修仙", "直播", "隐藏大佬"],
      },
    ],
  },
];

/**
 * 获取所有题材标签（扁平化）
 */
export function getAllGenreTags(): string[] {
  return GENRE_CATEGORIES.flatMap((category) =>
    category.groups.flatMap((group) => group.tags)
  );
}

/**
 * 获取所有核心设定标签（扁平化）
 */
export function getAllCoreHookTags(): string[] {
  return CORE_HOOK_CATEGORIES.flatMap((category) =>
    category.groups.flatMap((group) => group.tags)
  );
}

/**
 * 获取所有风格元素标签（扁平化）
 */
export function getAllStyleTags(): string[] {
  return STYLE_CATEGORIES.flatMap((category) =>
    category.groups.flatMap((group) => group.tags)
  );
}

/**
 * 目标受众
 */
export const AUDIENCE_OPTIONS = ["男频", "女频"];

// ============================================================================
// 预设标签库 - 两套模板
// ============================================================================

/**
 * 预设标签库接口
 * 两套模板:
 * - ai-short-drama: AI漫剧（核心设定和风格元素针对 AI 生成优化）
 * - live-action: 真人短剧（核心设定和风格元素针对实拍优化）
 */
export interface TagPresetDefinition {
  id: TagPresetLibrary;
  name: string;
  description: string;
  eras?: TagCategory[];
  genres: TagCategory[];
  coreHooks: TagCategory[];
  styleTags: TagCategory[];
}

export type TagPresetSection = "eras" | "genres" | "coreHooks" | "styleTags";

/**
 * AI漫剧预设 - 核心设定和风格元素针对 AI 生成优化
 */
export const AI_SHORT_DRAMA_PRESET: TagPresetDefinition = {
  id: "ai-short-drama",
  name: "AI漫剧",
  description: "针对 AI 生成的漫剧标签库，核心设定和风格元素适合 AI 创作",
  genres: GENRE_CATEGORIES,
  coreHooks: CORE_HOOK_CATEGORIES,
  styleTags: STYLE_CATEGORIES,
};

/**
 * 真人短剧预设 - 核心设定和风格元素针对实拍优化
 */
export const LIVE_ACTION_PRESET: TagPresetDefinition = {
  id: "live-action",
  name: "真人短剧",
  description: "针对真人短剧的标签库，核心设定和风格元素适合实拍创作",
  eras: [
    {
      id: "live-action-era-background",
      name: "时代背景",
      groups: [
        {
          id: "live-action-era-background-all",
          name: "时代背景",
          tags: ["现代都市", "古代", "民国", "年代", "乡村", "职场现代", "豪门现代", "校园", "架空古代", "末世"],
        },
      ],
    },
  ],
  genres: [
    {
      id: "live-action-urban-emotion",
      name: "都市情感",
      groups: [
        {
          id: "live-action-urban-emotion",
          name: "都市情感",
          tags: ["都市", "豪门", "家庭伦理", "婚姻情感", "职场", "商战", "校园", "乡村"],
        },
      ],
    },
    {
      id: "live-action-suspense-law",
      name: "悬疑法治",
      groups: [
        {
          id: "live-action-suspense-law",
          name: "悬疑法治",
          tags: ["悬疑", "推理", "刑侦", "犯罪", "法律"],
        },
      ],
    },
    {
      id: "live-action-costume-era",
      name: "古装年代",
      groups: [
        {
          id: "live-action-costume-era",
          name: "古装年代",
          tags: ["古装", "宫廷", "宅斗", "权谋", "民国", "年代"],
        },
      ],
    },
    {
      id: "live-action-fusion",
      name: "融合题材",
      groups: [
        {
          id: "live-action-fusion",
          name: "融合题材",
          tags: ["喜剧", "玄学", "灵异", "规则怪谈", "异能", "志怪", "轻奇幻", "末世", "科幻", "武侠", "动作"],
        },
      ],
    },
  ],
  coreHooks: [
    {
      id: "live-action-opening-hook",
      name: "开场爆点",
      groups: [
        {
          id: "live-action-opening-hook-all",
          name: "开场爆点",
          tags: ["当众羞辱", "抓奸背叛", "替嫁逼婚", "身份误判", "亲人病危", "债务危机", "命案开局", "阴谋开局", "重生归来", "被退婚", "被离婚", "携崽归来", "孩子被抢"],
        },
      ],
    },
    {
      id: "live-action-relationship",
      name: "人物关系",
      groups: [
        {
          id: "live-action-relationship-all",
          name: "人物关系",
          tags: ["男女主拉扯", "夫妻反目", "前任白月光", "替身关系", "真假千金", "豪门婆媳", "父女撕裂", "母女撕裂", "上下级暧昧", "仇人变爱人", "兄弟夺权", "家族夺权", "主角对抗豪门", "主角对抗公司"],
        },
      ],
    },
    {
      id: "live-action-identity",
      name: "主角身份",
      groups: [
        {
          id: "live-action-identity-all",
          name: "主角身份",
          tags: ["隐藏大佬", "落魄强者", "清醒反抗者", "复仇归来者", "小人物", "赘婿", "灰姑娘", "霸总", "总裁", "神医", "医生", "律师", "特种兵", "王爷", "王妃", "女帝", "萌宝", "反派", "病娇"],
        },
      ],
    },
    {
      id: "live-action-turnaround",
      name: "翻盘机制",
      groups: [
        {
          id: "live-action-turnaround-all",
          name: "翻盘机制",
          tags: ["身份揭露", "马甲掉落", "重生信息差", "穿越", "穿书", "掌握证据", "专业能力", "商业能力", "医术", "法律能力", "武力压制", "财力暴露", "贵人资源", "读心术", "灵魂互换", "人物逆袭"],
        },
      ],
    },
  ],
  styleTags: [
    {
      id: "live-action-conflict-drive",
      name: "冲突驱动",
      groups: [
        {
          id: "live-action-conflict-drive-all",
          name: "冲突驱动",
          tags: ["对白驱动", "情绪驱动", "动作驱动", "悬念驱动", "关系驱动", "反转驱动"],
        },
      ],
    },
    {
      id: "live-action-scene-constraint",
      name: "场景约束",
      groups: [
        {
          id: "live-action-scene-constraint-all",
          name: "场景约束",
          tags: ["单场景", "少场景", "多场景", "室内为主", "公司场景", "豪宅场景", "医院场景", "校园场景", "乡村场景", "封闭空间"],
        },
      ],
    },
    {
      id: "live-action-emotion-style",
      name: "情绪风格",
      groups: [
        {
          id: "live-action-emotion-style-all",
          name: "情绪风格",
          tags: ["打脸虐渣", "追妻火葬场", "甜宠", "虐恋", "双向救赎", "女性成长", "家庭伦理", "强势碾压", "紧张悬疑", "轻松喜剧", "现实主义", "疯批拉扯", "隐忍反击"],
        },
      ],
    },
    {
      id: "live-action-market-element",
      name: "市场元素",
      groups: [
        {
          id: "live-action-market-element-all",
          name: "市场元素",
          tags: ["豪门恩怨", "真假千金", "先婚后爱", "破镜重圆", "姐弟恋", "年龄差", "娱乐圈", "黑道", "方言", "暴富", "玄学", "萌宝携崽", "极品亲戚", "家族秘密"],
        },
      ],
    },
  ],
};

/**
 * 默认预设库 - 默认使用 AI漫剧预设
 */
export const DEFAULT_PRESET: TagPresetDefinition = AI_SHORT_DRAMA_PRESET;

/**
 * 预设库注册表
 * 当前有两套模板：AI漫剧 和 真人短剧
 */
export const PRESET_LIBRARIES: Record<TagPresetLibrary, TagPresetDefinition> = {
  "ai-short-drama": AI_SHORT_DRAMA_PRESET,
  "live-action": LIVE_ACTION_PRESET,
};

export function getPresetForScriptType(scriptType: "short_drama" | "ai_comic"): TagPresetDefinition {
  return scriptType === "ai_comic" ? AI_SHORT_DRAMA_PRESET : LIVE_ACTION_PRESET;
}

export function getTagsFromPresetGroup(
  preset: TagPresetDefinition,
  section: TagPresetSection,
  groupId: string,
): string[] {
  const sectionCategories = preset[section] ?? [];
  const category = sectionCategories.find((item) => item.groups.some((group) => group.id === groupId));
  const group = category?.groups.find((item) => item.id === groupId);
  return group?.tags ?? [];
}

type ResolvePresetTagsArgs = {
  preset: TagPresetDefinition;
  section: TagPresetSection;
  groupIds?: string[];
  categoryIds?: string[];
  sampleCount?: number;
  debugLabel?: string;
};

export function resolvePresetTags({
  preset,
  section,
  groupIds = [],
  categoryIds = [],
  sampleCount,
  debugLabel,
}: ResolvePresetTagsArgs): string[] {
  const isDev = process.env.NODE_ENV !== "production";
  const resolvedFromCategories = categoryIds.flatMap((categoryId) => {
    const sectionCategories = preset[section] ?? [];
    const category = sectionCategories.find((item) => item.id === categoryId);
    if (!category && isDev) {
      console.warn("[标签库] category 未找到", {
        presetId: preset.id,
        section,
        categoryId,
        debugLabel,
      });
    }
    return category?.groups.flatMap((group) => group.tags) ?? [];
  });

  const resolvedFromGroups = groupIds.flatMap((groupId) => {
    const sectionCategories = preset[section] ?? [];
    const category = sectionCategories.find((item) => item.groups.some((group) => group.id === groupId));
    const group = category?.groups.find((item) => item.id === groupId);
    if (!group && isDev) {
      console.warn("[标签库] group 未找到", {
        presetId: preset.id,
        section,
        groupId,
        debugLabel,
      });
    }
    return group?.tags ?? [];
  });

  const resolved = Array.from(new Set([
    ...resolvedFromCategories,
    ...resolvedFromGroups,
  ].map((tag) => tag.trim()).filter(Boolean)));

  if (isDev) {
    console.log("[标签库] resolvePresetTags", {
      presetId: preset.id,
      section,
      debugLabel,
      categoryIds,
      groupIds,
      count: resolved.length,
      labels: resolved,
    });
    if (resolved.length === 0) {
      console.warn("[标签库] resolvePresetTags 结果为空", {
        presetId: preset.id,
        section,
        debugLabel,
        categoryIds,
        groupIds,
      });
    }
  }

  return typeof sampleCount === "number" ? resolved.slice(0, sampleCount) : resolved;
}

export function getAudienceOptionsForScriptType(scriptType: "short_drama" | "ai_comic"): string[] {
  return scriptType === "short_drama" ? ["男频", "女频", "银发"] : ["男频", "女频"];
}

/**
 * 根据预设 ID 获取对应的标签库
 * @param presetId - 预设库 ID
 * @returns 预设库定义，如果不存在则返回默认预设
 */
export function getPresetById(presetId: TagPresetLibrary): TagPresetDefinition {
  return PRESET_LIBRARIES[presetId] || DEFAULT_PRESET;
}

/**
 * 获取所有可用的预设库列表
 * @returns 预设库定义数组
 */
export function getAllPresets(): TagPresetDefinition[] {
  return Object.values(PRESET_LIBRARIES);
}

/**
 * 获取当前预设的题材类型标签
 */
export function getCurrentGenres(): TagCategory[] {
  return PRESET_LIBRARIES[currentPresetLibrary]?.genres || GENRE_CATEGORIES;
}

/**
 * 获取当前预设的核心设定标签
 */
export function getCurrentCoreHooks(): TagCategory[] {
  return PRESET_LIBRARIES[currentPresetLibrary]?.coreHooks || CORE_HOOK_CATEGORIES;
}

/**
 * 获取当前预设的风格元素标签
 */
export function getCurrentStyleTags(): TagCategory[] {
  return PRESET_LIBRARIES[currentPresetLibrary]?.styleTags || STYLE_CATEGORIES;
}

// ============================================================================
// 标签限额与归一化
// ============================================================================

export type OverviewTagLimits = {
  genres: number;
  coreHooks: number;
  styleTags: number;
};

/** AI 漫剧标签上限 */
export const AI_COMIC_OVERVIEW_LIMITS: OverviewTagLimits = {
  genres: 3,
  coreHooks: 3,
  styleTags: 5,
};

/** 真人短剧标签上限（保持现有规则） */
export const SHORT_DRAMA_OVERVIEW_LIMITS: OverviewTagLimits = {
  genres: 3,
  coreHooks: 5,
  styleTags: 8,
};

export function getOverviewTagLimits(scriptType: "ai_comic" | "short_drama"): OverviewTagLimits {
  return scriptType === "ai_comic" ? AI_COMIC_OVERVIEW_LIMITS : SHORT_DRAMA_OVERVIEW_LIMITS;
}

/**
 * 判断标签是否为长句（非标准短标签）
 * 超过 10 个中文字、含标点符号、或包含句式结构的，视为非标准标签
 */
function isLongSentenceTag(tag: string): boolean {
  const chineseChars = [...tag].filter((c) => /[\u4e00-\u9fff]/.test(c)).length;
  if (chineseChars > 10) return true;
  if (/[，。！？、；：""''（）【】《》]/.test(tag)) return true;
  if (/(成为|揭开|从此|因为|所以|但是|然而|于是|最终|终于|原来|竟然|居然|发现|通过|主角).{4,}/u.test(tag)) return true;
  return false;
}

/** 归一化结果 */
export interface NormalizedOverviewTags {
  genres: string[];
  coreHooks: string[];
  styleTags: string[];
  audiences: string[];
  /** 未匹配标签库的候选标签，不进入正式字段 */
  candidateTags: {
    genres: string[];
    coreHooks: string[];
    styleTags: string[];
  };
  /** 归一化过程中的 warning */
  warnings: string[];
}

/**
 * 统一归一化 overview 选择字段
 *
 * 处理流程：
 * 1. trim / 去空 / 去重 / 保留原顺序
 * 2. 匹配标签库 → 写入正式字段
 * 3. 非标签库标签 → 短标签直接用，长句为候选
 * 4. 按 scriptType 限额裁剪
 *
 * @param input - AI 返回或用户输入的原始字段
 * @param options.scriptType - AI漫剧 / 真人短剧
 */
export function normalizeOverviewSelectionFields(
  input: {
    genres?: unknown;
    coreHooks?: unknown;
    styleTags?: unknown;
    audiences?: unknown;
  },
  options: { scriptType: "ai_comic" | "short_drama" },
): NormalizedOverviewTags {
  const limits = getOverviewTagLimits(options.scriptType);
  const preset = getPresetForScriptType(options.scriptType);

  // 收集标签库
  const genreTagLibrary = new Set(
    preset.genres.flatMap((c) => c.groups.flatMap((g) => g.tags)),
  );
  const coreHookTagLibrary = new Set(
    preset.coreHooks.flatMap((c) => c.groups.flatMap((g) => g.tags)),
  );
  const styleTagLibrary = new Set(
    preset.styleTags.flatMap((c) => c.groups.flatMap((g) => g.tags)),
  );

  function normalize(arr: unknown): string[] {
    if (Array.isArray(arr))
      return arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
    if (typeof arr === "string")
      return arr.split(/[,，、\n#]+/).map((s) => s.trim()).filter(Boolean);
    return [];
  }

  function matchAndCap(
    raw: string[],
    tagLibrary: Set<string>,
    maxCount: number,
  ): { matched: string[]; candidates: string[] } {
    const seen = new Set<string>();
    const matched: string[] = [];
    const candidates: string[] = [];

    for (const tag of raw) {
      if (seen.has(tag)) continue;

      if (tagLibrary.has(tag)) {
        // 标签库中已存在 → 直接写入正式字段
        matched.push(tag);
        seen.add(tag);
        if (matched.length >= maxCount) break;
      } else if (isLongSentenceTag(tag)) {
        // 非标签库 + 长句 → 标记为候选，不写入正式字段
        candidates.push(tag);
      } else {
        // 非标签库 + 短标签 → 可用但标记为候选
        if (matched.length < maxCount) {
          matched.push(tag);
          seen.add(tag);
        } else {
          candidates.push(tag);
        }
      }
    }

    return { matched, candidates };
  }

  const genresRaw = normalize(input.genres);
  const coreHooksRaw = normalize(input.coreHooks);
  const styleTagsRaw = normalize(input.styleTags);
  const audiencesRaw = normalize(input.audiences);

  const genresResult = matchAndCap(genresRaw, genreTagLibrary, limits.genres);
  const coreHooksResult = matchAndCap(coreHooksRaw, coreHookTagLibrary, limits.coreHooks);
  const styleTagsResult = matchAndCap(styleTagsRaw, styleTagLibrary, limits.styleTags);

  const warnings: string[] = [];
  if (genresResult.candidates.length > 0) {
    warnings.push(
      `题材类型候选标签（待治理）：${genresResult.candidates.join("、")}`,
    );
  }
  if (coreHooksResult.candidates.length > 0) {
    warnings.push(
      `核心设定候选标签（待治理）：${coreHooksResult.candidates.join("、")}`,
    );
  }
  if (styleTagsResult.candidates.length > 0) {
    warnings.push(
      `风格元素候选标签（待治理）：${styleTagsResult.candidates.join("、")}`,
    );
  }

  return {
    genres: genresResult.matched,
    coreHooks: coreHooksResult.matched,
    styleTags: styleTagsResult.matched,
    audiences: audiencesRaw,
    candidateTags: {
      genres: genresResult.candidates,
      coreHooks: coreHooksResult.candidates,
      styleTags: styleTagsResult.candidates,
    },
    warnings,
  };
}
