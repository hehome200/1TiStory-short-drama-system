"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Film, MapPin, FileText, Users, Palette, Sparkles, ChevronRight, Home } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function CreationPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08090d]">
      <div className="fixed inset-0 bg-gradient-to-br from-[#08090d] via-[#0a0b14] to-[#0d101a]" />
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(124,92,255,0.1)_1px,transparent_1px),linear-gradient(315deg,rgba(124,92,255,0.1)_1px,transparent_1px)] bg-[18px_18px]" />
      </div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(124,92,255,0.08),transparent_40%)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-white/5 px-8 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <span className="text-sm font-semibold tracking-[0.15em] text-white">以太内容实验室</span>
            </div>
            <span className="mx-2 h-4 w-px bg-white/10" />
            <span className="text-xs tracking-[0.12em] text-white/40">1Ti Visual Story</span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Home className="h-3.5 w-3.5" />
            返回首页
          </Link>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              选择创作方向
            </h1>
            <p className="max-w-2xl text-sm text-white/50 md:text-base">
              从短剧剧本到文旅展陈方案，选择一个方向开始创建内容项目。
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex w-full max-w-6xl flex-col gap-6 md:flex-row"
          >
            <motion.article
              variants={fadeInUp}
              className="group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.02] p-8 transition-all hover:border-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/10"
            >
              <div className="absolute -right-8 -top-8 opacity-5 transition group-hover:opacity-10">
                <Film className="h-48 w-48 text-amber-400" />
              </div>

              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10">
                <Film className="h-7 w-7 text-amber-400" />
              </div>

              <h2 className="mb-3 text-xl font-bold text-white">短剧剧本</h2>

              <p className="mb-6 text-sm leading-relaxed text-white/60">
                面向短剧项目，从题材、人设、分集大纲到正文剧本，建立可持续生产的剧本工作流。
              </p>

              <div className="mb-8 flex flex-wrap gap-2">
                {[
                  { icon: FileText, text: "剧本原创" },
                  { icon: FileText, text: "剧本改写" },
                  { icon: FileText, text: "分集大纲" },
                  { icon: Users, text: "人物关系" },
                  { icon: Sparkles, text: "爽点检测" },
                  { icon: FileText, text: "台词优化" },
                ].map((tag, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs text-amber-200/80"
                  >
                    <tag.icon className="h-3 w-3" />
                    {tag.text}
                  </span>
                ))}
              </div>

              <Link
                href="/workspace/original"
                className="mt-auto flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-amber-500/30"
              >
                进入短剧系统
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.article>

            <motion.article
              variants={fadeInUp}
              className="group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.02] p-8 transition-all hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/10"
            >
              <div className="absolute -right-8 -top-8 opacity-5 transition group-hover:opacity-10">
                <MapPin className="h-48 w-48 text-cyan-400" />
              </div>

              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-500/10">
                <MapPin className="h-7 w-7 text-cyan-400" />
              </div>

              <h2 className="mb-3 text-xl font-bold text-white">文旅展陈方案</h2>

              <p className="mb-6 text-sm leading-relaxed text-white/60">
                面向文旅演艺、展馆展陈与沉浸式空间项目，将文化内容、故事线和空间需求转化为可沟通、可视觉化、可落地的方案。
              </p>

              <div className="mb-8 flex flex-wrap gap-2">
                {[
                  { icon: MapPin, text: "文旅演艺" },
                  { icon: Palette, text: "展馆展陈" },
                  { icon: FileText, text: "故事线" },
                  { icon: FileText, text: "讲解词" },
                  { icon: Film, text: "多媒体脚本" },
                  { icon: Palette, text: "场景拆解" },
                  { icon: Sparkles, text: "效果图提示词" },
                  { icon: MapPin, text: "施工配合" },
                ].map((tag, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-xs text-cyan-200/80"
                  >
                    <tag.icon className="h-3 w-3" />
                    {tag.text}
                  </span>
                ))}
              </div>

              <Link
                href="/creation/project"
                className="mt-auto flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-cyan-500/30"
              >
                创建方案项目
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.article>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 max-w-2xl text-center"
          >
            <p className="text-xs leading-relaxed text-white/40">
              不确定选哪个？如果目标是剧集内容，选择<span className="text-amber-200/70">短剧剧本</span>；
              如果目标是展馆、文旅、空间或汇报方案，选择<span className="text-cyan-200/70">文旅展陈方案</span>。
            </p>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
