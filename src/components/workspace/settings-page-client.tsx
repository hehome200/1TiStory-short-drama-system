"use client";

import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { clearWorkspaceCache } from "@/lib/workspace-cache";
import Link from "next/link";
import { useWorkspaceShell } from "@/components/workspace/workspace-shell-context";
import { SettingsPanel } from "@/components/workspace/settings-panel";
import {
  LogOut,
  Check,
  AlertCircle,
  Mail,
  Lock,
  ExternalLink,
  Wallet,
  ArrowRight,
} from "lucide-react";

type TabId = "profile" | "security" | "contact" | "account" | "general";

const tabs: { id: TabId; label: string }[] = [
  { id: "profile", label: "我的资料" },
  { id: "security", label: "账号安全" },
  { id: "contact", label: "联系我们" },
  { id: "account", label: "账户中心" },
  { id: "general", label: "通用设置" },
];

export function SettingsPageClient() {
  const { sessionUser } = useWorkspaceShell();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    clearWorkspaceCache();
    await signOut();
  };

  return (
    <div className="p-6">
      {/* Tabs - 整体深色圆角条 */}
      <div className="mb-6 flex gap-1 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap border-b-2 px-5 py-3 text-base font-medium transition ${
              activeTab === tab.id
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-white/60 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/30 to-blue-600/20 text-2xl font-bold text-amber-300">
              {sessionUser?.name?.[0]?.toUpperCase() || sessionUser?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {sessionUser?.name || "未设置昵称"}
              </h2>
              <p className="text-sm text-white/50">{sessionUser?.email}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-base text-white/60">昵称</div>
              <div className="mt-1 text-lg text-white">{sessionUser?.name || "未设置"}</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-base text-white/60">邮箱</div>
              <div className="mt-1 text-lg text-white">{sessionUser?.email || "未设置"}</div>
            </div>
          </div>

          <p className="text-sm text-white/40">
            如需修改个人信息，请联系管理员。
          </p>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-4">
            <Mail className="h-5 w-5 text-amber-400" />
            <div className="flex-1">
              <div className="text-base text-white/60">邮箱</div>
              <div className="text-lg text-white">{sessionUser?.email || "未设置"}</div>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-400">
              <Check className="h-3 w-3" />
              已验证
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-4">
            <Lock className="h-5 w-5 text-amber-400" />
            <div className="flex-1">
              <div className="text-base text-white/60">密码</div>
              <div className="text-lg text-white">••••••••</div>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/60">
              已设置
            </span>
          </div>

          <div className="border-t border-white/10 pt-5">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-base font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {loggingOut ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  退出中...
                </>
              ) : (
                <>
                  <LogOut className="h-5 w-5" />
                  退出登录
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Contact Tab */}
      {activeTab === "contact" && (
        <div className="space-y-5">
          <p className="text-base text-white/60">
            扫描下方二维码，关注我们的官方渠道获取最新资讯和客服支持。
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Official Service Account */}
            <div className="flex flex-col items-center rounded-xl bg-white/5 p-4">
              <div className="mb-3 flex h-32 w-32 items-center justify-center rounded-lg bg-white/5">
                <div className="text-center text-sm text-white/30">
                  <div className="mb-2 text-5xl">📱</div>
                  二维码
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium text-white">官方服务号</div>
                <div className="mt-1 text-sm text-white/50">获取最新资讯</div>
              </div>
            </div>

            {/* Customer Service */}
            <div className="flex flex-col items-center rounded-xl bg-white/5 p-4">
              <div className="mb-3 flex h-32 w-32 items-center justify-center rounded-lg bg-white/5">
                <div className="text-center text-sm text-white/30">
                  <div className="mb-2 text-5xl">💬</div>
                  二维码
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium text-white">人工客服</div>
                <div className="mt-1 text-sm text-white/50">工作日 9:00-18:00</div>
              </div>
            </div>

            {/* Official Community */}
            <div className="flex flex-col items-center rounded-xl bg-white/5 p-4">
              <div className="mb-3 flex h-32 w-32 items-center justify-center rounded-lg bg-white/5">
                <div className="text-center text-sm text-white/30">
                  <div className="mb-2 text-5xl">👥</div>
                  二维码
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium text-white">官方社群</div>
                <div className="mt-1 text-sm text-white/50">与其他创作者交流</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <div className="text-base text-white/70">
                如遇到紧急问题或需要快速响应，请通过以下方式联系我们：
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <a
                href="tel:15311221311"
                className="inline-flex items-center gap-2 text-base text-amber-400 hover:text-amber-300"
              >
                <ExternalLink className="h-4 w-4" />
                153 1122 1311
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === "account" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-gradient-to-r from-amber-500/10 to-blue-600/10 p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-white">账户中心</h3>
                <p className="text-sm text-white/60">查看灵气余额、灵气流水、会员与账号信息</p>
              </div>
              <Link
                href="/account"
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/25"
              >
                进入账户中心
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-white/5 p-4">
              <Wallet className="mb-2 h-6 w-6 text-amber-400" />
              <div className="text-base font-medium text-white">灵气管理</div>
              <div className="mt-1 text-sm text-white/50">余额查询与流水记录</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
              </div>
              <div className="text-base font-medium text-white">会员权益</div>
              <div className="mt-1 text-sm text-white/50">VIP等级与专属福利</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div className="text-base font-medium text-white">账号信息</div>
              <div className="mt-1 text-sm text-white/50">个人资料与安全设置</div>
            </div>
          </div>
        </div>
      )}

      {/* General Settings Tab */}
      {activeTab === "general" && (
        <SettingsPanel />
      )}
    </div>
  );
}
