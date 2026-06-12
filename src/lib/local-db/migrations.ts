import { localDb } from "./database";
import { type LocalProjectKind } from "./schema";

type LegacyProject = {
  id: string;
  title?: string;
  updatedAt?: string;
  draft?: unknown;
  sourceMode?: string;
  providerConfig?: unknown;
  [key: string]: unknown;
};

function inferProjectKind(sourceMode?: string | null): LocalProjectKind {
  if (sourceMode === "outline" || sourceMode === "outline_studio") return "original";
  if (sourceMode === "rewrite") return "rewrite";
  return "original";
}

function safeParse<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function migrateLegacyStorageToIndexedDb() {
  if (typeof window === "undefined") return;

  const legacyKeys = [
    "storyplay-clone-projects",
    "storyplay-clone-rewrite-projects",
    "storyplay-clone-adapt-projects",
  ] as const;

  const existingProjects = await localDb.projects.count();
  const existingRewriteProjects = await localDb.projectDrafts.where("kind").equals("rewrite").count();
  const existingAdaptProjects = await localDb.projectDrafts.where("kind").equals("adapt").count();

  if (existingAdaptProjects > 0) {
    const adaptProjectRows = await localDb.projects.where("kind").equals("adapt").toArray();
    const adaptDraftRows = await localDb.projectDrafts.where("kind").equals("adapt").toArray();

    await localDb.transaction("rw", localDb.projects, localDb.projectDrafts, async () => {
      for (const row of adaptProjectRows) {
        await localDb.projects.put({
          ...row,
          kind: "original",
          projectType: "original",
        });
      }

      for (const draft of adaptDraftRows) {
        await localDb.projectDrafts.put({
          ...draft,
          id: `original:${draft.projectId}:draft`,
          kind: "original",
        });
      }
    });
  }

  if (existingProjects > 0 || existingRewriteProjects > 0) {
    return;
  }

  const originalProjects = safeParse<LegacyProject>(window.localStorage.getItem(legacyKeys[0]));
  const rewriteProjects = safeParse<LegacyProject>(window.localStorage.getItem(legacyKeys[1]));
  const adaptProjects = safeParse<LegacyProject>(window.localStorage.getItem(legacyKeys[2]));

  const now = new Date().toISOString();

  await localDb.transaction("rw", localDb.projects, localDb.projectDrafts, async () => {
    for (const legacy of originalProjects) {
      const payload = JSON.stringify(legacy);
      await localDb.projects.put({
        id: legacy.id,
        kind: inferProjectKind(legacy.sourceMode as string | null | undefined),
        title: legacy.title || "未命名项目",
        projectType: legacy.sourceMode ? String(legacy.sourceMode) : "original",
        createdAt: (legacy as { createdAt?: string }).createdAt || now,
        updatedAt: legacy.updatedAt || now,
        payload,
      });
      if (legacy.draft) {
        await localDb.projectDrafts.put({
          id: `${legacy.id}:draft`,
          projectId: legacy.id,
          kind: "original",
          updatedAt: legacy.updatedAt || now,
          payload: JSON.stringify(legacy.draft),
        });
      }
    }

    for (const legacy of rewriteProjects) {
      const payload = JSON.stringify(legacy);
      await localDb.projects.put({
        id: legacy.id,
        kind: "rewrite",
        title: legacy.title || "未命名项目",
        projectType: "rewrite",
        createdAt: (legacy as { createdAt?: string }).createdAt || now,
        updatedAt: legacy.updatedAt || now,
        payload,
      });
    }

    for (const legacy of adaptProjects) {
      const payload = JSON.stringify(legacy);
      await localDb.projects.put({
        id: legacy.id,
        kind: "original",
        title: legacy.title || "未命名项目",
        projectType: "original",
        createdAt: (legacy as { createdAt?: string }).createdAt || now,
        updatedAt: legacy.updatedAt || now,
        payload,
      });
    }
  });
}
