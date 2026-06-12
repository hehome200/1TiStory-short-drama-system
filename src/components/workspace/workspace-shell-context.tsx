"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuthSession, type SessionUser } from "@/lib/auth-client";
import { hydrateProjectsCache } from "@/lib/projects";
import { hydrateRewriteWorkspace } from "@/lib/rewrite-projects";
import { loadLocalProviderConfig } from "@/lib/local-ai/provider-settings";
import { PROVIDER_CONFIG_STORAGE_KEY } from "@/lib/provider-config";
import type { WorkspaceSidebarItem } from "@/components/workspace/workspace-sidebar";

// New sidebar navigation items
export const CREATION_WORKSPACE_ITEM: WorkspaceSidebarItem = {
  key: "creation",
  label: "剧本创作",
  href: "/workspace/original",
  icon: "creation",
};

export const SETTINGS_ITEM: WorkspaceSidebarItem = {
  key: "settings",
  label: "账户中心",
  href: "/workspace/settings",
  icon: "settings",
};

export type WorkspaceShellConfig = {
  primaryItems: WorkspaceSidebarItem[];
  secondaryItems: WorkspaceSidebarItem[];
  pointCount: string;
  pointLabel: string;
  footerLabel: string;
  note?: string;
  contentClassName: string;
  auraCount?: number | null;
};

const defaultShellConfig: WorkspaceShellConfig = {
  primaryItems: [CREATION_WORKSPACE_ITEM],
  secondaryItems: [SETTINGS_ITEM],
  pointCount: "468",
  pointLabel: "大约还能生成 0 篇剧本",
  footerLabel: "充值剧点",
  note: undefined,
  contentClassName: "",
  auraCount: null,
};

type WorkspaceShellContextValue = {
  config: WorkspaceShellConfig;
  setConfig: (nextConfig: WorkspaceShellConfig) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  authState: "loading" | "authenticated" | "unauthenticated";
  sessionUser: SessionUser | null;
  isAuthenticated: boolean;
  importDialogOpen: boolean;
  setImportDialogOpen: (open: boolean) => void;
};

const WorkspaceShellContext = createContext<WorkspaceShellContextValue | null>(null);

export function WorkspaceShellProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<WorkspaceShellConfig>(defaultShellConfig);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { user, isAuthenticated, loading } = useAuthSession();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [, forceHydrateTick] = useState(0);

  useEffect(() => {
    void Promise.all([
      hydrateProjectsCache(),
      hydrateRewriteWorkspace(),
      loadLocalProviderConfig().then((config) => {
        if (typeof window !== "undefined" && config.enabled) {
          window.localStorage.setItem(PROVIDER_CONFIG_STORAGE_KEY, JSON.stringify(config));
        }
      }),
    ]).catch((error) => {
      console.warn("[workspace-shell] hydrate failed", error);
    }).finally(() => {
      forceHydrateTick((value) => value + 1);
    });
  }, []);

  const authState: "loading" | "authenticated" | "unauthenticated" = loading
    ? "loading"
    : isAuthenticated
      ? "authenticated"
      : "unauthenticated";

  const setStableConfig = useCallback((nextConfig: WorkspaceShellConfig) => {
    setConfig((currentConfig) => {
      if (JSON.stringify(currentConfig) === JSON.stringify(nextConfig)) {
        return currentConfig;
      }

      return nextConfig;
    });
  }, []);

  const value = useMemo(
    () => ({
      config,
      setConfig: setStableConfig,
      isSettingsOpen,
      setIsSettingsOpen,
      authState,
      sessionUser: user,
      isAuthenticated,
      importDialogOpen,
      setImportDialogOpen,
    }),
    [config, setStableConfig, isSettingsOpen, authState, user, isAuthenticated, importDialogOpen],
  );

  return <WorkspaceShellContext.Provider value={value}>{children}</WorkspaceShellContext.Provider>;
}

export function useWorkspaceShell() {
  const context = useContext(WorkspaceShellContext);
  if (!context) {
    throw new Error("useWorkspaceShell must be used within WorkspaceShellProvider.");
  }

  return context;
}

export function getDefaultWorkspaceShellConfig(): WorkspaceShellConfig {
  return defaultShellConfig;
}
