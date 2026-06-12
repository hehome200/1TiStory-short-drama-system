"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X, ArrowRight, BookOpen, FileText, ExternalLink, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics";
import { communityConfig } from "@/lib/community-config";

type CommunityModalProps = {
  open: boolean;
  onClose: () => void;
  source?: string;
};

const benefits = [
  "免费内测资格",
  "短剧案例拆解模板",
  "爆款开头拆解表",
  "飞书资料库",
  "每周共创任务",
  "优先体验新功能",
];

export function CommunityModal({ open, onClose, source = "unknown" }: CommunityModalProps) {
  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  // 打开时记录埋点
  useEffect(() => {
    if (open) {
      track("community_modal_open", { source });
    }
  }, [open, source]);

  const handleClose = useCallback(() => {
    track("community_modal_close", { source });
    onClose();
  }, [onClose, source]);

  const handleJoinClick = useCallback(() => {
    track("community_join_click", { source, target: "waitlist" });
  }, [source]);

  const handleTemplateClick = useCallback(() => {
    track("community_template_click", { source, target: "template" });
  }, [source]);

  const handleFeishuClick = useCallback(() => {
    track("community_feishu_click", { source, target: "feishu_docs" });
  }, [source]);

  const handleFullPageClick = useCallback(() => {
    track("community_full_page_click", { source, target: "/community" });
    onClose();
  }, [onClose, source]);

  // 遮罩点击关闭
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Desktop Modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 hidden items-center justify-center p-4 lg:flex"
            onClick={handleBackdropClick}
          >
            {/* 遮罩 */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* 弹窗内容 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-[720px] max-h-[80vh] overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0f] shadow-2xl"
            >
              {/* 关闭按钮 */}
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              {/* 内容区 */}
              <div className="overflow-y-auto max-h-[80vh] p-6 md:p-8">
                {/* 标题区 */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-amber-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    1TiStory 社区
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-white md:text-3xl">
                    加入 AI短剧生产实验室
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-white/60">
                    不是普通交流群，而是一个围绕 AI短剧生产流程的共创社区。
                  </p>
                </div>

                {/* 简介 */}
                <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm leading-7 text-white/70">
                    我们正在把短剧创作拆成：
                    <span className="text-white/90">灵感 → 人物 → 大纲 → 分集 → 案例拆解 → 剧本评估 → 分镜/出片</span>。
                    如果你正在写短剧、研究爆款、使用 AI 做内容，欢迎加入第一批内测共创者。
                  </p>
                </div>

                {/* 用户可获得 */}
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-white/80">加入后你能获得</h3>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {benefits.map((benefit) => (
                      <div
                        key={benefit}
                        className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-xs text-white/70"
                      >
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA 按钮 */}
                <div className="flex flex-col gap-3">
                  {communityConfig.waitlistUrl ? (
                    <a
                      href={communityConfig.waitlistUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={handleJoinClick}
                      className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-amber-400/70 bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/20 transition hover:border-amber-300 hover:shadow-amber-500/30"
                    >
                      申请加入内测社区
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </a>
                  ) : (
                    <div className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-center text-sm text-white/50">
                      内测申请表链接即将开放
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {communityConfig.templateDownloadUrl && (
                      <a
                        href={communityConfig.templateDownloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={handleTemplateClick}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/15"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        领取案例拆解模板
                      </a>
                    )}

                    {communityConfig.feishuDocsUrl && (
                      <a
                        href={communityConfig.feishuDocsUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={handleFeishuClick}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/30 hover:bg-white/[0.07]"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        飞书资料库
                      </a>
                    )}

                    <Link
                      href="/community"
                      onClick={handleFullPageClick}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/30 hover:bg-white/[0.07]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      查看完整介绍
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Mobile Drawer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
            onClick={handleBackdropClick}
          >
            {/* 遮罩 */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Drawer 内容 */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#0a0a0f]"
            >
              {/* 拖拽指示条 */}
              <div className="flex justify-center py-3">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={handleClose}
                className="absolute right-4 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              {/* 内容区 */}
              <div className="overflow-y-auto max-h-[calc(85vh-3rem)] px-5 pb-8 pt-2">
                {/* 标题区 */}
                <div className="mb-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-amber-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    1TiStory 社区
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-white">
                    加入 AI短剧生产实验室
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    不是普通交流群，而是一个围绕 AI短剧生产流程的共创社区。
                  </p>
                </div>

                {/* 简介 */}
                <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                  <p className="text-sm leading-6 text-white/70">
                    我们正在把短剧创作拆成：
                    <span className="text-white/90">灵感 → 人物 → 大纲 → 分集 → 案例拆解 → 剧本评估 → 分镜/出片</span>。
                    如果你正在写短剧、研究爆款、使用 AI 做内容，欢迎加入第一批内测共创者。
                  </p>
                </div>

                {/* 用户可获得 */}
                <div className="mb-5">
                  <h3 className="mb-2.5 text-sm font-semibold text-white/80">加入后你能获得</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {benefits.map((benefit) => (
                      <div
                        key={benefit}
                        className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-white/70"
                      >
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA 按钮 */}
                <div className="space-y-3">
                  {communityConfig.waitlistUrl ? (
                    <a
                      href={communityConfig.waitlistUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={handleJoinClick}
                      className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-amber-400/70 bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/20 transition hover:border-amber-300 hover:shadow-amber-500/30"
                    >
                      申请加入内测社区
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </a>
                  ) : (
                    <div className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-center text-sm text-white/50">
                      内测申请表链接即将开放
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {communityConfig.templateDownloadUrl && (
                      <a
                        href={communityConfig.templateDownloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={handleTemplateClick}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/15"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        领取案例拆解模板
                      </a>
                    )}

                    {communityConfig.feishuDocsUrl && (
                      <a
                        href={communityConfig.feishuDocsUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={handleFeishuClick}
                        className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/30 hover:bg-white/[0.07]"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        飞书资料库
                      </a>
                    )}
                  </div>

                  <Link
                    href="/community"
                    onClick={handleFullPageClick}
                    className="group flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-white/70 transition hover:border-white/30 hover:bg-white/[0.07]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    查看完整介绍
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
