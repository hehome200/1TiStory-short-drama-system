import type { OutlineEpisodeView } from "./contracts";

type OutlineEpisodeCardProps = {
  episode: OutlineEpisodeView;
  selected?: boolean;
  /** 被阶段选中时的次级高亮 */
  highlighted?: boolean;
  onSelect?: (episodeId: string) => void;
  /** 只读：不可编辑，但仍可点击选择 */
  readonly?: boolean;
};

export function OutlineEpisodeCard({
  episode,
  selected,
  highlighted,
  onSelect,
  readonly,
}: OutlineEpisodeCardProps) {
  // 可点击：取决于是否有 onSelect，与 readonly 无关
  const clickable = Boolean(onSelect);

  let borderClass: string;
  let bgClass: string;

  if (selected) {
    borderClass = "border-violet-400/50";
    bgClass = "bg-violet-500/10";
  } else if (highlighted) {
    borderClass = "border-violet-400/25";
    bgClass = "bg-violet-500/5";
  } else {
    borderClass = "border-white/10";
    bgClass = "bg-white/4";
  }

  return (
    <div
      className={`rounded-[28px] border p-6 text-slate-200 transition-colors ${borderClass} ${bgClass} ${
        clickable ? "cursor-pointer hover:border-violet-400/30" : ""
      }`}
      onClick={clickable ? () => onSelect!(episode.id) : undefined}
    >
      <div className="mb-2 flex items-center gap-3">
        <span className="text-2xl font-semibold">第{episode.episodeNumber}集</span>
        {episode.title && (
          <span className="text-lg text-slate-300">{episode.title}</span>
        )}
      </div>

      <div className="text-lg leading-8">{episode.summary}</div>

      {(episode.goal || episode.coreEvent || episode.conflictProgress || episode.resultChange) && (
        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
          {episode.goal && (
            <div>
              <span className="text-xs font-medium text-slate-500">目标</span>
              <p className="text-sm leading-6">{episode.goal}</p>
            </div>
          )}
          {episode.coreEvent && (
            <div>
              <span className="text-xs font-medium text-slate-500">核心事件</span>
              <p className="text-sm leading-6">{episode.coreEvent}</p>
            </div>
          )}
          {episode.conflictProgress && (
            <div>
              <span className="text-xs font-medium text-slate-500">冲突进展</span>
              <p className="text-sm leading-6">{episode.conflictProgress}</p>
            </div>
          )}
          {episode.resultChange && (
            <div>
              <span className="text-xs font-medium text-slate-500">结果变化</span>
              <p className="text-sm leading-6">{episode.resultChange}</p>
            </div>
          )}
        </div>
      )}

      {episode.warnings && episode.warnings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {episode.warnings.map((w) => (
            <span
              key={w}
              className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300"
            >
              {w}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
