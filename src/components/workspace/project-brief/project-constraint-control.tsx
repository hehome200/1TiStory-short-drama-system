"use client";

import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";

export type TickDef = {
  value: number;
  label?: string;
};

type ProjectConstraintControlProps = {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  normalizeValue?: (next: number) => number;
  ticks?: TickDef[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatValue(value: number, unit: string) {
  return `${value} ${unit}`;
}

export function ProjectConstraintControl({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  normalizeValue,
  ticks,
}: ProjectConstraintControlProps) {
  const safeValue = useMemo(() => {
    const baseValue = Number.isFinite(value) ? Math.trunc(value) : min;
    const clamped = clamp(baseValue, min, max);
    return normalizeValue ? clamp(normalizeValue(clamped), min, max) : clamped;
  }, [max, min, normalizeValue, value]);

  const [dragValue, setDragValue] = useState(safeValue);

  useEffect(() => {
    setDragValue(safeValue);
  }, [safeValue]);

  const handleChange = (next: number) => {
    const normalized = normalizeValue ? normalizeValue(next) : next;
    const clamped = clamp(Math.trunc(normalized), min, max);
    setDragValue(clamped);
    onChange(clamped);
  };

  return (
    <div className="space-y-1.5 py-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">{label}</span>
        <span className="text-sm font-medium text-white">{formatValue(safeValue, unit)}</span>
      </div>
      <Slider
        value={[dragValue]}
        min={min}
        max={max}
        step={step}
        onValueChange={(value) => {
          const next = Array.isArray(value) ? value[0] : value;
          if (next !== undefined) handleChange(next);
        }}
      />
      {ticks && ticks.length > 0 && (
        <div className="relative mt-0.5 h-3.5">
          {ticks.map((tick, i) => {
            const pct = ((tick.value - min) / (max - min)) * 100;
            const isFirst = i === 0;
            const isLast = i === ticks.length - 1;
            return (
              <div
                key={tick.value}
                className="absolute"
                style={{
                  left: `${pct}%`,
                  transform: isFirst ? "translateX(0)" : isLast ? "translateX(-100%)" : "translateX(-50%)",
                }}
              >
                <div className="mx-auto h-1.5 w-px bg-white/20" />
                {tick.label !== undefined && (
                  <div className="mt-0.5 text-[10px] text-white/25 leading-none text-center whitespace-nowrap">
                    {tick.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
