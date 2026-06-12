"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus, X } from "lucide-react";
import type { TagCategory } from "@/lib/script-tags";

type CategorizedMultiDropdownProps = {
  label: string;
  placeholder: string;
  categories: TagCategory[];
  value: string[];
  onChange: (next: string[]) => void;
  maxCount: number;
  required?: boolean;
  helperText?: string;
  allowCustom?: boolean;
  customPlaceholder?: string;
  menuColumns?: 1 | 2;
  customInputPlacement?: "menu" | "trigger";
  hidePlaceholderText?: boolean;
};

function uniqueTrimmed(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

export function CategorizedMultiDropdown({
  label,
  placeholder,
  categories,
  value,
  onChange,
  maxCount,
  required,
  helperText,
  allowCustom = true,
  customPlaceholder = "输入后回车添加",
  menuColumns = 1,
  customInputPlacement = "menu",
  hidePlaceholderText = false,
}: CategorizedMultiDropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [customValue, setCustomValue] = useState("");
  const [errorText, setErrorText] = useState("");
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  const selectedTags = useMemo(() => uniqueTrimmed(value), [value]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = rootRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom - 5;
      const spaceAbove = rect.top - 5;
      const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(240, Math.min(300, openAbove ? spaceAbove : spaceBelow));
      const top = openAbove
        ? Math.max(5, rect.top - Math.min(300, maxHeight) - 5)
        : rect.bottom + 5;

      // Panel width: match trigger width exactly
      const panelWidth = rect.width;

      setPanelStyle({
        top: Math.max(8, top),
        left: rect.left,
        width: panelWidth,
        maxHeight,
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    updatePosition();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (activeCategoryIndex >= categories.length) {
      setActiveCategoryIndex(Math.max(0, categories.length - 1));
    }
  }, [activeCategoryIndex, categories.length]);

  const activeCategory = categories[activeCategoryIndex];

  // Flatten all tags from active category's groups
  const activeCategoryTags = useMemo(() => {
    if (!activeCategory) return [];
    return activeCategory.groups.flatMap((group) => group.tags);
  }, [activeCategory]);

  const commitChange = (next: string[]) => {
    onChange(uniqueTrimmed(next).slice(0, maxCount));
  };

  const toggleTag = (tag: string) => {
    const normalized = tag.trim();
    if (!normalized) return;

    setErrorText("");
    const exists = selectedTags.includes(normalized);
    if (exists) {
      commitChange(selectedTags.filter((item) => item !== normalized));
      return;
    }

    if (selectedTags.length >= maxCount) {
      if (maxCount === 1) {
        commitChange([normalized]);
        return;
      }
      setErrorText(`最多选择 ${maxCount} 个`);
      return;
    }

    commitChange([...selectedTags, normalized]);
  };

  const addCustomTag = () => {
    if (!allowCustom) return;
    const normalized = customValue.trim();
    if (!normalized) {
      setErrorText("请输入内容");
      return;
    }
    if (selectedTags.includes(normalized)) {
      setErrorText("已存在相同选项");
      return;
    }
    if (selectedTags.length >= maxCount) {
      if (maxCount === 1) {
        setErrorText("");
        commitChange([normalized]);
        setCustomValue("");
        return;
      }
      setErrorText(`最多选择 ${maxCount} 个`);
      return;
    }

    setErrorText("");
    commitChange([...selectedTags, normalized]);
    setCustomValue("");
  };

  // === Panel: left categories + right tags ===
  const panel = open && panelStyle && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[90] overflow-hidden rounded-[14px] border border-slate-700/80 bg-[#0f1318] shadow-lg shadow-black/20"
          style={{
            top: `${panelStyle.top}px`,
            left: `${panelStyle.left}px`,
            width: `${panelStyle.width}px`,
            height: `${panelStyle.maxHeight}px`,
          }}
        >
          <div className="flex h-full min-h-0 flex-col p-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500">
                已选 {selectedTags.length}/{maxCount}
              </div>
              {selectedTags.length >= maxCount ? (
                <div className="text-xs text-cyan-300">已达上限</div>
              ) : null}
            </div>

            {/* Error */}
            {errorText ? (
              <div className="mt-2 shrink-0 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                {errorText}
              </div>
            ) : null}

            {/* Main content: left categories + right tags */}
            <div className="mt-2 flex min-h-0 flex-1 gap-3 overflow-hidden">
              {/* Left sidebar: categories */}
              <div className="scrollbar-thin h-full min-h-0 w-[128px] shrink-0 overflow-y-auto border-r border-white/[0.06] pr-1.5">
                <div className="space-y-1">
                  {categories.map((category, index) => {
                    const active = index === activeCategoryIndex;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setActiveCategoryIndex(index)}
                        className={`flex h-8 w-full items-center rounded-md px-2.5 text-left text-xs font-medium transition ${
                          active
                            ? "bg-cyan-400/12 text-cyan-100"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                        }`}
                      >
                        <span className="min-w-0 truncate">{category.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: tags grid for active category */}
              <div className="scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto">
                {activeCategory ? (
                  activeCategory.groups.map((group) => (
                    <div key={group.id} className="space-y-1.5">
                      {group.name !== group.tags[0] ? (
                        <div className="text-xs font-medium text-slate-500 px-0.5">
                          {group.name}
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-2">
                        {group.tags.map((tag) => {
                          const normalized = tag.trim();
                          const active = selectedTags.includes(normalized);
                          const disabled = !active && selectedTags.length >= maxCount;

                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTag(tag)}
                              disabled={disabled}
                              className={`rounded-lg border text-left text-sm transition ${
                                active
                                  ? "border-cyan-300/40 bg-cyan-400/[0.10] text-cyan-100"
                                  : disabled
                                    ? "cursor-not-allowed border-white/[0.04] bg-white/[0.02] text-slate-500 opacity-60"
                                    : "border-white/[0.08] bg-white/[0.035] text-white/70 hover:border-cyan-300/30 hover:bg-white/[0.06] hover:text-white"
                              } px-3 py-2`}
                            >
                              <span className="min-w-0 truncate whitespace-nowrap block">{tag}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : null}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  // === Shared chips + inline input (no label, used inside the shell) ===
  const chipsContent = (
    <>
      {selectedTags.map((item) => (
        <span
          key={item}
          className="inline-flex h-6 min-w-fit items-center gap-1 rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 text-[11px] whitespace-nowrap text-cyan-100"
        >
          <span className="min-w-0 truncate">{item}</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleTag(item);
            }}
            className="rounded-full p-0.5 text-cyan-100/70 transition hover:bg-cyan-400/15 hover:text-cyan-50"
            aria-label={`移除 ${item}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {allowCustom && selectedTags.length < maxCount ? (
        <input
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustomTag();
            }
          }}
          onClick={(event) => event.stopPropagation()}
          placeholder={hidePlaceholderText ? "" : customPlaceholder}
          className="h-6 min-w-[120px] flex-1 border-none bg-transparent px-1 text-sm text-white outline-none placeholder:text-slate-500"
        />
      ) : !allowCustom && selectedTags.length === 0 ? (
        <div
          aria-hidden="true"
          className="h-6 min-w-[120px] flex-1 rounded-md bg-transparent px-1"
        />
      ) : null}
    </>
  );

  // === Shared input shell (used by both branches below) ===
  const sharedShellClasses =
    "flex min-h-[42px] w-full items-center rounded-xl border border-white/[0.08] bg-white/[0.035] transition hover:border-white/[0.14] focus-within:border-cyan-300/35 focus-within:ring-2 focus-within:ring-cyan-400/10";

  return (
    <div ref={rootRef} className="relative space-y-1.5">
      {/* Label as heading, outside shell */}
      <div className="text-xs font-medium text-slate-300">
        {label}{required ? " *" : ""}
      </div>

      {customInputPlacement === "trigger" ? (
        /* === trigger mode: combobox shell, label already outside === */
        <div
          role="combobox"
          aria-expanded={open}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen((current) => !current);
            }
          }}
          className={`${sharedShellClasses} cursor-pointer`}
        >
          <div
            className="min-w-0 flex-1 px-3 py-2"
            onClick={() => setOpen(true)}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {chipsContent}
            </div>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen((current) => !current);
            }}
            className="flex shrink-0 items-center px-3 text-slate-400 transition hover:text-slate-200"
            aria-label="打开选项"
          >
            <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      ) : (
        /* === menu mode: button shell, label already outside === */
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={`${sharedShellClasses} cursor-pointer text-left`}
        >
          <div className="min-w-0 flex-1 px-3 py-2">
            {selectedTags.length === 0 ? (
              <div className="text-sm text-slate-500">{hidePlaceholderText ? "" : placeholder}</div>
            ) : (
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {chipsContent}
              </div>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 mr-3 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
        </button>
      )}

      {panel}
    </div>
  );
}
