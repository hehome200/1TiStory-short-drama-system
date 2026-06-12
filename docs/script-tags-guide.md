# 短剧题材标签库使用指南

## 概述

本系统提供完整的短剧题材标签分类体系和两种选择器组件：

1. **Cascader（级联选择器）** - 左右两栏布局，左侧一级分类，右侧二级标签
2. **AudienceSelector（受众选择器）** - 男频/女频按钮选择

## 标签结构

### 一、题材类型 (GENRE_CATEGORIES)

共 13 个大类，包含 60+ 个具体标签：

| 大类 | 二级分组 | 标签示例 |
|------|----------|----------|
| 玄幻仙侠 | 玄幻脑洞 | 凡人修仙、仙侠奇缘、上古神话、修仙剑道、洪荒 |
| 都市现代 | 都市 | 都市高武、都市修真、都市异能、都市脑洞、都市神豪、都市职场 |
| 悬疑灵异 | 悬疑灵异 | 诡异复苏、规则怪谈、无限流、推理破案 |
| 历史架空 | 历史架空 | 穿越古代、两界搬运、三国、大明、唐朝 |
| 末世 | 末世 | 末日废土、末日求生、灵气复苏、末世天灾、末日经营 |
| 科幻 | 科幻 | 未来科幻、赛博朋克、星际文明、科幻机甲、时空穿梭、进化变异 |
| 游戏 | 游戏 | 无限游戏、第四天灾、游戏穿越 |
| 国运 | 国运 | 国运擂台、国运游戏、王朝争霸 |
| 武侠 | 武侠 | 传统武侠、江湖权谋 |
| 兵王 | 兵王 | 末世兵王、异界兵王、都市兵王 |
| 奇幻 | 奇幻 | 西方奇幻、魔法世界 |
| 军事 | 军事 | 军事战争、军工武器、穿越战争 |
| 其他 | 其他 | 异界架空、御兽契约、赘婿家族流 |

### 二、核心设定 (CORE_HOOK_CATEGORIES)

共 4 个大类，包含 40+ 个标签：

| 大类 | 标签示例 |
|------|----------|
| 流派 | 升级流、无脑流、无敌流、迪化流、震惊流、脑洞流、反套路 |
| 身份 | 圣女、仙尊、大师兄、师妹、女帝、凡人、神豪、大反派、仙子、废材弟子、大男主、大女主、小人物 |
| 金手指 | 系统无敌流、异能觉醒、身份反转、赘婿、传承觉醒、穿书、天下无敌、灵魂互换、人物逆袭 |
| 情节 | 仙魔大战、多女主、多男主、高手下山、强强联合、战神归来、强者回归、家国情怀、基建种田、求生种田、经营势力 |

### 三、风格元素 (STYLE_CATEGORIES)

共 2 个大类，包含 30+ 个标签：

| 大类 | 标签示例 |
|------|----------|
| 风格 | 爽文虐渣、打脸复仇、强势碾压、沙雕搞笑、幽默风趣、玩梗搞笑、轻松喜剧、甜宠恋爱、紧张悬疑、惊悚诡秘、热血成长、温馨治愈 |
| 元素 | 妖魔、克苏鲁、萌宠、诡秘、特效、古神、赛博机械、炫酷异能、神战遗迹、读心、外挂、天命、黑道、暴富、玄学、病娇、白月光、马甲流、全村修仙、直播、隐藏大佬 |

## 组件使用

### 1. Cascader - 级联选择器（推荐）

左右两栏布局，左侧一级分类，右侧二级标签：

```tsx
"use client";

import { useState } from "react";
import { Cascader } from "@/components/workspace/cascader-selector";
import { GENRE_CATEGORIES } from "@/lib/script-tags";

function MyPage() {
  const [selected, setSelected] = useState("");

  return (
    <Cascader
      title="题材类型"
      categories={GENRE_CATEGORIES}
      selected={selected}
      onChange={(value) => setSelected(value)}
      placeholder="选择题材类型"
    />
  );
}
```

**特性：**
- 左侧显示一级分类（如"玄幻仙侠"、"都市现代"）
- 右侧显示对应分类下的所有标签
- 点击左侧分类切换右侧内容
- 点击标签选中/取消选中
- 底部显示当前已选标签

### 2. AudienceSelector - 目标受众选择器

```tsx
import { AudienceSelector } from "@/components/workspace/cascader-selector";

<AudienceSelector
  selected={audience}
  onChange={(audience) => setAudience(audience)}
/>
```

## 工具函数

```ts
import {
  getAllGenreTags,
  getAllCoreHookTags,
  getAllStyleTags,
  AUDIENCE_OPTIONS
} from "@/lib/script-tags";

// 获取所有题材标签（扁平化数组）
const allGenres = getAllGenreTags();

// 获取所有核心设定标签
const allCoreHooks = getAllCoreHookTags();

// 获取所有风格元素标签
const allStyles = getAllStyleTags();

// 目标受众选项
const audiences = AUDIENCE_OPTIONS; // ["男频", "女频"]
```

## 数据结构

```typescript
interface TagCategory {
  id: string;        // 分类 ID
  name: string;      // 分类名称（如"玄幻仙侠"）
  groups: TagGroup[]; // 子分组
}

interface TagGroup {
  id: string;    // 分组 ID
  name: string;  // 分组名称（如"玄幻脑洞"）
  tags: string[]; // 标签列表
}
```

## 完整示例

参考 `src/app/workspace/original/inspiration/page.tsx`：

```tsx
"use client";

import { useState } from "react";
import { WorkspaceFrame } from "@/components/workspace/workspace-frame";
import { AudienceSelector, Cascader } from "@/components/workspace/cascader-selector";
import { GENRE_CATEGORIES, CORE_HOOK_CATEGORIES, STYLE_CATEGORIES } from "@/lib/script-tags";

export default function InspirationPage() {
  const [audience, setAudience] = useState("");
  const [genre, setGenre] = useState("");
  const [coreHook, setCoreHook] = useState("");
  const [styleTag, setStyleTag] = useState("");

  return (
    <WorkspaceFrame>
      <div className="mx-auto max-w-5xl">
        <h1>灵感策划</h1>

        {/* 输入框 */}
        <textarea placeholder="选择标签自动生成 # 标签" />

        {/* 目标受众 */}
        <AudienceSelector selected={audience} onChange={setAudience} />

        {/* 题材类型 - 级联选择器 */}
        <Cascader
          title="题材类型"
          categories={GENRE_CATEGORIES}
          selected={genre}
          onChange={setGenre}
        />

        {/* 核心设定 - 级联选择器 */}
        <Cascader
          title="核心设定"
          categories={CORE_HOOK_CATEGORIES}
          selected={coreHook}
          onChange={setCoreHook}
        />

        {/* 风格元素 - 级联选择器 */}
        <Cascader
          title="风格元素"
          categories={STYLE_CATEGORIES}
          selected={styleTag}
          onChange={setStyleTag}
        />
      </div>
    </WorkspaceFrame>
  );
}
```

## 文件列表

| 文件 | 说明 |
|------|------|
| `src/lib/script-tags.ts` | 标签数据定义 |
| `src/components/workspace/cascader-selector.tsx` | 级联选择器组件 |
| `docs/script-tags-guide.md` | 使用文档 |

## 扩展方式

添加新标签类别：

```ts
// src/lib/script-tags.ts
export const NEW_CATEGORY: TagCategory[] = [
  {
    id: "new-category",
    name: "新分类",
    groups: [
      {
        id: "new-group",
        name: "新分组",
        tags: ["标签 1", "标签 2"],
      },
    ],
  },
];

// 导出
export function getAllNewCategoryTags(): string[] {
  return NEW_CATEGORY.flatMap((c) => c.groups.flatMap((g) => g.tags));
}
```
