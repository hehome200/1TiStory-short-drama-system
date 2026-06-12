"use client";

import { useMemo } from "react";
import type { TurningPoint } from "@/lib/types";
import { buildEpisodeBatches } from "@/lib/outline/phase-utils";

type PhasePlannerPanelProps = {
  turningPoints: TurningPoint[];
  totalEpisodes: number;
  selectedArcIndex?: number;
  onSelectArcIndex?: (arcIndex: number) => void;
};

export function PhasePlannerPanel({
  turningPoints,
  totalEpisodes,
  selectedArcIndex,
  onSelectArcIndex,
}: PhasePlannerPanelProps) {
  const batches = useMemo(() => buildEpisodeBatches(totalEpisodes), [totalEpisodes]);
  const batchGroups = useMemo(() => {
    const groups: typeof batches[] = [];
    for (let i = 0; i < batches.length; i += 3) {
      groups.push(batches.slice(i, i + 3));
    }
    return groups;
  }, [batches]);

  if (batches.length === 0) {
    return (
      <div className="w-[172px]" />
    );
  }

  return (
      <div className="w-full space-y-2">
        {batchGroups.map((group, groupIndex) => (
        <div key={`batch-group-${groupIndex}`} className="rounded-lg border border-white/10 bg-slate-950/50 p-1.5 shadow-sm">
          <div className="space-y-1.5">
            {group.map((batch, localIndex) => {
              const index = groupIndex * 3 + localIndex;
              const isSelected = index === (selectedArcIndex ?? 0);
              return (
                <button
                  key={batch.batchIndex}
                  type="button"
                  onClick={() => onSelectArcIndex?.(index)}
                  className={`flex h-10 w-full items-center justify-center rounded-lg border text-sm font-semibold tracking-wide transition-colors ${
                    isSelected
                      ? "border-sky-400/55 bg-sky-400/12 text-white"
                      : "border-white/10 bg-slate-950/30 text-slate-300 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  {batch.startEpisode} - {batch.endEpisode}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
