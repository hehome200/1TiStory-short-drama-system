import type { ReactNode } from "react";

// ==================== OutlineWorkbenchKit ViewModel 契约 ====================
// 本文件只定义 shared-outline UI 层的 ViewModel，不依赖任何业务类型。

/** 分集卡片 ViewModel */
export type OutlineEpisodeView = {
  id: string;
  episodeNumber: number;
  title?: string;
  summary: string;
  goal?: string;
  coreEvent?: string;
  conflictProgress?: string;
  resultChange?: string;
  phaseId?: string;
  sourceRefs?: string[];
  warnings?: string[];
};

/** 阶段侧栏 ViewModel */
export type OutlinePhaseView = {
  id: string;
  label: string;
  startEpisode: number;
  endEpisode: number;
  episodeIds: string[];
  summary?: string;
};

/** OutlineWorkbench 容器 Props */
export type OutlineWorkbenchProps = {
  episodes: OutlineEpisodeView[];
  phases?: OutlinePhaseView[];
  /** 外部受控选中态；不传则由内部自管 */
  selectedEpisodeId?: string;
  selectedPhaseId?: string;
  readonly?: boolean;
  /** 选中回调，外部可监听但不影响内部高亮 */
  onSelectEpisode?: (episodeId: string) => void;
  onSelectPhase?: (phaseId: string) => void;
  /** 容器 className 扩展 */
  className?: string;
  slots?: {
    header?: ReactNode;
    empty?: ReactNode;
    footer?: ReactNode;
  };
};
