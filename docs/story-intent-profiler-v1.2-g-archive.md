# Story Intent Profiler V1.2-g Archive

## 1. Current Baseline

The original inspiration flow is now closed at five steps and browser-verified:

1. Audience selection
2. Topic direction
3. Opening hook
4. Villain preference
5. Payment hook / next-episode hook

Current implementation state:

- `acd7cec` contains V1.2-f.
- `89797f5` contains V1.2-e.
- The workspace is clean at the time of this archive.
- The flow is still a single-step wizard.
- The choice chain is still frontend-only and still feeds the existing generation flow through tags and free text.

## 2. Step Map

### Step 1: Audience

Purpose: identify the first audience split.

Short drama:

- 男频
- 女频
- 银发

AI comic:

- 男频
- 女频

### Step 2: Topic Direction

Purpose: identify the story engine behind the audience.

Short drama:

- 都市情感
- 悬疑法治
- 古装年代
- 融合题材

AI comic:

- 现实漫剧化
- 规则怪谈
- 东方幻想
- 末世异能
- 赛博未来

### Step 3: Opening Hook

Purpose: identify the first-moment pitch.

Short drama:

- 年会反击
- 饭局沉默
- 婚礼转身
- 镜头前反转

AI comic:

- 血色规则
- 禁地只认他
- 怪物听命
- 旧名追杀

### Step 4: Villain Preference

Purpose: identify the most satisfying target of reversal.

Short drama:

- 抢功上司
- 豪门亲戚
- 背叛前任
- 隐藏真凶

AI comic:

- 伪善掌门
- 规则制定者
- 夺命财阀
- 旧日背叛者

### Step 5: Payment Hook

Purpose: identify the next-episode promise that makes users continue.

Short drama:

- 身份马上公开
- 反派马上翻车
- 关系马上失控
- 真相马上揭开

AI comic:

- 力量马上失控
- 规则马上反噬
- 旧身份马上曝光
- 真正的敌人来了

## 3. Behavioral Rules

- The wizard is single-step only.
- Each click replaces the current card set with the next step.
- The page never stacks multiple steps vertically inside the Morphic panel.
- The panel remains compact and does not grow into a scroll container.
- The current wizard stops at step 5.
- The `开始策划` button remains the existing bottom action.
- All step scores accumulate into the bottom pills.
- The pills are derived from the selected choices, not from `#` tags.
- The short drama and AI comic flows stay split.
- Frontend titles stay human-readable and do not expose internal tag labels.

## 4. Current Scoring Model

The UI currently accumulates:

- `当前意图分`
- `受众匹配`
- `爽感强度`
- `情绪驱动`
- `视觉潜力`
- `可生成度`
- `核心爆点`
- `反派厌恶`
- `付费钩子`
- `悬念强度`

The current implementation keeps the score display in the frontend and merges repeated labels by summing their numeric values.

## 5. Boundary List

This archive does not change:

- API routes
- database schema
- Prisma
- route structure
- `handleGenerate`
- `parseTags`
- `generatePlans`
- dependencies
- LLM calls

This archive also does not introduce:

- a new generation step
- a result-summary model
- a separate backend scoring service
- a new persistence layer for answers

## 6. Not Yet Done

Planned later work, intentionally not included in V1.2-g:

- result summary after the five-step wizard
- script construction / creativity generation entry
- configuration-driven question catalog
- explicit scoring service and result payload
- additional verification copy for the archive page

## 7. 五步结果摘要结构

五步选择完成后，系统应把用户选择收束成一份稳定的 `storyIntentSummary`，用于后续“结果摘要 / 剧本构思生成”。

这个摘要不应该依赖页面临时状态，也不应该依赖用户当前是否还停留在某一步。它的目标是把五步结果固化成一个可传递、可展示、可继续加工的中间结果。

建议结构如下：

```ts
type StoryIntentSummary = {
  scriptType: "short_drama" | "ai_comic";
  steps: {
    audience?: {
      label: string;
      tags: string[];
      scores: string[];
      intentScore: number;
    };
    topicDirection?: {
      label: string;
      tags: string[];
      scores: string[];
      intentScore: number;
    };
    openingHook?: {
      label: string;
      text: string;
      tags: string[];
      scores: string[];
      intentScore: number;
    };
    villainPreference?: {
      label: string;
      text: string;
      tags: string[];
      scores: string[];
      intentScore: number;
    };
    paymentHook?: {
      label: string;
      text: string;
      tags: string[];
      scores: string[];
      intentScore: number;
    };
  };
  mergedTags: {
    audiences: string[];
    genres: string[];
    coreHooks: string[];
    styleTags: string[];
  };
  scoreSummary: {
    totalIntentScore: number;
    weights: Record<string, number>;
  };
  userPremiseSeed: string;
};
```

字段说明：

- `scriptType` 用来区分真人短剧和 AI 漫剧。
- `steps` 保留每一步的原始选择，方便回看和生成解释。
- `mergedTags` 是五步合并后的标签结果，用于后续文案、摘要和生成入口。
- `scoreSummary.totalIntentScore` 是五步 intentScore 的累计值。
- `scoreSummary.weights` 是按标签名累加后的数值表，包含重复命中后的汇总结果。
- `userPremiseSeed` 用来承接用户自由输入和五步结果的合成摘要。

## 8. 剧本构思生成入口说明

当五步结果摘要完成后，下一层不应该直接跳到最终生成，而应该先进入一个轻量的“剧本构思生成”入口。

这个入口的职责是：

- 展示五步摘要
- 允许用户快速确认或微调
- 生成一段可读的构思种子
- 再把这段种子接回现有原创策划链路

建议入口语义：

- 前台提示可以是“根据你的选择，先整理一版剧本构思”
- 入口目标是把五步结果转成一段短摘要，而不是立即产出完整剧本
- 入口应继续尊重用户自由输入的最高优先级
- 入口不改变现有生成后端的请求契约

推荐输出内容：

- 一段 2 到 4 行的摘要文案
- 一份结构化的 `StoryIntentSummary`
- 一份供后续策划页回填的 `userPremiseSeed`

推荐处理顺序：

1. 读取五步选择结果。
2. 合并标签和权重。
3. 生成摘要文案。
4. 进入现有原创策划入口，保留用户二次修改空间。

## 9. Handoff Notes

This archive is meant to be the reference point for the next stage of the original inspiration flow.

The next natural step is to connect the five-step intent result to a compact summary layer and then feed that into the existing script-creation path without changing the generation backend contract.
