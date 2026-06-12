import type { OutlinePhaseView } from "./contracts";

type OutlinePhaseSidebarProps = {
  phases: OutlinePhaseView[];
  selectedPhaseId?: string;
  /** 被分集选中时的次级高亮 */
  highlightedPhaseId?: string;
  onSelect?: (phaseId: string) => void;
  /** 只读：不可编辑，但仍可点击选择 */
  readonly?: boolean;
};

export function OutlinePhaseSidebar({
  phases,
  selectedPhaseId,
  highlightedPhaseId,
  onSelect,
  readonly,
}: OutlinePhaseSidebarProps) {
  // 可点击：取决于是否有 onSelect，与 readonly 无关
  const clickable = Boolean(onSelect);

  return (
    <div className="space-y-4">
      {phases.map((phase) => {
        const isSelected = phase.id === selectedPhaseId;
        const isHighlighted = phase.id === highlightedPhaseId && !isSelected;

        let borderClass: string;
        let bgClass: string;

        if (isSelected) {
          borderClass = "border-violet-400/50";
          bgClass = "bg-violet-500/10";
        } else if (isHighlighted) {
          borderClass = "border-violet-400/30";
          bgClass = "bg-violet-500/8";
        } else {
          borderClass = "border-violet-400/20";
          bgClass = "bg-violet-500/5";
        }

        return (
          <div
            key={phase.id}
            className={`rounded-[28px] border px-5 py-5 text-slate-200 transition-colors ${borderClass} ${bgClass} ${
              clickable ? "cursor-pointer hover:border-violet-400/40" : ""
            }`}
            onClick={clickable ? () => onSelect!(phase.id) : undefined}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xl font-bold text-violet-300">{phase.label}</span>
              <span className="text-sm text-slate-500">
                第{phase.startEpisode}-{phase.endEpisode}集
              </span>
            </div>
            {phase.summary && (
              <p className="text-sm leading-6">{phase.summary}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
