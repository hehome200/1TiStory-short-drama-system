"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useWorkspaceShell } from "@/components/workspace/workspace-shell-context";

import type { WorkspaceSidebarItem } from "@/components/workspace/workspace-sidebar";

type WorkspaceFrameProps = {
  primaryItems?: WorkspaceSidebarItem[];
  secondaryItems?: WorkspaceSidebarItem[];
  pointCount?: string;
  pointLabel?: string;
  footerLabel?: string;
  note?: string;
  contentClassName?: string;
  children: ReactNode;
};

export function WorkspaceFrame({
  primaryItems: _primaryItems,
  secondaryItems: _secondaryItems,
  pointCount,
  pointLabel,
  footerLabel,
  note,
  contentClassName = "",
  children,
}: WorkspaceFrameProps) {
  const { config, setConfig } = useWorkspaceShell();

  const nextConfig = useMemo(
    () => ({
      primaryItems: config.primaryItems,
      secondaryItems: config.secondaryItems,
      pointCount: pointCount ?? config.pointCount,
      pointLabel: pointLabel ?? config.pointLabel,
      footerLabel: footerLabel ?? config.footerLabel,
      note: note ?? config.note,
      contentClassName,
      auraCount: config.auraCount,
    }),
    [
      contentClassName,
      footerLabel,
      note,
      pointCount,
      pointLabel,
      config,
    ],
  );
  const nextConfigKey = useMemo(() => JSON.stringify(nextConfig), [nextConfig]);
  const currentConfigKey = useMemo(() => JSON.stringify(config), [config]);

  useEffect(() => {
    if (nextConfigKey !== currentConfigKey) {
      setConfig(nextConfig);
    }
  }, [currentConfigKey, nextConfig, nextConfigKey, setConfig]);

  return <>{children}</>;
}
