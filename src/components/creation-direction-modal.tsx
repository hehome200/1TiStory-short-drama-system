"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, Film, MapPin, FileText, Users, Palette, Sparkles, ChevronRight } from "lucide-react";

interface CreationDirectionModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreationDirectionModal({ open, onClose }: CreationDirectionModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-[#12131a] to-[#0a0a0f] p-6 shadow-2xl shadow-black/50">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header */}
              <div className="mb-6 text-center">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-medium tracking-[0.18em] text-blue-300">
                  <Sparkles className="h-3 w-3" />
                  选择创作方向
                </div>
                <h2 className="text-2xl font-bold text-white">
                  开始创作内容
                </h2>
                <p className="mt-2 text-sm text-white/50">
                  从短剧剧本到文旅展陈方案，选择一个方向开始创建内容项目
                </p>
              </div>

              {/* Direction Cards */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Short Drama */}
                <motion.article
                  whileHover={{ scale: 1.02 }}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.02] p-6 transition-all hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/10"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                    <Film className="h-6 w-6 text-amber-400" />
                  </div>

                  <h3 className="mb-2 text-lg font-bold text-white">短剧剧本</h3>

                  <p className="mb-4 text-sm leading-relaxed text-white/60">
                    面向短剧项目，从题材、人设、分集大纲到正文剧本，建立可持续生产的剧本工作流。
                  </p>

                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {["剧本原创", "剧本改写", "分集大纲", "人物关系"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-xs text-amber-200/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <Link
                    href="/workspace/original"
                    onClick={onClose}
                    className="mt-auto flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/30"
                  >
                    进入短剧系统
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.article>

                {/* Cultural Tourism */}
                <motion.article
                  whileHover={{ scale: 1.02 }}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.02] p-6 transition-all hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/10"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
                    <MapPin className="h-6 w-6 text-cyan-400" />
                  </div>

                  <h3 className="mb-2 text-lg font-bold text-white">文旅展陈方案</h3>

                  <p className="mb-4 text-sm leading-relaxed text-white/60">
                    面向文旅演艺、展馆展陈与沉浸式空间项目，将文化内容转化为可沟通、可落地的方案。
                  </p>

                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {["文旅演艺", "展馆展陈", "故事线", "讲解词"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 text-xs text-cyan-200/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <Link
                    href="/creation/project"
                    onClick={onClose}
                    className="mt-auto flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-500/30"
                  >
                    创建方案项目
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.article>
              </div>

              {/* Help Text */}
              <p className="mt-4 text-center text-xs text-white/40">
                不确定选哪个？如果目标是剧集内容，选择<span className="text-amber-200/70">短剧剧本</span>；
                如果目标是展馆、文旅、空间或汇报方案，选择<span className="text-cyan-200/70">文旅展陈方案</span>。
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
