"use client";

import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";

interface AccountEntryCardProps {
  onSuccess?: () => void | Promise<void>;
  showInviteCode?: boolean;
  showHomeLink?: boolean;
}

export function AccountEntryCard({
  showHomeLink = true,
}: AccountEntryCardProps) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-8 shadow-2xl shadow-black/40">
      <h2 className="text-lg font-semibold text-white text-center">
        本地优先版本已取消登录
      </h2>
      <p className="mt-2 text-center text-sm text-white/50">
        所有项目、草稿和配置都保存在浏览器本地，不需要账号密码。
      </p>

      <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <div className="font-medium">无需登录即可继续</div>
            <div className="mt-1 text-amber-100/75">
              直接进入工作台即可新建、导入、编辑和导出项目。
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link
          href="/workspace"
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/35"
        >
          进入工作台
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {showHomeLink && (
        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors">
            返回首页
          </Link>
        </div>
      )}
    </div>
  );
}
