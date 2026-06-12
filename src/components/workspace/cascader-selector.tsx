"use client";

import { useState } from "react";
import {
  GENRE_CATEGORIES,
  CORE_HOOK_CATEGORIES,
  STYLE_CATEGORIES,
  type TagCategory,
} from "@/lib/script-tags";
import { AUDIENCE_OPTIONS } from "@/lib/script-tags";

/**
 * 级联选择器 - 左右两栏布局
 * 左边一级分类，右边二级分类（标签）
 * 点击标签直接添加到输入框
 */
interface CascaderProps {
  title: string;
  categories: TagCategory[];
  onAddTag: (tag: string, category?: 'audience' | 'genre' | 'coreHook' | 'style') => void;
  placeholder?: string;
  columnSpan?: number;
  fixedHeight?: boolean;
  colorTheme?: 'cyan' | 'violet' | 'pink' | 'blue';
}

const COLOR_THEMES = {
  cyan: {
    active: 'bg-cyan-500/10 text-cyan-400',
    tag: 'bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20',
    border: 'border-cyan-500/20',
  },
  violet: {
    active: 'bg-violet-500/10 text-violet-400',
    tag: 'bg-violet-500/10 text-violet-300 hover:bg-violet-500/20',
    border: 'border-violet-500/20',
  },
  pink: {
    active: 'bg-pink-500/10 text-pink-400',
    tag: 'bg-pink-500/10 text-pink-300 hover:bg-pink-500/20',
    border: 'border-pink-500/20',
  },
  blue: {
    active: 'bg-blue-500/10 text-blue-400',
    tag: 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20',
    border: 'border-blue-500/20',
  },
};

export function Cascader({
  title,
  categories,
  onAddTag,
  placeholder = "请选择",
  columnSpan = 2,
  fixedHeight = false,
  colorTheme = 'cyan',
}: CascaderProps) {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const theme = COLOR_THEMES[colorTheme];

  const getCategoryType = (): 'genre' | 'coreHook' | 'style' => {
    if (title.includes('题材')) return 'genre';
    if (title.includes('核心')) return 'coreHook';
    if (title.includes('风格')) return 'style';
    return 'coreHook';
  };

  const handleTagClick = (tag: string) => {
    onAddTag(tag, getCategoryType());
  };

  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-medium text-white/75">{title}</h3>
      <div className={`flex overflow-hidden rounded-xl border border-white/10 bg-[#18181b] ${fixedHeight ? 'h-40' : ''}`}>
        <div className="shrink-0 overflow-y-auto border-r border-white/5 bg-white/[0.02]" style={{ width: columnSpan === 1 ? '5rem' : columnSpan === 2 ? '7rem' : '10rem' }}>
          <div className="grid gap-1 p-1" style={{ gridTemplateColumns: `repeat(${columnSpan}, minmax(0, 1fr))` }}>
            {categories.map((category, index) => {
              const isActive = index === activeCategoryIndex;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategoryIndex(index)}
                  className={`rounded px-2 py-2 text-xs transition text-center ${
                    isActive
                      ? theme.active
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-3 ${fixedHeight ? '' : 'max-h-32'}`}>
          <div className="flex flex-wrap gap-2">
            {categories[activeCategoryIndex]?.groups.map((group) => (
              <div key={group.id} className="w-full">
                {group.name !== group.tags[0] && (
                  <div className="mb-1.5 text-xs text-slate-500">{group.name}</div>
                )}
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className={`rounded-md px-2.5 py-1 text-xs transition ${theme.tag}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 目标受众选择器 - AI漫剧/真人短剧切换 + 男频/女频
 */
interface AudienceSelectorProps {
  onAddTag: (tag: string, category?: 'audience' | 'genre' | 'coreHook' | 'style') => void;
}

export function AudienceSelector({ onAddTag }: AudienceSelectorProps) {
  const [format, setFormat] = useState<"AI" | "真人">("AI");

  const handleFormatClick = (type: "AI" | "真人") => {
    setFormat(type);
    onAddTag(type === "AI" ? "AI漫剧" : "真人短剧");
  };

  const handleGenderClick = (tag: string) => {
    onAddTag(tag, 'audience');
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-[140px] overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
        <button
          onClick={() => handleFormatClick("AI")}
          className={`flex-1 text-sm font-medium transition ${
            format === "AI"
              ? "bg-[#62b8fd] text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          AI漫剧
        </button>
        <button
          onClick={() => handleFormatClick("真人")}
          className={`flex-1 text-sm font-medium transition ${
            format === "真人"
              ? "bg-[#f9b75b] text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          真人短剧
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleGenderClick("男频")}
          className="h-10 w-[60px] rounded-lg border border-[#62b8fd] text-sm font-medium text-[#62b8fd] transition hover:bg-[#62b8fd]/15"
        >
          男频
        </button>
        <button
          onClick={() => handleGenderClick("女频")}
          className="h-10 w-[60px] rounded-lg border border-[#f9b75b] text-sm font-medium text-[#f9b75b] transition hover:bg-[#f9b75b]/15"
        >
          女频
        </button>
      </div>
    </div>
  );
}
