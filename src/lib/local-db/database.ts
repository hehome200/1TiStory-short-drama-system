import Dexie, { type Table } from "dexie";
import {
  LOCAL_DB_NAME,
  LOCAL_DB_VERSION,
  type LocalAppSettingsRow,
  type LocalProjectDraftRow,
  type LocalProjectRow,
  type LocalProviderSettingsRow,
} from "./schema";

export class LocalFirstDatabase extends Dexie {
  projects!: Table<LocalProjectRow, string>;
  projectDrafts!: Table<LocalProjectDraftRow, string>;
  providerSettings!: Table<LocalProviderSettingsRow, string>;
  appSettings!: Table<LocalAppSettingsRow, string>;

  constructor() {
    super(LOCAL_DB_NAME);
    this.version(LOCAL_DB_VERSION).stores({
      projects: "id, kind, projectType, updatedAt, createdAt",
      projectDrafts: "id, projectId, kind, updatedAt",
      providerSettings: "id, updatedAt",
      appSettings: "key, updatedAt",
    });
  }
}

export const localDb = new LocalFirstDatabase();

export function isLocalDbAvailable() {
  return typeof window !== "undefined";
}
