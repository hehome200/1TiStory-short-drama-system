import {
  addProject,
  createProjectRecord,
  deleteProjectById,
  loadProjects,
  updateProjectById,
} from "@/lib/projects";
import type { ProjectRecord } from "@/lib/types";

export type DraftSummary = {
  scriptType?: string | null;
  targetAudience?: string | null;
  coreSetting?: string | null;
  eraBackground?: string | null;
  genreType?: string | null;
  styleElement?: string | null;
  stage?: string | null;
  episodeCount?: number | null;
  scriptWordCount?: number | null;
  excerpt?: string | null;
};

export type ApiProject = {
  id: string;
  title: string;
  sourceMode: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  draftSummary?: DraftSummary | null;
};

function toApiProject(project: ProjectRecord): ApiProject {
  return {
    id: project.id,
    title: project.title,
    sourceMode: project.sourceMode ?? null,
    status: project.draft?.script?.content?.trim() ? "published" : "draft",
    createdAt: project.updatedAt,
    updatedAt: project.updatedAt,
    draftSummary: {
      scriptType: project.draft?.overview?.scriptType ?? null,
      targetAudience: project.draft?.overview?.audience ?? null,
      coreSetting: project.draft?.overview?.worldview ?? null,
      eraBackground: project.draft?.overview?.storyBackground ?? null,
      genreType: project.draft?.overview?.genres?.[0] ?? null,
      styleElement: project.draft?.overview?.styleTags?.[0] ?? null,
      stage: project.draft?.outlines?.lockLevel ? "locked" : "draft",
      episodeCount: project.draft?.overview?.projectBrief?.episodeCount ?? null,
      scriptWordCount: project.draft?.script?.content?.length ?? null,
      excerpt: project.draft?.overview?.premise ?? null,
    },
  };
}

export type FetchProjectsOptions = {
  sourceMode?: string;
};

export async function fetchProjects(options?: FetchProjectsOptions): Promise<ApiProject[]> {
  const projects = loadProjects();
  const filtered = options?.sourceMode
    ? projects.filter((project) => project.sourceMode === options.sourceMode)
    : projects;
  return filtered.map(toApiProject);
}

export async function createProject(title?: string, sourceMode?: string): Promise<ApiProject> {
  const project = createProjectRecord({
    title: title || "未命名项目",
    sourceMode: (sourceMode as ProjectRecord["sourceMode"]) ?? "idea",
  });
  addProject(project);
  return toApiProject(project);
}

export async function updateProject(
  projectId: string,
  data: Record<string, unknown>,
): Promise<ApiProject> {
  const next = updateProjectById(projectId, (project) => ({
    ...project,
    title: typeof data.title === "string" ? data.title : project.title,
    sourceMode: typeof data.sourceMode === "string" ? data.sourceMode : project.sourceMode,
    draft: project.draft,
    updatedAt: new Date().toISOString(),
  } as ProjectRecord));
  const updated = next.find((project) => project.id === projectId);
  if (!updated) {
    throw new Error("项目不存在");
  }
  return toApiProject(updated);
}

export async function deleteProject(projectId: string): Promise<void> {
  deleteProjectById(projectId);
}

export type ProjectDraftResponse = {
  draft: unknown;
  updatedAt: string | null;
  version: number | null;
};

export async function loadProjectDraft(
  projectId: string,
  _flowType = "original",
): Promise<ProjectDraftResponse | null> {
  const project = loadProjects().find((item) => item.id === projectId);
  if (!project) return null;
  return {
    draft: project.draft,
    updatedAt: project.updatedAt,
    version: 1,
  };
}

export async function saveProjectDraft(
  projectId: string,
  draft: unknown,
  _flowType = "original",
): Promise<{ updatedAt: string; version: number } | null> {
  const next = updateProjectById(projectId, (project) => ({
    ...project,
    draft: draft as ProjectRecord["draft"],
    updatedAt: new Date().toISOString(),
  }));
  const updated = next.find((project) => project.id === projectId);
  if (!updated) {
    return null;
  }
  return { updatedAt: updated.updatedAt, version: 1 };
}
