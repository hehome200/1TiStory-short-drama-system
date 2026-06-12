"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, Copy, Link2, Users } from "lucide-react";

interface PromotionPanelProps {
  inviteCode: string;
  inviteLink: string;
}

async function copyText(value: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("复制失败，请手动复制");
  }

  await navigator.clipboard.writeText(value);
}

function CopyRow({
  icon,
  label,
  value,
  onCopy,
  copied,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onCopy: () => Promise<void>;
  copied: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-white/40">{icon}</span>
          <span className="text-sm text-white/80">{label}</span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <div className="mt-3 break-all rounded-md border border-white/5 bg-black/20 px-3 py-2 font-mono text-sm text-white/80">
        {value}
      </div>
    </div>
  );
}

export function PromotionPanel({ inviteCode, inviteLink }: PromotionPanelProps) {
  const [copiedField, setCopiedField] = useState<"code" | "link" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!copiedField) return;
    const timer = window.setTimeout(() => setCopiedField(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedField]);

  const handleCopy = async (value: string, field: "code" | "link") => {
    setError("");
    try {
      await copyText(value);
      setCopiedField(field);
    } catch (copyError) {
      setCopiedField(null);
      setError(copyError instanceof Error ? copyError.message : "复制失败，请手动复制");
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Users className="h-5 w-5 text-amber-400" />
        推广中心
      </h2>

      <div className="space-y-3">
        <CopyRow
          icon={<Link2 className="h-4 w-4" />}
          label="我的邀请码"
          value={inviteCode}
          copied={copiedField === "code"}
          onCopy={() => handleCopy(inviteCode, "code")}
        />

        <CopyRow
          icon={<Users className="h-4 w-4" />}
          label="推广链接"
          value={inviteLink}
          copied={copiedField === "link"}
          onCopy={() => handleCopy(inviteLink, "link")}
        />

        <div className="flex items-center justify-between rounded-lg bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-white/40" />
            <span className="text-sm">推广商后台</span>
          </div>
          <span className="text-sm text-white/40">即将开放</span>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
