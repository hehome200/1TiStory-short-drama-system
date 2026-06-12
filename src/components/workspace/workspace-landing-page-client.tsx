"use client";

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { ProjectRecord } from '@/lib/types'
import { loadProjects } from '@/lib/projects'
import { fetchProjects, type ApiProject, type DraftSummary } from '@/lib/api-projects'
import { createProjectRecord } from '@/lib/projects'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWorkspaceShell } from '@/components/workspace/workspace-shell-context'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const PROJECT_POSTER_THEMES = [
  "from-slate-500/35 via-blue-950/55 to-black",
  "from-zinc-400/30 via-indigo-950/50 to-black",
  "from-cyan-300/25 via-slate-800/55 to-black",
  "from-violet-400/28 via-zinc-900/60 to-black",
] as const;

const RECOMMENDATION_POSTER_THEMES = [
  "from-slate-500/35 via-blue-950/55 to-black",
  "from-zinc-400/30 via-indigo-950/50 to-black",
  "from-violet-400/28 via-zinc-900/60 to-black",
] as const;

/** 稳定的项目 ID → palette index，同一个项目每次渲染颜色一致 */
function projectThemeIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % PROJECT_POSTER_THEMES.length;
}

type ScriptType = 'short_drama' | 'ai_comic'
type ActiveTab = 'newcomer' | 'daily' | 'achievement'

const tickerItems = [
  { icon: '🔥', text: '用户「南风」刚刚完成了一个重生复仇短剧方案，获得 +30 灵气' },
  { icon: '🎬', text: '用户「阿泽」的剧本已进入洽谈阶段，解锁成就「出山编剧」' },
  { icon: '🚀', text: '用户「晚星」完成了第 1 集正文，剧本评分提升至 A-' },
  { icon: '✨', text: '签约、开拍、上线战报将在认证审核后展示' },
]

const newcomerTasks = [
  { id: 1, text: '选择创作类型', reward: 5, completed: true },
  { id: 2, text: '输入脑洞或参考作品', reward: 10, completed: true },
  { id: 3, text: '诊断我的想法', reward: 20, completed: false },
  { id: 4, text: '生成原创方案', reward: 30, completed: false },
  { id: 5, text: '保存为项目', reward: 20, completed: false },
]

const dailyTasks = [
  { id: 1, title: '创建一个剧本', difficulty: '简单', reward: 20, action: '开始' },
  { id: 2, title: '完成一次爆款潜力诊断', difficulty: '简单', reward: 30, action: '诊断' },
  { id: 3, title: '让剧本评分达到 A-', difficulty: '中等', reward: 80, action: '去提升' },
  { id: 4, title: '完成第 1 集正文', difficulty: '进阶', reward: 100, action: '继续' },
  { id: 5, title: '发布作品或标记为已投递', difficulty: '困难', reward: 150, action: '推进' },
]

const achievementTasks = [
  { id: 1, title: '灵感觉醒', condition: '第一次生成原创方案', reward: 50, locked: false },
  { id: 2, title: '完整创作者', condition: '第一次完成结构分析', reward: 100, locked: true },
  { id: 3, title: '王牌创意', condition: '第一次剧本评分达到 A+', reward: 300, locked: true },
  { id: 4, title: '出山编剧', condition: '第一次标记项目为已投递', reward: 150, locked: true },
  { id: 5, title: '签约编剧', condition: '第一次签约认证审核通过', reward: 1000, locked: true },
]

const topicCards = [
  {
    id: 1,
    title: '豪门退婚',
    hook: '她被豪门退婚当天，转身嫁给了前未婚夫的小叔',
    rating: 'A+',
    ratingScore: 85,
    tags: ['女频', '甜宠', '反转'],
    meta: '60集 | 12.7万字',
    heat: '210,000',
    gradientFrom: 'from-red-900',
    gradientVia: 'via-rose-700',
    gradientTo: 'to-yellow-600',
  },
  {
    id: 2,
    title: '真假千金',
    hook: '假千金被赶出家门后，亲生父母跪求她回家',
    rating: 'A',
    ratingScore: 84,
    tags: ['女频', '逆袭', '身份反转'],
    meta: '60集 | 10.3万字',
    heat: '191,000',
    gradientFrom: 'from-purple-900',
    gradientVia: 'via-violet-700',
    gradientTo: 'to-pink-500',
  },
  {
    id: 3,
    title: '底层逆袭',
    hook: '外卖员继承万亿家产，第一件事是回公司辞职',
    rating: 'A',
    ratingScore: 83,
    tags: ['男频', '逆袭', '打脸'],
    meta: '70集 | 11.5万字',
    heat: '173,000',
    gradientFrom: 'from-blue-900',
    gradientVia: 'via-cyan-700',
    gradientTo: 'to-yellow-500',
  },
  {
    id: 4,
    title: '重生黑化',
    hook: '她重生回婚礼当天，当众撕掉渣男剧本',
    rating: 'A+',
    ratingScore: 85,
    tags: ['女频', '重生', '复仇'],
    meta: '80集 | 13.1万字',
    heat: '231,000',
    gradientFrom: 'from-black',
    gradientVia: 'via-purple-900',
    gradientTo: 'to-red-700',
  },
  {
    id: 5,
    title: '契约婚姻',
    hook: '她为救家族签下契约婚姻，却发现丈夫早已暗恋她多年',
    rating: 'A',
    ratingScore: 84,
    tags: ['女频', '契约', '先婚后爱'],
    meta: '60集 | 9.6万字',
    heat: '188,000',
    gradientFrom: 'from-indigo-900',
    gradientVia: 'via-indigo-700',
    gradientTo: 'to-blue-500',
  },
  {
    id: 6,
    title: '赛博狂徒',
    hook: '底层维修工意外觉醒机械神经，开始反杀财阀系统',
    rating: 'A',
    ratingScore: 83,
    tags: ['男频', '科幻', '动作'],
    meta: '60集 | 11.2万字',
    heat: '176,000',
    gradientFrom: 'from-cyan-900',
    gradientVia: 'via-blue-800',
    gradientTo: 'to-purple-700',
  },
]

// 从真实 ProjectRecord 提取卡片展示字段
function projectStageLabel(p: ProjectRecord): string {
  const overview = p.draft?.overview
  const outlines = p.draft?.outlines
  const script = p.draft?.script
  const episodeScripts = p.draft?.episodeScripts

  // 1. 正文：有真实内容或已生成正文批次
  const hasScriptContent = typeof script?.content === 'string' && script.content.trim().length > 0
  const hasBatches = script?.batches && script.batches.length > 0
  const hasEpisodeScriptContent = episodeScripts
    ? Object.values(episodeScripts).some(
        (es) => (typeof es.content === 'string' && es.content.trim().length > 0) || (es.batches && es.batches.length > 0)
      )
    : false
  if (hasScriptContent || hasBatches || hasEpisodeScriptContent) return '写正文'

  // 2. 分集大纲：episodesStructured 或 episodes 有内容
  const hasEpisodesStructured = outlines?.episodesStructured && outlines.episodesStructured.length > 0
  const hasEpisodes = outlines?.episodes && outlines.episodes.length > 0
  if (hasEpisodesStructured || hasEpisodes) return '分集大纲'

  // 3. 人物小传：characters 有内容
  const hasCharacters = p.draft?.characters && p.draft.characters.length > 0
  if (hasCharacters) return '人物小传'

  // 4. 故事梗概：premise / highlight / userPremise / coreSynopsis 有内容
  const hasSynopsis = overview?.premise || overview?.highlight || overview?.userPremise || overview?.coreSynopsis
  if (hasSynopsis) return '故事梗概'

  // 5. 原创方案：有 scriptPlan / projectBrief / variantId 等基础字段
  const hasPlan = overview?.scriptPlan || overview?.projectBrief || overview?.variantId
  if (hasPlan) return '原创方案'

  return '未开始'
}

const INVALID_TAGS = new Set([
  "通用", "项目", "未设置", "故事梗概", "人物小传",
  "原创方案", "分集大纲", "写正文", "正在创作正文",
]);

function projectTags(p: ProjectRecord, draftSummary?: DraftSummary | null): string[] {
  // Priority 1: API draftSummary
  if (draftSummary) {
    const tags: string[] = [];
    const pushTag = (v?: string | null) => {
      if (!v || INVALID_TAGS.has(v)) return;
      if (v.length > 10) return;
      if (/[，。！？；：、""''（）《》…—]/.test(v)) return;
      tags.push(v);
    };
    pushTag(draftSummary.targetAudience);
    pushTag(draftSummary.coreSetting);
    pushTag(draftSummary.eraBackground);
    pushTag(draftSummary.genreType);
    pushTag(draftSummary.styleElement);

    // dedup + max 3
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const t of tags) {
      if (seen.has(t)) continue;
      seen.add(t);
      unique.push(t);
    }
    if (unique.length > 0) return unique.slice(0, 3);
    // fall through to local fallback if draftSummary had no valid tags
  }

  // Priority 2: localStorage ProjectRecord (fallback)
  const overview = p.draft?.overview;
  if (!overview) return [];

  const tags: string[] = [];

  // 1. 受众：audiences 数组第一个 → audience 字符串
  const audience = (overview.audiences && overview.audiences.length > 0)
    ? overview.audiences.find((a) => typeof a === "string" && a.trim().length > 0 && !INVALID_TAGS.has(a.trim()))
    : undefined;
  const audienceTag = (audience || overview.audience || "").trim();
  if (audienceTag.length > 0 && audienceTag.length <= 10 && !INVALID_TAGS.has(audienceTag)) {
    tags.push(audienceTag);
  }

  // 2. 核心设定：只从 coreHooks[0] 取，不 fallback 到长文本
  const coreHook = (overview.coreHooks && overview.coreHooks.length > 0)
    ? overview.coreHooks.find((h) => typeof h === "string" && h.trim().length > 0 && h.trim().length <= 8 && !INVALID_TAGS.has(h.trim()))
    : undefined;
  if (coreHook && coreHook.trim().length > 0) {
    tags.push(coreHook.trim());
  }

  // 3. 题材类型：genres 数组第一个
  const genre = (overview.genres && overview.genres.length > 0)
    ? overview.genres.find((g) => typeof g === "string" && g.trim().length > 0 && !INVALID_TAGS.has(g.trim()))
    : undefined;
  const genreTag = (genre || "").trim();
  if (genreTag.length > 0 && genreTag.length <= 10) {
    tags.push(genreTag);
  }

  // 去重 + 最多 3 个
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of tags) {
    if (seen.has(t)) continue;
    seen.add(t);
    unique.push(t);
  }
  return unique.slice(0, 3);
}

function projectExcerpt(p: ProjectRecord): string {
  const overview = p.draft?.overview
  const text = overview?.premise || overview?.highlight || overview?.userPremise || ''
  if (!text) return ''
  return text
}

function projectMetaLine(
  _p: ProjectRecord,
  draftSummary?: DraftSummary | null,
): string {
  const epCount = draftSummary?.episodeCount;
  const wordCount = draftSummary?.scriptWordCount ?? 0;

  const epPart = (epCount && epCount > 0) ? `${epCount}集` : `--集`;
  const wordPart = wordCount >= 10000
    ? `${(wordCount / 10000).toFixed(1)}万字`
    : `${wordCount}字`;

  return `${epPart} | ${wordPart}`;
}

// 合并 API 项目元数据到本地 ProjectRecord
function mergeApiMeta(local: ProjectRecord, api: ApiProject): ProjectRecord {
  return {
    ...local,
    title: api.title || local.title,
    updatedAt: api.updatedAt || local.updatedAt,
  }
}

// 扩展类型：在组件内部使用，带上 draftSummary
type ProjectWithSummary = ProjectRecord & { _draftSummary?: DraftSummary | null };

export function WorkspaceLandingPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { config } = useWorkspaceShell()
  const auraCount = config.auraCount ?? 0
  const initialScriptType = searchParams.get('scriptType')
  const safeInitialScriptType: ScriptType =
    initialScriptType === 'ai_comic' || initialScriptType === 'short_drama'
      ? initialScriptType
      : 'short_drama'
  const scriptType: ScriptType = safeInitialScriptType
  const [activeTab, setActiveTab] = useState<ActiveTab>('newcomer')
  const [tickerIndex, setTickerIndex] = useState(0)
  const [taskCenterOpen, setTaskCenterOpen] = useState(false)
  const [projects, setProjects] = useState<ProjectWithSummary[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState(false)
  const [creationModePickerOpen, setCreationModePickerOpen] = useState(false)
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null)

  // Load projects: API first, fallback to localStorage
  useEffect(() => {
    let cancelled = false
    setProjectsLoading(true)
    setProjectsError(false)

    fetchProjects()
      .then((apiProjects) => {
        if (cancelled) return
        const localProjects = loadProjects()
        const merged: ProjectWithSummary[] = apiProjects.map((api) => {
          const local = localProjects.find((lp) => lp.id === api.id)
          if (local) {
            const m = mergeApiMeta(local, api)
            return { ...m, _draftSummary: api.draftSummary ?? null }
          }
          // 没有本地 draft 的项目，创建一个 stub
          const stub = createProjectRecord({ id: api.id, title: api.title })
          const m = mergeApiMeta(stub, api)
          return { ...m, _draftSummary: api.draftSummary ?? null }
        })
        setProjects(merged)
        setProjectsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        // API 失败，fallback 到 localStorage
        setProjects(loadProjects())
        setProjectsLoading(false)
        // localStorage 为空也算空状态，不报 error
      })

    return () => { cancelled = true }
  }, [])

  // Battle feed ticker: rotate every 3.6s
  useEffect(() => {
    if (tickerItems.length <= 1) return
    const timer = window.setInterval(() => {
      setTickerIndex((current) => (current + 1) % tickerItems.length)
    }, 3600)
    return () => window.clearInterval(timer)
  }, [])

  const completedNewcomerTasks = newcomerTasks.filter((t) => t.completed).length
  const totalNewcomerTasks = newcomerTasks.length

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Sticky Top Creative Dock */}
      <nav className="sticky top-0 z-40 flex-shrink-0 border-b border-white/[0.04] bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 justify-between gap-4">
            {/* Left: 以太工作台 title */}
            <div className="flex-shrink-0">
              <h1 className="text-sm font-semibold text-slate-100 tracking-wide">以太工作台</h1>
            </div>

            {/* Right: Battle Feed + Aura + Task Center */}
            <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
              {/* 战报胶囊 */}
              <div className="hidden lg:flex items-center gap-2 h-9 w-[520px] max-w-[42vw] px-3 rounded-full border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-cyan-500/5 backdrop-blur-sm overflow-hidden">
                <div key={tickerIndex} className="flex min-w-0 items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-500">
                  <span className="text-sm flex-shrink-0 font-semibold text-cyan-400">{tickerItems[tickerIndex].icon}</span>
                  <span className="text-xs text-foreground/90 truncate font-medium whitespace-nowrap">{tickerItems[tickerIndex].text}</span>
                </div>
              </div>

              {/* 灵气 capsule */}
              <div className="flex items-center gap-1.5 px-4 h-9 rounded-full border border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06] transition-colors">
                <span className="text-xs text-white/70">灵气</span>
                <span className="text-xs font-semibold text-slate-100 tabular-nums">{auraCount}</span>
              </div>

              {/* 任务中心胶囊 */}
              <button
                onClick={() => setTaskCenterOpen((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all backdrop-blur-sm h-9 text-xs font-medium ${
                  taskCenterOpen
                    ? 'border-cyan-500/60 bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 text-cyan-300'
                    : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-cyan-400/40 hover:text-foreground'
                }`}
              >
                <span>任务中心</span>
                <span className="text-[10px] transition-transform duration-200" style={{ transform: taskCenterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▾
                </span>
              </button>

              {/* 更新日志入口 — 轻量文本链接 */}
              <Link href="/workspace/changelog" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.06] bg-transparent h-9 text-[12px] font-medium text-white/40 transition-colors hover:border-white/14 hover:text-white/65">
                更新日志
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Floating Task Center Panel — shadcn-style Popover, page-level fixed */}
      {taskCenterOpen && (
        <>
          <button
            type="button"
            aria-label="关闭创作任务中心"
            className="fixed inset-0 z-40 cursor-default bg-black/20"
            onClick={() => setTaskCenterOpen(false)}
          />
          <div
            className="fixed right-6 top-16 z-50 w-[300px] bg-[#090b10]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-xl shadow-black/50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="px-4 py-2.5 border-b border-white/[0.06]">
              <h2 className="text-[13px] font-semibold text-white/85">创作任务中心</h2>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/[0.06]">
              {(['newcomer', 'daily', 'achievement'] as ActiveTab[]).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-3 py-2 text-[11px] font-medium transition-colors relative ${
                      activeTab === tab
                        ? 'text-cyan-400'
                        : 'text-white/45 hover:text-white/70'
                    }`}
                  >
                    {tab === 'newcomer'
                      ? '新手任务'
                      : tab === 'daily'
                        ? '今日任务'
                        : '成就任务'}
                    {activeTab === tab && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-cyan-500 rounded-full" />
                    )}
                  </button>
                )
              )}
            </div>

            {/* Tab Content */}
            <div className="max-h-[380px] overflow-y-auto p-4">
              {/* Newcomer Tasks */}
              {activeTab === 'newcomer' && (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-medium text-white/80">新手任务</span>
                    <span className="text-[11px] text-white/40">{completedNewcomerTasks}/{totalNewcomerTasks}</span>
                  </div>
                  <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all"
                      style={{ width: `${(completedNewcomerTasks / totalNewcomerTasks) * 100}%` }}
                    />
                  </div>
                  <div className="space-y-0.5">
                    {newcomerTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 px-1 h-7 text-[11px] rounded-md hover:bg-white/[0.03] transition-colors">
                        <span className={`flex-shrink-0 w-4 text-center text-[10px] ${task.completed ? 'text-cyan-400' : 'text-white/25'}`}>
                          {task.completed ? '✓' : '○'}
                        </span>
                        <span className={`flex-1 ${task.completed ? 'line-through text-white/25' : 'text-white/70'}`}>
                          {task.text}
                        </span>
                        <span className="text-cyan-400/80 font-medium flex-shrink-0 text-[11px] tabular-nums">+{task.reward}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-white/[0.05] text-[10px] text-white/30 text-center">
                    <span>全部完成 +100 灵气，解锁「初入剧门」</span>
                  </div>
                </div>
              )}

              {/* Daily Tasks */}
              {activeTab === 'daily' && (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-medium text-white/80">今日任务</span>
                    <span className="text-[11px] text-white/40">1/5</span>
                  </div>
                  <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all"
                      style={{ width: '20%' }}
                    />
                  </div>
                  <div className="space-y-0.5">
                    {dailyTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 px-1 h-7 text-[11px] rounded-md hover:bg-white/[0.03] transition-colors">
                        <span className="flex-shrink-0 w-4 text-center text-[10px] text-white/25">○</span>
                        <span className="flex-1 text-white/70">{task.title}</span>
                        <span className="text-[10px] text-white/35 flex-shrink-0 px-1.5 py-0.5 bg-white/[0.04] rounded">{task.difficulty}</span>
                        <span className="text-cyan-400/80 font-medium flex-shrink-0 text-[11px] tabular-nums">+{task.reward}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-white/[0.05] text-[10px] text-white/30 text-center">
                    <span>完成今日任务可获得额外灵气奖励</span>
                  </div>
                </div>
              )}

              {/* Achievement Tasks */}
              {activeTab === 'achievement' && (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-medium text-white/80">成就任务</span>
                    <span className="text-[11px] text-white/40">0/5</span>
                  </div>
                  <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all"
                      style={{ width: '0%' }}
                    />
                  </div>
                  <div className="space-y-0.5">
                    {achievementTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-2 px-1 h-7 text-[11px] rounded-md transition-colors ${task.locked ? 'opacity-35' : 'hover:bg-white/[0.03]'}`}
                      >
                        <span className="flex-shrink-0 w-4 text-center text-[10px]">{task.locked ? '🔒' : '○'}</span>
                        <p className="flex-1 min-w-0 text-[10px] text-white/35 leading-tight">{task.condition}</p>
                        <span className="text-cyan-400/50 font-medium flex-shrink-0 text-[11px] tabular-nums">+{task.reward}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-white/[0.05] text-[10px] text-white/30 text-center">
                    <span>解锁成就可获得大量灵气与称号</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-[1080px] px-4 pt-2 pb-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="works" className="w-full">
          {/* TabsList — left-aligned, no title, no count */}
          <div className="mb-2 flex items-center justify-start">
            <TabsList
              className="bg-white/[0.04] border border-white/[0.08] rounded-full p-1 h-auto gap-0"
              variant="line"
            >
              <TabsTrigger
                value="works"
                className="rounded-full h-8 px-3 text-xs data-active:bg-white/[0.10] data-active:text-white data-active:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
              >
                我的作品
              </TabsTrigger>
              <TabsTrigger
                value="recommendations"
                className="rounded-full h-8 px-3 text-xs data-active:bg-white/[0.10] data-active:text-white data-active:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
              >
                编剧推荐
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="works" className="mt-0 w-full min-h-0">

          {/* Project Wall — empty state: main action area */}
          {!projectsLoading && !projectsError && projects.length === 0 ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 min-h-[68px]">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/60">有戏？就别只停留在脑子里。</p>
                <p className="text-[10px] text-white/25 mt-0.5">开始创作你的第一部剧本，灵感不等人。</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!creationModePickerOpen ? (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => setCreationModePickerOpen(true)}
                    className="h-8 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-[12px]"
                  >
                    开始创作
                  </Button>
                ) : (
                  /* 二级选择：真人短剧 / AI漫剧 / 返回 */
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreationModePickerOpen(false);
                        router.push('/workspace/original/inspiration?scriptType=short_drama');
                      }}
                      className="h-8 px-4 rounded-lg border-white/[0.10] bg-white/[0.05] hover:bg-white/[0.10] hover:border-cyan-400/40 text-[12px]"
                    >
                      真人短剧
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreationModePickerOpen(false);
                        router.push('/workspace/original/inspiration?scriptType=ai_comic');
                      }}
                      className="h-8 px-4 rounded-lg border-white/[0.10] bg-white/[0.05] hover:bg-white/[0.10] hover:border-cyan-400/40 text-[12px]"
                    >
                      AI漫剧
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreationModePickerOpen(false);
                      }}
                      className="h-8 text-[11px] text-white/35 hover:text-white/60"
                    >
                      <X size={12} />
                      返回
                    </Button>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-disabled
                  onClick={(e) => {
                    e.stopPropagation();
                    // 上传文档入口暂未开放
                  }}
                  className="h-8 px-4 rounded-lg border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15 hover:text-cyan-50 text-[11px] opacity-100"
                >
                  <Upload size={12} />
                  上传文档
                  <span className="ml-1.5 text-[10px] text-cyan-100/50">即将开放</span>
                </Button>
              </div>
            </div>
          ) : (
            // Project Wall — 5-column grid, scrollable 2-row viewport
            <div className="relative">
            <div className="h-[calc(100vh-170px)] max-h-[560px] min-h-[480px] overflow-y-auto pr-2 pb-20 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent]">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* 创作入口卡 — always first */}
                  {!creationModePickerOpen ? (
                    /* 默认状态：整卡可点击进入二级选择 */
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setCreationModePickerOpen(true)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setCreationModePickerOpen(true); }}
                      className="cursor-pointer rounded-2xl overflow-hidden border border-dashed border-white/[0.12] hover:border-cyan-300/25 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_60px_rgba(0,0,0,0.35)] aspect-[3/4] w-full bg-white/[0.02] hover:bg-white/[0.055] focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:outline-none flex flex-col group relative"
                    >
                      {/* Hover highlight overlay */}
                      <div className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/[0.08] via-transparent to-cyan-400/[0.06]" />
                      {/* 顶部 Badge */}
                      <div className="flex justify-start px-4 pt-4">
                        <Badge variant="outline" className="text-[10px] border-white/[0.12] text-white/45">
                          创作入口
                        </Badge>
                      </div>

                      {/* 中央区域：大号 + / 文案 / 上传按钮 */}
                      <div className="flex flex-1 flex-col items-center justify-center pb-6 text-white/40 group-hover:text-cyan-400 transition-colors">
                        <span className="text-5xl font-light leading-none">+</span>
                        <div className="mt-3 text-center space-y-1">
                          <p className="text-[13px] font-medium text-white/60 group-hover:text-cyan-300 transition-colors">开始创作</p>
                          <p className="text-[10px] text-white/25 group-hover:text-white/40">从灵感或文档开始</p>
                        </div>

                        {/* 上传文档按钮 — 紧跟文案，不贴底 */}
                        <div className="mt-8 w-full px-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-disabled
                            onClick={(e) => {
                              e.stopPropagation();
                              // 上传文档入口暂未开放
                            }}
                            className="w-full h-8 border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15 hover:text-cyan-50 text-[11px] opacity-100"
                          >
                            <Upload size={13} />
                            上传文档
                            <span className="ml-1.5 text-[10px] text-cyan-100/50">即将开放</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 二级选择状态：在同一卡片内 */
                    <div className="rounded-2xl overflow-hidden border border-dashed border-cyan-400/30 transition-colors duration-200 aspect-[3/4] w-full bg-white/[0.02] flex flex-col">
                      {/* 标题区 — 不占满空间 */}
                      <div className="flex flex-col items-center pt-10 pb-2">
                        <h3 className="text-[13px] font-semibold text-cyan-300 mb-0.5">选择剧本类型</h3>
                        <p className="text-[10px] text-white/30 text-center leading-relaxed">选择后进入灵感策划</p>
                      </div>

                      {/* 选择按钮区 — 居中放置，不贴顶不贴底 */}
                      <div className="flex flex-1 flex-col justify-center px-4 pb-4 space-y-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreationModePickerOpen(false);
                            router.push('/workspace/original/inspiration?scriptType=short_drama');
                          }}
                          className="w-full h-auto justify-center rounded-lg border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] hover:border-cyan-400/40 px-2.5 py-2.5 text-center"
                        >
                          <div className="text-center">
                            <div className="text-[13px] font-semibold text-white/85 group-hover/btn:text-cyan-300">真人短剧</div>
                            <div className="text-[10px] text-white/30 mt-0.5">真人竖屏短剧</div>
                          </div>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreationModePickerOpen(false);
                            router.push('/workspace/original/inspiration?scriptType=ai_comic');
                          }}
                          className="w-full h-auto justify-center rounded-lg border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] hover:border-cyan-400/40 px-2.5 py-2.5 text-center"
                        >
                          <div className="text-center">
                            <div className="text-[13px] font-semibold text-white/85 group-hover/btn:text-cyan-300">AI漫剧</div>
                            <div className="text-[10px] text-white/30 mt-0.5">视觉化漫剧表达</div>
                          </div>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreationModePickerOpen(false);
                          }}
                          className="w-full h-7 text-[11px] text-white/35 hover:text-white/60"
                        >
                          <X size={12} />
                          返回
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Loading skeletons */}
                  {projectsLoading && Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={`skel-${i}`}
                      className="rounded-lg overflow-hidden border border-white/[0.04] bg-white/[0.03] animate-pulse aspect-[3/4]"
                    >
                      <div className="w-full h-full bg-gradient-to-br from-zinc-700/30 via-zinc-800/30 to-zinc-900/30" />
                    </div>
                  ))}

                  {/* Error state */}
                  {!projectsLoading && projectsError && projects.length === 0 && (
                    <div className="col-span-full text-center py-4">
                      <p className="text-xs text-muted-foreground">作品加载失败，请稍后重试</p>
                    </div>
                  )}

                  {/* Real project cards */}
                  {!projectsLoading && projects.map((project) => {
                  const tags = projectTags(project, project._draftSummary)
                  const excerpt = projectExcerpt(project)
                  const stage = project._draftSummary?.stage || projectStageLabel(project)
                  const metaLine = projectMetaLine(project, project._draftSummary)
                  const scriptTypeLabel = (() => {
                    // 1. sourceMode 明确且非 idea → 改编
                    if (project.sourceMode !== undefined && project.sourceMode !== 'idea') return '改编';

                    // 2. sourceMaterial 中有真实上传/导入内容（避免空对象误判）
                    if (project.sourceMaterial) {
                      const sm = project.sourceMaterial;
                      if (sm.outline && (sm.outline.rawText || sm.outline.cleanedText || sm.outline.sourceFileName)) return '改编';
                    }

                    // 3. draft.adaptation 中有真实应用内容（避免空对象误判）
                    if (project.draft?.adaptation) {
                      const ad = project.draft.adaptation;
                      if (ad.sourceText || ad.sourceFileName || ad.extraction || ad.overseasMapping || ad.leadAnchors) return '改编';
                    }

                    // 4. outlines.sourceSections 有实际字段内容（避免空对象误判）
                    const ss = project.draft?.outlines?.sourceSections;
                    if (ss && (ss.characterProfileText || ss.storySynopsisText || ss.storyBackgroundText || (Array.isArray(ss.episodeOutlineText) && ss.episodeOutlineText.length > 0))) return '改编';

                    return '原创';
                  })()
                  const isProjectHovered = hoveredProjectId === project.id
                  return (
                    <a
                      key={project.id}
                        href={`/workspace/original/editor?projectId=${encodeURIComponent(project.id)}`}
                      className="cursor-pointer rounded-lg overflow-hidden border border-white/[0.06] hover:border-cyan-300/25 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_60px_rgba(0,0,0,0.35)] block aspect-[3/4] relative"
                      onMouseEnter={() => setHoveredProjectId(project.id)}
                      onMouseLeave={() => setHoveredProjectId(null)}
                      onFocus={() => setHoveredProjectId(project.id)}
                      onBlur={() => setHoveredProjectId(null)}
                    >
                      {/* Colored Poster Background with radial highlight */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${PROJECT_POSTER_THEMES[projectThemeIndex(project.id)]}`}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
                        {/* Hover highlight overlay */}
                        <div className={cn("pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 bg-gradient-to-br from-white/[0.08] via-transparent to-cyan-400/[0.06]", isProjectHovered ? "opacity-100" : "opacity-0")} />

                        {/* Top-left: Script type badge */}
                        <div className="absolute top-2 left-2 z-20">
                          <span className="text-[10px] px-1.5 py-0.5 bg-black/55 backdrop-blur-sm text-white/80 rounded font-medium">
                            {scriptTypeLabel}
                          </span>
                        </div>

                        {/* Top-right: Stage badge */}
                        <div className="absolute top-2 right-2 z-20 max-w-[58%]">
                          <span className="text-[10px] px-1.5 py-0.5 bg-black/55 backdrop-blur-sm text-cyan-300 rounded font-medium truncate block">
                            {stage}
                          </span>
                        </div>

                        {/* Bottom Safe Zone: Title → Tags → Meta */}
                        <div className={cn("absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 pt-6 transition-opacity duration-300", isProjectHovered && "opacity-0")}>
                          <h3 className="font-semibold text-[13px] line-clamp-2 text-white mb-1 leading-snug">{project.title || '未命名项目'}</h3>

                          {tags.length > 0 ? (
                            <div className="flex gap-1 overflow-hidden mb-1">
                              {tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-1.5 py-0.5 bg-white/15 backdrop-blur-sm text-white/90 rounded font-medium truncate max-w-[80px] flex-shrink-0"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="flex gap-1 overflow-hidden mb-1">
                              <span className="text-[10px] px-1.5 py-0.5 bg-white/[0.06] text-white/40 rounded font-medium">
                                待补标签
                              </span>
                            </div>
                          )}

                          {metaLine && (
                            <p className="text-[11px] text-white/60">{metaLine}</p>
                          )}
                        </div>

                        {/* Hover: Full-card description overlay */}
                        <div className={cn("pointer-events-none absolute inset-0 z-40 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/88 to-black/55 p-3 transition-opacity duration-300 ease-out", isProjectHovered ? "opacity-100" : "opacity-0")}>
                          <div className={cn("transition-all duration-300 ease-out", isProjectHovered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")}>
                            <div className="mb-2 text-[11px] font-medium text-cyan-200/80">项目简介</div>
                            <p className="text-xs leading-relaxed text-white/80 line-clamp-5">
                              {excerpt || "暂无简介"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-3 z-50 h-20 bg-gradient-to-t from-background via-background/90 to-transparent" />
            </div>
          )}
          </TabsContent>

          <TabsContent value="recommendations" className="mt-0 w-full min-h-0">
          {/* Topic Cards — 5-column grid, 3:4 poster style, scrollable 2-row viewport */}
          <div className="relative">
          <div className="h-[calc(100vh-170px)] max-h-[560px] min-h-[480px] overflow-y-auto pr-2 pb-20 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent]">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {topicCards.map((card, idx) => (
              <div
                key={card.id}
                className="group/card cursor-pointer rounded-lg overflow-hidden border border-white/[0.06] hover:border-cyan-400/30 transition-all hover:shadow-lg hover:shadow-cyan-500/10 aspect-[3/4] w-full relative"
              >
                {/* Full poster gradient — 3:4 ratio */}
                <div className={`absolute inset-0 bg-gradient-to-br ${RECOMMENDATION_POSTER_THEMES[idx % RECOMMENDATION_POSTER_THEMES.length]}`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
                </div>

                {/* Rating Badge - Top Left */}
                <div className="absolute top-2 left-2 z-10">
                  <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/90 backdrop-blur-sm rounded font-bold text-black">
                    {card.ratingScore}/{card.rating}
                  </span>
                </div>

                {/* Bottom Safe Zone: Tags → Meta → Title → Heat (hook on hover overlay) */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-8">
                  <div className="flex gap-1 overflow-hidden mb-1">
                    {card.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 bg-white/15 backdrop-blur-sm text-white/90 rounded font-medium truncate max-w-[65px] flex-shrink-0"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-white/70">{card.meta}</p>
                  <h3 className="font-semibold text-[12px] line-clamp-1 text-white/90 mt-1.5">{card.title}</h3>
                  <p className="text-[9px] text-cyan-400/80 font-medium mt-1">热度 {card.heat}</p>
                </div>

                {/* Hover hook overlay — slides up, covers bottom half */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black/95 via-black/85 to-transparent translate-y-3 opacity-0 group-hover/card:translate-y-0 group-hover/card:opacity-100 transition-all duration-300 ease-out p-3 pt-10 z-20 rounded-b-lg">
                  <p className="text-xs text-white/80 leading-relaxed line-clamp-3">{card.hook}</p>
                </div>
              </div>
            ))}
          </div>
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-3 z-50 h-20 bg-gradient-to-t from-background via-background/90 to-transparent" />
          </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
