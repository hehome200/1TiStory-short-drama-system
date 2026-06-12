import { Badge } from "@/components/ui/badge";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  静态数据 — 不接 DB / API                                          */
/* ------------------------------------------------------------------ */

type ChangeType = "新增" | "优化" | "修复";

interface ChangeItem {
  type: ChangeType;
  text: string;
}

interface ChangelogVersion {
  version: string;
  typeLabel: string;
  date: string;
  title: string;
  items: ChangeItem[];
}

const changelogVersions: ChangelogVersion[] = [
  {
    version: "v1.0.0",
    typeLabel: "封版",
    date: "2026-06-08",
    title: "1.0 主链路收口",
    items: [
      { type: "新增", text: "正文批量生成 5 集，逐集触发并持久化" },
      { type: "新增", text: "整体导出 Word 文档（含完整大纲 + 人物小传 + 正文）" },
      { type: "优化", text: "正文工作台布局收紧，四个按钮对齐排列" },
      { type: "优化", text: "标签治理工作台上线，后台可管理剧本标签体系" },
      { type: "新增", text: "Quality OS 治理视图与 Agent 绑定检查" },
      { type: "新增", text: "Agent Registry 与 Rulers Skills 只读广场" },
      { type: "修复", text: "故事漂移项目内合法词误判修正" },
      { type: "优化", text: "粗纲与集纲去 AI 表达约束，提升可读性" },
    ],
  },
  {
    version: "v0.9.x",
    typeLabel: "优化",
    date: "2026-05",
    title: "上传大纲改编与正文生成",
    items: [
      { type: "新增", text: "上传大纲改编信息流完整接入" },
      { type: "新增", text: "AI 应用双入口：简易应用 / AI 应用" },
      { type: "新增", text: "故事梗概 → 人物小传 → 分集大纲 → 正文生成全链路" },
      { type: "优化", text: "分集大纲批次生成覆盖计算修正" },
      { type: "优化", text: "正文完整性闪回校验与质量校验失败提示" },
      { type: "修复", text: "灵感方案润色 Doubbo JSON 格式参数错误" },
    ],
  },
  {
    version: "v0.8.x",
    typeLabel: "新增",
    date: "2026-05",
    title: "原创工作台基础能力",
    items: [
      { type: "新增", text: "剧本原创工作台核心框架" },
      { type: "新增", text: "灵感策划页与灵感方案生成" },
      { type: "新增", text: "六拍式分集大纲模型（Six Beat Outline）" },
      { type: "新增", text: "DB Draft API 持久化闭环（ProjectDraft 表）" },
      { type: "新增", text: "灵气系统基础能力与扣费规则" },
      { type: "优化", text: "工作台暗色主题统一与 shadcn 化改造" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  类型颜色映射                                                       */
/* ------------------------------------------------------------------ */

function typeBadgeStyle(type: ChangeType): string {
  switch (type) {
    case "新增":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
    case "优化":
      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/25";
    case "修复":
      return "bg-amber-500/15 text-amber-400 border-amber-500/25";
    default:
      return "bg-white/[0.08] text-white/60 border-white/[0.12]";
  }
}

/* ------------------------------------------------------------------ */
/*  版本类型 badge                                                     */
/* ------------------------------------------------------------------ */

function versionTypeBadge(label: string): string {
  switch (label) {
    case "封版":
      return "bg-violet-500/20 text-violet-300 border-violet-400/30";
    case "优化":
      return "bg-blue-500/15 text-blue-300 border-blue-400/25";
    case "新增":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-400/25";
    default:
      return "bg-white/[0.10] text-white/70 border-white/[0.16]";
  }
}

/* ------------------------------------------------------------------ */
/*  页面                                                               */
/* ------------------------------------------------------------------ */

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#090b10] text-slate-200">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#090b10]/80 backdrop-blur-lg">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            更新日志
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            记录每一次进步，见证产品成长
          </p>
        </div>
      </header>

      {/* Timeline */}
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <ol className="relative space-y-8">
          {/* 竖线 */}
          <span
            className="absolute top-2 bottom-2 left-[15px] w-px bg-gradient-to-b from-white/20 via-white/8 to-transparent hidden sm:block"
            aria-hidden="true"
          />

          {changelogVersions.map((ver) => (
            <li key={ver.version} className="relative pl-10 sm:pl-10">
              {/* 时间线节点 */}
              <span
                className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/20 bg-[#0d1017]"
                aria-hidden="true"
              >
                <span className="h-2 w-2 rounded-full bg-white/40" />
              </span>

              {/* 卡片 */}
              <article className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.03] sm:p-6">
                {/* 卡片顶行：版本号 + 类型 + 日期 */}
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-white tabular-nums">
                      {ver.version}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-medium ${versionTypeBadge(ver.typeLabel)}`}
                    >
                      {ver.typeLabel}
                    </Badge>
                  </div>
                  <time
                    dateTime={ver.date}
                    className="text-[12px] text-slate-600 tabular-nums"
                  >
                    {ver.date}
                  </time>
                </div>

                {/* 标题 */}
                <h2 className="mb-3 text-sm font-semibold text-white/85">
                  {ver.title}
                </h2>

                {/* 变更列表 */}
                <ul className="space-y-2">
                  {ver.items.map((item, idx) => (
                    <li
                      key={`${ver.typeLabel}-${idx}`}
                      className="flex items-start gap-2.5 text-[13px] leading-relaxed text-slate-400"
                    >
                      <Badge
                        variant="outline"
                        className={`mt-0.5 inline-flex shrink-0 px-1.5 py-0 text-[10px] font-medium ${typeBadgeStyle(item.type)}`}
                      >
                        {item.type}
                      </Badge>
                      <span className="text-slate-350">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>

        {/* 底部返回 */}
        <div className="mt-14 text-center">
          <Link
            href="/workspace"
            className="inline-block rounded-lg border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-slate-200"
          >
            ← 返回工作台
          </Link>
        </div>
      </main>
    </div>
  );
}
