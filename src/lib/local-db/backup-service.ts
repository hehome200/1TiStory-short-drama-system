import { localDb } from "./database";

export const LOCAL_BACKUP_FORMAT = "1tistory-community-backup";
export const LOCAL_BACKUP_VERSION = 1;

export type LocalBackupPackage = {
  format: typeof LOCAL_BACKUP_FORMAT;
  version: typeof LOCAL_BACKUP_VERSION;
  exportedAt: string;
  projects: unknown[];
  projectDrafts: unknown[];
  providerSettings: unknown[];
  appSettings: unknown[];
};

export async function exportLocalBackup(): Promise<LocalBackupPackage> {
  const [projects, projectDrafts, providerSettings, appSettings] = await Promise.all([
    localDb.projects.toArray(),
    localDb.projectDrafts.toArray(),
    localDb.providerSettings.toArray(),
    localDb.appSettings.toArray(),
  ]);

  return {
    format: LOCAL_BACKUP_FORMAT,
    version: LOCAL_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    projects,
    projectDrafts,
    providerSettings,
    appSettings,
  };
}

export async function importLocalBackup(input: LocalBackupPackage, mode: "replace" | "merge" = "merge") {
  if (input.format !== LOCAL_BACKUP_FORMAT) {
    throw new Error("备份格式不匹配");
  }
  if (input.version !== LOCAL_BACKUP_VERSION) {
    throw new Error("备份版本不受支持");
  }

  if (mode === "replace") {
    await localDb.transaction("rw", localDb.projects, localDb.projectDrafts, localDb.providerSettings, localDb.appSettings, async () => {
      await Promise.all([
        localDb.projects.clear(),
        localDb.projectDrafts.clear(),
        localDb.providerSettings.clear(),
        localDb.appSettings.clear(),
      ]);
    });
  }

  await localDb.transaction("rw", localDb.projects, localDb.projectDrafts, localDb.providerSettings, localDb.appSettings, async () => {
    for (const row of input.projects as Array<Record<string, unknown>>) {
      if (!row.id || !row.payload) continue;
      await localDb.projects.put(row as never);
    }
    for (const row of input.projectDrafts as Array<Record<string, unknown>>) {
      if (!row.id || !row.payload) continue;
      await localDb.projectDrafts.put(row as never);
    }
    for (const row of input.providerSettings as Array<Record<string, unknown>>) {
      if (!row.id || !row.payload) continue;
      await localDb.providerSettings.put(row as never);
    }
    for (const row of input.appSettings as Array<Record<string, unknown>>) {
      if (!row.key || !row.payload) continue;
      await localDb.appSettings.put(row as never);
    }
  });
}
