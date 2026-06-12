import type { ProjectBrief, ScriptPlan } from "@/lib/types";
import {
  buildScenarioTagBundle,
  getScenarioVariantOverlays,
  type ScenarioGenerationHints,
  type ScenarioDisplayTagGroups,
  type ScenarioVariantOverlay,
  type ScenarioVariantId,
} from "@/lib/original/scenario-variant-overlays";
import { LIVE_ACTION_PRESET } from "@/lib/script-tags";

export type StoryIntentChoice = {
  label: string;
  tags: string[];
  scores?: string[];
  intentScore?: number;
};

export type StoryIntentMergedTags = {
  audiences: string[];
  eraTags: string[];
  genres: string[];
  coreHooks: string[];
  styleTags: string[];
};

export type InspirationBranchKey =
  | "counter_control"
  | "relation_shift"
  | "misjudge_reversal"
  | "anomaly_entry";

export type InspirationLockStatus =
  | "locked"
  | "soft_locked"
  | "ambiguous";

export type InspirationDiagnosis = {
  primaryBranch: InspirationBranchKey;
  secondaryBranch?: InspirationBranchKey;
  lockStatus: InspirationLockStatus;
  confidence: number;

  protagonistMode: string;
  conflictSource: string;
  episodeDrive: string;

  confirmedHooks: string[];
  candidateHooks: string[];
  rejectedHooks: string[];

  mustHave: string[];
  mustAvoid: string[];

  diagnosisText: string;
};

export type StoryIntentSummary = {
  scriptType: "short_drama" | "ai_comic";
  targetAudience?: StoryIntentChoice;
  steps: {
    audience?: StoryIntentChoice;
    topicDirection?: StoryIntentChoice;
    openingHook?: StoryIntentChoice;
    villainPreference?: StoryIntentChoice;
    paymentHook?: StoryIntentChoice;
  };
  stepSupplements: {
    audience?: string;
    topicDirection?: string;
    openingHook?: string;
    villainPreference?: string;
    paymentHook?: string;
  };
  mergedTags: StoryIntentMergedTags;
  scoreSummary: {
    totalIntentScore: number;
    weights: Record<string, number>;
  };
  userPremiseSeed: string;
  diagnosis: InspirationDiagnosis;
};

export type StoryScenarioPlan = {
  title: string;
  audiences: string[];
  genres: string[];
  coreHooks: string[];
  styleTags: string[];
  generationHints?: ScenarioGenerationHints;
  displayTagGroups?: ScenarioDisplayTagGroups;
  baseStepTags?: {
    audiences: string[];
    genres: string[];
    coreHooks: string[];
    styleTags: string[];
  };
  variantId?: ScenarioVariantId;
  variantName?: string;
  variantTags?: string[];
  scenarioTagBundle?: string[];
  targetAudience: string;
  eraBackground: string;
  genreTypes: string;
  coreSettings: string;
  coreHighlight: string;
  highlight: string;
  storyBackground: string;
  coreSetting: string;
  worldview: string;
  oneLineStory: string;
  coreSynopsis: string;
  premise: string;
  userPremise: string;
  mainlineAnchors: StoryMainlineAnchors;
  phaseStrategy: StoryPhaseStrategy;
  beatPool: string[];
  projectBrief?: ProjectBrief;
  scriptPlan: ScriptPlan;
};

export type StoryScenarioCard = {
  planName: string;
  storyTitle: string;
  synopsis: string;
  coreSynopsis: string;
  keyPoints: string[];
  plan: StoryScenarioPlan;
};

type StoryTagBucketName =
  | "audienceTags"
  | "eraTags"
  | "genreTags"
  | "coreSettingTags"
  | "emotionEngineTags"
  | "protagonistTags"
  | "antagonistTags"
  | "paymentHookTags"
  | "visualStyleTags"
  | "miscTags";

type StoryWeightedTag = {
  label: string;
  weight: number;
  bucket: StoryTagBucketName;
};

type StoryTagBuckets = Record<StoryTagBucketName, StoryWeightedTag[]>;

export type StoryMainlineAnchors = {
  protagonist: string;
  pressureSource: string;
  coreDesire: string;
  emotionalEngine: string;
  genreShell: string;
  paymentPromise: string;
};

export type StoryPhaseStrategy = {
  qi: string;
  cheng: string;
  zhuan: string;
  he: string;
  note: string;
};

type StoryIntentSummaryInput = {
  scriptType: "short_drama" | "ai_comic";
  targetAudience?: StoryIntentChoice | null;
  audience?: StoryIntentChoice | null;
  topicDirection?: StoryIntentChoice | null;
  openingHook?: StoryIntentChoice | null;
  villainPreference?: StoryIntentChoice | null;
  paymentHook?: StoryIntentChoice | null;
  paymentHookSelections?: StoryIntentChoice[];
  stepSupplements?: StoryIntentSummary["stepSupplements"];
  mergedTags: StoryIntentMergedTags;
  manualPremise?: string;
};

type StorySelection = Partial<ReturnType<typeof pickScenarioTags>>;

function compactChoiceLabel(choice?: StoryIntentChoice | null) {
  return choice?.label?.trim() || "未选择";
}

function normalizeTagText(tag: string) {
  return tag.trim().replace(/\s+/g, "");
}

function pickFirstTag(tags: StoryWeightedTag[], fallback: string) {
  return tags[0]?.label || fallback;
}

function pickTopTags(tags: StoryWeightedTag[], count: number, exclude = new Set<string>()) {
  return tags.filter((tag) => !exclude.has(tag.label)).slice(0, count);
}

function pickTailTags(tags: StoryWeightedTag[], count: number, exclude = new Set<string>()) {
  return tags
    .filter((tag) => !exclude.has(tag.label))
    .slice()
    .sort((a, b) => a.weight - b.weight || a.label.localeCompare(b.label, "zh-Hans-CN"))
    .slice(0, count);
}

function joinTags(tags: StoryWeightedTag[], fallback: string) {
  return tags.length > 0 ? tags.map((tag) => tag.label).join(" / ") : fallback;
}

function normalizeChoiceText(choice?: StoryIntentChoice | null) {
  return choice?.label?.trim() || "";
}

const BRANCH_KEYWORDS: Record<InspirationBranchKey, string[]> = {
  counter_control: ["低位反控", "权力压制", "夺回主动权", "压到低位", "反击", "反控", "羞辱", "压制", "大佬", "强者", "隐藏大佬", "落魄强者", "清醒反抗者", "复仇归来者", "专业能力", "身份揭露", "马甲掉落"],
  relation_shift: ["关系翻局", "亲密背刺", "断情自救", "背叛", "情感", "试探", "拉扯", "夫妻反目", "前任白月光", "替身关系", "仇人变爱人", "强强结盟", "双向试探"],
  misjudge_reversal: ["误判翻盘", "真相遮蔽", "证据翻盘", "误判", "舆论", "证据", "翻盘", "身份误判", "真假千金", "身份反转", "掌握证据", "真相", "马甲掉落", "身份揭露"],
  anomaly_entry: ["异象入局", "规则改写", "规则怪谈", "异常", "规则", "时间", "身份藏局", "命案开局", "阴谋开局", "重生信息差", "穿越", "系统无敌流", "异能觉醒", "升级流", "无脑流", "无敌流", "迪化流"],
};

const STEP1_BRANCH_MAP: Record<string, InspirationBranchKey> = {
  "低位反控": "counter_control",
  "关系翻局": "relation_shift",
  "误判翻盘": "misjudge_reversal",
  "异象入局": "anomaly_entry",
  "都市现代": "counter_control",
  "现代职场": "counter_control",
  "悬疑灵异": "misjudge_reversal",
  "历史古装": "relation_shift",
  "末世灾变": "anomaly_entry",
  "科幻未来": "anomaly_entry",
  "游戏竞技": "counter_control",
  "战争军事": "counter_control",
  "奇幻异界": "anomaly_entry",
  "当众羞辱": "counter_control",
  "抓奸背叛": "relation_shift",
  "身份误判": "misjudge_reversal",
  "命案开局": "anomaly_entry",
  "都市": "counter_control",
  "悬疑": "misjudge_reversal",
  "古代": "relation_shift",
  "末世": "anomaly_entry",
};

const STEP2_BRANCH_MAP: Partial<Record<string, InspirationBranchKey>> = {
  "隐忍清醒": "counter_control",
  "断情自救": "relation_shift",
  "被动察觉": "misjudge_reversal",
  "暗藏变量": "anomaly_entry",
  "男女主拉扯": "relation_shift",
  "夫妻反目": "relation_shift",
  "前任白月光": "relation_shift",
  "替身关系": "relation_shift",
  "凡人": "counter_control",
  "废材弟子": "counter_control",
  "小人物": "counter_control",
  "大男主": "counter_control",
  "大女主": "counter_control",
  "神豪": "counter_control",
  "女帝": "counter_control",
  "大反派": "counter_control",
  "圣女": "counter_control",
  "仙尊": "counter_control",
  "大师兄": "counter_control",
  "师妹": "relation_shift",
};

const STEP3_BRANCH_MAP: Partial<Record<string, InspirationBranchKey>> = {
  "权力压制": "counter_control",
  "亲密背刺": "relation_shift",
  "真相遮蔽": "misjudge_reversal",
  "规则改写": "anomaly_entry",
  "隐藏大佬": "counter_control",
  "落魄强者": "counter_control",
  "清醒反抗者": "counter_control",
  "复仇归来者": "counter_control",
  "系统无敌流": "anomaly_entry",
  "异能觉醒": "anomaly_entry",
  "身份反转": "misjudge_reversal",
  "传承觉醒": "anomaly_entry",
  "穿书": "anomaly_entry",
  "天下无敌": "counter_control",
  "灵魂互换": "misjudge_reversal",
  "人物逆袭": "counter_control",
  "赘婿": "counter_control",
};

const STEP4_BRANCH_MAP: Partial<Record<string, InspirationBranchKey>> = {
  "身份反杀": "counter_control",
  "能力碾压": "counter_control",
  "借势控局": "counter_control",
  "层层升级": "counter_control",
  "升级流": "counter_control",
  "反套路": "anomaly_entry",
  "震惊流": "misjudge_reversal",
  "强势碾压": "counter_control",
  "断爱复仇": "relation_shift",
  "强强结盟": "relation_shift",
  "追悔火葬": "relation_shift",
  "双向试探": "relation_shift",
  "证据翻盘": "misjudge_reversal",
  "身份反转": "misjudge_reversal",
  "局中有局": "misjudge_reversal",
  "舆论审判": "misjudge_reversal",
  "记忆错位": "anomaly_entry",
  "时间回环": "anomaly_entry",
  "身份藏局": "anomaly_entry",
  "规则试探": "anomaly_entry",
  "偏爽感": "counter_control",
  "偏情感": "relation_shift",
  "偏悬疑": "misjudge_reversal",
  "偏脑洞": "anomaly_entry",
  "身份揭露": "misjudge_reversal",
  "马甲掉落": "misjudge_reversal",
  "重生信息差": "misjudge_reversal",
  "穿越": "anomaly_entry",
  "无脑流": "counter_control",
  "无敌流": "counter_control",
  "迪化流": "anomaly_entry",
};

const STEP5_MUST_HAVE = new Set([
  "强爽优先",
  "情感优先",
  "悬疑优先",
  "脑洞优先",
  "女主要强",
  "现代背景",
]);

const STEP5_MUST_AVOID = new Set([
  "不要重生",
  "不要系统",
  "不要太虐",
  "不要玄幻",
  "不要末世",
  "不要宫斗",
]);

function normalizeAvoidToken(value: string): string {
  return value
    .replace(/^不要/, "")
    .replace(/^不想要/, "")
    .replace(/^避免/, "")
    .trim();
}

const MUST_AVOID_ALIASES: Record<string, string[]> = {
  重生: ["重生", "前世", "回到过去", "重来一次", "重回"],
  系统: ["系统", "绑定系统", "系统文", "任务系统", "金手指系统"],
  玄幻: ["玄幻", "奇幻", "修仙", "神魔", "法术", "灵力", "大世界观"],
  末世: ["末世", "灾变", "丧尸", "废土", "倒计时"],
  宫斗: ["宫斗", "宅斗", "后宫", "朝堂", "古代宅门"],
  太虐: ["太虐", "虐恋", "虐主", "苦情", "长期压抑", "极端伤害"],
};

function isAvoidedValue(value: string, mustAvoid: string[]): boolean {
  const normalizedValue = value.trim();
  if (!normalizedValue) return false;

  return mustAvoid.some((avoid) => {
    const key = normalizeAvoidToken(avoid);
    if (!key) return false;

    if (normalizedValue.includes(key) || key.includes(normalizedValue)) {
      return true;
    }

    const aliases = MUST_AVOID_ALIASES[key] || [];
    return aliases.some((alias) => normalizedValue.includes(alias) || alias.includes(normalizedValue));
  });
}

function filterAvoidedValues<T extends string>(values: T[], mustAvoid: string[]): T[] {
  return values.filter((value) => !isAvoidedValue(value, mustAvoid));
}

function scoreBranchKeywords(text: string, branch: InspirationBranchKey) {
  const keywords = BRANCH_KEYWORDS[branch];
  return keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? 1 : 0), 0);
}

function branchFromLabel(label?: string | null): InspirationBranchKey | null {
  const text = normalizeChoiceText(label ? { label, tags: [] } : null);
  if (!text) return null;
  if (STEP1_BRANCH_MAP[text]) return STEP1_BRANCH_MAP[text];
  if (STEP2_BRANCH_MAP[text]) return STEP2_BRANCH_MAP[text] as InspirationBranchKey;
  if (STEP3_BRANCH_MAP[text]) return STEP3_BRANCH_MAP[text] as InspirationBranchKey;
  if (STEP4_BRANCH_MAP[text]) return STEP4_BRANCH_MAP[text] as InspirationBranchKey;
  return null;
}

function buildDiagnosisSignalText(input: StoryIntentSummaryInput) {
  return [
    normalizeChoiceText(input.audience),
    normalizeChoiceText(input.topicDirection),
    normalizeChoiceText(input.openingHook),
    normalizeChoiceText(input.villainPreference),
    normalizeChoiceText(input.paymentHook),
    ...(input.paymentHookSelections ?? []).map((item) => normalizeChoiceText(item)),
    input.stepSupplements?.audience ?? "",
    input.stepSupplements?.topicDirection ?? "",
    input.stepSupplements?.openingHook ?? "",
    input.stepSupplements?.villainPreference ?? "",
    input.stepSupplements?.paymentHook ?? "",
    input.manualPremise ?? "",
    input.mergedTags.audiences.join(" / "),
    input.mergedTags.eraTags.join(" / "),
    input.mergedTags.genres.join(" / "),
    input.mergedTags.coreHooks.join(" / "),
    input.mergedTags.styleTags.join(" / "),
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildInspirationDiagnosis(input: StoryIntentSummaryInput): InspirationDiagnosis {
  const stepLabels = {
    audience: normalizeChoiceText(input.audience),
    topicDirection: normalizeChoiceText(input.topicDirection),
    openingHook: normalizeChoiceText(input.openingHook),
    villainPreference: normalizeChoiceText(input.villainPreference),
    paymentHook: normalizeChoiceText(input.paymentHook),
  };
  const paymentSelections = input.paymentHookSelections ?? (input.paymentHook ? [input.paymentHook] : []);
  const boundaryPaymentSelections = paymentSelections.filter((item) => !item.tags.includes("step5-era"));
  const selectedPaymentLabels = boundaryPaymentSelections.map((item) => normalizeChoiceText(item)).filter(Boolean);
  const positivePaymentLabel =
    selectedPaymentLabels.find((label) => STEP5_MUST_HAVE.has(label)) ||
    (stepLabels.paymentHook && !STEP5_MUST_AVOID.has(stepLabels.paymentHook) ? stepLabels.paymentHook : "") ||
    input.stepSupplements?.paymentHook?.trim() ||
    "待定";
  const signalText = buildDiagnosisSignalText(input);
  const scores: Record<InspirationBranchKey, number> = {
    counter_control: 0,
    relation_shift: 0,
    misjudge_reversal: 0,
    anomaly_entry: 0,
  };

  const addScore = (branch: InspirationBranchKey, value: number) => {
    scores[branch] += value;
  };

  const step1Branch = branchFromLabel(stepLabels.audience);
  // 第 1 步只做主方向探测，不应压过第 2/3 步的稳定确认。
  if (step1Branch) addScore(step1Branch, 2);

  const step2Branch = branchFromLabel(stepLabels.topicDirection);
  if (step2Branch) addScore(step2Branch, 3);

  const step3Branch = branchFromLabel(stepLabels.openingHook);
  if (step3Branch) addScore(step3Branch, 3);

  const step4Branch = branchFromLabel(stepLabels.villainPreference);
  if (step4Branch) addScore(step4Branch, 3);

  for (const label of Object.values(stepLabels)) {
    if (!label) continue;
    for (const branch of Object.keys(BRANCH_KEYWORDS) as InspirationBranchKey[]) {
      addScore(branch, scoreBranchKeywords(label, branch));
    }
  }
  for (const label of selectedPaymentLabels) {
    for (const branch of Object.keys(BRANCH_KEYWORDS) as InspirationBranchKey[]) {
      addScore(branch, Math.max(0, scoreBranchKeywords(label, branch) - 1));
    }
  }

  const stepSupplementText = [
    input.stepSupplements?.audience,
    input.stepSupplements?.topicDirection,
    input.stepSupplements?.openingHook,
    input.stepSupplements?.villainPreference,
    input.stepSupplements?.paymentHook,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");

  if (stepSupplementText) {
    for (const branch of Object.keys(BRANCH_KEYWORDS) as InspirationBranchKey[]) {
      addScore(branch, Math.min(2, scoreBranchKeywords(stepSupplementText, branch)));
    }
  }

  if (input.manualPremise) {
    for (const branch of Object.keys(BRANCH_KEYWORDS) as InspirationBranchKey[]) {
      addScore(branch, Math.min(1, scoreBranchKeywords(input.manualPremise || "", branch)));
    }
  }

  const stepBranchVotes = [step1Branch, step2Branch, step3Branch].filter(Boolean) as InspirationBranchKey[];
  const voteCounts = new Map<InspirationBranchKey, number>();
  for (const branch of stepBranchVotes) {
    voteCounts.set(branch, (voteCounts.get(branch) ?? 0) + 1);
  }
  const bestVoteBranch = Array.from(voteCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hans-CN"))[0];
  const directBranch = bestVoteBranch && bestVoteBranch[1] >= 2 ? bestVoteBranch[0] : undefined;
  const orderedBranches = (Object.keys(scores) as InspirationBranchKey[])
    .sort((a, b) => scores[b] - scores[a] || a.localeCompare(b, "zh-Hans-CN"));
  const primaryBranch = directBranch ?? orderedBranches[0];
  const secondaryBranch = orderedBranches[1];
  const topScore = scores[primaryBranch];
  const secondScore = scores[secondaryBranch];
  const hasThreeWaySplit = new Set(stepBranchVotes).size >= 3;

  let lockStatus: InspirationLockStatus = "ambiguous";
  if (directBranch) {
    lockStatus = bestVoteBranch?.[1] && bestVoteBranch[1] >= 3 ? "locked" : "soft_locked";
  } else if (!hasThreeWaySplit && topScore >= 6 && topScore - secondScore >= 2) {
    lockStatus = "locked";
  } else if (topScore >= 4) {
    lockStatus = "soft_locked";
  }
  if (hasThreeWaySplit && !directBranch) {
    lockStatus = "ambiguous";
  }

  const confirmedHooks: string[] = [];
  const candidateHooks: string[] = [];
  const rejectedHooks: string[] = [];
  const mustHave = new Set<string>();
  const mustAvoid = new Set<string>();

  const branchHookMap: Record<InspirationBranchKey, { confirmed: string[]; candidates: string[] }> = {
    counter_control: {
      confirmed: ["隐藏大佬", "落魄强者", "清醒反抗者"],
      candidates: ["身份揭露", "马甲掉落", "专业能力"],
    },
    relation_shift: {
      confirmed: ["男女主拉扯", "夫妻反目", "前任白月光"],
      candidates: ["替身关系", "仇人变爱人", "强强结盟"],
    },
    misjudge_reversal: {
      confirmed: ["身份误判", "真假千金", "证据翻盘"],
      candidates: ["身份反转", "局中有局", "舆论审判"],
    },
    anomaly_entry: {
      confirmed: ["规则怪谈", "命案开局", "阴谋开局"],
      candidates: ["规则试探", "规则漏洞", "穿书"],
    },
  };

  const branchBundle = branchHookMap[primaryBranch];
  confirmedHooks.push(...branchBundle.confirmed.filter((item) => item !== stepLabels.audience && item !== stepLabels.topicDirection));
  candidateHooks.push(...branchBundle.candidates);

  if (secondaryBranch && secondaryBranch !== primaryBranch) {
    candidateHooks.push(...branchHookMap[secondaryBranch].confirmed.slice(0, 2));
  }

  if (stepLabels.villainPreference) {
    confirmedHooks.push(stepLabels.villainPreference);
  }
  if (stepLabels.paymentHook) {
    candidateHooks.push(stepLabels.paymentHook);
  }

  if (stepSupplementText) {
    if (/不要|拒绝|排除|避开/.test(stepSupplementText)) {
      rejectedHooks.push(stepSupplementText);
    } else {
      candidateHooks.push(stepSupplementText);
    }
  }

  for (const label of selectedPaymentLabels) {
    if (STEP5_MUST_HAVE.has(label)) mustHave.add(label);
    if (STEP5_MUST_AVOID.has(label)) mustAvoid.add(label);
    if (STEP5_MUST_AVOID.has(label)) {
      rejectedHooks.push(label);
    } else if (STEP5_MUST_HAVE.has(label)) {
      confirmedHooks.push(label);
    }
  }

  for (const label of selectedPaymentLabels) {
    if (/不要/.test(label)) {
      mustAvoid.add(label);
    } else {
      mustHave.add(label);
    }
  }

  const unique = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
  const mustAvoidList = Array.from(mustAvoid);
  const finalConfirmed = unique(confirmedHooks).filter((item) => !isAvoidedValue(item, mustAvoidList));
  const finalCandidates = unique(candidateHooks).filter((item) => !isAvoidedValue(item, mustAvoidList) && !finalConfirmed.includes(item));
  const finalRejected = unique(rejectedHooks).filter(Boolean);

  const diagnosisText = [
    `主方向：${primaryBranch}`,
    secondaryBranch ? `次方向：${secondaryBranch}` : "",
    `锁定状态：${lockStatus}`,
    `主角姿态：${stepLabels.openingHook || stepLabels.topicDirection || "待定"}`,
    `冲突来源：${stepLabels.villainPreference || stepLabels.topicDirection || "待定"}`,
    `推进动力：${positivePaymentLabel}`,
    mustHave.size > 0 ? `mustHave：${Array.from(mustHave).join(" / ")}` : "",
    mustAvoid.size > 0 ? `mustAvoid：${Array.from(mustAvoid).join(" / ")}` : "",
  ]
    .filter(Boolean)
    .join("｜");

  const branchConfidence = Math.min(100, Math.round((topScore * 12) + (lockStatus === "locked" ? 12 : lockStatus === "soft_locked" ? 6 : 0)));

  return {
    primaryBranch,
    secondaryBranch: secondaryBranch !== primaryBranch ? secondaryBranch : undefined,
    lockStatus,
    confidence: branchConfidence,
    protagonistMode: stepLabels.openingHook || "待定",
    conflictSource: stepLabels.villainPreference || stepLabels.topicDirection || "待定",
    episodeDrive: positivePaymentLabel,
    confirmedHooks: finalConfirmed,
    candidateHooks: finalCandidates,
    rejectedHooks: finalRejected,
    mustHave: Array.from(mustHave),
    mustAvoid: mustAvoidList,
    diagnosisText,
  };
}

function hasExplicitRuleWeirdGenre(summary: StoryIntentSummary, selection?: StorySelection) {
  const labels = [
    selection?.genre?.label,
    summary.steps.audience?.label,
    ...summary.mergedTags.genres,
    ...summary.diagnosis.mustHave,
    summary.stepSupplements.paymentHook,
    summary.userPremiseSeed,
  ].filter(Boolean) as string[];

  return labels.some((label) => /规则怪谈|诡秘|怪谈/.test(label));
}

function isRuleWeirdProject(summary: StoryIntentSummary, selection?: StorySelection) {
  return hasExplicitRuleWeirdGenre(summary, selection);
}

function buildRuleWeirdScenarioText(
  scriptType: "short_drama" | "ai_comic",
  archetype: "commercial" | "character" | "differentiated",
) {
  const worldview =
    scriptType === "ai_comic"
      ? "规则怪谈世界里，身份、资源和生存机会都被可验证的异常规则重新分配；每次突破都会引来更高层级审查、规则反噬和身份暴露风险。"
      : "近现实都市空间被异常规则覆盖，角色必须遵守看似荒诞但可验证的规则；违规会触发身份、证据或人身代价，规则解释权被对手利用。";
  const highlight =
    scriptType === "ai_comic"
      ? "规则禁忌、违规代价和规则漏洞构成机制爽点，能力爆发与公开反转不断制造追更动力。"
      : "规则禁忌、违规代价、身份误判和证据反转共同推动公开反击。";
  const synopsis =
    scriptType === "ai_comic"
      ? "凡人主角在规则怪谈世界中意外获得规则破解机制，可以在违规边缘解析隐藏规则并获得能力提升。但每次突破都会引来更高层级规则审查、身份暴露和规则反噬风险。主角从一次被误判的违规事件开始，沿着自证、反击、升级、揭开规则操纵者的路径推进，并用规则变化、能力爆发和公开反转制造连续追更钩子。"
      : archetype === "commercial"
        ? "主角在规则误判中被迫站到众人对立面，必须先完成自证再寻找反击入口。主角表面退让，实际目标是查清真相并夺回主动权，并准备借规则漏洞一步步反击。第一次公开反击后，更大的幕后压力被推到台前，为下一阶段反转留下追更钩子。"
        : archetype === "character"
          ? "主角在规则判定里遭遇身份和关系双重误判，只能靠试错摸清禁忌。主角表面退让，实际目标是守住关键关系并查清真相，并在规则漏洞被看见后完成第一次公开反击，为下一阶段反转留下追更钩子。"
          : "主角先在异常规则里看见秩序被篡改，再顺着规则漏洞、证据漏洞和解释权漏洞把局面翻转。主角表面退让，实际目标是查清真相并夺回主动权，第一次公开反击后把更大的幕后压力推到台前。";

  return { worldview, highlight, synopsis };
}

function createTagBuckets(summary: StoryIntentSummary): StoryTagBuckets {
  const weights = summary.scoreSummary.weights;
  const labels = new Set<string>([
    ...Object.keys(weights),
    ...summary.mergedTags.audiences,
    ...summary.mergedTags.eraTags,
    ...summary.mergedTags.genres,
    ...summary.mergedTags.coreHooks,
    ...summary.mergedTags.styleTags,
  ].map(normalizeTagText).filter(Boolean));

  const emptyBuckets: StoryTagBuckets = {
    audienceTags: [],
    eraTags: [],
    genreTags: [],
    coreSettingTags: [],
    emotionEngineTags: [],
    protagonistTags: [],
    antagonistTags: [],
    paymentHookTags: [],
    visualStyleTags: [],
    miscTags: [],
  };

  const includesAny = (label: string, keywords: string[]) => keywords.some((keyword) => label.includes(keyword));
  const classify = (label: string): StoryTagBucketName => {
    if (summary.scriptType === "ai_comic" && label.includes("银发")) {
      return "miscTags";
    }

    if (includesAny(label, ["男频", "女频", "银发"])) return "audienceTags";
    if (includesAny(label, ["现代", "都市", "古代", "未来", "末世", "玄幻", "仙侠", "规则怪谈", "赛博", "民国", "校园", "职场", "乡村", "江湖"])) return "eraTags";
    if (includesAny(label, ["战神", "豪门", "悬疑", "规则怪谈", "修仙", "末世", "系统", "重生", "赘婿", "神豪", "甜宠", "虐恋", "权谋", "科幻", "奇幻", "宫斗"])) return "genreTags";
    if (includesAny(label, ["马甲", "隐藏身份", "系统", "重生", "赘婿", "神豪", "传承", "觉醒", "血脉", "替身", "穿书", "双身份", "契约婚姻"])) return "coreSettingTags";
    if (includesAny(label, ["打脸虐渣", "反转驱动", "情绪驱动", "强势碾压", "悬疑压迫", "压迫反杀", "步步紧逼", "爽感", "情绪拉扯", "翻车"])) return "emotionEngineTags";
    if (includesAny(label, ["小人物", "强者回归", "身份特殊", "失去一切后夺回", "改写命运", "逆袭", "弃子", "归来", "隐藏大佬", "落难"])) return "protagonistTags";
    if (includesAny(label, ["上位者打压", "规则压迫", "伪善者", "豪门亲族", "真凶", "打压", "审判", "恶人", "权威", "控制"])) return "antagonistTags";
    if (includesAny(label, ["身份公开", "实力暴露", "真相揭开", "关系选择", "灾变降临", "秘密曝光", "翻盘", "反转曝光", "复仇成功"])) return "paymentHookTags";
    if (includesAny(label, ["特效", "诡秘", "强冲突", "大场面", "情绪拉扯", "视觉冲击", "规则感", "镜头感", "压迫感"])) return "visualStyleTags";
    return "miscTags";
  };

  for (const label of labels) {
    const cleanLabel = normalizeTagText(label);
    if (!cleanLabel) continue;
    const bucket = classify(cleanLabel);
    emptyBuckets[bucket].push({
      label: cleanLabel,
      weight: weights[cleanLabel] ?? weights[label] ?? 0,
      bucket,
    });
  }

  for (const bucket of Object.values(emptyBuckets)) {
    bucket.sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label, "zh-Hans-CN"));
  }

  return emptyBuckets;
}

function pickScenarioTags(
  buckets: StoryTagBuckets,
  exclude: Set<string>,
  options: {
    audience?: "top" | "tail";
    era?: "top" | "tail";
    genre?: "top" | "tail";
    coreSetting?: "top" | "tail";
    emotion?: "top" | "tail";
    protagonist?: "top" | "tail";
    antagonist?: "top" | "tail";
    payment?: "top" | "tail";
    visual?: "top" | "tail";
    misc?: "top" | "tail";
  },
) {
  const take = (bucket: StoryTagBucketName, mode: "top" | "tail" = "top") => {
    const source = mode === "tail" ? pickTailTags(buckets[bucket], 1, exclude) : pickTopTags(buckets[bucket], 1, exclude);
    const tag = source[0];
    if (tag) exclude.add(tag.label);
    return tag;
  };

  return {
    audience: take("audienceTags", options.audience),
    era: take("eraTags", options.era),
    genre: take("genreTags", options.genre),
    coreSetting: take("coreSettingTags", options.coreSetting),
    emotion: take("emotionEngineTags", options.emotion),
    protagonist: take("protagonistTags", options.protagonist),
    antagonist: take("antagonistTags", options.antagonist),
    payment: take("paymentHookTags", options.payment),
    visual: take("visualStyleTags", options.visual),
    misc: take("miscTags", options.misc),
  };
}

function formatSceneTags(tags: Array<StoryWeightedTag | undefined>, fallback: string) {
  return tags.filter(Boolean).map((tag) => tag!.label).join(" / ") || fallback;
}

function buildPhaseStrategy(
  scriptType: "short_drama" | "ai_comic",
  title: string,
  selection: StorySelection,
  beatPool: string[],
  archetype: "commercial" | "character" | "differentiated",
  isRuleWeird = false,
): StoryPhaseStrategy {
  const opening = selection.era?.label || selection.visual?.label || title;
  const pressure = selection.antagonist?.label || selection.coreSetting?.label || "规则压力";
  const turn = selection.payment?.label || selection.coreSetting?.label || "真相揭开";
  const ending = selection.protagonist?.label || selection.misc?.label || "主角完成兑现";

  return {
    qi:
      scriptType === "short_drama"
        ? `起：以${opening}迅速把主角推到压迫中心，用第一爽点和明确冲突抓住观众。`
        : `起：以${opening}先建立视觉或设定抓手，再把主角推入失控局面。`,
    cheng:
      isRuleWeird
        ? "承：围绕规则解释权和违规代价持续加压，让主角在每一次试错里确认规则边界。"
        : archetype === "commercial"
        ? `承：围绕${pressure}持续加压，让误判、翻车和反击连续发生，保持高商业密度。`
        : archetype === "character"
          ? `承：围绕${selection.protagonist?.label || "主角"}的身份压力、误判与隐藏动机推进关系拉扯。`
          : `承：围绕${selection.genre?.label || "题材壳"}和${selection.visual?.label || "视觉设定"}不断扩展差异化信息。`,
    zhuan:
      isRuleWeird
        ? "转：让主角发现规则漏洞，开始反向利用规则和证据翻盘。"
        : archetype === "commercial"
        ? `转：让${turn}变成主线锚点，通过身份公开、证据翻转或阵营变化把追更推高。`
        : archetype === "character"
          ? `转：让${selection.antagonist?.label || "对手"}升级压迫，再用${turn}把主角的隐藏价值翻出来。`
          : `转：让${selection.payment?.label || "核心钩子"}把规则、设定或世界秘密推到前台，形成记忆点。`,
    he:
      isRuleWeird
        ? "合：把规则真相、身份暴露和违规代价一起收口，让主角完成规则反杀。"
        : archetype === "commercial"
        ? `合：用${ending}完成清算，把追更承诺兑现到身份公开、实力暴露或最终翻盘。`
        : archetype === "character"
          ? `合：把人物关系和情绪落点收住，让主角从失去中夺回位置并完成价值证明。`
          : `合：把低频高记忆点的设定兑现成最终爆点，让差异化不是噱头而是完整回收。`,
    note:
      isRuleWeird
        ? `${beatPool.join(" / ")}。规则怪谈要先立规则文本，再逐步揭示禁忌、违规代价和规则解释权，不要直接把它写成普通刑侦。`
        : `${beatPool.join(" / ")}。五步选择只是创作偏好，不是每集固定结构；后续分集要做阶段变奏，避免全程围绕同一动作重复。`,
  };
}

function buildBeatPool(
  summary: StoryIntentSummary,
  selection: StorySelection,
  archetype: "commercial" | "character" | "differentiated",
  hints: StoryIntentHints,
  isRuleWeird = false,
) {
  if (isRuleWeird) {
    return [
      "规则公布卡：先把显性规则立住，让观众知道什么能做、什么不能做。",
      "违规代价卡：用一次违规代价确认规则边界，让危险变得可验证。",
      "解释权争夺卡：对手利用规则解释权和证据解释权压迫主角。",
      "漏洞发现卡：主角通过观察和试错找到规则文字里的漏洞。",
      "自证翻盘卡：主角在规则限制下自证，并反向利用规则反击。",
      "下一条规则卡：抛出新规则、新禁忌或身份暴露，留住追更。",
    ].map((item, index) => `${index + 1}. ${item}`);
  }

  const pools =
    archetype === "commercial"
      ? [
          `压迫开局卡：把主角推到${hints.openingMood}里，迅速打出第一波张力。`,
          `身份悬念卡：先遮住关键能力或身份，再逐步揭开。`,
          `证据反转卡：用证据链翻盘，把爽点前置。`,
          `关系选择卡：让关键关系在信任和利益之间做选择。`,
          `公开打脸卡：身份或实力公开后完成正向清算。`,
          `断点钩子卡：把身份、证据或关系悬念留到下一段。`,
        ]
      : archetype === "character"
        ? [
            `处境压迫卡：把主角的现实困局先压到极致。`,
            `隐藏身份卡：让关键能力或身份在误判中维持悬念。`,
            `失去夺回卡：主角先失去，再在情绪节点夺回。`,
            `立场翻转卡：让对手背后的真实动机被揭开。`,
            `情绪爆发卡：在人物压力最高的位置打出高光。`,
            `关系破局卡：把关系选择变成真正的价值选择。`,
          ]
        : [
            `规则怪谈卡：先把世界规则立住，再逐步翻开异常。`,
            `设定揭示卡：把高概念设定慢慢翻开。`,
            `低频高记忆点卡：用稀有组合建立差异化。`,
            `转折降临卡：让身份或世界层面的变化成为关键节点。`,
            `认知反转卡：让观众先相信错误答案，再被推翻。`,
            `视觉奇观卡：用可视化冲击制造记忆点。`,
          ];

  return pools.map((item, index) => `${index + 1}. ${item}`);
}

function buildScenarioProjectBrief(
  summary: StoryIntentSummary,
  selection: StorySelection,
  mainlineAnchors: StoryMainlineAnchors,
  archetype: "commercial" | "character" | "differentiated",
  isRuleWeird = false,
): ProjectBrief {
  const step0AudienceLabel = summary.steps.audience?.label || "";
  const selectionAudienceLabel = selection.audience?.label || "";
  const resolveAudienceType = (label: string): ProjectBrief["audienceType"] | null =>
    label.includes("男频")
      ? "male"
      : label.includes("女频")
        ? "female"
        : null;
  const audienceType =
    resolveAudienceType(step0AudienceLabel) ??
    resolveAudienceType(selectionAudienceLabel) ??
    "general";
  const productionConstraint: ProjectBrief["productionConstraint"] =
    summary.scriptType === "ai_comic" ? "visual_ai_comic" : "low_cost_live";
  const genres = filterAvoidedValues(
    selection.genre ? [selection.genre.label] : summary.mergedTags.genres,
    summary.diagnosis.mustAvoid,
  );
  const selectedHooks = filterAvoidedValues(
    [
      summary.steps.topicDirection?.label,
      summary.steps.openingHook?.label,
      summary.steps.villainPreference?.label,
      summary.steps.paymentHook?.label,
      ...summary.mergedTags.coreHooks,
    ].filter(Boolean) as string[],
    summary.diagnosis.mustAvoid,
  );
  const coreHooks =
    isRuleWeird
      ? ["规则文本", "违规代价", "规则解释权", "规则漏洞"]
      : selectedHooks.length > 0
        ? selectedHooks.slice(0, 4)
        : archetype === "commercial"
          ? ["身份悬念", "关系牵引", "利益翻盘", "情绪回弹"]
          : archetype === "character"
            ? ["人物反差", "关系拉扯", "身份压力", "情绪回弹"]
            : ["高概念设定", "规则揭示", "视觉冲击", "身份悬念"];
  const styleTags = filterAvoidedValues(
    summary.mergedTags.styleTags,
    summary.diagnosis.mustAvoid,
  );

  return {
    scriptType: summary.scriptType,
    audienceType,
    genres,
    coreHooks,
    styleTags,
    userPremise: summary.userPremiseSeed,
    episodeCount: summary.scriptType === "ai_comic" ? 36 : 60,
    episodeDuration: summary.scriptType === "ai_comic" ? "3-5min" : "1-2min",
    targetWordsPerEpisode: summary.scriptType === "ai_comic" ? 600 : 450,
    mainCharactersLimit: archetype === "differentiated" ? 5 : summary.scriptType === "ai_comic" ? 4 : 3,
    sceneLimitPerEpisode: summary.scriptType === "ai_comic" ? 8 : 5,
    coreEmotion:
      isRuleWeird
        ? "规则压迫与反杀爽感"
        : archetype === "commercial"
        ? "爽点连续性和关系牵引"
        : archetype === "character"
          ? "人物反差和情绪回弹"
          : "设定记忆点和视觉冲击",
    productionConstraint,
    complexityLevel: archetype === "differentiated" ? "advanced" : "standard",
  };
}

function buildDifferentiatedStoryTitle(
  scriptType: "short_drama" | "ai_comic",
  selection: StorySelection,
) {
  if (scriptType === "ai_comic") {
    return selection.genre?.label || selection.era?.label || "高设定款";
  }

  return selection.era?.label || selection.genre?.label || "现实切口款";
}

const VALID_AUDIENCE_LABELS = new Set([
  "男频",
  "女频",
  "银发",
  "男频倾向",
  "女频倾向",
  "泛短剧受众",
  "大众短剧受众",
]);

const VALID_ERA_HINTS: Array<[RegExp, string]> = [
  [/规则怪谈|诡秘|怪谈/, "规则怪谈世界"],
  [/末世|灾变|废土/, "末世废土"],
  [/玄幻|修仙|仙侠/, "玄幻世界"],
  [/古代|宫廷|宫斗/, "古代"],
  [/职场|办公室|公司/, "职场"],
  [/豪门|家族|商战/, "豪门"],
  [/校园|学园/, "校园"],
];

const VALID_GENRE_HINTS: Array<[RegExp, string]> = [
  [/规则怪谈|诡秘|怪谈/, "规则怪谈"],
  [/末世|灾变|废土/, "末世"],
  [/玄幻|修仙|仙侠/, "玄幻"],
  [/古装|宫廷|宅斗|权谋|民国|年代|古代/, "古装"],
  [/乡村/, "乡村"],
  [/校园/, "校园"],
  [/都市|现代|现实/, "都市"],
  [/豪门|家族|商战/, "豪门"],
  [/职场|办公室|公司/, "职场"],
  [/战神|武力|碾压/, "战神"],
  [/复仇|翻盘|反杀/, "复仇"],
  [/甜宠|恋爱|婚恋/, "甜宠"],
  [/情感|拉扯|虐恋/, "情感"],
  [/系统|穿书|重生/, "系统"],
];

const SHORT_DRAMA_GENRE_BUCKETS = new Set([
  "战神",
  "爱情",
  "仙侠",
  "推理",
  "宅斗",
  "玄幻",
  "言情",
  "末世",
  "恐怖",
  "青春",
  "奇幻",
  "剧情",
  "修仙",
  "鉴宝",
  "喜剧",
  "脑洞",
  "权谋",
  "悬疑",
  "宫斗",
  "科幻",
  "动作",
  "抗战",
  "刑侦",
  "高武",
  "志怪",
  "谍战",
  "犯罪",
  "商战",
  "武侠",
  "求生",
  "法律",
  "灵异",
  "传奇",
]);

/** 真人短剧合法题材标签全集 = BUCKETS ∪ LIVE_ACTION_PRESET.genres 扁平化 */
const LIVE_ACTION_VALID_GENRE_LABELS = new Set([
  ...SHORT_DRAMA_GENRE_BUCKETS,
  ...LIVE_ACTION_PRESET.genres.flatMap((cat) => cat.groups.flatMap((g) => g.tags)),
]);

export function isValidShortDramaGenreLabel(label: string | undefined) {
  return Boolean(label && LIVE_ACTION_VALID_GENRE_LABELS.has(label.trim()));
}

const LIVE_ACTION_BACKGROUND_GENRE_LABELS = new Set([
  "现代",
  "现代都市",
  "职场现代",
  "豪门现代",
  "荒岛",
  "古代",
  "架空古代",
  "80年代",
  // 以下标签同时存在于 LIVE_ACTION_PRESET.genres，是合法题材，不再作为 background 排除：
  // "都市", "职场", "校园", "宫廷", "民国", "年代", "乡村"
]);

function hasValidAudienceLabel(label?: string) {
  return Boolean(label && VALID_AUDIENCE_LABELS.has(label));
}

function removeLiveActionBackgroundLabelsFromGenres(labels: string[]) {
  return Array.from(new Set(
    labels
      .map((label) => label.trim())
      .filter(Boolean)
      .filter((label) => !LIVE_ACTION_BACKGROUND_GENRE_LABELS.has(label))
      .filter((label) => LIVE_ACTION_VALID_GENRE_LABELS.has(label)),
  ));
}

function deriveAudienceLabel(summary: StoryIntentSummary, selection: StorySelection) {
  const explicitFromTargetAudience = summary.targetAudience?.label?.trim();
  if (hasValidAudienceLabel(explicitFromTargetAudience)) {
    return explicitFromTargetAudience!;
  }

  const explicitFromStep0 = summary.steps.audience?.label?.trim();
  if (hasValidAudienceLabel(explicitFromStep0)) {
    return explicitFromStep0!;
  }

  const explicit = selection.audience?.label?.trim();
  if (hasValidAudienceLabel(explicit)) {
    return explicit!;
  }

  const mergedAudience = summary.mergedTags.audiences.find((label) => hasValidAudienceLabel(label));
  if (mergedAudience) {
    return mergedAudience;
  }

  return summary.scriptType === "short_drama" ? "短剧受众" : "AI漫剧受众";
}

function deriveEraBackground(
  summary: StoryIntentSummary,
  selection: StorySelection,
  archetype: "commercial" | "character" | "differentiated",
  isRuleWeird = false,
) {
  const explicit = selection.era?.label?.trim();
  if (explicit && !isAvoidedValue(explicit, summary.diagnosis.mustAvoid)) {
    return explicit;
  }

  const explicitEraTag = summary.mergedTags.eraTags.find((label) => !isAvoidedValue(label, summary.diagnosis.mustAvoid));
  if (explicitEraTag) {
    return explicitEraTag;
  }

  if (isRuleWeird) {
    return summary.scriptType === "ai_comic" ? "规则怪谈世界" : "异常规则都市空间";
  }

  const sourceLabels = filterAvoidedValues([
    selection.genre?.label,
    ...summary.mergedTags.eraTags,
    ...summary.mergedTags.genres,
    selection.coreSetting?.label,
    selection.visual?.label,
  ].filter(Boolean) as string[], summary.diagnosis.mustAvoid);

  for (const label of sourceLabels) {
    for (const [pattern, mapped] of VALID_ERA_HINTS) {
      if (pattern.test(label)) {
        return mapped;
      }
    }
  }

  // 真人短剧暂未选择时代时，最后才回退到现代都市；第 5 步 era 标签会优先覆盖这里。
  return summary.scriptType === "ai_comic"
    ? archetype === "differentiated"
      ? "高设定世界"
      : "现代都市"
    : "现代都市";
}

function deriveGenreTypes(
  summary: StoryIntentSummary,
  selection: StorySelection,
  eraBackground: string,
  isRuleWeird = false,
) {
  if (isRuleWeird && hasExplicitRuleWeirdGenre(summary, selection)) {
    return "规则怪谈";
  }

  const explicit = selection.genre?.label?.trim();
  const filteredMergedGenres = removeLiveActionBackgroundLabelsFromGenres(
    filterAvoidedValues(summary.mergedTags.genres, summary.diagnosis.mustAvoid),
  );
  const filteredExplicit = removeLiveActionBackgroundLabelsFromGenres(
    explicit && !isAvoidedValue(explicit, summary.diagnosis.mustAvoid)
      ? [explicit]
      : [],
  );

  if (summary.scriptType === "short_drama") {
    if (filteredExplicit[0]) {
      return filteredExplicit[0];
    }

    if (filteredMergedGenres[0]) {
      return filteredMergedGenres[0];
    }

    return "";
  }

  const mergedGenres = filterAvoidedValues(summary.mergedTags.genres, summary.diagnosis.mustAvoid);
  const mergedGenre = mergedGenres[0];
  if (mergedGenre) {
    return mergedGenre;
  }

  if (explicit && !isAvoidedValue(explicit, summary.diagnosis.mustAvoid)) {
    return explicit;
  }

  const hintLabels = filterAvoidedValues(
    summary.scriptType === "ai_comic"
      ? [
          summary.steps.audience?.label,
          selection.genre?.label,
          ...summary.mergedTags.genres,
        ].filter(Boolean) as string[]
      : [
          selection.coreSetting?.label,
          selection.protagonist?.label,
          selection.antagonist?.label,
          ...summary.mergedTags.genres,
          ...summary.mergedTags.coreHooks,
          ...summary.mergedTags.styleTags,
        ].filter(Boolean) as string[],
    summary.diagnosis.mustAvoid,
  );

  for (const label of hintLabels) {
    for (const [pattern, mapped] of VALID_GENRE_HINTS) {
      if (pattern.test(label)) {
        return mapped;
      }
    }
  }

  return summary.scriptType === "ai_comic" ? "玄幻" : "都市";
}

function deriveCoreSettingLabel(
  summary: StoryIntentSummary,
  selection: StorySelection,
  archetype: "commercial" | "character" | "differentiated",
  eraBackground: string,
  genreTypes: string,
  isRuleWeird = false,
) {
  if (isRuleWeird) {
    return "规则文本";
  }
  const explicit = selection.coreSetting?.label?.trim();
  if (explicit && !isAvoidedValue(explicit, summary.diagnosis.mustAvoid)) {
    return explicit;
  }

  const sourceLabels = filterAvoidedValues([
    selection.payment?.label,
    selection.protagonist?.label,
    selection.antagonist?.label,
    selection.emotion?.label,
    ...summary.mergedTags.coreHooks,
  ].filter(Boolean) as string[], summary.diagnosis.mustAvoid);

  for (const label of sourceLabels) {
    if (/隐藏身份|马甲|身份误判/.test(label)) return "隐藏身份";
    if (/规则怪谈|规则/.test(label)) return "规则重置";
    if (/灾变|倒计时|末世/.test(label)) return "灾变倒计时";
    if (/女帝/.test(label)) return "女帝落难";
    if (/禁地/.test(label)) return "禁地奇遇";
    if (/系统/.test(label)) return "系统";
    if (/重生/.test(label)) return "重生";
    if (/传承|觉醒/.test(label)) return "传承觉醒";
    if (/失去一切|夺回|反杀/.test(label)) return "失去后夺回";
  }

  if (archetype === "differentiated") {
    if (eraBackground === "末世废土") return "规则被篡改";
    if (genreTypes === "规则怪谈") return "规则被篡改";
    if (summary.scriptType === "ai_comic") return "规则重置";
    return "规则重置";
  }

  if (archetype === "character") {
    return summary.scriptType === "ai_comic" ? "隐藏身份" : "身份误判";
  }

  return summary.scriptType === "ai_comic" ? "隐藏身份" : "马甲";
}

const INTERNAL_DISPLAY_PHRASES = [
  "商业稳态款",
  "强人设反差款",
  "脑洞差异化款",
  "本变体",
  "这个变体",
  "变体",
  "方案类型",
  "方案增强",
  "设定记忆点",
  "规则兑现",
  "稳态钩子",
  "商业节奏",
  "角色聚焦",
  "差异化记忆点",
  "现实切口",
  "高概念设定",
  "高概念差异",
  "稳定爆款",
  "稳定爽点",
  "人物反差",
  "规则反转",
  "AI 漫剧强调视觉冲击、设定展开和镜头感",
  "真人短剧强调现实冲突、人物关系和低成本落地",
  "男女主拉扯持续拉扯",
  "男女主拉扯形成持续拉扯",
];

function containsInternalDisplayPhrase(text: string) {
  return INTERNAL_DISPLAY_PHRASES.some((phrase) => text.includes(phrase));
}

const BANNED_VISIBLE_TOKENS = [
  "商业稳态款",
  "强人设反差款",
  "脑洞差异化款",
  "爆款稳态款",
  "本变体",
  "这个变体",
  "方案类型",
  "方案增强",
  "稳定爽点",
  "人物反差",
  "设定记忆点",
  "规则兑现",
  "商业节奏",
  "稳态钩子",
  "角色聚焦",
  "高概念设定",
  "差异化记忆点",
  "高概念",
  "前台",
];

function cleanVisibleDisplayText(value: string) {
  const normalized = value
    .replace(/男女主拉扯持续拉扯/g, "男女主拉扯持续升级")
    .replace(/男女主拉扯形成持续拉扯/g, "男女主拉扯形成持续误判")
    .replace(/替身关系持续拉扯/g, "替身关系持续误判")
    .replace(/([^，。；\s]+)形成持续拉扯/g, "$1形成持续关系压力")
    .replace(/AI 漫剧强调视觉冲击、设定展开和镜头感。?/g, "")
    .replace(/真人短剧强调现实冲突、人物关系和低成本落地。?/g, "")
    .replace(/｜稳定爽点|｜人物反差|｜设定记忆点/g, "")
    .replace(/本变体更强调[^。]*。?/g, "")
    .replace(/这个变体主打[^，。；]*[，。；]?/g, "")
    .replace(/商业稳态款强调[^。]*。?/g, "")
    .replace(/强人设反差款强调[^。]*。?/g, "")
    .replace(/脑洞差异化款强调[^。]*。?/g, "")
    .replace(/商业稳态款/g, "")
    .replace(/强人设反差款/g, "")
    .replace(/脑洞差异化款/g, "")
    .replace(/爆款稳态款/g, "")
    .replace(/本变体/g, "")
    .replace(/这个变体/g, "")
    .replace(/方案类型/g, "")
    .replace(/方案增强/g, "")
    .replace(/稳定爽点/g, "")
    .replace(/人物反差/g, "")
    .replace(/设定记忆点/g, "")
    .replace(/规则兑现/g, "")
    .replace(/商业节奏/g, "")
    .replace(/稳态钩子/g, "")
    .replace(/角色聚焦/g, "")
    .replace(/高概念设定/g, "")
    .replace(/差异化记忆点/g, "")
    .replace(/高概念/g, "")
    .replace(/\s+/g, " ")
    .replace(/([，。；:：])\s+/g, "$1 ")
    .replace(/\s+([，。；:：])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();

  return BANNED_VISIBLE_TOKENS.reduce((current, token) => current.replaceAll(token, ""), normalized)
    .replace(/\s+/g, " ")
    .replace(/([，。；:：])\s+/g, "$1 ")
    .replace(/\s+([，。；:：])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeDisplayText(text: string, fallback: string) {
  const normalized = cleanVisibleDisplayText(text);
  const normalizedFallback = cleanVisibleDisplayText(fallback);

  if (normalized) {
    return normalized;
  }

  return normalizedFallback;
}

function buildVariantTitle(
  scriptType: "short_drama" | "ai_comic",
  variantId: ScenarioVariantId,
  audiencePrefix: string,
  openingLabel: string,
  worldTypeLabel: string,
) {
  const titleScene = (scriptType === "ai_comic" ? worldTypeLabel : openingLabel) || "公开冲突";
  const normalizedTitleScene = titleScene
    .replace(/反击局|错位反转|局中局|升级反击局|误判反转局|规则破局局/g, "")
    .replace(/反击/g, "")
    .replace(/不装了/g, "")
    .replace(/破局/g, "")
    .trim();
  const safeScene = normalizedTitleScene || (scriptType === "ai_comic" ? "世界观" : "公开冲突");

  const variantTitle =
    variantId === "commercial_stable"
      ? scriptType === "ai_comic"
        ? `${safeScene}升级反击局`
        : `${safeScene}反击局`
      : variantId === "character_contrast"
        ? scriptType === "ai_comic"
          ? `${safeScene}误判反转局`
          : `${safeScene}错位反转`
        : scriptType === "ai_comic"
          ? `${safeScene}破局局`
          : `${safeScene}局中局`;

  return `${audiencePrefix}${variantTitle}`;
}

function buildVariantDisplayTexts(
  scriptType: "short_drama" | "ai_comic",
  variantId: ScenarioVariantId,
  payload: {
    audience: string;
    sceneLabel: string;
    openingLabel: string;
    relationshipLabel: string;
    protagonistLabel: string;
    coreMechanismLabel: string;
    upgradeStyleLabel: string;
    pressureSource: string;
    targetGoal: string;
  },
) {
  const sceneLabel = payload.sceneLabel || payload.openingLabel || "现代都市";
  const relationshipLabel = payload.relationshipLabel || payload.pressureSource || "对手压力";
  const protagonistLabel = payload.protagonistLabel || "主角";
  const coreMechanismLabel = payload.coreMechanismLabel || "核心机制";
  const upgradeStyleLabel = payload.upgradeStyleLabel || "升级路径";

  if (scriptType === "short_drama") {
    const targetSentence = payload.targetGoal
      ? `主角的目标是${payload.targetGoal}。`
      : "主角的目标是夺回主动权。";

    switch (variantId) {
      case "commercial_stable":
        return {
          coreHighlight:
            `${sceneLabel}一开局就把主角推进冲突中心，证据链和公开反击让爽点连续上升，观众很快就能看清谁在压谁。`,
          storyBackground:
            `${sceneLabel}的公开场合里，主角被直接推到舆论和利益的交叉点，职场、家庭或豪门压力形成明确落点，冲突节奏清楚、反击路径也更直。`,
          worldview: `${sceneLabel}的公开场合里，主角被直接推到舆论和利益的交叉点，职场、家庭或豪门压力形成明确落点，冲突节奏清楚、反击路径也更直。`,
          coreSynopsis:
            `主角先被压到低位，${targetSentence}迅速抓住关键证据或线索，第一次公开反击就把气势拉起来；接着更大的对手出现，冲突从羞辱升级为真正的对决。`,
        };
      case "character_contrast":
        return {
          coreHighlight:
            `${sceneLabel}里，主角表面被压住，实际上握着关键身份，关系误判和情绪拉扯不断放大，回弹感比单纯硬碰硬更强。`,
          storyBackground:
            `在${sceneLabel}里，亲密关系与公共场域交错，误判、猜疑和身份错位让主角持续承压，关系压力比单纯对抗更像一层层情感夹击。`,
          worldview: `在${sceneLabel}里，亲密关系与公共场域交错，误判、猜疑和身份错位让主角持续承压，关系压力比单纯对抗更像一层层情感夹击。`,
          coreSynopsis:
            `主角先被误判、被低估，${targetSentence}再在关系压力下继续伪装；情绪拉扯升级，身份揭露时反转最强，观众的代入感也随之拉满。`,
        };
      case "high_concept":
      default:
        return {
          coreHighlight:
            `表面羞辱只是第一层，真正的反转来自被设计好的局：真相藏得更深，主角先收证，再把对手拖进公开反击的位置。`,
          storyBackground:
            `${sceneLabel}的公开场合里看似平常，但真正的压力来自有人提前布好局；主角必须先承压，再用证据和节奏把隐藏真相逐步推到台前。`,
          worldview: `${sceneLabel}的公开场合里看似平常，但真正的压力来自有人提前布好局；主角必须先承压，再用证据和节奏把隐藏真相逐步推到台前。`,
          coreSynopsis:
            `主角被设计成在公开场合失势，但其实早就埋好反击路径；${targetSentence}他先收集证据，再把对手一步步引到公开对决的位置，最后揭出更深的操盘者。`,
        };
    }
  }

  switch (variantId) {
    case "commercial_stable":
      return {
        coreHighlight:
          `这里的核心看点是${upgradeStyleLabel}清晰、公开打脸节奏稳、能力爆发和对手层级一起上升，观众很容易跟着节奏追下去。`,
        storyBackground:
          `故事从${sceneLabel}的底层试探开始，主角在可升级的世界规则里一步步拿到更高层级的资源与对抗资格。`,
        worldview:
          `在${sceneLabel}的世界里，规则以升级路径和能力展示为主，主角从低阶试探起步，逐步获得更强的资源、能力与对抗资格。`,
        coreSynopsis:
          `主角先从低阶试探起步，能力逐步显形，公开打脸把节奏拉起来；越往后，敌人层级越高，升级和对抗一起推进。`,
      };
    case "character_contrast":
      return {
        coreHighlight:
          `这里的核心看点是主角被误判、被低估，关系与认知错位不断拉高，能力暴露时反转会比单纯升级更有冲击。`,
        storyBackground:
          `故事一开始就建立了误判感：主角被低估，外界只看到表面，真正的身份和能力却在暗处积累。`,
        worldview:
          `在${sceneLabel}的世界里，身份与认知被反复错位，主角看起来普通，却能在误判里持续释放出更强的能力。`,
        coreSynopsis:
          `主角一开始被当成普通人，关系和认知误判不断累积；等到能力暴露时，反向打脸会比单纯升级更有冲击。`,
      };
    case "high_concept":
    default:
      return {
        coreHighlight:
          `这里的核心看点是规则、代价和隐藏操盘者共同构成主线，主角不是只会硬冲，而是先看清局再反向收割。`,
        storyBackground:
          `故事把隐藏操盘者、规则代价和反向收证放在同一条线上，主角先看清局，再把对手带进自己的布局。`,
        worldview:
          `在${sceneLabel}的世界里，规则不是装饰，而是可计算的博弈：每一步升级都有代价，真正的矛盾在于谁在操控规则、谁在被规则牵着走。`,
        coreSynopsis:
          `主角先看清规则漏洞，再让隐藏操盘者落入自己的布局；真正的破局不是硬拼，而是用规则代价和反向收证把真相逼近台面。`,
      };
  }
}

function buildScenarioGenerationHints(
  scriptType: "short_drama" | "ai_comic",
  archetype: "commercial" | "character" | "differentiated",
  openingLabel: string,
  relationshipLabel: string,
  protagonistLabel: string,
  coreMechanismLabel: string,
  upgradeStyleLabel: string,
  eraBackground: string,
  genreTypes: string,
  variant: ScenarioVariantOverlay,
): ScenarioGenerationHints {
  const titleHint =
    scriptType === "ai_comic"
      ? `标题围绕${(genreTypes || eraBackground || "世界类型").trim()}、${(coreMechanismLabel || "核心机制").trim()}与差异化钩子展开`
      : `标题围绕${(openingLabel || eraBackground || "开局").trim()}、${(protagonistLabel || "主角").trim()}与反转钩子展开`;
  const highlightHint =
    scriptType === "ai_comic"
      ? `突出世界规则、${coreMechanismLabel || "核心机制"}、${upgradeStyleLabel || "升级流"}与视觉兑现，不要把内部策略词直接写进正文。`
      : `突出开局冲突、${relationshipLabel || "人物关系"}、${protagonistLabel || "主角身份"}与翻盘动作，不要把内部策略词直接写进正文。`;
  const synopsisHint =
    scriptType === "ai_comic"
      ? `按世界规则 -> 主角起点 -> 核心机制 -> 代价/限制 -> 升级路径 -> 视觉卖点来写，正文只保留自然叙述。`
      : `按主角身份 -> 开场爆点 -> 人物关系/对手压力 -> 主角目标 -> 翻盘机制 -> 追剧钩子来写，正文只保留自然叙述。`;
  const backgroundHint =
    scriptType === "ai_comic"
      ? `世界观要写清世界类型、资源/身份/规则、升级代价和视觉奇观。`
      : `故事背景要写清现实场域、舆论/家庭/职场/豪门压力和关系失衡。`;

  return {
    variantId: variant.variantId,
    variantName: variant.variantName,
    focus: variant.focus,
    title: [titleHint, ...variant.requiredSignals],
    coreHighlight: [highlightHint, variant.highlightAngle, ...variant.requiredSignals],
    storyBackground: [backgroundHint, variant.focus, ...variant.requiredSignals],
    worldview: [backgroundHint, variant.focus, ...variant.requiredSignals],
    coreSynopsis: [synopsisHint, variant.synopsisAngle, ...variant.requiredSignals],
    requiredSignals: variant.requiredSignals,
    forbiddenSignals: variant.forbiddenSignals,
  };
}

function buildCoreHighlightText(
  scriptType: "short_drama" | "ai_comic",
  archetype: "commercial" | "character" | "differentiated",
  audience: string,
  worldTypeLabel: string,
  relationshipLabel: string,
  protagonistLabel: string,
  coreMechanismLabel: string,
  upgradeStyleLabel: string,
  eraBackground: string,
  genreTypes: string,
  variant: ScenarioVariantOverlay,
  isRuleWeird = false,
) {
  if (isRuleWeird) {
    if (scriptType === "ai_comic") {
      return `${worldTypeLabel || eraBackground || "规则怪谈"}世界里，${coreMechanismLabel || "核心机制"}让主角在规则限制中找到突破口；每次破解都会带来规则审查、身份暴露和更高层级敌人，${upgradeStyleLabel || "升级流"}与视觉化规则变化共同制造追更动力。`;
    }
    return `面向${audience}，规则禁忌、违规代价和解释权争夺都被推到台前，主角围绕${coreMechanismLabel || "规则漏洞"}寻找反击入口，在公开误判中完成第一次反转。`;
  }

  if (scriptType === "ai_comic") {
    return `${worldTypeLabel || eraBackground || "世界类型"}世界里，${coreMechanismLabel || "核心机制"}带来清晰机制爽点，${upgradeStyleLabel || "升级流"}让主角不断突破，同时用规则代价、能力爆发和视觉奇观制造追更动力。`;
  }

  const emotional =
    archetype === "commercial"
      ? "爽点更集中"
      : archetype === "character"
        ? "情绪回弹更强"
        : "悬念更突出";
  return `${worldTypeLabel || eraBackground}开局直接把主角推到冲突中心，${relationshipLabel || "人物关系"}形成持续关系压力，${protagonistLabel || "主角身份"}与${coreMechanismLabel || "翻盘机制"}共同制造反击点，后续反转${emotional}。`;
}

function buildStoryBackgroundText(
  summary: StoryIntentSummary,
  scriptType: "short_drama" | "ai_comic",
  archetype: "commercial" | "character" | "differentiated",
  audience: string,
  openingLabel: string,
  relationshipLabel: string,
  protagonistLabel: string,
  coreMechanismLabel: string,
  upgradeStyleLabel: string,
  eraBackground: string,
  genreTypes: string,
  variant: ScenarioVariantOverlay,
  isRuleWeird = false,
) {
  if (isRuleWeird) {
    if (scriptType === "ai_comic") {
      return `${openingLabel || genreTypes || "规则怪谈"}世界里，身份、资源和生存机会都被可验证的异常规则重新分配。${relationshipLabel || "凡人"}原本处在体系边缘，直到${coreMechanismLabel || "规则破解机制"}让他看见规则漏洞；每次突破都会引来更高层级审查、规则反噬和身份暴露风险。`;
    }
    return `${eraBackground || "现代都市"}的公开场合被异常规则搅动，角色必须遵守看似荒诞但可验证的禁忌；违规会触发身份、证据或人身代价，规则解释权被对手利用。`;
  }

  if (scriptType === "ai_comic") {
    return `${openingLabel || eraBackground}世界里，力量、身份或资源由一套可升级规则驱动。${relationshipLabel || "主角起点"}原本处在体系边缘，直到${coreMechanismLabel || "核心机制"}打破原有秩序；每次升级都会带来更高层级敌人、规则反噬或身份暴露风险。画面表达重点放在${upgradeStyleLabel || "升级流"}、能力爆发和规则变化的视觉奇观上。`;
  }

  const audienceClause =
    /银发/.test(audience)
      ? "银发更突出亲情误会、代际冲突和守护关系。"
      : /女频/.test(audience)
        ? "女频更突出婚恋、家庭、豪门和情绪拉扯。"
        : "男频更突出公开羞辱、资源压迫、身份反杀和打脸翻盘。";
  const sceneLabel = eraBackground || "现代都市";
  return `${sceneLabel}的公开场合中，${protagonistLabel || "主角"}因${openingLabel || "开场爆点"}被推到关系和舆论压力中心，并与${relationshipLabel || "对手压力"}形成持续误判与情感冲突。现实场域以家庭、职场、豪门或公共冲突为主，核心压力来自误判、利益压迫和关系失衡。${audienceClause}`;
}

function buildCoreSynopsisText(
  scriptType: "short_drama" | "ai_comic",
  archetype: "commercial" | "character" | "differentiated",
  targetAudience: string,
  openingLabel: string,
  relationshipLabel: string,
  protagonist: string,
  pressureSource: string,
  coreMechanismLabel: string,
  upgradeStyleLabel: string,
  eraBackground: string,
  genreTypes: string,
  targetGoal: string,
  variant: ScenarioVariantOverlay,
  isRuleWeird = false,
) {
  if (isRuleWeird) {
    if (scriptType === "ai_comic") {
      const worldClause = openingLabel || genreTypes || "规则怪谈";
      const startClause = relationshipLabel || "凡人";
      const mechanismClause = coreMechanismLabel || "规则破解机制";
      const upgradeClause = upgradeStyleLabel || "升级路径";
      return `在${worldClause}覆盖的世界里，${startClause}主角意外获得${mechanismClause}，可以在违规边缘解析隐藏规则并获得能力提升。但每次突破都会引来更高层级规则审查、身份暴露和规则反噬风险。主角从一次被误判的违规事件开始，沿着自证、反击、升级、揭开规则操纵者的路径推进，并用规则变化、能力爆发和公开反转制造连续追更钩子。`;
    }
    return `${protagonist}在${openingLabel || "规则误判"}中被迫站到众人对立面，和${relationshipLabel || "对手压力"}形成持续误判与关系压力。主角表面退让，实际目标是${targetGoal || "查清真相并夺回主动权"}，并准备借${coreMechanismLabel || "规则漏洞"}一步步反击。第一次公开反击后，更大的幕后压力被推到台前，为下一阶段反转留下追更钩子。`;
  }

  if (scriptType === "ai_comic") {
    const worldClause = openingLabel || eraBackground || genreTypes || "世界类型";
    const startClause = relationshipLabel || "凡人起点";
    const mechanismClause = coreMechanismLabel || "核心机制";
    const upgradeClause = upgradeStyleLabel || "升级流";
    const costClause = "身份暴露、规则反噬或更高层级敌人";
    const visualClause = "能力爆发、规则变化和视觉奇观";
    const archetypeLine =
      archetype === "commercial"
        ? "主角沿着清晰的升级路径一路兑现爽点。"
      : archetype === "character"
          ? "主角在身份误判和关系反差里持续翻身。"
          : "主角在规则变化和隐藏线索里逐步破局。";
    return `在${worldClause}世界里，力量、身份或资源由一套可升级规则驱动。${startClause}原本处在体系边缘，直到${mechanismClause}打破原有秩序。${archetypeLine}表面能让主角沿着${upgradeClause}一路突破，但每次使用都会带来${costClause}，迫使主角在升级、暴露和反噬之间做选择。随着敌人层级不断升高，主角从低阶试探一路打到更高规则层，并用${visualClause}持续制造追更钩子。`;
  }

  const openingClause = openingLabel || pressureSource || "开局压力";
  const relationshipClause = relationshipLabel || pressureSource || "对手压力";
  const targetClause = targetGoal || (archetype === "character" ? "守住关键关系" : "夺回主动权");
  const turnClause = upgradeStyleLabel || pressureSource || "翻盘机制";

  const archetypeLine =
    archetype === "commercial"
      ? "主角会把冲突很快推向公开反击。"
      : archetype === "character"
        ? "主角会在关系误判里完成身份回弹。"
        : "主角会把隐藏真相逐步推到台前。";
  return `${protagonist}在${openingClause}中被迫站到众人对立面，和${relationshipClause}形成持续关系压力与情感冲突。主角表面退让，实际目标是${targetClause}，并准备借${turnClause}一步步夺回主动权。${archetypeLine}随着关系误判、利益压迫和关键证据逐渐浮出水面，主角完成第一次公开反击后，幕后更大的压力也被推到台前，为下一阶段反转留下追更钩子。`;
}

function aggregateScores(choices: Array<StoryIntentChoice | null | undefined>) {
  const weights: Record<string, number> = {};
  let totalIntentScore = 0;

  for (const choice of choices) {
    if (!choice) continue;
    totalIntentScore += choice.intentScore ?? 0;

    for (const scoreText of choice.scores ?? []) {
      // 支持格式：标签 +3、标签+3、标签 + 3
      const match = scoreText.match(/^(.+?)\s*\+\s*(\d+)$/);
      if (!match) continue;

      const label = match[1].trim();
      const value = Number(match[2]) || 0;
      if (label && value > 0) {
        weights[label] = (weights[label] ?? 0) + value;
      }
    }
  }

  return { totalIntentScore, weights };
}

function createUserPremiseSeed(input: StoryIntentSummaryInput, diagnosis?: InspirationDiagnosis) {
  const lines = [
    "用户偏好摘要（仅作策划参考）：",
    `- 第0步：${compactChoiceLabel(input.targetAudience)}`,
    `- 第1步：${compactChoiceLabel(input.audience)}`,
    `- 第2步：${compactChoiceLabel(input.topicDirection)}`,
    `- 第3步：${compactChoiceLabel(input.openingHook)}`,
    `- 第4步：${compactChoiceLabel(input.villainPreference)}`,
    `- 第5步：${compactChoiceLabel(input.paymentHook)}`,
  ];
  const stepSupplements = input.stepSupplements ?? {};
  const supplementLines = [
    stepSupplements.audience ? `- 第1步补充：${stepSupplements.audience}` : "",
    stepSupplements.topicDirection ? `- 第2步补充：${stepSupplements.topicDirection}` : "",
    stepSupplements.openingHook ? `- 第3步补充：${stepSupplements.openingHook}` : "",
    stepSupplements.villainPreference ? `- 第4步补充：${stepSupplements.villainPreference}` : "",
    stepSupplements.paymentHook ? `- 第5步补充：${stepSupplements.paymentHook}` : "",
  ].filter(Boolean);

  if (supplementLines.length > 0) {
    lines.push("");
    lines.push("用户当前步骤高优先级补充：");
    lines.push(...supplementLines);
  }

  const manualPremise = input.manualPremise?.trim();
  if (manualPremise) {
    lines.push("");
    lines.push(`用户补充：${manualPremise}`);
  }

  if (diagnosis) {
    lines.push("");
    lines.push("InspirationDiagnosis（仅作后台诊断参考，不作剧情事实）：");
    lines.push(`- primaryBranch：${diagnosis.primaryBranch}`);
    if (diagnosis.secondaryBranch) {
      lines.push(`- secondaryBranch：${diagnosis.secondaryBranch}`);
    }
    lines.push(`- lockStatus：${diagnosis.lockStatus}`);
    lines.push(`- confidence：${diagnosis.confidence}`);
    if (diagnosis.confirmedHooks.length > 0) {
      lines.push(`- confirmedHooks：${diagnosis.confirmedHooks.join(" / ")}`);
    }
    if (diagnosis.candidateHooks.length > 0) {
      lines.push(`- candidateHooks：${diagnosis.candidateHooks.join(" / ")}`);
    }
    if (diagnosis.mustHave.length > 0) {
      lines.push(`- mustHave：${diagnosis.mustHave.join(" / ")}`);
    }
    if (diagnosis.mustAvoid.length > 0) {
      lines.push(`- mustAvoid：${diagnosis.mustAvoid.join(" / ")}`);
    }
  }

  return lines.join("\n");
}

function getOpeningStoryCore(scriptType: "short_drama" | "ai_comic", openingLabel: string) {
  // AI 漫剧开场映射
  const aiComicMapping: Record<string, string> = {
    "禁地奇遇": "禁地只认他",
    "女帝落难": "落难女帝",
    "血色规则": "血色规则",
    "灾变倒计时": "灾变倒计时",
  };

  // 真人短剧开场映射
  const shortDramaMapping: Record<string, string> = {
    "年会反击": "年会反击",
    "饭局沉默": "饭局沉默",
    "婚礼转身": "婚礼转身",
    "镜头前反转": "镜头前反转",
  };

  if (scriptType === "ai_comic") {
    return aiComicMapping[openingLabel] || openingLabel;
  }

  return shortDramaMapping[openingLabel] || openingLabel;
}

function buildPlanUserPremise(summary: StoryIntentSummary, synopsis: string) {
  return summary.userPremiseSeed || synopsis;
}

function buildDisplayTagGroups(
  scriptType: "short_drama" | "ai_comic",
  variant: ScenarioVariantOverlay,
  input: {
    audience: string[];
    era?: string[];
    genres: string[];
    coreSettings: string[];
    styleElements: string[];
  },
): ScenarioDisplayTagGroups {
  const unique = (values: string[]) => Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
  const audience = unique(input.audience);
  const era = unique(input.era ?? []);
  const genres = unique(input.genres);
  const coreSettings = unique(input.coreSettings);
  const styleElements = unique(input.styleElements);

  if (scriptType === "short_drama") {
    const orderedCoreSettings =
      variant.variantId === "commercial_stable"
        ? coreSettings
        : variant.variantId === "character_contrast"
          ? [...coreSettings.slice(1), coreSettings[0]].filter(Boolean)
          : [...coreSettings.slice(2), ...coreSettings.slice(0, 2)].filter(Boolean);
    return {
      audience,
      era,
      genres,
      coreSettings: unique(orderedCoreSettings),
    };
  }

  const orderedGenres = genres.length > 0 ? genres : era;
  const orderedCoreSettings =
    variant.variantId === "commercial_stable"
      ? coreSettings
      : variant.variantId === "character_contrast"
        ? [...coreSettings.slice(1), coreSettings[0]].filter(Boolean)
        : [...coreSettings.slice(2), ...coreSettings.slice(0, 2)].filter(Boolean);
  const orderedStyleElements =
    variant.variantId === "commercial_stable"
      ? styleElements
      : variant.variantId === "character_contrast"
        ? [...styleElements.slice(1), styleElements[0]].filter(Boolean)
        : [...styleElements.slice(2), ...styleElements.slice(0, 2)].filter(Boolean);

  return {
    audience,
    genres: unique(orderedGenres),
    coreSettings: unique(orderedCoreSettings),
    styleElements: unique(orderedStyleElements),
  };
}

function normalizeAudienceLabelForProject(
  audienceLabel: string,
  audienceType: ProjectBrief["audienceType"],
) {
  const trimmed = audienceLabel.trim();
  if (audienceType === "male" && /女频/.test(trimmed)) {
    return "男频向都市豪门语境";
  }

  if (audienceType === "female" && /男频/.test(trimmed)) {
    return "女频向情感关系语境";
  }

  return trimmed;
}

type StoryIntentHints = {
  openingMood: string;
  protagonistFunction: string;
  antagonistFunction: string;
  relationshipFunction: string;
  paymentPromise: string;
  coreConflict: string;
  title: string;
};

function buildDiagnosisSelection(
  summary: StoryIntentSummary,
  diagnosis: InspirationDiagnosis,
  scriptType: "short_drama" | "ai_comic",
  archetype: "commercial" | "character" | "differentiated",
) {
  const makeTag = (label: string | undefined, bucket: StoryTagBucketName): StoryWeightedTag | undefined =>
    label
      ? {
          label,
          weight: 0,
          bucket,
        }
      : undefined;

  const audienceLabel = deriveAudienceLabel(summary, {} as StorySelection);
  const step0Audience = normalizeChoiceText(summary.targetAudience) || normalizeChoiceText(summary.steps.audience);
  const step1Label = normalizeChoiceText(summary.steps.topicDirection);
  const step2Label = normalizeChoiceText(summary.steps.openingHook);
  const step3Label = normalizeChoiceText(summary.steps.villainPreference);
  const step4Label = normalizeChoiceText(summary.steps.paymentHook);
  const explicitEraTags = filterAvoidedValues([...summary.mergedTags.eraTags], diagnosis.mustAvoid);
  const explicitEra = explicitEraTags[0] || "";
  const genres = filterAvoidedValues([...summary.mergedTags.genres], diagnosis.mustAvoid);
  const styles = filterAvoidedValues([...summary.mergedTags.styleTags], diagnosis.mustAvoid);
  const hooks = filterAvoidedValues([...summary.mergedTags.coreHooks], diagnosis.mustAvoid);

  const fallbackEra = scriptType === "ai_comic" ? "现代都市" : "现代都市";
  const fallbackGenre = scriptType === "ai_comic" ? "都市" : "都市";
  const fallbackCoreSetting = scriptType === "ai_comic" ? "核心机制" : "身份悬念";
  const fallbackEmotion = scriptType === "ai_comic" ? "升级流" : "打脸虐渣";
  const fallbackProtagonist = scriptType === "ai_comic" ? "主角起点" : "隐藏大佬";
  const fallbackAntagonist = scriptType === "ai_comic" ? "规则压力" : "上位者打压";
  const fallbackPayment = scriptType === "ai_comic" ? "规则漏洞" : "身份揭露";
  const fallbackVisual = scriptType === "ai_comic" ? "视觉奇观" : "强势碾压";
  const fallbackMisc = scriptType === "ai_comic" ? "高设定" : "现实切口";

  const branchLabels: Record<InspirationBranchKey, {
    era: string;
    genre: string;
    coreSetting: string;
    emotion: string;
    protagonist: string;
    antagonist: string;
    payment: string;
    visual: string;
    misc: string;
  }> = {
    counter_control: {
      era: scriptType === "ai_comic" ? step1Label || fallbackEra : explicitEra || fallbackEra,
      genre: scriptType === "ai_comic" ? (genres[0] || step1Label || fallbackGenre) : (genres[0] || fallbackGenre),
      coreSetting: scriptType === "ai_comic" ? (step3Label || hooks[0] || fallbackCoreSetting) : (step2Label || hooks[0] || fallbackCoreSetting),
      emotion: scriptType === "ai_comic" ? (styles[0] || step4Label || fallbackEmotion) : (styles[0] || step4Label || fallbackEmotion),
      protagonist: scriptType === "ai_comic" ? (step2Label || step1Label || fallbackProtagonist) : (step3Label || step2Label || fallbackProtagonist),
      antagonist: scriptType === "ai_comic" ? (step4Label || hooks[1] || fallbackAntagonist) : (step3Label || hooks[1] || fallbackAntagonist),
      payment: scriptType === "ai_comic" ? (step4Label || styles[0] || fallbackPayment) : (step4Label || hooks[2] || fallbackPayment),
      visual: scriptType === "ai_comic" ? (styles[0] || step4Label || fallbackVisual) : (styles[0] || step4Label || fallbackVisual),
      misc: scriptType === "ai_comic" ? (styles[1] || fallbackMisc) : (styles[1] || fallbackMisc),
    },
    relation_shift: {
      era: scriptType === "ai_comic" ? step1Label || fallbackEra : explicitEra || fallbackEra,
      genre: scriptType === "ai_comic" ? (genres[0] || step1Label || "情感") : (genres[0] || "婚恋"),
      coreSetting: scriptType === "ai_comic" ? (step2Label || hooks[0] || "关系翻局") : (step2Label || hooks[0] || "关系翻局"),
      emotion: scriptType === "ai_comic" ? (styles[0] || step4Label || "情绪拉扯") : (styles[0] || step4Label || "情绪拉扯"),
      protagonist: scriptType === "ai_comic" ? (step2Label || step1Label || "断情自救") : (step3Label || "断情自救"),
      antagonist: scriptType === "ai_comic" ? (step3Label || hooks[1] || "亲密背刺") : (step3Label || hooks[1] || "亲密背刺"),
      payment: scriptType === "ai_comic" ? (step4Label || styles[0] || "关系选择") : (step4Label || hooks[2] || "关系选择"),
      visual: scriptType === "ai_comic" ? (styles[0] || step4Label || "双向试探") : (styles[0] || step4Label || "双向试探"),
      misc: scriptType === "ai_comic" ? (styles[1] || fallbackMisc) : (styles[1] || fallbackMisc),
    },
    misjudge_reversal: {
      era: scriptType === "ai_comic" ? step1Label || "都市悬疑" : explicitEra || fallbackEra,
      genre: scriptType === "ai_comic" ? (genres[0] || "悬疑") : (genres[0] || "悬疑"),
      coreSetting: scriptType === "ai_comic" ? (step3Label || hooks[0] || "误判翻盘") : (step3Label || hooks[0] || "误判翻盘"),
      emotion: scriptType === "ai_comic" ? (styles[0] || step4Label || "反转驱动") : (styles[0] || step4Label || "反转驱动"),
      protagonist: scriptType === "ai_comic" ? (step2Label || step1Label || "被动察觉") : (step3Label || "被动察觉"),
      antagonist: scriptType === "ai_comic" ? (step4Label || hooks[1] || "真相遮蔽") : (step3Label || hooks[1] || "真相遮蔽"),
      payment: scriptType === "ai_comic" ? (step4Label || styles[0] || "证据翻盘") : (step4Label || hooks[2] || "证据翻盘"),
      visual: scriptType === "ai_comic" ? (styles[0] || step4Label || "舆论审判") : (styles[0] || step4Label || "舆论审判"),
      misc: scriptType === "ai_comic" ? (styles[1] || fallbackMisc) : (styles[1] || fallbackMisc),
    },
    anomaly_entry: {
      era: scriptType === "ai_comic" ? (step1Label || "异常规则都市") : explicitEra || fallbackEra,
      genre: scriptType === "ai_comic" ? (genres[0] || step1Label || fallbackGenre) : (genres[0] || "规则怪谈"),
      coreSetting: scriptType === "ai_comic" ? (step3Label || hooks[0] || "异象入局") : (step2Label || hooks[0] || "异象入局"),
      emotion: scriptType === "ai_comic" ? (styles[0] || step4Label || "规则试探") : (styles[0] || step4Label || "规则试探"),
      protagonist: scriptType === "ai_comic" ? (step2Label || step1Label || "暗藏变量") : (step3Label || "暗藏变量"),
      antagonist: scriptType === "ai_comic" ? (step4Label || hooks[1] || "规则改写") : (step3Label || hooks[1] || "规则改写"),
      payment: scriptType === "ai_comic" ? (step4Label || styles[0] || "规则漏洞") : (step4Label || hooks[2] || "规则漏洞"),
      visual: scriptType === "ai_comic" ? (styles[0] || step4Label || "规则怪谈") : (styles[0] || step4Label || "规则怪谈"),
      misc: scriptType === "ai_comic" ? (styles[1] || fallbackMisc) : (styles[1] || fallbackMisc),
    },
  };

  const labels = branchLabels[diagnosis.primaryBranch];
  const secondary = branchLabels[diagnosis.secondaryBranch ?? diagnosis.primaryBranch];
  const branchLabel =
    diagnosis.primaryBranch === "counter_control"
      ? "反击写法"
      : diagnosis.primaryBranch === "relation_shift"
        ? "情感写法"
        : diagnosis.primaryBranch === "misjudge_reversal"
          ? "反转写法"
          : "设定写法";

  const audience = makeTag(audienceLabel, "audienceTags");
  const era = makeTag(labels.era, "eraTags");
  const genre = makeTag(labels.genre, "genreTags");
  const coreSetting = makeTag(labels.coreSetting, "coreSettingTags");
  const emotion = makeTag(labels.emotion, "emotionEngineTags");
  const protagonist = makeTag(labels.protagonist, "protagonistTags");
  const antagonist = makeTag(labels.antagonist, "antagonistTags");
  const payment = makeTag(labels.payment, "paymentHookTags");
  const visual = makeTag(labels.visual, "visualStyleTags");
  const misc = makeTag(labels.misc, "miscTags");

  return {
    audience,
    era,
    genre,
    coreSetting,
    emotion,
    protagonist,
    antagonist,
    payment,
    visual,
    misc,
    branchLabel,
    secondaryBranchLabel:
      diagnosis.secondaryBranch && diagnosis.secondaryBranch !== diagnosis.primaryBranch
        ? diagnosis.secondaryBranch === "counter_control"
          ? "反击写法"
          : diagnosis.secondaryBranch === "relation_shift"
            ? "情感写法"
            : diagnosis.secondaryBranch === "misjudge_reversal"
              ? "反转写法"
              : "设定写法"
        : branchLabel,
    diagnosisSummary: `${diagnosis.diagnosisText}｜archetype=${archetype}｜scriptType=${scriptType}`,
  };
}

function buildIntentHints(
  summary: StoryIntentSummary,
  scriptType: "short_drama" | "ai_comic",
  archetype: "commercial" | "character" | "differentiated",
  projectBrief: ProjectBrief,
  diagnosis: InspirationDiagnosis,
  isRuleWeird = false,
): StoryIntentHints {
  const title =
    isRuleWeird
      ? "规则怪谈原创项目"
      : projectBrief.audienceType === "male"
        ? "男频原创项目"
        : projectBrief.audienceType === "female"
          ? "女频原创项目"
          : archetype === "character"
            ? "人物反差原创项目"
            : archetype === "differentiated"
              ? "高设定原创项目"
              : "原创项目";

  if (isRuleWeird) {
    return {
      openingMood: "被异常规则覆盖的近现实空间",
      protagonistFunction: "被误判为违规者却掌握漏洞的主角",
      antagonistFunction: "掌握规则解释权并借证据压迫主角的对手",
      relationshipFunction: "关键关系掌握部分规则线索，因恐惧或利益暂不完全坦白",
      paymentPromise: "规则漏洞、违规真相与身份暴露逐步揭开",
      coreConflict: "主角在规则判定、舆论判定和证据判定下自证，并找出操纵者",
      title,
    };
  }

  const branch = diagnosis.primaryBranch;
  const branchOpening: Record<InspirationBranchKey, string> = scriptType === "ai_comic"
    ? {
        counter_control: "世界规则第一次露出裂缝的都市/异世界开局",
        relation_shift: "角色站队和身份起点不断变化的关系场",
        misjudge_reversal: "设定真相被误判、反转的高概念开局",
        anomaly_entry: "异常规则闯入现实的世界壳",
      }
    : {
        counter_control: "当众压制和现实翻身的开局",
        relation_shift: "关系背离和重新站队的开局",
        misjudge_reversal: "误判、证据和公开翻盘的开局",
        anomaly_entry: "异常事件先埋进现实关系里的开局",
      };
  const branchProtagonist: Record<InspirationBranchKey, string> = scriptType === "ai_comic"
    ? {
        counter_control: "从凡人起步、靠机制升级的主角",
        relation_shift: "从身份起点与关系起点中建立反差的主角",
        misjudge_reversal: "被误判后通过机制与线索自证的主角",
        anomaly_entry: "在规则缝隙里试探并寻找漏洞的主角",
      }
    : {
        counter_control: "在公开压制中被迫直面局面的主角",
        relation_shift: "在关系拉扯中重新找回位置的主角",
        misjudge_reversal: "被误判后逼出证据和真相的主角",
        anomaly_entry: "被异常事件卷入现实冲突的主角",
      };
  const branchAntagonist: Record<InspirationBranchKey, string> = scriptType === "ai_comic"
    ? {
        counter_control: "规则压力、敌人阶层和代价共同压迫主角。",
        relation_shift: "站队变化和关系代价持续改变局势。",
        misjudge_reversal: "错误认知和隐藏真相把主角推向更难的局。",
        anomaly_entry: "世界规则本身会不断升级并反噬主角。",
      }
    : {
        counter_control: "上位者和现实压力持续压制主角。",
        relation_shift: "爱人、家人或旧友带来关系伤害。",
        misjudge_reversal: "证据被隐藏、真相被误导。",
        anomaly_entry: "规则变化和异常插入现实。",
      };
  const branchRelationship: Record<InspirationBranchKey, string> = scriptType === "ai_comic"
    ? {
        counter_control: "角色关系会围绕阵营、协作和背刺变化。",
        relation_shift: "角色关系推动站队和互相利用。",
        misjudge_reversal: "知情者和证人帮助主角翻案。",
        anomaly_entry: "关系线索会直接指向规则漏洞。",
      }
    : {
        counter_control: "关系在压制和误判中寻找可逆转的位置。",
        relation_shift: "关系在背离、试探和重新站队之间摆动。",
        misjudge_reversal: "知情者、证人和旁观者的立场决定翻盘速度。",
        anomaly_entry: "关系线索会直接指向异常入口。",
      };
  const branchPayment: Record<InspirationBranchKey, string> = scriptType === "ai_comic"
    ? {
        counter_control: "升级代价、身份暴露和规则反噬。",
        relation_shift: "站队代价、背刺反噬和关系回弹。",
        misjudge_reversal: "证据翻盘、身份反转和舆论审判。",
        anomaly_entry: "规则试探、漏洞发现和身份藏局。",
      }
    : {
        counter_control: "当众翻身、证据反击、身份揭露。",
        relation_shift: "断情自救、站队翻转、关系回弹。",
        misjudge_reversal: "证据翻盘、身份反转、舆论审判。",
        anomaly_entry: "规则试探、漏洞发现、身份藏局。",
      };

  return {
    openingMood: branchOpening[branch],
    protagonistFunction: branchProtagonist[branch],
    antagonistFunction: branchAntagonist[branch],
    relationshipFunction: branchRelationship[branch],
    paymentPromise: branchPayment[branch],
    coreConflict:
      scriptType === "ai_comic"
        ? branch === "counter_control"
          ? "主角在世界规则和机制代价之间找到升级路径。"
          : branch === "relation_shift"
            ? "主角在站队变化和身份反差中持续变强。"
            : branch === "misjudge_reversal"
              ? "主角在误判和反转中用机制自证。"
              : "主角在异常规则中找到漏洞并反击。"
        : branch === "counter_control"
          ? "主角被压制后重新夺回主动权。"
          : branch === "relation_shift"
            ? "主角在关系崩塌后重建选择权。"
            : branch === "misjudge_reversal"
              ? "主角在误判中自证并完成翻盘。"
              : "主角在异常规则下找出漏洞并反击。",
    title,
  };
}

function buildAntagonistPressure(villainLabel: string) {
  const mapping: Record<string, string> = {
    // 真人短剧反派
    "仗着地位打压的上位者": "仗着地位打压主角的上位者持续压迫，让主角被迫证明自己。",
    "满口正义背地抢机会": "满口正义背地抢机会的人抢走主角成果，让主角被迫反击。",
    "躲在规则背后的人": "躲在规则背后的人用规则困住主角，却给自己留下生路。",
    "看不起主角被当众反转": "看不起主角的人最终被当众反转，让主角证明自己的价值。",
    // AI 漫剧反派
    "师门长辈打压": "师门长辈仗着地位打压主角，持续制造压迫和冲突升级。",
  };

  return mapping[villainLabel] || `${villainLabel}持续压迫主角，并推动冲突升级。`;
}

function buildCoreSynopsis(
  scriptType: "short_drama" | "ai_comic",
  hints: StoryIntentHints,
  mode: "primary" | "secondary",
) {
  const openingText =
    scriptType === "short_drama"
      ? `主角先被推到${hints.openingMood}里，不得不面对外部压力。`
      : `主角在${hints.openingMood}中第一次看见世界规则开始失衡。`;
  const villainText = `${hints.antagonistFunction}持续施压，让主角始终处在被动位置。`;
  const modeText =
    mode === "primary"
      ? "故事会把反击节奏前置，让压迫和翻车形成连续爽点。"
      : scriptType === "short_drama"
        ? "故事会把人物关系和情绪拉扯放在前面，让反击更有情绪落点。"
        : "故事会把视觉设定和世界观扩展放在前面，让追更动力更靠设定展开。";
  const paymentText = `后续会围绕${hints.paymentPromise}继续展开。`;

  return `${hints.protagonistFunction}在${scriptType === "short_drama" ? "现实冲突" : "高概念设定"}中先被压住，${openingText}${villainText}${modeText}${paymentText}`;
}

function buildScriptPlan(input: {
  scriptType: "short_drama" | "ai_comic";
  audienceLabel: string;
  topicLabel: string;
  synopsis: string;
  coreSynopsis: string;
  highlight: string;
  worldview: string;
  storyBackground: string;
  coreSetting: string;
  mainlineAnchors: StoryMainlineAnchors;
  phaseStrategy: StoryPhaseStrategy;
  beatPool: string[];
  styleTags: string[];
  mode: "primary" | "secondary";
  intentHints: StoryIntentHints;
  isRuleWeird?: boolean;
}): ScriptPlan {
  const isRuleWeird = input.isRuleWeird ?? false;
  const relationshipEngine =
    isRuleWeird
      ? "关系角色掌握部分规则线索，但因恐惧、利益或误判暂不完全坦白，关系变化会直接影响规则自证与选择。"
      : input.mode === "primary"
        ? `${input.intentHints.relationshipFunction}，推动阶段性爽点升级。`
        : input.scriptType === "short_drama"
          ? "人物关系、误会、偏爱和拉扯共同推动情绪递进。"
          : "主角关系变化与世界规则揭露同步推进，形成设定和情绪的双线牵引。";
  const openingThreeEpisodesHook = [
    `第1集：${input.phaseStrategy.qi}`,
    `第2集：${input.phaseStrategy.cheng}`,
    `第3集：${input.phaseStrategy.zhuan}`,
  ].join("\n");
  const beatPoolText = input.beatPool.join(" / ");

  return {
    scriptType: input.scriptType,
    logline: input.storyBackground || input.synopsis,
    commercialHook: input.highlight,
    targetAudience: input.audienceLabel,
    genrePromise: input.worldview || input.topicLabel,
    mainConflict: isRuleWeird
      ? "主角被规则判定、舆论判定和证据判定为违规者，必须找出规则漏洞与操纵者，并在规则限制下自证。"
      : `${input.intentHints.coreConflict}，主角必须一步步找回局势。`,
    protagonistGoal: isRuleWeird
      ? "在规则限制下自证、找到漏洞、夺回解释权。"
      : input.mainlineAnchors.coreDesire,
    antagonistPressure: isRuleWeird
      ? "对手掌握规则解释权或证据解释权，把主角推成违规者，并不断放大违规代价。"
      : `${input.intentHints.antagonistFunction}，持续制造误判与压迫。`,
    relationshipEngine: `${input.mainlineAnchors.emotionalEngine}；${relationshipEngine}`,
    openingThreeEpisodesHook,
    paymentPointPlan: isRuleWeird
      ? `规则漏洞、违规真相、身份暴露与规则反杀逐步揭开；${beatPoolText}`
      : `${input.intentHints.paymentPromise}；${beatPoolText}`,
    tone: input.styleTags.length > 0 ? input.styleTags.slice(0, 3).join(" / ") : input.coreSetting,
    productionNotes:
      `${input.phaseStrategy.note} ${input.scriptType === "ai_comic" ? "按 AI漫剧视觉化表达控制场景与镜头。" : "按低成本真人短剧控制人物数量、场景数量和对白冲突。"}`,
    riskNotes: [],
  };
}

export function buildStoryIntentSummary(input: StoryIntentSummaryInput): StoryIntentSummary {
  const selectedChoices = [
    input.audience,
    input.topicDirection,
    input.openingHook,
    input.villainPreference,
    input.paymentHook,
    ...(input.paymentHookSelections ?? []),
  ];

  const scoreSummary = aggregateScores(selectedChoices);
  const diagnosis = buildInspirationDiagnosis(input);

  return {
    scriptType: input.scriptType,
    targetAudience: input.targetAudience ?? undefined,
    steps: {
      audience: input.audience ?? undefined,
      topicDirection: input.topicDirection ?? undefined,
      openingHook: input.openingHook ?? undefined,
      villainPreference: input.villainPreference ?? undefined,
      paymentHook: input.paymentHook ?? undefined,
    },
    stepSupplements: input.stepSupplements ?? {},
    mergedTags: input.mergedTags,
    scoreSummary,
    userPremiseSeed: createUserPremiseSeed(input, diagnosis),
    diagnosis,
  };
}

export function buildStoryScenarioCards(summary: StoryIntentSummary): StoryScenarioCard[] {
  const diagnosis = summary.diagnosis;
  const isRuleWeird = isRuleWeirdProject(summary);
  const variantOverlays = getScenarioVariantOverlays();
  const commercialSelection = buildDiagnosisSelection(summary, diagnosis, summary.scriptType, "commercial");
  const characterSelection = buildDiagnosisSelection(summary, diagnosis, summary.scriptType, "character");
  const differentiatedSelection = buildDiagnosisSelection(summary, diagnosis, summary.scriptType, "differentiated");

  const openingChoiceLabel = compactChoiceLabel(summary.steps.topicDirection);
  const emotionalChoiceLabel = compactChoiceLabel(summary.steps.openingHook);
  const protagonistChoiceLabel = compactChoiceLabel(summary.steps.villainPreference);
  const villainLabel = compactChoiceLabel(summary.steps.paymentHook);
  const worldTypeLabel = openingChoiceLabel;
  const protagonistStartLabel = emotionalChoiceLabel;
  const coreMechanismLabel = protagonistChoiceLabel;
  const upgradeStyleLabel = villainLabel;
  const openingSupplement = summary.stepSupplements.topicDirection;
  const emotionalSupplement = summary.stepSupplements.openingHook;
  const protagonistSupplement = summary.stepSupplements.villainPreference;
  const villainSupplement = summary.stepSupplements.paymentHook;
  const openingDirection = openingSupplement ? `${openingChoiceLabel}（${openingSupplement}）` : openingChoiceLabel;
  const emotionalDirection = emotionalSupplement ? `${emotionalChoiceLabel}（${emotionalSupplement}）` : emotionalChoiceLabel;
  const protagonistDirection = protagonistSupplement ? `${protagonistChoiceLabel}（${protagonistSupplement}）` : protagonistChoiceLabel;
  const villainDirection = villainSupplement ? `${villainLabel}（${villainSupplement}）` : villainLabel;
  const paymentDirection = villainLabel;
  const uniqueLabels = (...values: Array<string | undefined>) =>
    Array.from(
      new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
    );
  const resolveScenarioGoal = (
    targetAudience: string,
    opening: string,
    relationship: string,
    protagonist: string,
    turn: string,
  ) => {
    const text = [targetAudience, opening, relationship, protagonist, turn].join(" / ");
    if (/命案|证据|阴谋|失踪|真相|误判|揭开/.test(text)) return "查清真相";
    if (/婚姻|替嫁|豪门|婆媳|关系|拉扯|婚恋|夫妻|前任|亲密/.test(text)) return "守住关键关系并夺回尊严";
    if (/抓奸|背叛|离婚|退婚|羞辱|抢|反控/.test(text)) return "完成复仇并夺回主动权";
    if (/债务|病危|家人/.test(text)) return "守住家人和关键利益";
    return "夺回主动权";
  };
  const buildScenarioTitle = (
    targetAudience: string,
    archetype: "commercial" | "character" | "differentiated",
    scriptType: "short_drama" | "ai_comic",
    worldTypeLabel: string,
    protagonistStartLabel: string,
    coreMechanismLabel: string,
    upgradeStyleLabel: string,
    variant: ScenarioVariantOverlay,
  ) => {
    const audiencePrefix = /^(男频|女频|银发)/.test(targetAudience) ? targetAudience : "";
    return buildVariantTitle(
      scriptType,
      variant.variantId,
      audiencePrefix,
      openingChoiceLabel || "公开冲突",
      worldTypeLabel || "世界观",
    );
  };
  const commonTags = {
    audiences: uniqueLabels(deriveAudienceLabel(summary, commercialSelection)),
    genres: summary.scriptType === "short_drama"
      ? removeLiveActionBackgroundLabelsFromGenres(
          filterAvoidedValues(
            uniqueLabels(commercialSelection.genre?.label, ...summary.mergedTags.genres),
            diagnosis.mustAvoid,
          ),
        )
      : filterAvoidedValues(
          uniqueLabels(commercialSelection.genre?.label, ...summary.mergedTags.genres),
          diagnosis.mustAvoid,
        ),
    coreHooks: filterAvoidedValues(
      uniqueLabels(
        openingChoiceLabel,
        emotionalChoiceLabel,
        protagonistChoiceLabel,
        villainLabel,
        ...summary.mergedTags.coreHooks,
      ),
      diagnosis.mustAvoid,
    ),
    styleTags: filterAvoidedValues(
      uniqueLabels(...summary.mergedTags.styleTags),
      diagnosis.mustAvoid,
    ),
  };
  const baseStepTags = {
    audiences: commonTags.audiences,
    genres: commonTags.genres,
    coreHooks: commonTags.coreHooks,
    styleTags: commonTags.styleTags,
  };

  const buildScenario = (
    planName: string,
    storyTitle: string,
    synopsis: string,
    coreSynopsis: string,
    highlight: string,
    worldview: string,
    selection: StorySelection,
    archetype: "commercial" | "character" | "differentiated",
    keyPoints: string[],
    variant: ScenarioVariantOverlay,
  ): StoryScenarioCard => {
    const targetAudience = deriveAudienceLabel(summary, selection);
    const eraBackground = deriveEraBackground(summary, selection, archetype, isRuleWeird);
    const genreTypes = deriveGenreTypes(summary, selection, eraBackground, isRuleWeird);
    const coreSettings =
      isRuleWeird
        ? "规则文本"
        : summary.scriptType === "ai_comic"
          ? (coreMechanismLabel || "核心机制")
          : (upgradeStyleLabel || protagonistChoiceLabel || "翻盘机制");
    const projectBrief = buildScenarioProjectBrief(summary, selection, {
      protagonist: "",
      pressureSource: "",
      coreDesire: "",
      emotionalEngine: "",
      genreShell: "",
      paymentPromise: "",
    }, archetype, isRuleWeird);
    const intentHints = buildIntentHints(summary, summary.scriptType, archetype, projectBrief, diagnosis, isRuleWeird);
    const beatPool = buildBeatPool(summary, selection, archetype, intentHints, isRuleWeird);
    const generationHints = buildScenarioGenerationHints(
      summary.scriptType,
      archetype,
      worldTypeLabel || eraBackground,
      emotionalChoiceLabel,
      protagonistChoiceLabel,
      coreMechanismLabel || coreSettings,
      upgradeStyleLabel || genreTypes,
      eraBackground,
      genreTypes,
      variant,
    );
    const rawScenarioTitle = buildScenarioTitle(
      targetAudience,
      archetype,
      summary.scriptType,
      worldTypeLabel || eraBackground,
      protagonistStartLabel || targetAudience,
      coreMechanismLabel || coreSettings,
      upgradeStyleLabel || genreTypes,
      variant,
    );
    const scenarioTitle = sanitizeDisplayText(rawScenarioTitle, storyTitle);
    const targetGoal = resolveScenarioGoal(targetAudience, openingChoiceLabel, emotionalChoiceLabel, protagonistChoiceLabel, villainLabel);
    const phaseStrategy = buildPhaseStrategy(summary.scriptType, scenarioTitle, selection, beatPool, archetype, isRuleWeird);
    const mainlineAnchors: StoryMainlineAnchors = {
      protagonist: intentHints.protagonistFunction,
      pressureSource: intentHints.antagonistFunction,
      coreDesire:
        archetype === "commercial"
          ? "主角要夺回主动权、证明自己、把局势拉回可控。"
          : archetype === "character"
            ? "主角要从误判和压迫里夺回身份、关系和情绪位置。"
            : "主角要把隐藏的设定或真相推到台前，完成差异化兑现。",
      emotionalEngine:
        archetype === "character"
          ? "人物反差和情绪回弹共同推进，突出关系变化。"
          : archetype === "differentiated"
            ? "设定记忆点和视觉冲击共同推进。"
            : "爽点连续性和关系牵引共同推进。",
      genreShell:
        archetype === "commercial"
          ? `${summary.scriptType === "ai_comic" ? "视觉设定" : "都市现实"} / ${targetAudience}`
          : archetype === "character"
            ? "人物设定 / 关系张力"
            : "高概念设定 / 视觉冲击",
      paymentPromise: intentHints.paymentPromise,
    };
    const normalizedAudience = normalizeAudienceLabelForProject(targetAudience, projectBrief.audienceType);
    const ruleText = isRuleWeird ? buildRuleWeirdScenarioText(summary.scriptType, archetype) : null;
    const effectiveSynopsis = isRuleWeird ? ruleText!.synopsis : synopsis;
    const effectiveHighlight = isRuleWeird ? ruleText!.highlight : highlight;
    const effectiveWorldview = isRuleWeird ? ruleText!.worldview : worldview;
    const variantDisplayTexts = buildVariantDisplayTexts(summary.scriptType, variant.variantId, {
      audience: normalizedAudience,
      sceneLabel: eraBackground || worldTypeLabel || genreTypes || "现代都市",
      openingLabel: worldTypeLabel || openingChoiceLabel || "公开冲突",
      relationshipLabel: emotionalChoiceLabel || mainlineAnchors.pressureSource,
      protagonistLabel: protagonistChoiceLabel || mainlineAnchors.protagonist,
      coreMechanismLabel: coreMechanismLabel || coreSettings,
      upgradeStyleLabel: upgradeStyleLabel || villainLabel || mainlineAnchors.paymentPromise,
      pressureSource: mainlineAnchors.pressureSource,
      targetGoal,
    });
    const rawCoreHighlight = isRuleWeird ? effectiveHighlight : variantDisplayTexts.coreHighlight;
    const rawStoryBackground = isRuleWeird ? effectiveWorldview : variantDisplayTexts.storyBackground;
    const rawWorldview = isRuleWeird ? effectiveWorldview : variantDisplayTexts.worldview;
    const rawStoryCoreSynopsis = isRuleWeird
      ? effectiveSynopsis
      : variantDisplayTexts.coreSynopsis;
    const coreHighlight = sanitizeDisplayText(rawCoreHighlight, effectiveHighlight || highlight);
    const storyBackground = sanitizeDisplayText(rawStoryBackground, effectiveWorldview || worldview);
    const displayWorldview = sanitizeDisplayText(rawWorldview, storyBackground || effectiveWorldview || worldview);
    const storyCoreSynopsis = sanitizeDisplayText(rawStoryCoreSynopsis, coreSynopsis || synopsis);
    // 第 5 步后续接入明确时代标签时，这里会优先使用真实选择；当前无显式时代时才回退现代都市。
    const displayEraTags = summary.scriptType === "short_drama" ? [eraBackground] : [];
    const displayTagGroups = buildDisplayTagGroups(summary.scriptType, variant, {
      audience: [normalizedAudience],
      era: displayEraTags,
      genres:
        summary.scriptType === "short_drama"
          ? [genreTypes, ...commonTags.genres]
          : [worldTypeLabel, genreTypes, ...commonTags.genres],
      coreSettings:
        summary.scriptType === "short_drama"
          ? [openingChoiceLabel, emotionalChoiceLabel, protagonistChoiceLabel, villainLabel]
          : [protagonistStartLabel, coreMechanismLabel],
      styleElements:
        summary.scriptType === "short_drama"
          ? [upgradeStyleLabel, ...commonTags.styleTags]
          : [upgradeStyleLabel, ...commonTags.styleTags],
    });
    if (process.env.NODE_ENV !== "production") {
      console.debug("[InspirationDisplayTags]", {
        scriptType: summary.scriptType,
        scenarioId: variant.variantId,
        displayTagGroups,
        rawSelectedStepLabels: {
          audience: summary.targetAudience?.label,
          step1: summary.steps.audience?.label,
          step2: summary.steps.topicDirection?.label,
          step3: summary.steps.openingHook?.label,
          step4: summary.steps.villainPreference?.label,
          step5: summary.steps.paymentHook?.label,
        },
        explicitEra: summary.mergedTags.eraTags[0] || "",
        fallbackEraUsed:
          summary.scriptType === "short_drama" &&
          displayEraTags[0] === "现代都市" &&
          summary.mergedTags.eraTags.length === 0,
        genreDerivationReason:
          summary.scriptType === "ai_comic"
            ? (worldTypeLabel ? "step1-world-type" : "fallback")
            : (commonTags.genres.length > 0 ? "merged-genres" : "fallback"),
      });
    }
    const scriptPlan = buildScriptPlan({
      scriptType: summary.scriptType,
      audienceLabel: normalizedAudience,
      topicLabel: coreHighlight,
      synopsis: storyCoreSynopsis,
      coreSynopsis: storyCoreSynopsis,
      highlight: coreHighlight,
      worldview: displayWorldview,
      storyBackground,
      coreSetting: coreSettings,
      mainlineAnchors,
      phaseStrategy,
      beatPool,
      styleTags: commonTags.styleTags,
      mode: archetype === "commercial" ? "primary" : "secondary",
      intentHints,
      isRuleWeird,
    });

    return {
      planName,
      storyTitle: scenarioTitle,
      synopsis,
      coreSynopsis: storyCoreSynopsis,
      keyPoints,
      plan: {
        title: scenarioTitle,
        audiences: commonTags.audiences,
        genres: commonTags.genres,
        coreHooks: commonTags.coreHooks,
        styleTags: commonTags.styleTags,
        generationHints,
        baseStepTags,
        variantId: variant.variantId,
        variantName: variant.variantName,
        variantTags: variant.overlayTags,
        scenarioTagBundle: buildScenarioTagBundle(baseStepTags, variant).scenarioTagBundle,
        displayTagGroups,
        targetAudience: normalizedAudience,
        eraBackground,
        genreTypes,
        coreSettings,
        coreHighlight,
        highlight: coreHighlight,
        storyBackground,
        coreSetting: coreSettings,
        worldview: displayWorldview,
        oneLineStory: storyCoreSynopsis,
        coreSynopsis: storyCoreSynopsis,
        premise: storyCoreSynopsis,
        userPremise: buildPlanUserPremise(summary, isRuleWeird ? ruleText!.synopsis : synopsis),
        mainlineAnchors,
        phaseStrategy,
        beatPool,
        projectBrief,
        scriptPlan,
      },
    };
  };

  const commercialPlan = buildScenario(
    "A. 爆款稳态款",
    "原创项目",
    summary.scriptType === "short_drama"
      ? `${openingChoiceLabel || "开场爆点"}里，${protagonistChoiceLabel || "主角身份"}被${emotionalChoiceLabel || "人物关系"}推到台前，靠${villainLabel || "翻盘机制"}第一次翻身。`
      : `${worldTypeLabel || "世界类型"}里，${protagonistStartLabel || "主角起点"}拿到${coreMechanismLabel || "核心机制"}，沿着${upgradeStyleLabel || "升级流"}一路升级并面对代价。`,
    summary.scriptType === "short_drama"
      ? `${openingChoiceLabel || "开场爆点"}把${protagonistChoiceLabel || "主角"}推到冲突中心，${emotionalChoiceLabel || "人物关系"}持续制造关系压力；主角借${villainLabel || "翻盘机制"}完成第一次公开反击。`
      : `${worldTypeLabel || "世界类型"}世界里，${coreMechanismLabel || "核心机制"}带来机制爽点，${upgradeStyleLabel || "升级流"}、规则代价和视觉奇观共同制造追更动力。`,
    summary.scriptType === "short_drama"
      ? `现代都市的公开场合中，${protagonistChoiceLabel || "主角身份"}因${openingChoiceLabel || "开场爆点"}被推到关系和舆论压力中心，并与${emotionalChoiceLabel || "人物关系"}形成持续误判与情感冲突。现实场域以家庭、职场、豪门或公共冲突为主，核心压力来自误判、利益压迫和关系失衡。`
      : `${worldTypeLabel || "世界类型"}世界里，力量、身份和资源由升级规则分配；${protagonistStartLabel || "主角起点"}处在体系边缘，直到${coreMechanismLabel || "核心机制"}打破原有秩序，每次升级都会引来更高层级敌人和身份暴露风险。`,
    summary.scriptType === "short_drama"
      ? `${protagonistChoiceLabel || "主角"}在${openingChoiceLabel || "开场爆点"}中被迫站到众人对立面，和${emotionalChoiceLabel || "人物关系"}形成持续关系压力。主角表面退让，实际目标是夺回主动权，并准备借${villainLabel || "翻盘机制"}一步步反击。第一次公开反击后，更大的幕后压力被推到台前，为下一阶段反转留下追更钩子。`
      : `${worldTypeLabel || "世界类型"}世界里，力量、身份和资源由升级规则分配；${protagonistStartLabel || "主角起点"}处在体系边缘，直到${coreMechanismLabel || "核心机制"}打破原有秩序，每次升级都会引来更高层级敌人和身份暴露风险。`,
    commercialSelection,
    "commercial",
    summary.scriptType === "short_drama"
      ? [
          `核心看点：${openingDirection}直接打出第一波爽点。`,
          `核心看点：${villainDirection}持续压迫，让反击更快更狠。`,
          `核心看点：${paymentDirection}把追更承诺前置。`,
        ]
      : [
          `核心看点：${openingDirection}先建立视觉抓手。`,
          `核心看点：${villainDirection}把规则压迫与冲突推高。`,
          `核心看点：${paymentDirection}持续释放设定承诺。`,
        ],
    variantOverlays[0],
  );

  const characterPlan = buildScenario(
    "B. 强人设反差款",
    "人物反差原创项目",
    summary.scriptType === "short_drama"
      ? `${emotionalChoiceLabel || "人物关系"}先断裂，${protagonistChoiceLabel || "主角身份"}在${openingChoiceLabel || "开场爆点"}里一点点把自己找回来。`
      : `${protagonistStartLabel || "主角起点"}先失衡，${coreMechanismLabel || "核心机制"}在${worldTypeLabel || "世界类型"}里一点点把自己找回来。`,
    summary.scriptType === "short_drama"
      ? `${protagonistChoiceLabel || "主角身份"}表面被误判，${emotionalChoiceLabel || "人物关系"}持续加压；当${villainLabel || "翻盘机制"}被触发，关系错位会转化为情绪反击。`
      : `${protagonistStartLabel || "主角起点"}先被低估，${coreMechanismLabel || "核心机制"}逐步放大角色反差；${upgradeStyleLabel || "升级流"}让每次突破都带出新的身份风险。`,
    summary.scriptType === "short_drama"
      ? `${openingChoiceLabel || "开场爆点"}触发身份误判，${emotionalChoiceLabel || "人物关系"}让关系压力持续升级；主角真实能力被一步步看见，情绪回弹随公开反击一起到来。`
      : `${worldTypeLabel || "世界类型"}世界里，力量、身份和资源由升级规则分配；${protagonistStartLabel || "主角起点"}处在体系边缘，直到${coreMechanismLabel || "核心机制"}打破原有秩序，每次升级都会引来更高层级敌人和身份暴露风险。`,
    summary.scriptType === "short_drama"
      ? `${protagonistChoiceLabel || "主角"}在${openingChoiceLabel || "开场爆点"}中被迫站到众人对立面，和${emotionalChoiceLabel || "人物关系"}形成持续误判和关系压力。主角表面退让，实际目标是守住关键关系并夺回尊严，并准备借${villainLabel || "翻盘机制"}一步步夺回主动权。第一次公开反击后，幕后更大的压力被推到台前，为下一阶段反转留下追更钩子。`
      : `${protagonistStartLabel || "主角起点"}主角在${worldTypeLabel || "世界类型"}世界中获得${coreMechanismLabel || "核心机制"}，沿着${upgradeStyleLabel || "升级流"}不断突破。但每次突破都会放大身份暴露和规则反噬风险，迫使主角在升级、隐藏和反击之间做选择，并用能力爆发与规则变化制造连续追更钩子。`,
    characterSelection,
    "character",
    summary.scriptType === "short_drama"
      ? [
          `核心看点：${protagonistDirection}的身份压力更强，人物更有记忆点。`,
          `核心看点：${villainDirection}带来误判和压迫，拉出反差。`,
          `核心看点：${emotionalDirection}推动失去后夺回的情绪回弹。`,
        ]
      : [
          `核心看点：${protagonistDirection}先建立角色魅力。`,
          `核心看点：${villainDirection}提供压迫与反转条件。`,
          `核心看点：${emotionalDirection}让设定更像人物命运。`,
        ],
    variantOverlays[1],
  );

  const differentiatedPlan = buildScenario(
    "C. 脑洞差异化款",
    "高设定原创项目",
    summary.scriptType === "short_drama"
      ? `${openingChoiceLabel || "开场爆点"}不只是冲突开场，还会引出${protagonistChoiceLabel || "主角身份"}背后的隐藏真相。`
      : `${worldTypeLabel || "世界类型"}里的规则变化先立起来，再让${coreMechanismLabel || "核心机制"}推动主角破局。`,
    summary.scriptType === "short_drama"
      ? `${openingChoiceLabel || "开场爆点"}不是单纯冲突，而是引出身份误判和关系反转；主角借${villainLabel || "翻盘机制"}逐步翻盘，让观众持续追问他还藏着什么。`
      : `${worldTypeLabel || "世界类型"}世界里，${coreMechanismLabel || "核心机制"}不断改变规则边界；${upgradeStyleLabel || "升级流"}、机制代价和视觉变化共同形成追更看点。`,
    summary.scriptType === "short_drama"
      ? `现代都市的公开冲突中，${protagonistChoiceLabel || "主角"}因${openingChoiceLabel || "开场爆点"}被卷入关系误判，${emotionalChoiceLabel || "人物关系"}让外部压力持续加码。随着隐藏真相浮出水面，现实压力和关系反转一起推动故事升级。`
      : `${worldTypeLabel || "世界类型"}世界里，规则变化先制造异常秩序；${protagonistStartLabel || "主角起点"}借${coreMechanismLabel || "核心机制"}逐步打破旧秩序，让能力爆发和身份风险一起进入主线。`,
    summary.scriptType === "short_drama"
      ? `${protagonistChoiceLabel || "主角"}在${openingChoiceLabel || "开场爆点"}中被迫站到众人对立面，和${emotionalChoiceLabel || "人物关系"}形成持续误判和外部压力。主角表面退让，实际目标是查清真相并夺回主动权，并准备借${villainLabel || "翻盘机制"}逐步反击。第一次公开反击后，更大的隐藏真相被推到台前，为下一阶段反转留下追更钩子。`
      : `${protagonistStartLabel || "主角起点"}主角在${worldTypeLabel || "世界类型"}世界中意外获得${coreMechanismLabel || "核心机制"}，能够沿着${upgradeStyleLabel || "升级流"}快速突破。但每次使用机制都会引来规则变化、身份暴露或更高层级敌人，主角从低阶试探一路升级，并用能力爆发、规则变化和公开反转制造连续追更钩子。`,
    differentiatedSelection,
    "differentiated",
    summary.scriptType === "short_drama"
      ? [
          `核心看点：${differentiatedSelection.genre?.label || "差异化题材"}把现实切口做成新鲜入口。`,
          `核心看点：${differentiatedSelection.coreSetting?.label || "设定"}提供记忆点。`,
          `核心看点：${differentiatedSelection.visual?.label || "视觉元素"}放大可看性。`,
        ]
      : [
          `核心看点：${differentiatedSelection.genre?.label || "规则怪谈"}建立高概念差异化。`,
          `核心看点：${differentiatedSelection.coreSetting?.label || "高设定"}拉开和主流款的距离。`,
          `核心看点：${differentiatedSelection.visual?.label || "大场面"}让记忆点更明确。`,
        ],
    variantOverlays[2],
  );

  return [commercialPlan, characterPlan, differentiatedPlan];
}
