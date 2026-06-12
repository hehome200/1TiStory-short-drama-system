"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, FileText, Home, Layers, Map, Sparkles } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const deliverables = [
  "项目背景与目标梳理",
  "空间叙事结构草案",
  "文旅展陈方案框架",
  "后续执行方向说明",
];

export default function CreationProjectPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08090d] text-white">
      <div className="fixed inset-0 bg-gradient-to-br from-[#08090d] via-[#0b0d16] to-[#10131d]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.10),transparent_28%)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-white/6 px-6 py-4 backdrop-blur-sm md:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.14em] text-white">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <span>1Ti Visual Story</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/creation"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/72 transition hover:bg-white/10 hover:text-white"
            >
              返回选择页
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/72 transition hover:bg-white/10 hover:text-white"
            >
              <Home className="h-3.5 w-3.5" />
              首页
            </Link>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-14 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300/75">
              Project Creation
            </div>
            <h1 className="mt-4 text-4xl font-black leading-[1.05] text-white md:text-6xl">
              文旅展陈方案
              <span className="block bg-[linear-gradient(135deg,#67e8f9,#fbbf24,#fde68a)] bg-clip-text text-transparent">
                从项目框架开始
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
              这一支用于整理展陈、文旅、空间叙事和提案型项目。先把项目目标、叙事结构与交付方向收束清楚，再进入后续工作台推进内容。
            </p>
          </motion.div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.section
              {...fadeInUp}
              className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-sm md:p-7"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10">
                  <Map className="h-6 w-6 text-cyan-300" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-300/75">
                    Scope
                  </div>
                  <div className="mt-1 text-xl font-bold text-white">适用项目</div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {["文旅演艺", "展馆展陈", "沉浸式空间", "汇报提案"].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm font-medium text-white/78"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </motion.section>

            <motion.section
              {...fadeInUp}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10">
                  <Layers className="h-6 w-6 text-amber-300" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-amber-300/75">
                    Deliverables
                  </div>
                  <div className="mt-1 text-xl font-bold text-white">建议起步内容</div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {deliverables.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4"
                  >
                    <div className="text-xs font-semibold tracking-[0.22em] text-amber-300">
                      0{index + 1}
                    </div>
                    <div className="mt-2 text-sm font-medium text-white/82">{item}</div>
                  </div>
                ))}
              </div>
            </motion.section>
          </div>

          <motion.section
            {...fadeInUp}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mt-6 rounded-[28px] border border-white/10 bg-[#0f131c]/88 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div className="text-xs uppercase tracking-[0.2em] text-white/42">
                  Next Step
                </div>
                <h2 className="mt-2 text-2xl font-bold text-white">进入方案工作台</h2>
                <p className="mt-3 text-sm leading-7 text-white/62">
                  当前项目里还没有独立的文旅展陈工作台模块，这里先接入现有工作台，方便继续整理结构、文本和方案内容。
                </p>
              </div>

              <div className="flex flex-col gap-3 md:min-w-[220px]">
                <Link
                  href="/workspace/original"
                  className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:scale-[1.02]"
                >
                  <FileText className="h-4 w-4" />
                  进入工作台
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/creation"
                  className="flex items-center justify-center rounded-full border border-white/12 px-6 py-3 text-sm font-medium text-white/75 transition hover:bg-white/6 hover:text-white"
                >
                  返回重新选择
                </Link>
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
}
