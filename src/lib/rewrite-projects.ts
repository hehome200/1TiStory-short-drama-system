import { mergeProviderConfig } from "@/lib/provider-config";
import { localDb } from "@/lib/local-db/database";
import type { RewriteDraft, RewriteProjectRecord } from "@/lib/types";

export const REWRITE_PROJECTS_STORAGE_KEY = "storyplay-clone-rewrite-projects";
export const CURRENT_REWRITE_PROJECT_ID_STORAGE_KEY =
  "storyplay-clone-current-rewrite-project-id";
let rewriteProjectCache: RewriteProjectRecord[] | null = null;
let rewriteHydrationPromise: Promise<void> | null = null;

export const INITIAL_REWRITE_DRAFT: RewriteDraft = {
  title: "总裁爹地，还我妈咪来",
  infoFlow: {
    sourceFileName: "",
    sourceText: "",
    uploaded: false,
    format: "",
    sourceTitle: "总裁爹地，还我妈咪来",
    sourceSynopsis:
      "六年前，凌希被父亲凌江下药，意图送给生意伙伴张庸。她侥幸逃脱，却误入沈氏集团继承人沈敛的房间，一夜后怀上孩子凌越。回到家中后，母亲离奇死亡，父亲携情妇崔丽丽及私生女凌依依登堂入室，凌希被迫远走他乡。",
    keyNodes:
      "下药、逃房、一夜情、怀孕、母亲死亡、六年后归来、豪门复仇、神医身份、萌宝认亲",
    overview: {
      audience: "",
      genres: "",
      coreHooks: "",
      styleTags: "",
      worldview: "",
      highlight: "",
      premise: "",
    },
    characters: [],
    macro: {
      content: "",
    },
    episodes: {
      episodes: [],
    },
  },
  overview: {
    audience: "男频",
    genre: "都市职场",
    coreHooks: ["身份反转", "人物逆袭", "隐藏大佬", "萌宝", "神医"],
    styleTags: ["爽文虐渣", "打脸复仇", "萌宠", "隐藏大佬"],
    worldview:
      "现代都市中，顶尖医术与黑客技术是凌驾于财富与权力之上的硬通货。当零神医为复仇伪装成痴傻丑女，带着天才萌宝潜入豪门时，一场围绕家族秘辛、商业阴谋与情感博弈的暗战悄然拉开序幕。",
    highlight:
      "装傻丑女实为隐藏神医，携天才萌宝嫁入豪门复仇，打脸渣爹继母，却被残疾霸总识破身份，联手追凶发现真凶竟是身边人。",
    premise:
      "六年前，凌希被父亲凌江下药，意图送给生意伙伴张庸。她侥幸逃脱，却误入沈氏集团继承人沈敛的房间，一夜情后怀上孩子凌越。回到家中后，面对的却是母亲离奇死亡、父亲携情妇崔丽丽及私生女凌依依登堂入室的残酷现实。",
  },
  characters: [
    {
      id: "shen-lian",
      name: "沈敛",
      role: "男主",
      gender: "male",
      age: 27,
      traits: "冷酷霸道、心思缜密",
      background:
        "沈氏集团继承人，早年被叔叔下药导致双腿残疾。六年前与凌希有过一夜情，之后一直寻找那个女人，同时渴望找到零神医治好腿疾。",
      relationToMaleLead: "unknown",
      relationToFemaleLead: "likes_female_lead",
      relationshipTags: ["male_character", "likes_female_lead"],
    },
    {
      id: "ling-xi",
      name: "凌希",
      role: "女主",
      gender: "female",
      age: 24,
      traits: "隐忍聪慧、医术高超",
      background:
        "六年前遭父亲下药后逃离凌家，隐姓埋名成长为神秘医者“零神医”，带着儿子凌越回国，为母亲之死复仇。",
      relationToMaleLead: "likes_male_lead",
      relationToFemaleLead: "unknown",
      relationshipTags: ["female_character", "likes_male_lead"],
    },
    {
      id: "ling-yue",
      name: "凌越",
      role: "萌宝",
      gender: "unknown",
      age: 6,
      traits: "机灵毒舌、护妈狂魔",
      background: "凌希与沈敛的儿子，天赋极高，是推动男女主破冰的重要纽带。",
      relationToMaleLead: "male_lead_backer",
      relationToFemaleLead: "female_lead_backer",
      relationshipTags: ["family_pressure"],
    },
  ],
  outlines: {
    macro: "",
    episodes: [
      "第1集：凌希被父亲凌江下药后逃到皇星酒店，为躲避张庸的追逐闯入101房间，黑暗中与双腿残疾的沈敛发生关系。",
      "第2集：凌江怒斥凌希在外鬼混，真情人崔丽丽更污蔑凌希母亲偷情被撞死。六年后，凌希以丑女傻女身份带着儿子潜入凌家。",
      "第3集：凌希告知儿子凌越自己要去沈家调查外婆死因，凌依依与崔丽丽突然出现，强行带走凌越。",
    ],
    stageLabels: ["起\n1-10", "承\n11-30", "转\n-", "合\n-"],
  },
  script: {
    episode: "第1集",
    content:
      "1-1 夜 内 皇星酒店-走廊\n人物：凌希、张庸\n△凌希衣衫不整，脸颊泛着不正常的潮红，眼神迷离。\n△她扶着墙壁，踉跄地在酒店走廊里奔跑，身体燥热难耐。\n凌希OS：好热……身体……不听使唤了……\n【闪回开始】\n△豪华餐厅包间，父亲凌江端着一杯红酒递给凌希。\n凌江（慈爱）：希希，喝了这杯，张总的合作就稳了。\n△凌希接过酒杯，一饮而尽。\n【闪回结束】\n△凌希头痛欲裂，身后传来油腻的呼喊声。\n张庸vo：小美人儿，别跑啊！你爸可把你交给我了！",
  },
};

export function createRewriteProjectRecord(
  partial?: Partial<RewriteProjectRecord>,
): RewriteProjectRecord {
  const title = partial?.title ?? INITIAL_REWRITE_DRAFT.title;
  const draft = partial?.draft ?? { ...INITIAL_REWRITE_DRAFT, title };

  return {
    id:
      partial?.id ??
      `rewrite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    draft,
    providerConfig: mergeProviderConfig(partial?.providerConfig),
    updatedAt: partial?.updatedAt ?? new Date().toISOString(),
  };
}

export function loadRewriteProjects() {
  if (typeof window === "undefined") {
    return [];
  }

  if (rewriteProjectCache) {
    return rewriteProjectCache;
  }

  const cached = window.localStorage.getItem(REWRITE_PROJECTS_STORAGE_KEY);
  if (!cached) {
    return [];
  }

  try {
    const parsed = JSON.parse(cached) as RewriteProjectRecord[];
    rewriteProjectCache = parsed.length ? parsed : [];
    return rewriteProjectCache;
  } catch {
    return [];
  }
}

export function loadCurrentRewriteProjectId(projects: RewriteProjectRecord[]) {
  if (typeof window === "undefined") return projects[0]?.id ?? "";

  const cached = window.localStorage.getItem(CURRENT_REWRITE_PROJECT_ID_STORAGE_KEY);
  if (cached && projects.some((item) => item.id === cached)) {
    return cached;
  }

  return projects[0]?.id ?? "";
}

export function loadRewriteWorkspace() {
  const projects = loadRewriteProjects();
  const currentProjectId = loadCurrentRewriteProjectId(projects);

  return {
    projects,
    currentProjectId,
  };
}

export function saveRewriteProjects(projects: RewriteProjectRecord[]) {
  rewriteProjectCache = projects.map((project) => ({
    ...project,
    providerConfig: mergeProviderConfig(project.providerConfig),
  }));
  window.localStorage.setItem(REWRITE_PROJECTS_STORAGE_KEY, JSON.stringify(rewriteProjectCache));
  void persistRewriteProjectsToIndexedDb(rewriteProjectCache).catch((error) => {
    console.warn("[rewrite-projects] persist to IndexedDB failed", error);
  });
}

async function persistRewriteProjectsToIndexedDb(projects: RewriteProjectRecord[]) {
  if (typeof window === "undefined") return;
  await localDb.transaction("rw", localDb.projects, async () => {
    await localDb.projects.where("kind").equals("rewrite").delete();
    for (const project of projects) {
      await localDb.projects.put({
        id: project.id,
        kind: "rewrite",
        title: project.title,
        projectType: "rewrite",
        createdAt: project.updatedAt,
        updatedAt: project.updatedAt,
        payload: JSON.stringify(project),
      });
    }
  });
}

export async function hydrateRewriteWorkspace() {
  if (typeof window === "undefined") return [];
  if (!rewriteHydrationPromise) {
    rewriteHydrationPromise = (async () => {
      const rows = await localDb.projects.where("kind").equals("rewrite").toArray();
      const projects = rows
        .map((row) => {
          try {
            return JSON.parse(row.payload) as RewriteProjectRecord;
          } catch {
            return null;
          }
        })
        .filter((item): item is RewriteProjectRecord => Boolean(item));
      if (projects.length > 0) {
        rewriteProjectCache = projects;
        window.localStorage.setItem(REWRITE_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      }
    })();
  }
  await rewriteHydrationPromise;
  return rewriteProjectCache ?? [];
}
