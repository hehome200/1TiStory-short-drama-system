import type {
  AdaptDraft,
  AdaptChapterDraft,
  Character,
  CharacterProfileCard,
  InputVisibility,
  OutlineDraft,
  OutlineExtractionResult,
  OutlineFactSheet,
  OutlineMacroExtraction,
  OverviewDraft,
  RewriteDraft,
  RewriteOutlineDraft,
  RewriteOverviewDraft,
  RewriteScriptDraft,
  ScriptDraft,
} from "@/lib/types";
import type {
  CharacterProfileExtraction,
  StructuredSummaryExtraction,
} from "@/lib/ai/types";

export function createOverviewDraft(overview: OverviewDraft): OverviewDraft {
  const audience = overview.audience || "男频";
  const genreArray = Array.isArray(overview.genres) ? overview.genres : [];
  const genres = genreArray.length > 0
    ? genreArray[0]
    : "东方玄幻";
  const hooks = Array.isArray(overview.coreHooks) ? overview.coreHooks.join(",") : overview.coreHooks || "穿越、系统、赘婿逆袭";
  const styles = Array.isArray(overview.styleTags) ? overview.styleTags.join(",") : overview.styleTags || "打脸、反转、爽感";

  return {
    ...overview,
    worldview:
      overview.worldview ||
      `${genres}世界以血脉、灵根和宗门秩序为尊，强者垄断资源，家族联姻被当成巩固利益的工具。主角意外获得一套能把他人负面情绪转化为修为与宝物的系统，从此打破旧有秩序。`,
    highlight:
      overview.highlight ||
      `主角表面是任人羞辱的废柴赘婿，实则拿着"情绪变现"的外挂系统，在最丢脸的退婚现场完成第一次反杀。整体风格强调${styles}，每次升级都绑定一次公开打脸与身份反转。`,
    premise:
      overview.premise ||
      `现代社畜穿进${audience}${genres}世界，成了大婚当天被当众退婚的废柴赘婿。面对满堂羞辱，他激活了以吸收愤怒、嫉妒、轻蔑等情绪为力量来源的系统，从退婚局开始一路逆袭，在复仇和成长中掀翻旧秩序。核心卖点围绕${hooks}展开。`,
  };
}

export function createCharacterDrafts(
  overview: OverviewDraft,
  existing: Character[],
): Character[] {
  if (existing.length) return existing;

  const names = [
    ["lin-xiao", "林宵", "男主", 22, "表面玩世不恭、实则机敏腹黑、越挫越狠"],
    ["ye-qingxue", "叶清雪", "女主", 21, "高冷克制、眼里容不得废物、外冷内热"],
    ["ye-lingyun", "叶凌云", "反派天才", 24, "自负阴狠、极端好胜、把所有人都当垫脚石"],
    ["su-muyao", "苏沐瑶", "盟友", 20, "聪明泼辣、善于试探、关键时刻很可靠"],
    ["system", "系统精灵", "外挂引导", 18, "嘴甜话多、爱拱火、擅长激发情绪值"],
  ] as const;

  return names.map(([id, name, role, age, traits]) => ({
    id,
    name,
    role,
    gender: role.includes("女") ? "female" : role.includes("男") ? "male" : "unknown",
    age,
    traits,
    background: `${name}是《${overview.premise.slice(0, 10) || "原创剧本"}》中的${role}。TA 与主线冲突强绑定，会推动剧情持续升级。结合当前设定，TA 将围绕"退婚风波、系统升级、家族利益与身份反转"持续制造戏剧张力。`,
    relationToMaleLead: role.includes("反派")
      ? "male_lead_antagonist"
      : role.includes("盟友") || role.includes("外挂") || role.includes("主角")
        ? "male_lead_backer"
        : "unknown",
    relationToFemaleLead: role.includes("反派")
      ? "female_lead_rival"
      : role.includes("女")
        ? "likes_female_lead"
        : "unknown",
    relationshipTags: role.includes("反派")
      ? ["male_lead_antagonist", "family_pressure"]
      : role.includes("盟友")
        ? ["male_lead_backer"]
        : role.includes("女")
          ? ["female_character"]
          : ["unknown"],
  }));
}

export function createOutlineDraft(
  _overview: OverviewDraft,
  characters: Character[],
  range: string,
): OutlineDraft {
  const lead = characters[0]?.name || "主角";
  const rival = characters[2]?.name || "宿敌";
  const heroine = characters[1]?.name || "女主";

  return {
    range,
    macro: `${lead}在退婚局上完成第一次反杀，借系统吸收全场负面情绪完成破境；随后他为了查清原身被废与赘婚背后的利益链，主动卷入家族斗争与宗门试炼。${heroine}从轻蔑旁观到逐渐怀疑${lead}另有身份，${rival}则把${lead}视为眼中钉，多次试图提前扼杀。前十集聚焦立威、立人设、立关系，并把"系统升级规则"和"更高层势力"的悬念抛出来。`,
    characterText: "",
    episodes: [
      `第 1 集：${lead}在大婚现场醒来，意识到自己穿成了废柴赘婿，被${heroine}当众退婚。系统激活，他借口舌反杀，点燃全场怒火并完成首次升级。`,
      `第 2 集：${lead}强撑场面，逼出婚书背后的隐藏条款，当众拆穿叶家双标。${rival}出手镇压，反而让${lead}吸满情绪值，爆出更强底牌。`,
      `第 3 集：${lead}回到偏院，整理原身记忆，发现自己被废并非意外。系统精灵首次解释完整规则，提示真正危机来自更高层布局。`,
      `第 4 集：${lead}借一次街头冲突验证新能力，顺手救下关键盟友，得到进入宗门外门试炼的机会。`,
      `第 5 集：${heroine}开始重新审视${lead}，怀疑他隐藏了真实天赋。${rival}安排爪牙试探，试图逼出${lead}底牌。`,
      `第 6 集：${lead}在家族议事上利用情绪值反制长辈，争下修炼资源与行动自由。原本轻视他的人开始动摇。`,
      `第 7 集：${lead}追查当年被废的线索，锁定一位掌管药库的关键人物，发现此事牵扯到跨家族交易。`,
      `第 8 集：${lead}首次进入试炼秘境，用看似胡闹的方式破局，赢得一批支持者，也彻底激怒${rival}。`,
      `第 9 集：${heroine}与${lead}被迫短暂联手，共同面对外敌围杀。两人的关系从针锋相对开始出现裂缝。`,
      `第 10 集：${lead}在众目睽睽下完成一次越阶反杀，坐实"废物崛起"的名号，同时抛出更大的幕后黑手悬念。`,
    ],
    stageLabels: ["起\n1", "承\n-", "转\n-", "合\n-"],
  };
}

export function createScriptDraft(
  _overview: OverviewDraft,
  characters: Character[],
  _outlines: OutlineDraft,
  episode: string,
): ScriptDraft {
  const lead = characters[0]?.name || "林宵";
  const heroine = characters[1]?.name || "叶清雪";
  const rival = characters[2]?.name || "叶凌云";

  return {
    episode,
    content: `1-1 日 内 叶家大堂\n人物：${lead}、${heroine}、${rival}、宾客若干\n\n【镜头】鼓乐喧天，红绸高挂，满堂宾客正等着看一出热闹。\n${lead}猛地睁眼，头痛欲裂，视线从模糊到清晰，低头看见自己身上的喜服，心里一沉。\n${lead}OS：我刚刚不是在公司通宵改方案吗？\n\n宾客甲：醒了？叶家的废柴赘婿竟然还敢在大婚礼上睡着。\n宾客乙：可惜啊，今天之后他连赘婿都做不成了。\n\n【镜头】高台之上，${heroine}缓缓起身，神色清冷，手里捏着一封退婚书。\n${heroine}：${lead}，你灵根尽毁，前途断绝，我不可能把余生交给一个废人。\n\n全场哄笑，讥讽声四起。${lead}脑海一阵轰鸣，大量陌生记忆涌入。\n机械音：检测到宿主承受高强度负面情绪，"最强情绪值系统"绑定成功。\n\n${lead}微微一怔，随即唇角一勾。\n${lead}：退婚可以，但你拿着叶家祖辈求来的婚约，在这儿装得像施舍，未免太把自己当回事了。\n\n【镜头】全场骤静，随即怒火暴涨。\n系统精灵：叮，收集轻蔑值、愤怒值、震惊值，宿主修为提升。\n\n${rival}冷笑着迈出一步。\n${rival}：一个废物，也敢在这里大放厥词？\n${lead}抬眼看他，声音更冷。\n${lead}：你算什么东西？一个靠家族资源堆出来的样板货，也配替她说话？\n\n人群再度炸锅。${lead}感受到体内灵力开始恢复，心跳愈发沉稳。\n${lead}OS：既然来了，那就从这场退婚开始，把他们的脸一个一个踩回去。\n\n【钩子】${lead}当众亮出婚书背面的隐藏印记，整座叶家大堂瞬间鸦雀无声。`,
  };
}

export function createRewriteOverviewDraft(
  draft: RewriteDraft,
): RewriteOverviewDraft {
  return {
    audience: draft.overview.audience || "女频",
    genre: draft.overview.genre || "都市职场",
    coreHooks:
      draft.overview.coreHooks.length > 0
        ? draft.overview.coreHooks
        : ["身份反转", "隐藏大佬", "萌宝", "神医"],
    styleTags:
      draft.overview.styleTags.length > 0
        ? draft.overview.styleTags
        : ["爽文虐渣", "打脸复仇", "甜虐交织"],
    worldview:
      draft.overview.worldview ||
      "现代都市中，资本、医学与家族秘密相互缠绕。豪门婚约与继承权争夺的背后，隐藏着旧案、替身、亲缘错位和身份反转。",
    highlight:
      draft.overview.highlight ||
      "落魄女主带娃回归、隐瞒神医身份复仇，和表面冷厉实则深情的总裁在误会与合作中逐步揭开真相，持续制造打脸、认亲和身份翻盘。",
    premise:
      draft.overview.premise ||
      `${draft.infoFlow.sourceSynopsis || "女主被亲人算计后逃离，多年后带娃归来"}。改写为短剧后，前期聚焦误会与羞辱，中段强化复仇、认亲、情感拉扯，后段揭露旧案真凶并完成情感与身份双反转。`,
  };
}

export function createRewriteInfoFlowDraft(draft: RewriteDraft): RewriteDraft["infoFlow"] {
  const sourceText = draft.infoFlow.sourceText || draft.infoFlow.sourceSynopsis || "";
  const titleSeed = draft.infoFlow.sourceTitle || draft.title || "剧本改写项目";
  const synopsisSeed = sourceText.replace(/\s+/g, " ").trim();

  return {
    sourceFileName: draft.infoFlow.sourceFileName,
    sourceText: draft.infoFlow.sourceText,
    uploaded: draft.infoFlow.uploaded,
    format: draft.infoFlow.format,
    sourceTitle: titleSeed,
    sourceSynopsis:
      draft.infoFlow.sourceSynopsis ||
      (synopsisSeed
        ? `${synopsisSeed.slice(0, 220)}${synopsisSeed.length > 220 ? "..." : ""}`
        : "导入剧本后，AI 会在这里提炼一段适合短剧改写的剧情信息流摘要。"),
    keyNodes:
      draft.infoFlow.keyNodes ||
      "身份反转、情感拉扯、家庭旧案、豪门冲突、打脸反击、关系反转",
    overview: {
      audience: draft.infoFlow.overview.audience || "女频",
      genres: draft.infoFlow.overview.genres || "都市职场、豪门恩怨",
      coreHooks: draft.infoFlow.overview.coreHooks || "身份反转、隐藏大佬、萌宝",
      styleTags: draft.infoFlow.overview.styleTags || "爽文虐渣、打脸复仇、甜宠",
      worldview: draft.infoFlow.overview.worldview || "现代都市中，顶尖医术与黑客技术是凌驾于财富与权力之上的硬通货。当零神医为复仇伪装成痴傻丑女，带着天才萌宝潜入豪门时，一场围绕家族秘辛、商业阴谋与情感博弈的暗战悄然拉开序幕。",
      highlight: draft.infoFlow.overview.highlight || "装傻丑女实为隐藏神医，携天才萌宝嫁入豪门复仇，打脸渣爹继母，却被残疾霸总识破身份，联手追凶发现真凶竟是身边人。",
      premise: draft.infoFlow.overview.premise || synopsisSeed || "六年前，凌希被父亲凌江下药，意图送给生意伙伴张庸。她侥幸逃脱，却误入沈氏集团继承人沈敛的房间，一夜情后怀上孩子凌越。回到家中后，面对的却是母亲离奇死亡、父亲携情妇崔丽及私生女凌依依登堂入室的残酷现实。",
    },
    characters: draft.infoFlow.characters.length > 0 ? draft.infoFlow.characters : [
      {
        id: "infoflow-shen",
        name: "沈敛",
        age: 27,
        traits: "冷酷霸道、心思缜密、深情克制",
        background: "沈氏集团继承人，早年遭暗算导致双腿残疾。一直在追查六年前那个改变命运的女人，并暗中布局清除家族内鬼。",
      },
      {
        id: "infoflow-lingxi",
        name: "凌希",
        age: 25,
        traits: "隐忍倔强、聪明敏锐、外柔内刚",
        background: "六年前被亲人陷害，意外怀孕后远走他乡，如今带着孩子回归，以伪装身份接近真相并展开复仇。",
      },
      {
        id: "infoflow-lingyue",
        name: "凌越",
        age: 5,
        traits: "机灵可爱、嘴甜心细、神助攻",
        background: "凌希的孩子，天生和沈敛气场契合，是推动认亲、融化情感关系的重要纽带。",
      },
      {
        id: "infoflow-cuili",
        name: "崔丽",
        age: 45,
        traits: "唯利是图、目光短浅、心狠手辣",
        background: "凌江的情人，带着私生女闯入凌家，拿着伪造的亲子鉴定图谋凌家财产。",
      },
      {
        id: "infoflow-lingjiang",
        name: "凌江",
        age: 54,
        traits: "性格软弱、见风使舵、自私自利",
        background: "凌希的父亲，入赘凌家。为了利益和情人勾结，给凌希下药想将她送给生意伙伴。",
      },
      {
        id: "infoflow-yayu",
        name: "娅玉",
        age: 24,
        traits: "阴险狠毒、偏执自私",
        background: "沈敛的青梅竹马，被沈敛当作妹妹。六年前意外撞死凌希的母亲，为掩盖真相逃亡国外。",
      },
    ],
    macro: {
      content: draft.infoFlow.macro.content || "六年前，凌希被父亲下药，意图送给生意伙伴。她侥幸逃脱，却误入沈氏集团继承人沈敛的房间，一夜情后怀上孩子凌越。凌希回到家中，面对的是母亲离奇死亡、父亲携情妇及私生女登堂入室。为调查母亲死因，凌希隐藏自己'零神医'的身份，伪装成被毒傻的丑女，带着五岁的天才儿子凌越重返凌家。崔丽母女为逃避与残疾沈敛的婚约，将凌希替嫁到沈家。凌希将计就计进入沈家，儿子凌越为留在母亲身边，谎称能治好沈敛的腿疾。在凌越'治疗'失误的危急关头，凌希被迫出手，精湛医术暴露了她装傻的事实，也被沈敛认出她就是六年前的女人以及传闻中的零神医。两人达成交易：凌希为沈敛治腿，沈敛帮凌希追查母亲车祸真相。在订婚宴上，凌希当众撕下伪装，痛打崔丽母女，揭露父亲下药丑行。沈敛也奇迹般站起，强势护妻。然而，调查深入后他们发现，撞死凌母的沈氏车辆背后，凶手竟是一直爱慕沈敛的青梅竹马娅玉。最终，凌希与沈敛联手，在揭露家族内部下毒黑手（沈敛叔叔）的同时，也将杀害凌母的真凶娅玉绳之以法，两人在并肩作战中感情升温，与萌宝凌越组成幸福家庭。",
    },
    episodes: {
      episodes: draft.infoFlow.episodes.episodes.length > 0 ? draft.infoFlow.episodes.episodes : [
        "第 1 集：凌希带着儿子凌越回国，在机场与沈敛狭路相逢。凌越机智化解危机，沈敛对这个孩子产生莫名好感。",
        "第 2 集：崔丽母女逼迫凌希替嫁，凌希将计就计。新婚夜，凌希装傻充愣，沈敛冷眼旁观。",
        "第 3 集：凌越声称能治好沈敛的腿，开始'治疗'。沈敛半信半疑，暗中观察凌希。",
        "第 4 集：凌希医术暴露，沈敛认出她就是六年前的女人。两人达成交易，开始合作。",
        "第 5 集：凌江在宴会上羞辱凌希，被沈敛当场打脸。崔丽母女心生怨恨，策划新的阴谋。",
        "第 6 集：凌越通过黑客技术发现沈敛是自己的父亲，开始暗中助攻。",
        "第 7 集：娅玉回国，试图破坏凌希和沈敛的关系。凌希识破她的诡计，反将一军。",
        "第 8 集：沈敛的腿逐渐好转，家族内部反对声音出现。沈敛叔叔暗中使坏。",
        "第 9 集：凌希发现母亲车祸的线索，指向娅玉。娅玉狗急跳墙，试图伤害凌越。",
        "第 10 集：真相大白，娅玉和沈敛叔叔被绳之以法。沈敛在众人面前向凌希求婚，一家三口终于团聚。",
      ],
    },
  };
}

export function createRewriteCharacterDrafts(draft: RewriteDraft): Character[] {
  if (draft.characters.length >= 6) {
    return draft.characters;
  }

  return [
    {
      id: "rewrite-hero",
      name: "沈敛",
      role: "男主",
      gender: "male",
      age: 27,
      traits: "冷酷霸道、心思缜密、深情克制",
      background:
        "沈氏集团继承人，早年遭暗算导致双腿残疾。一直在追查六年前那个改变命运的女人，并暗中布局清除家族内鬼。",
      relationToMaleLead: "unknown",
      relationToFemaleLead: "likes_female_lead",
      relationshipTags: ["male_character", "likes_female_lead"],
    },
    {
      id: "rewrite-heroine",
      name: "凌希",
      role: "女主",
      gender: "female",
      age: 25,
      traits: "隐忍倔强、聪明敏锐、外柔内刚",
      background:
        "六年前被亲人陷害，意外怀孕后远走他乡，如今带着孩子回归，以伪装身份接近真相并展开复仇。",
      relationToMaleLead: "likes_male_lead",
      relationToFemaleLead: "unknown",
      relationshipTags: ["female_character", "likes_male_lead"],
    },
    {
      id: "rewrite-child",
      name: "凌越",
      role: "萌宝",
      gender: "unknown",
      age: 5,
      traits: "机灵可爱、嘴甜心细、神助攻",
      background:
        "凌希的孩子，天生和沈敛气场契合，是推动认亲、融化情感关系的重要纽带。",
      relationToMaleLead: "male_lead_backer",
      relationToFemaleLead: "female_lead_backer",
      relationshipTags: ["family_pressure"],
    },
    {
      id: "rewrite-antagonist",
      name: "崔丽",
      role: "核心反派",
      gender: "female",
      age: 46,
      traits: "势利狠毒、擅长伪装、控制欲强",
      background:
        "凌希继母，为了利益长期联手外人设计凌希母女，是旧案和豪门阴谋的重要参与者。",
      relationToMaleLead: "male_lead_antagonist",
      relationToFemaleLead: "female_lead_antagonist",
      relationshipTags: ["family_pressure", "faction_pressure"],
    },
    {
      id: "rewrite-rival",
      name: "凌江",
      role: "渣父",
      gender: "male",
      age: 50,
      traits: "自私懦弱、见风使舵、唯利是图",
      background:
        "凌希生父，早年卖女求荣，如今仍想利用凌希攀附豪门，对旧案真相知情却始终隐瞒。",
      relationToMaleLead: "male_lead_antagonist",
      relationToFemaleLead: "family_pressure",
      relationshipTags: ["family_pressure", "male_lead_antagonist"],
    },
    {
      id: "rewrite-aide",
      name: "温轩",
      role: "盟友",
      gender: "male",
      age: 29,
      traits: "沉稳靠谱、洞察力强、执行果断",
      background:
        "沈敛心腹助理，表面负责集团事务，实际也在调查六年前的真相，是男女主的关键桥梁。",
      relationToMaleLead: "male_lead_backer",
      relationToFemaleLead: "female_lead_backer",
      relationshipTags: ["male_lead_backer"],
    },
  ];
}

export function createRewriteOutlineDraft(draft: RewriteDraft): RewriteOutlineDraft {
  return {
    macro:
      draft.outlines.macro ||
      "女主凌希从被迫离开到带娃回归，以隐藏身份潜入权力核心调查旧案。她与沈敛从互相试探到联手破局，一边对抗原生家庭与豪门内斗，一边揭开孩子身世与当年真相，整体节奏围绕认亲、复仇、打脸和情感升温推进。",
    episodes:
      draft.outlines.episodes.length > 0
        ? draft.outlines.episodes
        : [
            "凌希被父亲凌江下药后逃到皇星酒店，与双腿残疾的沈敛发生关系。次日她回家发现母亲去世，自己也被逐出家门。",
            "六年后，凌希以丑女傻女伪装带着儿子凌越回到凌家隐忍生活。沈敛的手下仍在寻找当年的女人，双方命运再次交汇。",
            "凌希准备调查外婆死因，凌依依与崔丽突然出现强行带走凌越，并用孩子威胁她替嫁进入沈家。",
            "凌希在替嫁婚礼上意外暴露医术，开始被沈敛怀疑身份。崔丽母女则继续推动她沦为豪门笑柄。",
            "沈敛发现凌希的某些细节与六年前女人高度吻合，暗中试探。凌希为了救凌越被迫再次出手医治沈敛。",
            "凌江与崔丽担心旧案暴露，联手新的幕后势力准备除掉凌希。沈敛表面旁观，实则开始护她。",
            "凌越无意中说出关键线索，沈敛逐渐意识到孩子可能与自己有关。凌希则发现害死母亲的人并不止崔丽。",
            "凌希与沈敛短暂联手设局，反打崔丽母女一次，凌家颜面尽失。两人的情感开始升温。",
            "旧案核心证据现身，凌江试图销毁并嫁祸凌希。沈敛首次公开站队，豪门关系全面撕裂。",
            "亲子真相呼之欲出，幕后主使现身反扑。凌希与沈敛决定共同掀翻整场阴谋，为下一阶段大战埋钩。",
          ],
    stageLabels:
      draft.outlines.stageLabels.length > 0
        ? draft.outlines.stageLabels
        : ["起\n1 - 10", "承\n11 - 30", "转\n31 - 50", "合\n51 - 60"],
  };
}

export function createRewriteScriptDraft(draft: RewriteDraft): RewriteScriptDraft {
  return {
    episode: draft.script.episode || "第 1 集",
    content:
      draft.script.content ||
      `1-1 夜 内 皇星酒店 - 走廊\n人物：凌希、张庸\n\n△凌希衣衫不整，脸颊泛着不正常的潮红，跌跌撞撞冲进走廊。\n凌希 OS：好热……身体……不听使唤了……\n\n【闪回开始】\n△凌家豪华包厢内，父亲凌江端着一杯红酒逼近。\n凌江（慈爱伪装）：希希，喝了这杯，张总的合作就稳了。\n△凌希被迫灌酒，一饮而尽。\n【闪回结束】\n\n△身后传来油腻的呼喊声，张庸追了上来。\n张庸：小美人儿，别跑啊！你爸可把你交给我了！\n\n△凌希惊恐回头，推开旁边一扇虚掩的房门躲了进去。\n1-2 夜 内 皇星酒店 - 套房\n人物：凌希、沈敛\n\n△房内昏暗，轮椅上的男人正背对门口，气场冷厉。\n沈敛：谁？\n△凌希药性上涌，脚下一软扑向沈敛。\n△两人四目相对，气氛骤然失控。\n\n【钩子】\n△清晨，凌希慌乱离开，只留下半枚碎裂的玉坠；沈敛抬手捡起，眸色骤沉。`,
  };
}

export function createAdaptChapterDraft(draft: AdaptDraft): AdaptChapterDraft {
  const selectedChapters = draft.chapters.filter((item) => item.selected);
  const topChapters = selectedChapters.slice(0, 10);
  const title = draft.title || draft.sourceFileName.replace(/\.[^.]+$/, "");

  return {
    summary:
      draft.chapter.summary ||
      `${title}围绕${topChapters[0]?.title || "开篇"}展开，主角在连续冲突中被迫入局，随后在身份、关系和情节危机中不断升级，整体适合改成强钩子、强反转的短剧节奏。`,
    entries:
      draft.chapter.entries.length > 0
        ? draft.chapter.entries
        : topChapters.map(
            (chapter, index) =>
              `第${index + 1}章 ${chapter.title.replace(/^第.+?[章回节卷]\s*/, "")}\n${chapter.content.slice(0, 120)}...`,
          ),
    stageLabels:
      draft.chapter.stageLabels.length > 0 ? draft.chapter.stageLabels : ["1", "10"],
  };
}

export function createAdaptOverviewDraft(draft: AdaptDraft): RewriteOverviewDraft {
  const baseGenre = draft.format === "ai_short" ? "东方玄幻" : "古装情感";
  return {
    audience: draft.overview.audience || "男频",
    genre: draft.overview.genre || baseGenre,
    coreHooks:
      draft.overview.coreHooks.length > 0
        ? draft.overview.coreHooks
        : ["身份反转", "升级成长", "命运对抗"],
    styleTags:
      draft.overview.styleTags.length > 0
        ? draft.overview.styleTags
        : draft.format === "ai_short"
          ? ["高燃升级", "情绪拉满", "反转强钩"]
          : ["情绪写实", "关系拉扯", "古风宿命"],
    worldview:
      draft.overview.worldview ||
      "原著世界观被提炼为便于短剧呈现的核心舞台，保留最强设定、最高冲突和最清晰的阵营关系，让观众能快速进入情境。",
    highlight:
      draft.overview.highlight ||
      "保留网文原著最强爽点和人物命运感，在短时长内强化每集钩子、人物反差与情绪爆发点。",
    premise:
      draft.overview.premise ||
      `${draft.chapter.summary || "基于已选小说章节"}，提炼主线冲突、人物关系和核心目标，改编为节奏更强、镜头感更明确的短剧故事。`,
  };
}

export function createAdaptCharacterDrafts(draft: AdaptDraft): Character[] {
  if (draft.characters.length > 0) return draft.characters;

  return [
    {
      id: "adapt-hero",
      name: "陆见",
      role: "主角",
      gender: "male",
      age: 24,
      traits: "克制坚韧、心有执念、临场果断",
      background: "出身微末却意外卷入权势与旧案之争，因一次关键相遇踏入更危险的命运洪流。",
      relationToMaleLead: "unknown",
      relationToFemaleLead: "likes_female_lead",
      relationshipTags: ["male_character", "likes_female_lead"],
    },
    {
      id: "adapt-heroine",
      name: "李云妆",
      role: "女主",
      gender: "female",
      age: 22,
      traits: "聪慧隐忍、外柔内刚、背负秘密",
      background: "表面是受困局势的贵女，实则握有改变局面的关键真相，与主角命运交缠。",
      relationToMaleLead: "likes_male_lead",
      relationToFemaleLead: "unknown",
      relationshipTags: ["female_character", "likes_male_lead"],
    },
    {
      id: "adapt-rival",
      name: "裴执",
      role: "对手",
      gender: "male",
      age: 28,
      traits: "冷硬狠辣、城府极深、掌控欲强",
      background: "身处更高权力中心，既是主角的压迫者，也是推动剧情升级的主要阻力。",
      relationToMaleLead: "male_lead_antagonist",
      relationToFemaleLead: "female_lead_rival",
      relationshipTags: ["male_lead_antagonist", "faction_pressure"],
    },
  ];
}

export function createAdaptOutlineDraft(draft: AdaptDraft): RewriteOutlineDraft {
  return {
    macro:
      draft.outlines.macro ||
      `${draft.title}从原著章节中提炼出最核心的冲突线，前十集聚焦主角入局、关系建立、阶段性反转与更大阴谋抛出，整体以"起局 - 承压 - 反击 - 钩子"推进。`,
    episodes:
      draft.outlines.episodes.length > 0
        ? draft.outlines.episodes
        : Array.from({ length: 10 }, (_, index) => {
            const base = draft.chapter.entries[index] || draft.chapter.entries[0] || "主角在变局中被迫行动。";
            return `第${index + 1}集：${base}`;
          }),
    stageLabels:
      draft.outlines.stageLabels.length > 0
        ? draft.outlines.stageLabels
        : ["起\n1", "承\n-", "转\n-", "合\n-"],
  };
}

export function createAdaptScriptDraft(draft: AdaptDraft): RewriteScriptDraft {
  return {
    episode: draft.script.episode || "第 1 集",
    content:
      draft.script.content ||
      `1-1 日 外 安州城 - 王府\n人物：陆见、李云妆、侍从若干\n\n△鼓声低沉，王府内外戒备森严。\n△陆见立于廊下，望向被层层围住的内院，神情警惕。\n陆见 OS：这一步踏进去，便再没有回头路。\n\n△内院忽然传来女子痛呼与器物坠地之声。\n侍从：公主病势又重了！\n△陆见眸色一沉，快步上前。\n\n【钩子】\n△门帘被猛地掀开，李云妆抬眼与他对视，眼底竟藏着一抹早已认出他的震动。`,
  };
}

export function createMockMacroExtraction(
  _sourceText: string,
  currentMacro: string,
): OutlineMacroExtraction {
  const hasMacro = currentMacro.trim().length > 50;
  return {
    meta: {
      sourceType: hasMacro ? "半成型大纲" : "剧情梗概",
      episodeDetectionMode: "heuristic",
      narrativeMode: "linear",
      completenessLevel: hasMacro ? "medium" : "low",
      confidence: hasMacro ? 72 : 45,
      missingFields: hasMacro
        ? ["核心冲突可进一步明确"]
        : ["主线冲突不清", "人物关系缺失", "推进方向不明"],
    },
    storySummary: {
      mainline:
        currentMacro.slice(0, 100) ||
        "女主被亲人算计后逃离，多年后带娃归来，以隐藏身份潜入权力核心调查旧案并展开复仇。",
      coreConflict:
        "女主与原生家庭的背叛对抗、与男主从互相试探到联手的情感博弈、以及旧案真相的层层揭露。",
      keyRelationships:
        "女主与男主：从敌对到合作到深情。女主与反派继母：复仇主线。萌宝与男主：认亲暗线推动情感。",
      storyDirection:
        "前期聚焦误会与羞辱，中段强化复仇、认亲和情感拉扯，后段揭露旧案真凶并完成身份与情感双反转。",
      styleTone: "女频都市虐恋，爽文虐渣 + 打脸复仇 + 甜虐交织，节奏紧凑、每集有钩子。",
    },
    notes: {
      keptOriginalNarrativeOrder: true,
      warnings: hasMacro ? [] : ["原文信息量较少，部分总纲为推测性提炼"],
      editorSuggestions: ["建议补充核心冲突的具体触发事件", "建议明确主角的终极目标"],
    },
  };
}

export function createMockExtractionResult(
  _cleanedText: string,
  currentEpisodes: string[],
  inputVisibility: InputVisibility,
): OutlineExtractionResult {
  const hasEpisodes = currentEpisodes.length > 0 && currentEpisodes.some((e) => e.trim());
  const episodeCount = hasEpisodes ? currentEpisodes.length : 5;

  const confirmedEpisodes = Array.from({ length: episodeCount }, (_, i) => ({
    episode: i + 1,
    goal: hasEpisodes
      ? `推进${currentEpisodes[i]?.slice(0, 15) || "剧情"}的核心冲突`
      : `第${i + 1}集：建立阶段性冲突与人物关系`,
    coreEvent: hasEpisodes
      ? currentEpisodes[i]?.slice(0, 80) || `第${i + 1}集核心事件`
      : [
          "女主带娃回归，与男主在机场狭路相逢",
          "替嫁婚礼上女主医术暴露，被男主怀疑身份",
          "男主试探女主，发现与六年前女人高度吻合",
          "女主被迫出手医治男主，两人达成合作交易",
          "旧案线索浮现，幕后势力开始反扑",
        ][i] || `第${i + 1}集推进主线`,
    conflictProgress: [
      "身份隐藏与试探的张力建立",
      "替嫁阴谋暴露，女主被动转主动",
      "男女主从敌对到有限信任",
      "合作关系确立，但各怀心思",
      "外部压力加剧，联盟面临考验",
    ][i % 5],
    resultChange: [
      "女主成功潜入目标环境",
      "女主身份出现第一道裂缝",
      "男主开始暗中保护女主",
      "双方利益绑定，关系升级",
      "真相接近核心，危险升级",
    ][i % 5],
    confidence: (hasEpisodes ? "medium-high" : "medium") as "high" | "medium-high" | "medium" | "low",
    splitBasis: {
      type: (hasEpisodes ? "explicit_marker" : "rhythm_judgment") as "explicit_marker" | "rhythm_judgment",
      description: hasEpisodes ? "原文包含明确分集标记" : "根据剧情节奏推测分集",
    },
    ...(i === 0 || i === episodeCount - 1
      ? {
          endingHook:
            i === 0
              ? "男主捡起女主遗落的信物，眸色骤变"
              : "幕后主使现身，局势彻底失控",
        }
      : {}),
    ...(i >= 2
      ? {
          relationshipChange: "男女主关系从互相试探进入有限合作阶段",
        }
      : {}),
  }));

  return {
    meta: {
      sourceType: hasEpisodes ? "半成型大纲" : "剧情梗概",
      episodeDetectionMode: hasEpisodes ? "explicit" : "heuristic",
      completenessLevel: hasEpisodes ? "medium" : "low",
      confidence: hasEpisodes ? 68 : 40,
      missingFields: hasEpisodes
        ? ["部分集的结尾钩子待补充"]
        : ["分集结构为推测性拆分", "缺少具体场景和对白线索"],
    },
    confirmedEpisodes,
    storyBeats: [
      {
        id: "beat_001",
        content: "女主带娃回归，开启复仇之路",
        characters: ["凌希", "凌越"],
        phase: "setup",
        importance: "critical",
        source: "original",
      },
      {
        id: "beat_002",
        content: "男女主初次交锋，身份试探开始",
        characters: ["凌希", "沈敛"],
        phase: "rising",
        importance: "major",
        source: "summarized",
      },
    ],
    constraints: {
      narrativeStructure: {
        mode: "linear",
      },
      estimatedEpisodeRange: {
        min: episodeCount,
        max: episodeCount + 5,
        reasoning: hasEpisodes ? "原文已有明确分集" : "根据剧情密度估算",
      },
    },
    report: {
      inputVisibility,
      episodeSplitReasoning: hasEpisodes
        ? "原文包含明确分集标记，沿用原分集结构"
        : "原文无分集标记，根据冲突节奏和人物关系转折推测分集",
      fieldSources: confirmedEpisodes.slice(0, 3).flatMap((ep) => [
        { field: `episode_${ep.episode}.goal`, source: "original" as const },
        { field: `episode_${ep.episode}.coreEvent`, source: "summarized" as const },
      ]),
      missingItems: [
        {
          category: "sequel_plot" as const,
          description: "后续剧情发展未见于当前文本",
          severity: "important" as const,
          causedByTruncation: inputVisibility.visibleRatio < 1,
        },
      ],
      highRiskInferences: hasEpisodes ? [] : [
        {
          content: "分集边界基于剧情节奏推测",
          riskLevel: "medium" as const,
          category: "ending_hook" as const,
          suggestion: "建议编辑确认分集边界是否合理",
        },
      ],
      usabilityClassification: [
        {
          content: "已确认单集的核心事件",
          category: "A" as const,
          reason: "直接来源于原文",
          refType: "episode" as const,
          refId: "episode_1",
        },
        {
          content: "结尾钩子",
          category: "B" as const,
          reason: "部分为 AI 推断",
          refType: "field" as const,
          refId: "episode_1.endingHook",
        },
      ],
    },
    notes: {
      keptOriginalNarrativeOrder: true,
      warnings: hasEpisodes
        ? []
        : ["原文未包含明确分集标记，当前分集为 AI 根据剧情节奏推测"],
      editorSuggestions: [
        "建议检查每集结尾是否有足够悬念",
        "建议确认人物关系变化的节奏是否合理",
      ],
    },
  };
}

export function createMockStructuredSummaryExtraction(): StructuredSummaryExtraction {
  return {
    structuredSummary: {
      oneLineSummary: "一个关于成长与救赎的故事，主角在逆境中发现自我价值，最终实现人生逆转。",
      coreConflict: {
        external: "主角与强大敌对势力的对抗，面临资源匮乏和多方打压的生存危机。",
        internal: "主角在理想与现实、坚持与妥协之间的内心挣扎与自我怀疑。",
        relational: "主角与重要他人之间因立场不同而产生的信任危机与情感冲突。",
      },
      keyRelationships: [
        {
          personA: "主角",
          personB: "导师角色",
          relationshipType: "亲情",
          description: "亦师亦父的关系，初期全力支持，中期因理念分歧产生裂痕。",
          arcDirection: "修复",
        },
        {
          personA: "主角",
          personB: "竞争对手",
          relationshipType: "敌对",
          description: "从互看不顺眼到势均力敌，最终惺惺相惜的对手关系。",
          arcDirection: "缓和",
        },
        {
          personA: "主角",
          personB: "情感对象",
          relationshipType: "爱情",
          description: "从误会重重的相遇到逐渐理解，共同面对外部压力的情感线。",
          arcDirection: "修复",
        },
      ],
      narrativeStructure: {
        narrativeMode: "linear",
        isTimelineStart: true,
        hasBackstoryToRecover: false,
        openingType: "conflict_first",
        backstoryHint: "主角过往经历通过回忆片段逐步揭示，不影响主线理解。",
      },
      longArcNodes: [
        {
          nodeLabel: "主角觉醒",
          placementHint: "前期",
          description: "主角在经历重大打击后觉醒关键能力/认知，故事真正开始。",
          arcType: "rising",
          confidence: "high",
        },
        {
          nodeLabel: "第一次重大挫折",
          placementHint: "中前期",
          description: "主角遭遇首次重大失败，失去重要支持，被迫重新审视自己的道路。",
          arcType: "falling",
          confidence: "high",
        },
        {
          nodeLabel: " midpoint 反转",
          placementHint: "中期",
          description: "故事中段出现重大反转，主角发现之前的认知存在根本性错误。",
          arcType: "twist",
          confidence: "medium",
        },
        {
          nodeLabel: "终极对决",
          placementHint: "后期",
          description: "主角与最终对手的正面对决，所有伏笔回收，完成人物弧光。",
          arcType: "climax",
          confidence: "high",
        },
      ],
      hiddenReveals: [
        {
          revealLabel: "主角的真实身份",
          revealContent: "主角并非表面上的人物，而是某个重要事件的关键见证者/参与者后代。",
          plannedPhase: "后期",
          spoilerRiskLevel: "high",
        },
        {
          revealLabel: "反派动机",
          revealContent: "表面上的反派实际上是执行某种更高使命，其动机具有道德复杂性。",
          plannedPhase: "后期",
          spoilerRiskLevel: "medium",
        },
      ],
    },
    fieldConfidence: {
      oneLineSummary: "high",
      coreConflict: "high",
      keyRelationships: "high",
      narrativeStructure: "medium",
      longArcNodes: "medium",
      hiddenReveals: "low",
    },
    warnings: ["mock 数据，仅用于占位演示。请配置 API Key 后生成真实的结构化总纲。"],
    missingFields: [],
    sourceMode: "directTextFallback",
  };
}

function buildMockProfileFromName(
  name: string,
  importance: "core" | "major" | "supporting" | "minor",
): CharacterProfileCard {
  return {
    canonicalName: name,
    displayName: name,
    publicAliases: [],
    hiddenAliases: [],
    publicIdentity: `${name}的公开身份`,
    hiddenIdentity: "",
    occupationTags: [],
    professionalDomainTags: [],
    professionalSkillTags: [],
    professionalBehaviorTags: [],
    professionalEthicTags: [],
    personalityTags: [],
    temperamentTags: [],
    moralTraitTags: [],
    flawTags: [],
    villainyTags: [],
    dialogueStyleTags: [],
    dialogueMemoryTags: [],
    desireTags: [],
    fearTags: [],
    woundTags: [],
    beliefTags: [],
    bottomLineTags: [],
    contradictionTags: [],
    relationshipHookTags: [],
    memoryPointTags: [],
    behaviorMemoryTags: [],
    spoilerTags: [],
    rolePositionTags: importance === "core" ? ["主角"] : [],
    narrativeFunctionTags: [],
    rolePositionSummary: "",
    narrativeFunctionSummary: "",
    dialogueStyleSummary: "",
    importance,
    appearancePhase: "unknown",
    sourceVisibility: "explicit_in_source",
    audienceRevealState: "revealed_at_start",
    spoilerRisk: "none",
    sourceTracking: {},
    warnings: ["mock 数据"],
    generatedAt: new Date().toISOString(),
    version: 1,
  };
}

export function createMockCharacterProfileExtraction(
  factSheet: OutlineFactSheet,
): CharacterProfileExtraction {
  const nameSet = new Set<string>();
  for (const cf of factSheet.characterFacts) {
    if (cf.characterName) nameSet.add(cf.characterName);
  }
  for (const rf of factSheet.relationshipFacts) {
    if (rf.personA) nameSet.add(rf.personA);
    if (rf.personB) nameSet.add(rf.personB);
  }

  const names = [...nameSet];
  if (names.length === 0) {
    names.push("角色A", "角色B");
  }

  const profiles: CharacterProfileCard[] = names.map((name, i) => {
    const importance: "core" | "major" | "supporting" | "minor" =
      i === 0 ? "core" : i <= 2 ? "major" : i <= 5 ? "supporting" : "minor";
    return buildMockProfileFromName(name, importance);
  });

  const coreCount = profiles.filter((p) => p.importance === "core").length;
  const majorCount = profiles.filter((p) => p.importance === "major").length;
  const supportingCount = profiles.filter((p) => p.importance === "supporting").length;
  const minorCount = profiles.filter((p) => p.importance === "minor").length;

  return {
    discovery: {
      characters: names.map((name, i) => ({
        canonicalName: name,
        displayName: name,
        publicAliases: [],
        hiddenAliases: [],
        importance: (i === 0 ? "core" : i <= 2 ? "major" : i <= 5 ? "supporting" : "minor") as
          "core" | "major" | "supporting" | "minor",
        importanceReason: "mock 数据",
        relatedFactIndices: {
          characterFacts: [],
          relationshipFacts: [],
          revealFacts: [],
        },
      })),
      mergedNames: [],
      warnings: [],
    },
    profiles,
    extractionMeta: {
      totalCharacters: profiles.length,
      coreCount,
      majorCount,
      supportingCount,
      minorCount,
      totalApiCalls: 0,
      failedBatches: [],
    },
    warnings: ["mock 数据，仅用于占位演示。请配置 API Key 后生成真实的人物卡。"],
  };
}
