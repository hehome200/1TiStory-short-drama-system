"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadProjects } from "@/lib/projects";
import { loadRewriteProjects } from "@/lib/rewrite-projects";
import { loadGlobalProviderConfig } from "@/lib/provider-config";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Database, FolderKanban, Link2, Settings2 } from "lucide-react";

export function AccountCenterPage() {
  const [projectCount, setProjectCount] = useState(0);
  const [rewriteCount, setRewriteCount] = useState(0);
  const [providerEnabled, setProviderEnabled] = useState(false);
  const [providerLabel, setProviderLabel] = useState("未配置");

  useEffect(() => {
    const original = loadProjects();
    const rewrite = loadRewriteProjects();
    const provider = loadGlobalProviderConfig();
    setProjectCount(original.length);
    setRewriteCount(rewrite.length);
    setProviderEnabled(provider.enabled);
    setProviderLabel(provider.enabled ? `${provider.provider} / ${provider.model || "未命名模型"}` : "平台兜底模型");
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-300">本地优先</Badge>
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-300">无登录</Badge>
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-300">IndexedDB 持久化</Badge>
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-white">账户中心已切换为本地状态页</h1>
        <p className="mt-2 text-sm text-white/60">
          这个版本不再依赖服务端账号、灵气余额或签到接口。项目、草稿和模型配置都保存在浏览器本地。
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/workspace" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black">
            <FolderKanban className="h-4 w-4" />
            返回工作台
          </Link>
          <Link href="/workspace/settings" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-white">
            <Settings2 className="h-4 w-4" />
            打开设置
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-3 text-white/60">
            <Database className="h-4 w-4" />
            原创项目
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">{projectCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-3 text-white/60">
            <Link2 className="h-4 w-4" />
            改写项目
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">{rewriteCount}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-white/60">当前模型配置</div>
            <div className="mt-1 text-lg font-medium text-white">{providerLabel}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/60">是否启用外部调用</div>
            <div className="mt-1 text-lg font-medium text-white">{providerEnabled ? "已启用" : "未启用"}</div>
          </div>
        </div>
        <Separator className="my-4 bg-white/10" />
        <p className="text-sm text-white/50">
          如需配置 OpenAI-compatible 供应商，请到设置页填写 Base URL、API Key 和模型名。
        </p>
      </div>
    </div>
  );
}
