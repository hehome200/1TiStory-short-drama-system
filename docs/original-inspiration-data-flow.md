# Original Inspiration 数据流文档

> 生成日期：2025-06-02
> 范围：`/workspace/original/inspiration` → 原创灵感策划五步向导 → AI 生成三方案 → 策划结果 → 故事梗概
> 目的：防止 genres（题材类型）等字段在 20+ 步数据流中断线或接错

---

## 1. 总原则

1. **`scriptType` 是第一层分流。** `"ai_comic"` 和 `"short_drama"` 的预设库、步骤标签、UI、数据流完全独立。
2. **genres 是正式题材类型，不是 audience / era / coreHooks。**
3. **genres 最多 3 个。** 超过 3 个时应过滤、去重、截前 3；不能整组清空。
4. **如果没有真实 genres 来源，不允许用 mock / fallback 硬填。**
5. **写业务代码时必须逐字段对照本文件，禁止猜测字段映射。**

---

## 2. 禁止接错字段

下列字段**不是 genres**，禁止写入或读取时当 genres 使用：

| 错误字段 | 正确字段 | 说明 |
|----------|----------|------|
| `audience` / `audiences` | `genres` | 受众类型（男频/女频/银发） |
| `era` / `eraOrWorldType` | `genres` | 时代背景（现代都市/古代/民国...） |
| `coreHooks` / `coreSettings` | `genres` | 核心设定钩子（开场爆点/人物关系...） |
| `styleTags` / `styleElements` | `genres` | 风格元素 |
| `mustHave` / `mustAvoid` | `genres` | 生成约束 |
| `displayTagGroups.*` | `genres` | 展示用标签组，不等于最终写入字段 |

---

## 3. AI 漫剧 (`scriptType = "ai_comic"`) 题材数据流

```
scriptType = "ai_comic"
  → setPresetLibrary("ai-short-drama")
  → currentGenres = AI_SHORT_DRAMA_PRESET.genres = GENRE_CATEGORIES

Step 1 (audience) source: presetSection = "genres"
  → choice.tags = ["都市", "悬疑", "古代", "末世", ...]   ← 题材在此产生

Step 2-5 source: presetSection = "coreHooks" 或 "styleTags"

selectedChoiceTags = collectChoiceTags([audience, topicDir, opening, villain, payment])
  → ["都市", "悬疑", ..., "系统", "异能", ...]   ← 混合了 genres + coreHooks + styleTags

mergedGenreTags = uniqueLabels([
  ...selectedChoiceTags.filter(tag => bucketTagLabels.genres.has(tag)),  ← "都市"/"悬疑" 等
  ...parsedTags.genres,  ← 用户手输 #标签
])
  → ["都市", "悬疑", ...]

funnelDiagnosis = buildInspirationDiagnosis({
  mergedTags: { genres: mergedGenreTags, ... }
})
  → funnelDiagnosis.mergedTags.genres = ["都市", "悬疑", ...]

storyScenarioCards = buildStoryScenarioCards(funnelDiagnosis)
  → commonTags.genres = uniqueLabels(
      commercialSelection.genre?.label,
      ...summary.mergedTags.genres    ← = funnelDiagnosis.mergedTags.genres
    )
  → plan.genres = commonTags.genres   ← ["都市", "悬疑", ...]

promptBundle = buildStablePromptBundle()
  → genres = stablePlan?.genres || parsed.genres
  → promptBundle.genres = ["都市", "悬疑", ...]

API POST /api/original/inspire
  → request.mergedTags.genres → LLM prompt
  → LLM 生成 3 个 scenarios

API Response SSE events:
  → response.scenarios[n].genres    ← AI 返回的 genres（如有）

debugInspectorData["scenarios"] → visibleScenarioCards:
  scenarioRecord.genres
    || rawDisplayTagGroups?.genres
    || fallbackCard?.plan?.genres
    || fallbackDisplayTagGroups?.genres
  → normalizeSelectedGenresForScriptType(...)
    → 过滤条件: bucketTagLabels.genres.has(item)
    → slice(0, 3)

selectedGenres = normalizeSelectedGenresForScriptType(
  plan.genres,                    ← visibleScenarioCard.genres
  plan.projectBrief?.genres,      ← 项目简报 genres
  plan.displayTagGroups?.genres,  ← 展示标签组 genres
  promptBundle.genres,            ← 稳定 prompt genres
)
  → ["都市", "悬疑", ...]

overviewData.genres = selectedGenres
  → draft.overview.genres = ["都市", "悬疑", ...]

故事梗概页面:
  original-studio.tsx L1742:
  const genres = draft.overview.genres.filter(...)
  → 显示: "都市、悬疑"
```

**AI 漫剧 genres 不会为空**，因为 Step 1 的 `presetSection = "genres"` 保证了 choice tags 包含 genre 标签。

---

## 4. 真人短剧 (`scriptType = "short_drama"`) 题材数据流

### 4.1 当前状态（含 patch diff）

```
scriptType = "short_drama"
  → setPresetLibrary("live-action")
  → currentGenres = LIVE_ACTION_PRESET.genres
    = 4 categories, 36 tags:
        都市情感: 都市/豪门/家庭伦理/婚姻情感/职场/商战/校园/乡村
        悬疑法治: 悬疑/推理/刑侦/犯罪/法律
        古装年代: 古装/宫廷/宅斗/权谋/民国/年代
        融合题材: 喜剧/玄学/灵异/规则怪谈/异能/志怪/轻奇幻/末世/科幻/武侠/动作

Step 1-4 source: presetSection = "coreHooks"
  → choice.tags = coreHooks 标签（"当众羞辱", "抓奸背叛", ...）
  → 不含任何 genre 标签

Step 5 source: presetSection = "eras"
  → choice.tags = era 标签（"现代都市", "古代", ...）
  → 不含任何 genre 标签

selectedChoiceTags = collectChoiceTags(...)
  → 不含 genre 标签

genreSelections (补丁新增)
  → step 5 UI: 短剧题材选择 checkbox grid
  → 来自: getPresetForScriptType("short_drama").genres (36 tags)
  → 用户最多选 3 个
  → genreSelections = ["悬疑", "刑侦", "商战"]

mergedGenreTags = uniqueLabels([
  ...selectedChoiceTags.filter(genre)      ← 空（短剧无 genre choice）
  ...genreSelections,                       ← 补丁: ["悬疑", "刑侦", "商战"]
  ...parsedTags.genres,                     ← 用户手输 #标签
])
  → ["悬疑", "刑侦", "商战"]

funnelDiagnosis = buildInspirationDiagnosis({
  mergedTags: { genres: mergedGenreTags, ... }
})
  → funnelDiagnosis.mergedTags.genres = ["悬疑", "刑侦", "商战"]

                   ⚠️ 断点 1 ⚠️
storyScenarioCards = buildStoryScenarioCards(funnelDiagnosis)
  → commonTags.genres (for short_drama) =
      removeLiveActionBackgroundLabelsFromGenres(
        filterAvoidedValues(
          uniqueLabels(
            commercialSelection.genre?.label,
            ...summary.mergedTags.genres     ← funnelDiagnosis.mergedTags.genres
          ),
          diagnosis.mustAvoid,
        ),
      )
  → removeLiveActionBackgroundLabelsFromGenres 做两件事:
      1. 删除 LIVE_ACTION_BACKGROUND_GENRE_LABELS 中的标签
         = 删除: 都市/现代/现代都市/职场/校园/宫廷/荒岛/古代/架空古代/民国/年代/80年代/乡村
         → "悬疑"/"刑侦"/"商战" 不在其中 → 保留
      2. 只保留 SHORT_DRAMA_GENRE_BUCKETS 中的标签
         = ["战神","爱情","仙侠","推理","宅斗","玄幻","言情","末世","恐怖","青春",
            "奇幻","剧情","修仙","鉴宝","喜剧","脑洞","权谋","悬疑","宫斗","科幻",
            "动作","抗战","刑侦","高武","志怪","谍战","犯罪","商战","武侠","求生",
            "法律","灵异","传奇"]
         → "悬疑" 在 ✓ / "刑侦" 在 ✓ / "商战" 在 ✓
  → commonTags.genres = ["悬疑", "刑侦", "商战"]   ← 通过 ✓

  BUT 如果用户选了以下标签则会在此断线:
    LIV_ACTION_PRESET.genres 中但不在 SHORT_DRAMA_GENRE_BUCKETS 中:
      豪门、古装、家庭伦理、婚姻情感、异能、轻奇幻、规则怪谈、玄学
    → 全部被 removeLiveActionBackgroundLabelsFromGenres 丢弃 ❌

  AND 以下标签也会被丢弃 (在 LIVE_ACTION_BACKGROUND_GENRE_LABELS 中):
      都市、职场、校园、宫廷、民国、年代、乡村
    → 被第一步过滤丢弃 ❌

  → plan.genres = commonTags.genres   ← 可能为空！

                   ⚠️ 断点 2 ⚠️
API POST /api/original/inspire
  → Polish 输入 card 已不包含 genres 字段（新 prompt 瘦身后）
  → AI 输出 schema: {id, title, coreHighlight, storyBackground, worldview, coreSynopsis}
  → **AI 不返回 genres！**

API Response → visibleScenarioCards:
  scenarioRecord.genres          ← undefined/空（AI 不返回）
    || rawDisplayTagGroups?.genres  ← 如 API 也不返回则空
    || fallbackCard?.plan?.genres   ← plan.genres（可能为空）
    || fallbackDisplayTagGroups?.genres
  → normalizeSelectedGenresForScriptType(...)
    → 过滤条件:
        bucketTagLabels.genres.has(item)
        || (scriptType === "short_drama" && isValidShortDramaGenreLabel(item))
    → slice(0, 3)

selectedGenres = normalizeSelectedGenresForScriptType(
  plan.genres,                    ← 可能为空
  plan.projectBrief?.genres,      ← 可能为空
  plan.displayTagGroups?.genres,  ← displayTagGroups.genres
  promptBundle.genres,            ← = stablePlan?.genres || parsed.genres
)

overviewData.genres = selectedGenres
  → draft.overview.genres = selectedGenres

故事梗概页面:
  original-studio.tsx L1742:
  const genres = draft.overview.genres.filter(...)
  → 如果 selectedGenres 为空 → 显示 "题材类型：待确认"
```

### 4.2 真人短剧 genres 三大断点总结

| 断点位置 | 原因 | 影响 |
|----------|------|------|
| **断点 1**: `removeLiveActionBackgroundLabelsFromGenres` | `LIVE_ACTION_PRESET.genres` (36 tags) 与 `SHORT_DRAMA_GENRE_BUCKETS` (34 tags) 不匹配；`LIVE_ACTION_BACKGROUND_GENRE_LABELS` 误删 genre 标签 | 约 40% 的 genre 选择在此被丢弃 |
| **断点 2**: API polish 不返回 genres | 新 prompt 输出 schema 只有 6 个文案字段 | 可见方案卡的 genres 完全依赖 fallbackCard |
| **断点 3** (历史): 短剧 Step1-5 无 genre 选择 | 所有步骤 presetSection 都是 coreHooks/eras | 补丁新增 genreSelections 前 mergedGenreTags 为空 |

---

## 5. 关键函数索引

### 5.1 写入点（genres 来源）

| 阶段 | 文件 | 行号/函数 | genres 来源 |
|------|------|-----------|------------|
| UI 题材选择 | `inspiration/page.tsx` | `genreSelections` state | 用户 step 5 选择 |
| 标签解析 | `inspiration/page.tsx` | `parseTags()` | 用户手输 `#标签` |
| choice tags | `inspiration/page.tsx` | `collectChoiceTags()` | Step1-5 选择的 `.tags` |
| 合并 genres | `inspiration/page.tsx` | `mergedGenreTags` | choiceTags + genreSelections + parsedTags |
| 诊断输入 | `inspiration/page.tsx` | `funnelDiagnosis.mergedTags.genres` | mergedGenreTags |
| 方案卡构建 | `story-intent-summary.ts` | `buildStoryScenarioCards()` → `commonTags.genres` | mergedTags.genres → 经过过滤器 |
| plan.genres | `story-intent-summary.ts` | `plan.genres` | commonTags.genres |
| prompt bundle | `inspiration/page.tsx` | `buildStablePromptBundle()` → `.genres` | stablePlan?.genres \|\| parsed.genres |

### 5.2 读取点（genres 被使用的地方）

| 阶段 | 文件 | 行号/函数 | 读取字段 |
|------|------|-----------|---------|
| 方案卡 genres | `inspiration/page.tsx` | ~L2467 | `normalizeSelectedGenresForScriptType(scenarioRecord.genres, displayTagGroups.genres, fallbackCard.plan.genres, fallbackDisplayTagGroups.genres)` |
| 选中方案 genres | `inspiration/page.tsx` | ~L2607 | `normalizeSelectedGenresForScriptType(plan.genres, projectBrief.genres, displayTagGroups.genres, promptBundle.genres)` |
| overviewData | `inspiration/page.tsx` | ~L2663 | `genres: selectedGenres` |
| draft.overview | `inspiration/page.tsx` | ~L2676 | `genres: selectedGenres` |
| 故事梗概 | `original-studio.tsx` | ~L1742 | `draft.overview.genres` |
| 故事梗概 prompt | `prompts.ts` | ~L208 | `draft.overview.projectBrief.genres` |

### 5.3 过滤器函数

| 函数 | 文件 | 行号 | 作用 | 注意 |
|------|------|------|------|------|
| `normalizeSelectedGenresForScriptType` | `inspiration/page.tsx` | ~L2071 | 多源取第一个非空 + 过滤 + 截断 | 短剧需同时通过 `bucketTagLabels.genres` 或 `isValidShortDramaGenreLabel` |
| `removeLiveActionBackgroundLabelsFromGenres` | `story-intent-summary.ts` | ~L1049 | 移除背景标签 + 只保留 SHORT_DRAMA_GENRE_BUCKETS | **LIVE_ACTION_PRESET.genres 标签不一定在 SHORT_DRAMA_GENRE_BUCKETS 中！** |
| `isValidShortDramaGenreLabel` | `story-intent-summary.ts` | ~L1023 | 检查标签是否在 SHORT_DRAMA_GENRE_BUCKETS 中 | 导出供 page.tsx 使用 |

---

## 6. 调试 Checklist

以后查题材类型为空时，按顺序检查以下字段：

```
□ scriptType                      → "short_drama" 或 "ai_comic"
□ genreSelections                 → 用户 step 5 选择（仅短剧）
□ bucketTagLabels.genres          → 当前预设的所有 genre 标签
□ selectedChoiceTags              → 五步选择的所有 tags
□ parsedTags.genres               → 用户手输 #标签
□ mergedGenreTags                 → 三者合并结果
□ funnelDiagnosis.mergedTags.genres → 输入到 buildStoryScenarioCards
□ removeLiveActionBackgroundLabelsFromGenres 结果 → 过滤后是否为空
□ storyScenarioCards[n].plan.genres  → fallback 源
□ promptBundle.genres             → 稳定 prompt genres
□ API response.scenarios[n].genres  → AI 是否返回了
□ normalizeSelectedGenresForScriptType 结果 → visibleScenarioCards[n].genres
□ selectedGenres                  → 最终选中的 genres
□ overviewData.genres             → 写入 overviewData
□ draft.overview.genres           → 持久化到 DB
□ original-studio.tsx L1742       → 故事梗概页面读取
```

检查命令（浏览器 console）：
```js
console.info("[OriginalGenresFlow]", {
  scriptType, currentGenres, promptBundleGenres,
  visibleScenarioGenres, selectedGenres, overviewDataGenres,
  projectBriefGenres, draftOverviewGenres,
});
// 仅 admin + ORIGINAL_DEBUG_INSPECTOR=true 时生效
```

---

## 7. 未解决问题

1. **`LIVE_ACTION_PRESET.genres` 与 `SHORT_DRAMA_GENRE_BUCKETS` 标签不一致** — 用户在 UI 中选中的标签可能在下游被丢弃
2. **`LIVE_ACTION_BACKGROUND_GENRE_LABELS` 误删 genre 标签** — "都市"/"职场"/"校园"/"宫廷" 等既是背景标签也是 genre 标签
3. **API polish 不返回 genres** — 无法从 AI 获取题材补充
4. **短剧无原生题材入口** — 依赖补丁 genreSelections
