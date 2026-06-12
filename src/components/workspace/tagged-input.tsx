"use client";

import { useState, useRef, useEffect } from "react";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AUDIENCE_OPTIONS, GENRE_CATEGORIES, CORE_HOOK_CATEGORIES, STYLE_CATEGORIES } from "@/lib/script-tags";

// 标签颜色映射
const TAG_COLORS = {
  audience: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/20',
  },
  genre: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-300',
    border: 'border-violet-500/20',
  },
  coreHook: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-300',
    border: 'border-blue-500/20',
  },
  style: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-300',
    border: 'border-pink-500/20',
  },
};

// 预设标签分类缓存
const tagCategoryCache = new Map<string, 'audience' | 'genre' | 'coreHook' | 'style'>();

const parseTagCategory = (tag: string): 'audience' | 'genre' | 'coreHook' | 'style' => {
  if (tagCategoryCache.has(tag)) {
    return tagCategoryCache.get(tag)!;
  }

  if (AUDIENCE_OPTIONS.includes(tag)) {
    tagCategoryCache.set(tag, 'audience');
    return 'audience';
  }

  for (const category of GENRE_CATEGORIES) {
    for (const group of category.groups) {
      if (group.tags.includes(tag)) {
        tagCategoryCache.set(tag, 'genre');
        return 'genre';
      }
    }
  }

  for (const category of CORE_HOOK_CATEGORIES) {
    for (const group of category.groups) {
      if (group.tags.includes(tag)) {
        tagCategoryCache.set(tag, 'coreHook');
        return 'coreHook';
      }
    }
  }

  for (const category of STYLE_CATEGORIES) {
    for (const group of category.groups) {
      if (group.tags.includes(tag)) {
        tagCategoryCache.set(tag, 'style');
        return 'style';
      }
    }
  }

  return 'coreHook';
};

interface Tag {
  id: string;
  text: string;
  category: 'audience' | 'genre' | 'coreHook' | 'style';
}

interface TaggedInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddTag?: (tag: string, category?: 'audience' | 'genre' | 'coreHook' | 'style') => void;
  placeholder?: string;
  disabled?: boolean;
  charLimit?: number;
}

// 可拖拽标签组件
function DraggableTag({ tag, onRemove, disabled }: { tag: Tag; onRemove: (id: string) => void; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colors = TAG_COLORS[tag.category];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`inline-flex items-center gap-1 rounded-md ${colors.bg} ${colors.text} ${colors.border} border px-2 py-1 text-xs select-none ${disabled ? '' : 'cursor-grab active:cursor-grabbing'} hover:brightness-110 transition`}
      {...attributes}
      {...listeners}
    >
      <span>#{tag.text}</span>
      {!disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag.id);
          }}
          className="rounded-full p-0.5 hover:bg-white/10 transition"
          tabIndex={-1}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function TaggedInput({
  value,
  onChange,
  onAddTag,
  placeholder = "输入故事想法，或点击右侧标签自动生成 #标签 格式",
  disabled = false,
  charLimit = 200,
}: TaggedInputProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [inputText, setInputText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始化时解析现有标签
  useEffect(() => {
    const tagMatches = value.match(/#\S+/g) || [];
    const newTags = tagMatches.map((tag, index) => ({
      id: `tag-${index}-${tag.replace('#', '')}`,
      text: tag.replace('#', ''),
      category: parseTagCategory(tag.replace('#', '')),
    }));
    setTags(newTags);
    setInputText(value.replace(/#\S+/g, '').trim());
  }, []);

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 移动 8px 后才激活拖拽
      },
    })
  );

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTags((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = [...items];
        const [removed] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, removed);

        // 更新 value
        updateValue(newItems, inputText);
        return newItems;
      });
    }
  };

  // 删除标签
  const handleRemoveTag = (tagId: string) => {
    setTags((prev) => {
      const newTags = prev.filter((t) => t.id !== tagId);
      updateValue(newTags, inputText);
      return newTags;
    });
  };

  // 更新输入文本
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setInputText(newText);

    // 检查是否输入了空格，如果是则添加标签
    if (newText.endsWith(' ') && newText.trim()) {
      const newTagText = newText.trim();
      if (!tags.some(t => t.text === newTagText)) {
        const newTag: Tag = {
          id: `tag-${Date.now()}-${newTagText}`,
          text: newTagText,
          category: parseTagCategory(newTagText),
        };
        const newTags = [...tags, newTag];
        setTags(newTags);
        setInputText('');
        updateValue(newTags, '');

        onAddTag?.(newTagText, newTag.category);
      }
    } else {
      updateValue(tags, newText);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && inputText === '' && tags.length > 0) {
      // 删除最后一个标签
      const newTags = tags.slice(0, -1);
      setTags(newTags);
      updateValue(newTags, inputText);
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputText.trim()) {
        const newTag: Tag = {
          id: `tag-${Date.now()}-${inputText.trim()}`,
          text: inputText.trim(),
          category: parseTagCategory(inputText.trim()),
        };
        const newTags = [...tags, newTag];
        setTags(newTags);
        setInputText('');
        updateValue(newTags, '');

        onAddTag?.(inputText.trim(), newTag.category);
      }
    }
  };

  // 更新 value
  const updateValue = (newTags: Tag[], newText: string) => {
    const tagsStr = newTags.map(t => `#${t.text}`).join(' ');
    const fullValue = newText ? `${tagsStr} ${newText}`.trim() : tagsStr;
    onChange(fullValue);
  };

  // 从外部添加标签（通过 Cascader）
  useEffect(() => {
    const currentTags = value.match(/#\S+/g) || [];
    if (currentTags.length !== tags.length) {
      const newTags = currentTags.map((tag, index) => ({
        id: `tag-${index}-${tag.replace('#', '')}`,
        text: tag.replace('#', ''),
        category: parseTagCategory(tag.replace('#', '')),
      }));
      setTags(newTags);
      setInputText(value.replace(/#\S+/g, '').trim());
    }
  }, [value]);

  const plainTextLength = inputText.trim().length;

  return (
    <div className="relative">
      <div
        className={`min-h-[120px] w-full rounded-2xl border ${isFocused ? 'border-cyan-300/60' : 'border-white/10'} bg-white/4 px-5 py-4 text-sm outline-none transition-colors`}
        onClick={() => inputRef.current?.focus()}
      >
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={tags.map(t => t.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <DraggableTag key={tag.id} tag={tag} onRemove={handleRemoveTag} disabled={disabled} />
              ))}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={tags.length === 0 ? placeholder : ''}
                disabled={disabled}
                className="flex-1 min-w-[120px] bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* 字符计数 */}
      <div className="mt-2 flex justify-end">
        <span className={`text-xs ${plainTextLength > charLimit ? "text-red-400" : "text-slate-500"}`}>
          {plainTextLength} / {charLimit}
        </span>
      </div>
    </div>
  );
}
