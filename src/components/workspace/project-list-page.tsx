"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { WorkspaceFrame } from "@/components/workspace/workspace-frame";
import {
  audienceLabelToParam,
  createProjectRecord,
  CURRENT_PROJECT_ID_STORAGE_KEY,
  deleteProjectById,
  loadProjectsByMode,
  loadProjects,
  saveProjects,
  updateProjectById,
  addProject,
} from "@/lib/projects";
import { fetchProjects, createProject, deleteProject as apiDeleteProject, updateProject, type ApiProject } from "@/lib/api-projects";
import { useWorkspaceShell } from "@/components/workspace/workspace-shell-context";
import { ExportProjectPopover } from "@/components/workspace/export-project-popover";
import type { ProjectRecord, SourceMode } from "@/lib/types";
import type { ScriptType } from "@/components/workspace/script-type-selector";
import { getAudienceOptionsForScriptType } from "@/lib/script-tags";

type SortMode = "updated_desc" | "updated_asc" | "title_asc" | "title_desc";

const SCRIPT_TYPE_CARD_CONTENT: Record<ScriptType, { title: string; subtitle: string; accent: string; orbit: string }> = {
  short_drama: {
    title: "真人短剧",
    subtitle: "现实冲突",
    accent: "from-amber-300/90 via-orange-400/70 to-rose-500/70",
    orbit: "from-white/20 via-white/10 to-transparent",
  },
  ai_comic: {
    title: "AI 漫剧",
    subtitle: "高概念视觉",
    accent: "from-cyan-300/90 via-sky-400/70 to-violet-500/70",
    orbit: "from-cyan-100/20 via-white/10 to-transparent",
  },
};

const AUDIENCE_CARD_CONTENT: Record<"男频" | "女频" | "银发", { title: string; subtitle: string; accent: string }> = {
  男频: {
    title: "男频",
    subtitle: "升级反击",
    accent: "from-sky-400/80 via-cyan-400/50 to-blue-500/60",
  },
  女频: {
    title: "女频",
    subtitle: "关系反转",
    accent: "from-rose-300/80 via-pink-400/50 to-fuchsia-500/60",
  },
  银发: {
    title: "银发",
    subtitle: "家庭共鸣",
    accent: "from-amber-200/80 via-orange-300/45 to-yellow-500/50",
  },
};

function getProjectScriptTypeLabel(project: ProjectRecord) {
  const scriptType = project.draft.overview.scriptType;
  if (scriptType === "ai_comic") return "AI 漫剧";
  if (scriptType === "short_drama") return "真人短剧";
  return "剧本原创";
}

function getProjectFlowTypeLabel(project: ProjectRecord): "原创" | "改编" {
  // 1. sourceMode 明确且非 idea → 改编
  if (project.sourceMode !== undefined && project.sourceMode !== "idea") return "改编";

  // 2. sourceMaterial 中有真实上传/导入内容（避免空对象误判）
  if (project.sourceMaterial) {
    const sm = project.sourceMaterial;
    if (sm.outline && (sm.outline.rawText || sm.outline.cleanedText || sm.outline.sourceFileName)) return "改编";
  }

  // 3. draft.adaptation 中有真实应用内容（避免空对象误判）
  if (project.draft?.adaptation) {
    const ad = project.draft.adaptation;
    if (ad.sourceText || ad.sourceFileName || ad.extraction || ad.overseasMapping || ad.leadAnchors) return "改编";
  }

  // 4. outlines.sourceSections 有实际字段内容（避免空对象误判）
  const ss = project.draft?.outlines?.sourceSections;
  if (ss && (ss.characterProfileText || ss.storySynopsisText || ss.storyBackgroundText || (Array.isArray(ss.episodeOutlineText) && ss.episodeOutlineText.length > 0))) return "改编";

  return "原创";
}

function normalizeProjectDate(value: unknown): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? value.toISOString() : null;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }

  return null;
}

function mergeApiProjectMeta(project: ProjectRecord, apiProject: ApiProject): ProjectRecord {
  const createdAt = normalizeProjectDate(apiProject.createdAt) ?? project.updatedAt;
  const updatedAt =
    normalizeProjectDate(apiProject.updatedAt) ??
    normalizeProjectDate(apiProject.createdAt) ??
    project.updatedAt ??
    createdAt;

  return {
    ...project,
    title: apiProject.title || project.title,
    sourceMode: (apiProject.sourceMode as SourceMode) ?? project.sourceMode,
    updatedAt,
  };
}

function getProjectTime(project: ProjectRecord): number {
  const value = project.updatedAt;
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatProjectUpdatedAt(project: ProjectRecord): string {
  const value = project.updatedAt;
  if (!value) return "未知时间";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "未知时间";

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function mapApiProjects(projects: ApiProject[]): ProjectRecord[] {
  const localProjects = loadProjects();

  return projects.map((p) => {
    const existing = localProjects.find((lp) => lp.id === p.id);

    if (existing) {
      return mergeApiProjectMeta(existing, p);
    }

    const stub = createProjectRecord({
      id: p.id,
      title: p.title,
      sourceMode: (p.sourceMode as SourceMode) ?? undefined,
    });

    return mergeApiProjectMeta(stub, p);
  });
}

function hydrateProjectStub(apiProject: ApiProject) {
  const projects = loadProjects();

  if (!projects.find((p) => p.id === apiProject.id)) {
    const stub = createProjectRecord({
      id: apiProject.id,
      title: apiProject.title,
      sourceMode: (apiProject.sourceMode as SourceMode) ?? undefined,
    });

    saveProjects([mergeApiProjectMeta(stub, apiProject), ...projects]);
  }

  window.localStorage.setItem(CURRENT_PROJECT_ID_STORAGE_KEY, apiProject.id);
}

function excerptProject(project: ProjectRecord) {
  return (
    project.draft.overview.premise ||
    project.draft.overview.highlight ||
    project.draft.outlines.macro ||
    "点击进入后开始填写故事设定、人物小传、分集大纲和剧本正文。"
  ).slice(0, 110);
}

export function ProjectListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isOriginalListPage = pathname === "/workspace/original";
  const { authState } = useWorkspaceShell();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [renamingProjectId, setRenamingProjectId] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [showScriptTypeDialog, setShowScriptTypeDialog] = useState(false);
  const [selectedScriptType, setSelectedScriptType] = useState<ScriptType | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("updated_desc");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const availableAudienceOptions = selectedScriptType ? getAudienceOptionsForScriptType(selectedScriptType) : [];
  const dialogStage: "scriptType" | "audience" = selectedScriptType ? "audience" : "scriptType";

  useEffect(() => {
    if (authState === "authenticated") {
      fetchProjects({ sourceMode: "idea" })
        .then((apiProjects) => {
          setProjects(mapApiProjects(apiProjects));
        })
        .catch(() => setProjects(loadProjectsByMode("idea")));
    } else {
      setProjects(loadProjectsByMode("idea"));
    }
  }, [authState]);

  const createNewProject = async () => {
    // original 类型：先弹出剧本类型选择
    if (isOriginalListPage) {
      setSelectedScriptType(null);
      setShowScriptTypeDialog(true);
      return;
    }
    // 非 original：保持原有逻辑
    if (authState === "authenticated") {
      try {
        const apiProject = await createProject();
        hydrateProjectStub(apiProject);
        router.push(`/workspace/original/editor?projectId=${encodeURIComponent(apiProject.id)}`);
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "创建项目失败");
      }
    } else {
      router.push("/workspace/original/inspiration");
    }
  };

  const handleScriptTypeCancel = () => {
    setSelectedScriptType(null);
    setShowScriptTypeDialog(false);
  };

  const handleScriptTypeSelect = (value: ScriptType) => {
    setSelectedScriptType(value);
  };

  const handleBackToScriptType = () => {
    setSelectedScriptType(null);
  };

  const handleAudienceSelect = (label: string) => {
    if (!selectedScriptType) {
      return;
    }
    const audienceParam = audienceLabelToParam(label);
    if (!audienceParam) {
      return;
    }
    setShowScriptTypeDialog(false);
    router.push(`/workspace/original/inspiration?scriptType=${selectedScriptType}&audience=${audienceParam}`);
  };

  const startRename = (project: ProjectRecord) => {
    setRenamingProjectId(project.id);
    setRenameValue(project.title);
  };

  const submitRename = async (projectId: string) => {
    const nextTitle = renameValue.trim();
    if (!nextTitle) return;

    if (authState === "authenticated") {
      try {
        await updateProject(projectId, { title: nextTitle });
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "重命名失败");
        return;
      }
    }
    updateProjectById(projectId, (p) => ({
      ...p,
      title: nextTitle,
      draft: { ...p.draft, title: nextTitle },
      updatedAt: new Date().toISOString(),
    }));
    setProjects((current) =>
      current.map((item) =>
        item.id === projectId
          ? {
              ...item,
              title: nextTitle,
              draft: {
                ...item.draft,
                title: nextTitle,
              },
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setRenamingProjectId("");
    setRenameValue("");
  };

  const duplicateProject = async (project: ProjectRecord) => {
    if (authState === "authenticated") {
      try {
        const apiProject = await createProject(`${project.title} - 副本`, project.sourceMode ?? undefined);
        hydrateProjectStub(apiProject);
        setProjects((current) => [createProjectRecord({
          id: apiProject.id,
          title: apiProject.title,
          sourceMode: (apiProject.sourceMode as SourceMode) ?? undefined,
          draft: JSON.parse(JSON.stringify({ ...project.draft, title: apiProject.title })),
        }), ...current]);
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "复制项目失败");
      }
    } else {
      const copy = createProjectRecord({
        title: `${project.title} - 副本`,
        draft: JSON.parse(JSON.stringify({ ...project.draft, title: `${project.title} - 副本` })),
        versionHistory: JSON.parse(JSON.stringify(project.versionHistory)),
        providerConfig: JSON.parse(JSON.stringify(project.providerConfig)),
      });
      addProject(copy);
      setProjects((current) => [copy, ...current]);
    }
  };

  const deleteProject = async (project: ProjectRecord) => {
    const confirmed = window.confirm(`确定删除项目《${project.title}》吗？`);
    if (!confirmed) return;

    if (authState === "authenticated") {
      try {
        await apiDeleteProject(project.id);
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "删除项目失败");
        return;
      }
    }
    deleteProjectById(project.id);
    const nextProjects = projects.filter((item) => item.id !== project.id);
    setProjects(nextProjects);

    const nextCurrentId = nextProjects[0]?.id ?? "";
    window.localStorage.setItem(CURRENT_PROJECT_ID_STORAGE_KEY, nextCurrentId);
  };

  const filteredProjects = useMemo(() => {
    const sorted = [...projects];
    sorted.sort((a, b) => {
      switch (sortMode) {
        case "updated_asc":
          return getProjectTime(a) - getProjectTime(b);
        case "title_asc":
          return a.title.localeCompare(b.title, "zh-CN");
        case "title_desc":
          return b.title.localeCompare(a.title, "zh-CN");
        case "updated_desc":
        default:
          return getProjectTime(b) - getProjectTime(a);
      }
    });

    return sorted;
  }, [projects, sortMode]);

  const isEmpty = projects.length === 0;
  const hasNoMatch = !isEmpty && filteredProjects.length === 0;

  return (
    <WorkspaceFrame
      primaryItems={[
        { key: "original", label: "剧本原创", href: "/workspace/original", icon: "original", active: true },
        { key: "rewrite", label: "剧本改写", href: "/workspace/rewrite", icon: "rewrite" },
      ]}
      pointCount="468"
      pointLabel="大约还能生成 0 篇剧本"
      contentClassName="p-7 md:p-8"
    >
      {errorMessage && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-400 hover:text-red-200">✕</button>
        </div>
      )}
      {showScriptTypeDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[5px]"
          onClick={handleScriptTypeCancel}
        >
          <div
            className="w-[470px] max-w-[470px] min-h-[520px] max-h-[520px] p-1"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center">
              <div className="flex items-start justify-center gap-4">
                <div className="h-8 w-8 shrink-0" aria-hidden="true" />
                <div className="flex-1 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200/70">新建剧本</div>
                <h3 className="mt-3 text-2xl font-bold text-white md:text-3xl">
                  {dialogStage === "scriptType" ? "选择剧本类型" : "选择目标受众"}
                </h3>
                </div>
                <div className="h-8 w-8 shrink-0" aria-hidden="true" />
              </div>
            </div>

            <div className="mt-6 flex h-[430px] flex-col items-center">
              <div className="flex items-start justify-center gap-4">
              {dialogStage === "scriptType"
                ? (["short_drama", "ai_comic"] as ScriptType[]).map((type) => {
                    const content = SCRIPT_TYPE_CARD_CONTENT[type];
                    const selected = selectedScriptType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleScriptTypeSelect(type)}
                        className={`group w-[144px] shrink-0 overflow-hidden rounded-b-[22px] rounded-t-none border text-center transition ${
                          selected
                            ? "border-cyan-300/40 bg-white/[0.06] shadow-[0_0_0_1px_rgba(103,232,249,0.16),0_18px_50px_rgba(8,145,178,0.12)]"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className={`relative aspect-[3/4] overflow-hidden rounded-t-none bg-gradient-to-br ${content.accent}`}>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_40%)]" />
                          <div className={`absolute -right-8 top-4 h-24 w-24 rounded-full bg-gradient-to-br ${content.orbit} blur-md`} />
                          <div className="absolute inset-x-4 bottom-5 h-16 rounded-[22px] border border-white/20 bg-black/10 backdrop-blur-sm" />
                          <div className="absolute left-4 top-4 h-14 w-12 rounded-[16px] border border-white/20 bg-white/10 backdrop-blur-sm" />
                        </div>
                        <div className="px-3 py-4 text-center">
                          <div className="text-lg font-semibold text-white">{content.title}</div>
                          <div className="mt-1.5 text-xs text-slate-400">{content.subtitle}</div>
                        </div>
                      </button>
                    );
                  })
                : availableAudienceOptions.map((label) => {
                    const content = AUDIENCE_CARD_CONTENT[label as keyof typeof AUDIENCE_CARD_CONTENT];
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => handleAudienceSelect(label)}
                        className="group w-[144px] shrink-0 overflow-hidden rounded-b-[22px] rounded-t-none border border-white/10 bg-white/[0.03] text-center transition hover:border-cyan-300/30 hover:bg-white/[0.06]"
                      >
                        <div className={`relative aspect-[3/4] overflow-hidden rounded-t-none bg-gradient-to-br ${content.accent}`}>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_44%)]" />
                          <div className="absolute right-4 top-4 h-12 w-12 rounded-[18px] border border-white/22 bg-white/10 backdrop-blur-sm" />
                          <div className="absolute bottom-5 left-4 h-20 w-14 rounded-[18px] border border-white/18 bg-black/10 backdrop-blur-sm" />
                        </div>
                        <div className="px-3 py-4 text-center">
                          <div className="text-lg font-semibold text-white">{content.title}</div>
                          <div className="mt-1.5 text-xs text-slate-400">{content.subtitle}</div>
                        </div>
                      </button>
                    );
                  })}
              </div>
              {dialogStage === "audience" ? (
                <button
                  type="button"
                  onClick={handleBackToScriptType}
                  className="mt-7 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  aria-label="返回"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              ) : (
                <div className="mt-7 h-9 w-9 shrink-0" aria-hidden="true" />
              )}
            </div>
          </div>
        </div>
      )}
      {/* 显示标题栏 */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[30px] font-black text-white md:text-[48px]">剧本原创</h1>
          {!isEmpty && (
            <button
              type="button"
              onClick={() => setSortMode((current) => (current === "updated_desc" ? "title_asc" : "updated_desc"))}
              className="mt-8 flex items-center gap-3 text-[16px] font-semibold text-white/90"
            >
              <span className="text-[26px] leading-none">三</span>
              <span>排序方式</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button className="px-2 py-3 text-[16px] font-semibold text-white/90">使用教程</button>
          <button
            onClick={createNewProject}
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-7 py-4 text-[16px] font-semibold text-slate-950 transition hover:brightness-110"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>新建剧本</span>
          </button>
        </div>
      </div>

      <div className="mt-12 max-w-5xl space-y-4">
        {isEmpty || hasNoMatch ? (
          <div className="rounded-[32px] border border-dashed border-white/10 bg-white/[0.02] px-8 py-20 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
              <svg className="h-10 w-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="mt-8 text-2xl font-semibold text-white">
              {hasNoMatch ? "没有匹配的项目" : "还没有项目"}
            </div>
            <div className="mt-3 text-sm text-slate-400">
              {hasNoMatch
                ? "换个关键词试试，或者新建一个项目。"
                : "先创建一个原创项目，再进入四步工作流开始写剧本。"}
            </div>
            {!hasNoMatch && (
              <button
                onClick={createNewProject}
                className="mt-8 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-8 py-3.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                立即新建
              </button>
            )}
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group relative overflow-hidden rounded-[32px] border border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent p-5 transition-all duration-300 hover:border-cyan-500/20 hover:bg-white/[0.05] hover:shadow-xl hover:shadow-cyan-500/5"
            >
              <div className="flex gap-6">
                <button
                  onClick={() => {
                    // Hydrate stub if this is a DB project without local record
                    hydrateProjectStub({
                      id: project.id,
                      title: project.title,
                      sourceMode: project.sourceMode ?? null,
                      status: "draft",
                      createdAt: project.updatedAt,
                      updatedAt: project.updatedAt,
                    });
                    router.push(`/workspace/original/editor?projectId=${encodeURIComponent(project.id)}`);
                  }}
                  className="flex min-w-0 flex-1 gap-6 text-left"
                >
                  {/* 封面图 */}
                  <div className="relative h-36 w-48 shrink-0 overflow-hidden rounded-[28px] bg-gradient-to-br from-pink-400 via-purple-300 to-blue-300 shadow-lg">
                    <div className="absolute inset-0 bg-black/10" />
                    {/* AI 标签 */}
                    <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                      <span className="text-xs font-bold text-white">{getProjectScriptTypeLabel(project)}</span>
                    </div>
                    {/* 装饰图案 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-10 w-10 rotate-45 rounded-lg border-2 border-white/40 bg-white/10 backdrop-blur-sm" />
                      <div className="absolute h-16 w-16 -rotate-12 rounded-xl border border-white/30 bg-white/5 backdrop-blur-sm" />
                      <div className="absolute h-20 w-20 rotate-12 rounded-2xl border border-white/20" />
                    </div>
                    {/* 底部渐变 */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>

                  {/* 内容区域 */}
                  <div className="min-w-0 flex-1 pt-1">
                    {renamingProjectId === project.id ? (
                      <div className="flex max-w-xl items-center gap-3">
                        <input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-11 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 text-base font-semibold text-white outline-none focus:border-cyan-400/60"
                        />
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            submitRename(project.id);
                          }}
                          className="rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:brightness-110"
                        >
                          保存
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <h3 className="truncate text-xl font-bold text-white transition-colors group-hover:text-cyan-300">
                          {project.title}
                        </h3>
                        <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-medium text-cyan-300">
                          {getProjectFlowTypeLabel(project)}
                        </span>
                      </div>
                    )}
                    <div className="mt-2.5 flex items-center gap-4 text-sm text-slate-400">
                      <span>
                        更新于 {formatProjectUpdatedAt(project)}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500">{project.draft.overview.audience || '未设定'}</span>
                    </div>
                    <div className="mt-3 line-clamp-2 max-w-4xl text-sm leading-7 text-slate-300">
                      {excerptProject(project)}
                    </div>
                  </div>
                </button>

                {/* 操作按钮 */}
                <div className="flex flex-col justify-center gap-2 pl-4">
                  <button
                    onClick={() => startRename(project)}
                    className="group/btn flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-300"
                    title="重命名"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>重命名</span>
                  </button>
                  <ExportProjectPopover
                    draft={project.draft}
                    projectTitle={project.title}
                    className="group/btn flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition-all hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-300"
                  />
                  <button
                    onClick={() => deleteProject(project)}
                    className="group/btn flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 transition-all hover:border-rose-400/50 hover:bg-rose-500/20 hover:text-rose-200"
                    title="删除"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>删除</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </WorkspaceFrame>
  );
}
