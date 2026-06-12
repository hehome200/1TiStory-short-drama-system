"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, X } from "lucide-react";

type MultiTagDropdownProps = {
  label: string;
  placeholder: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  maxCount: number;
  required?: boolean;
  helperText?: string;
  allowCustom?: boolean;
  customPlaceholder?: string;
  menuColumns?: 1 | 2 | 3 | 4;
  customInputPlacement?: "menu" | "trigger";
  hidePlaceholderText?: boolean;
};

function uniqueTrimmed(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

export function MultiTagDropdown({
  label,
  placeholder,
  options,
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
}: MultiTagDropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
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
      const openAbove = spaceBelow < 170 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(180, Math.min(280, openAbove ? spaceAbove : spaceBelow));
      const top = openAbove
        ? Math.max(5, rect.top - Math.min(280, maxHeight) - 5)
        : rect.bottom + 5;

      setPanelStyle({
        top: Math.max(8, top),
        left: rect.left,
        width: rect.width,
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
    setErrorText("");
  }, [selectedTags.length, open]);

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

  const gridClass = menuColumns === 2 ? "grid grid-cols-2 gap-2"
    : menuColumns === 3 ? "grid grid-cols-3 gap-2"
    : menuColumns === 4 ? "grid grid-cols-4 gap-2"
    : "space-y-1";

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
          <div className="flex h-full min-h-0 flex-col p-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                已选 {selectedTags.length}/{maxCount}
              </div>
              {selectedTags.length >= maxCount ? (
                <div className="text-xs text-cyan-300">已达上限</div>
              ) : null}
            </div>

            {/* Custom input only when placement is "menu" (old behavior) */}
            {allowCustom && customInputPlacement === "menu" ? (
              <div className="mt-1.5 shrink-0 flex gap-2">
                <input
                  value={customValue}
                  onChange={(event) => setCustomValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomTag();
                    }
                  }}
                  placeholder={customPlaceholder}
                  className="h-8 flex-1 rounded-lg border border-slate-700 bg-white/[0.04] px-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 text-sm text-cyan-100 transition hover:bg-cyan-400/15"
                >
                  <Plus className="h-4 w-4" />
                  添加
                </button>
              </div>
            ) : null}

            {errorText ? (
              <div className="mt-2 shrink-0 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                {errorText}
              </div>
            ) : null}

            {/* Tag grid — only tags, no input */}
            <div className="scrollbar-thin mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className={gridClass}>
                {options.map((option) => {
                  const normalized = option.trim();
                  const active = selectedTags.includes(normalized);
                  const disabled = !active && selectedTags.length >= maxCount;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleTag(option)}
                      disabled={disabled}
                      className={`rounded-lg border text-left text-sm transition ${
                        active
                          ? "border-cyan-300/40 bg-cyan-400/[0.10] text-cyan-100"
                          : disabled
                            ? "cursor-not-allowed border-white/[0.04] bg-white/[0.02] text-slate-500 opacity-60"
                            : "border-white/[0.08] bg-white/[0.035] text-white/70 hover:border-cyan-300/30 hover:bg-white/[0.06] hover:text-white"
                      } px-3 py-2`}
                    >
                      <span className="min-w-0 truncate whitespace-nowrap block">{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  // Shared chips + inline input
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

  return (
    <div ref={rootRef} className="relative">
      {customInputPlacement === "trigger" ? (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-slate-300">
            {label}{required ? " *" : ""}
          </div>

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
            className="flex min-h-[42px] w-full items-stretch rounded-xl border border-white/[0.08] bg-white/[0.035] transition hover:border-white/[0.14] focus-within:border-cyan-300/35 focus-within:ring-2 focus-within:ring-cyan-400/10 cursor-pointer"
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
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-slate-300">
            {label}{required ? " *" : ""}
          </div>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex min-h-[42px] w-full items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-left transition hover:border-white/[0.14] focus:outline-none focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-400/10"
          >
            <div className="min-w-0 flex-1">
              {selectedTags.length === 0 ? (
                <div className="text-sm text-slate-500">{hidePlaceholderText ? "" : placeholder}</div>
              ) : (
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {chipsContent}
                </div>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {panel}
    </div>
  );
}
