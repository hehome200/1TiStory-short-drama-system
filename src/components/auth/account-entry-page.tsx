"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { PenTool } from "lucide-react";
import { AccountEntryCard } from "./account-entry-card";

export function AccountEntryPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-amber-500/[0.03] blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-500/[0.03] blur-3xl" />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md mx-4"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-blue-600/10 transition-transform group-hover:scale-105">
              <PenTool className="h-6 w-6 text-amber-400" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            以太内容实验室
          </h1>
          <p className="mt-1 text-sm text-white/50 tracking-[0.12em]">
            1Ti Visual Story
          </p>
        </div>

        <AccountEntryCard showHomeLink={false} />
      </motion.div>
    </div>
  );
}
