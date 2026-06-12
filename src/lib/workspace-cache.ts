/**
 * Workspace 本地缓存清理工具
 * 用于在登录/退出时清理跨用户数据
 */

export const WORKSPACE_CACHE_KEYS = [
  // 新版 key (storyplay-clone 前缀)
  "storyplay-clone-projects",
  "storyplay-clone-current-project-id",
  "storyplay-clone-rewrite-projects",
  "storyplay-clone-current-rewrite-project-id",
  "storyplay-clone-pending-original-inspiration",
  "storyplay-clone-provider-config",
  "storyplay-clone-version-history",

  // 旧版 key (无前缀)
  "projects",
  "currentProjectId",
  "current-project-id",
  "rewrite-projects",
  "current-rewrite-project-id",
] as const;

export function clearWorkspaceCache(): void {
  if (typeof window === "undefined") return;

  for (const key of WORKSPACE_CACHE_KEYS) {
    window.localStorage.removeItem(key);
  }
}
