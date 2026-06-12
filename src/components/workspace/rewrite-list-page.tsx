"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceFrame } from "@/components/workspace/workspace-frame";
import {
  createRewriteProjectRecord,
  CURRENT_REWRITE_PROJECT_ID_STORAGE_KEY,
  INITIAL_REWRITE_DRAFT,
  loadRewriteWorkspace,
  REWRITE_PROJECTS_STORAGE_KEY,
} from "@/lib/rewrite-projects";
import { loadGlobalProviderConfig } from "@/lib/provider-config";
import type { RewriteProjectRecord } from "@/lib/types";
import {
  ScriptTypeSelector,
  type ScriptType,
  scriptTypeToAdaptFormat,
} from "@/components/workspace/script-type-selector";

type SortMode = "updated_desc" | "updated_asc" | "title_asc" | "title_desc";

function excerptProject(project: RewriteProjectRecord) {
  return (
    project.draft.infoFlow.sourceSynopsis ||
    project.draft.overview.premise ||
    "点击进入后开始做剧本改写的信息流、梗概、人物、小纲和正文。"
  ).slice(0, 110);
}

export function RewriteListPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [projects, setProjects] = useState<RewriteProjectRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updated_desc");
  const [fileName, setFileName] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [scriptType, setScriptType] = useState<ScriptType>("short_drama");
  const [showImportModal, setShowImportModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [renamingProjectId, setRenamingProjectId] = useState("");
  const [renameValue, setRenameValue] = useState("");

  // 客户端加载项目数据
  useEffect(() => {
    const workspace = loadRewriteWorkspace();
    setProjects(workspace.projects);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(REWRITE_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const openFilePicker = () => inputRef.current?.click();

  const handleFileChange = async (file?: File | null) => {
    if (!file) return;
    if (isUploading) return;

    setIsUploading(true);
    try {
      const nextSourceText = (await file.text()).trim();

      if (!nextSourceText) {
        throw new Error("导入的剧本内容为空，请检查文件格式。");
      }

      setFileName(file.name);
      setSourceText(nextSourceText);
      setScriptType("short_drama");
      setShowImportModal(true);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "文件读取失败，请重试。");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmImport = () => {
    if (!sourceText.trim()) {
      setErrorMessage("导入剧本文本为空，请重新上传。");
      return;
    }

    const title = fileName.replace(/\.[^.]+$/, "") || "剧本改写项目";
    const synopsisSeed = sourceText.replace(/\s+/g, " ").trim();
    const format = scriptTypeToAdaptFormat(scriptType);
    const project = createRewriteProjectRecord({
      title,
      providerConfig: loadGlobalProviderConfig(),
      draft: {
        ...INITIAL_REWRITE_DRAFT,
        title,
        infoFlow: {
          sourceFileName: fileName,
          sourceText,
          uploaded: true,
          format,
          sourceTitle: title,
          sourceSynopsis: synopsisSeed.slice(0, 220),
          keyNodes: "",
          overview: {
            audience: "",
            genres: "",
            coreHooks: "",
            styleTags: "",
            worldview: "",
            highlight: "",
            premise: "",
          },
          characters: [],
          macro: {
            content: "",
          },
          episodes: {
            episodes: [],
          },
        },
        overview: {
          ...INITIAL_REWRITE_DRAFT.overview,
          scriptType,
          audience: format === "live_action" ? "女频" : INITIAL_REWRITE_DRAFT.overview.audience,
          genre: "",
          coreHooks: [],
          styleTags: [],
          worldview: "",
          highlight: "",
          premise: "",
        },
        characters: [],
        outlines: {
          ...INITIAL_REWRITE_DRAFT.outlines,
          macro: "",
          episodes: [],
        },
        script: {
          ...INITIAL_REWRITE_DRAFT.script,
          content: "",
        },
      },
    });

    setProjects((current) => {
      const nextProjects = [project, ...current];
      window.localStorage.setItem(REWRITE_PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));
      return nextProjects;
    });
    window.localStorage.setItem(CURRENT_REWRITE_PROJECT_ID_STORAGE_KEY, project.id);
    setShowImportModal(false);
    router.push(`/workspace/rewrite/editor?projectId=${encodeURIComponent(project.id)}`);
  };

  const filteredProjects = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    const searched = keyword
      ? projects.filter((project) =>
          [project.title, project.draft.infoFlow.sourceSynopsis, project.draft.overview.premise]
            .join(" ")
            .toLowerCase()
            .includes(keyword),
        )
      : projects;

    const sorted = [...searched];
    sorted.sort((a, b) => {
      switch (sortMode) {
        case "updated_asc":
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case "title_asc":
          return a.title.localeCompare(b.title, "zh-CN");
        case "title_desc":
          return b.title.localeCompare(a.title, "zh-CN");
        case "updated_desc":
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return sorted;
  }, [projects, searchQuery, sortMode]);

  const isEmpty = projects.length === 0;

  const startRename = (project: RewriteProjectRecord) => {
    setRenamingProjectId(project.id);
    setRenameValue(project.title);
  };

  const submitRename = (projectId: string) => {
    const nextTitle = renameValue.trim();
    if (!nextTitle) return;

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

  const duplicateProject = (project: RewriteProjectRecord) => {
    const copy = createRewriteProjectRecord({
      title: `${project.title} - 副本`,
      draft: JSON.parse(JSON.stringify({ ...project.draft, title: `${project.title} - 副本` })),
    });

    setProjects((current) => [copy, ...current]);
  };

  const deleteProject = (project: RewriteProjectRecord) => {
    const confirmed = window.confirm(`确定删除项目《${project.title}》吗？`);
    if (!confirmed) return;

    const nextProjects = projects.filter((item) => item.id !== project.id);
    setProjects(nextProjects);
    window.localStorage.setItem(REWRITE_PROJECTS_STORAGE_KEY, JSON.stringify(nextProjects));

    const nextCurrentId = nextProjects[0]?.id ?? "";
    if (nextCurrentId) {
      window.localStorage.setItem(CURRENT_REWRITE_PROJECT_ID_STORAGE_KEY, nextCurrentId);
    } else {
      window.localStorage.removeItem(CURRENT_REWRITE_PROJECT_ID_STORAGE_KEY);
    }
  };

  return (
    <WorkspaceFrame
      primaryItems={[
        { key: "original", label: "剧本原创", href: "/workspace/original", icon: "original" },
        { key: "rewrite", label: "剧本改写", href: "/workspace/rewrite", icon: "rewrite", active: true },
      ]}
      note="剧本改写支持本地导入和持续编辑。"
      contentClassName="p-7 md:p-8"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(event) => handleFileChange(event.target.files?.[0])}
      />

      {/* 显示标题栏 */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[30px] font-black text-white md:text-[48px]">剧本改写</h1>
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
            onClick={openFilePicker}
            disabled={isUploading}
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-7 py-4 text-[16px] font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>{isUploading ? "上传中..." : "导入剧本"}</span>
          </button>
        </div>
      </div>

      <div className="mt-12 max-w-5xl space-y-4">
        {isEmpty ? (
          <div className="rounded-[32px] border border-dashed border-white/10 bg-white/[0.02] px-8 py-20 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
              <svg className="h-10 w-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="mt-8 text-2xl font-semibold text-white">
              还没有改写项目
            </div>
            <div className="mt-3 text-sm text-slate-400">
              上传已有剧本文档，AI 帮你快速改写和优化
            </div>
            <button
              onClick={openFilePicker}
              disabled={isUploading}
              className="mt-8 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-8 py-3.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploading ? "上传中..." : "上传剧本"}
            </button>
            {errorMessage && (
              <div className="mt-6 text-sm text-rose-300">{errorMessage}</div>
            )}
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group relative overflow-hidden rounded-[32px] border border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent p-5 transition-all duration-300 hover:border-violet-500/20 hover:bg-white/[0.05] hover:shadow-xl hover:shadow-violet-500/5"
            >
                <div className="flex gap-6">
                  <button
                    onClick={() => router.push(`/workspace/rewrite/editor?projectId=${encodeURIComponent(project.id)}`)}
                    className="flex min-w-0 flex-1 gap-6 text-left"
                  >
                    {/* 封面图 */}
                    <div className="relative h-36 w-48 shrink-0 overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-600 via-purple-400 to-amber-200 shadow-lg">
                      <div className="absolute inset-0 bg-black/10" />
                      {/* AI 标签 */}
                      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                        <span className="text-xs font-bold text-white">AI 改写</span>
                      </div>
                      {/* 装饰图案 */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-10 w-10 rotate-45 rounded-lg border-2 border-white/40 bg-white/10 backdrop-blur-sm" />
                        <div className="absolute h-16 w-16 -rotate-12 rounded-xl border border-white/30 bg-white/5 backdrop-blur-sm" />
                        <div className="absolute h-20 w-20 rotate-12 rounded-2xl border border-white/20" />
                      </div>
                      {/* 类型标签 */}
                      <div className="absolute right-3 top-3 rounded-lg bg-black/40 px-2 py-1 text-xs text-white/80 backdrop-blur-sm">
                        {project.draft.infoFlow.format === 'live_action' ? '真人短剧' : 'AI漫剧'}
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
                          <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[10px] font-medium text-violet-300">
                            已上传
                          </span>
                        </div>
                      )}
                      <div className="mt-2.5 flex items-center gap-4 text-sm text-slate-400">
                        <span>
                          更新于 {new Date(project.updatedAt).toLocaleString("zh-CN", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-500">{project.draft.infoFlow.sourceFileName || '未命名文件'}</span>
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
                    <button
                      onClick={() => duplicateProject(project)}
                      className="group/btn flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition-all hover:border-blue-400/40 hover:bg-blue-400/10 hover:text-blue-300"
                      title="复制"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>复制</span>
                    </button>
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

      {/* 导入确认模态框 */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="relative w-full max-w-5xl rounded-[28px] border border-white/10 bg-[#19191f] p-6 shadow-2xl">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute right-6 top-5 text-4xl text-slate-500 hover:text-white"
            >
              ×
            </button>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">选择剧本类型</h2>
              <p className="mt-2 text-slate-400">请选择要导入的剧本类型</p>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <ScriptTypeSelector
                  value={scriptType}
                  onChange={setScriptType}
                  variant="card"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-white">{fileName}</div>
                <div className="mt-1 text-sm text-slate-400">
                  支持小于 50M 的 `.docx` / `.txt` 文件，已导入 {sourceText.length} 字
                </div>
              </div>
              <button
                onClick={confirmImport}
                className="rounded-2xl bg-white px-8 py-4 text-lg font-semibold text-slate-950"
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceFrame>
  );
}
