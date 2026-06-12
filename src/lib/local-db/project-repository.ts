import { localDb } from "./database";
import type { LocalProjectKind } from "./schema";
import type { OriginalDraft, RewriteDraft, ModelProviderConfig } from "@/lib/types";

export type ProjectRepositoryRecord = {
  id: string;
  title: string;
  kind: LocalProjectKind;
  createdAt: string;
  updatedAt: string;
  data: unknown;
};

export interface ProjectRepository<TRecord extends ProjectRepositoryRecord = ProjectRepositoryRecord> {
  list(): Promise<TRecord[]>;
  get(id: string): Promise<TRecord | null>;
  create(input: Omit<TRecord, "createdAt" | "updatedAt">): Promise<TRecord>;
  update(id: string, patch: Partial<TRecord>): Promise<TRecord>;
  delete(id: string): Promise<void>;
  duplicate(id: string): Promise<TRecord>;
  saveDraft(projectId: string, draft: unknown, kind?: LocalProjectKind): Promise<void>;
  loadDraft<TDraft = unknown>(projectId: string, kind?: LocalProjectKind): Promise<TDraft | null>;
}

function nowIso() {
  return new Date().toISOString();
}

function createRecordFromRow(row: { id: string; kind: LocalProjectKind; title: string; createdAt: string; updatedAt: string; payload: string }): ProjectRepositoryRecord {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    data: JSON.parse(row.payload) as unknown,
  };
}

function createDraftId(projectId: string, kind: LocalProjectKind) {
  return `${kind}:${projectId}:draft`;
}

export class IndexedDbProjectRepository implements ProjectRepository {
  async list() {
    const rows = await localDb.projects.orderBy("updatedAt").reverse().toArray();
    return rows.map(createRecordFromRow);
  }

  async get(id: string) {
    const row = await localDb.projects.get(id);
    return row ? createRecordFromRow(row) : null;
  }

  async create(input: Omit<ProjectRepositoryRecord, "createdAt" | "updatedAt">) {
    const createdAt = nowIso();
    const updatedAt = createdAt;
    await localDb.projects.put({
      id: input.id,
      kind: input.kind,
      title: input.title,
      projectType: input.kind,
      createdAt,
      updatedAt,
      payload: JSON.stringify(input.data),
    });
    return { ...input, createdAt, updatedAt };
  }

  async update(id: string, patch: Partial<ProjectRepositoryRecord>) {
    const current = await this.get(id);
    if (!current) {
      throw new Error("项目不存在");
    }
    const next: ProjectRepositoryRecord = {
      ...current,
      ...patch,
      id: current.id,
      kind: patch.kind ?? current.kind,
      title: patch.title ?? current.title,
      createdAt: current.createdAt,
      updatedAt: nowIso(),
      data: patch.data ?? current.data,
    };
    await localDb.projects.put({
      id: next.id,
      kind: next.kind,
      title: next.title,
      projectType: next.kind,
      createdAt: next.createdAt,
      updatedAt: next.updatedAt,
      payload: JSON.stringify(next.data),
    });
    return next;
  }

  async delete(id: string) {
    await localDb.transaction("rw", localDb.projects, localDb.projectDrafts, async () => {
      await localDb.projects.delete(id);
      await localDb.projectDrafts.where("projectId").equals(id).delete();
    });
  }

  async duplicate(id: string) {
    const current = await this.get(id);
    if (!current) {
      throw new Error("项目不存在");
    }
    const cloned = {
      ...current,
      id: `${current.id}-copy-${Date.now()}`,
      title: `${current.title} - 副本`,
      data: JSON.parse(JSON.stringify(current.data)) as unknown,
    };
    return this.create(cloned);
  }

  async saveDraft(projectId: string, draft: unknown, kind: LocalProjectKind = "original") {
    await localDb.projectDrafts.put({
      id: createDraftId(projectId, kind),
      projectId,
      kind,
      updatedAt: nowIso(),
      payload: JSON.stringify(draft),
    });
  }

  async loadDraft<TDraft = unknown>(projectId: string, kind: LocalProjectKind = "original") {
    const row = await localDb.projectDrafts.get(createDraftId(projectId, kind));
    if (!row) return null;
    try {
      return JSON.parse(row.payload) as TDraft;
    } catch {
      return null;
    }
  }
}

export const indexedDbProjectRepository = new IndexedDbProjectRepository();
