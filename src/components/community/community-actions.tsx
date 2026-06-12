"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Code2, MessageCircle, Send } from "lucide-react";
import { track } from "@/lib/analytics";

type CommunityEvent =
  | "community_join_click"
  | "community_template_click"
  | "community_feishu_click"
  | "community_github_click"
  | "community_waitlist_click";

type CommunityActionProps = {
  label: string;
  href?: string;
  event: CommunityEvent;
  variant?: "primary" | "secondary" | "ghost";
  icon?: "arrow" | "book" | "github" | "message" | "send";
  fallbackMessage?: string;
  className?: string;
};

const iconMap = {
  arrow: ArrowRight,
  book: BookOpen,
  github: Code2,
  message: MessageCircle,
  send: Send,
};

const variantClassNames = {
  primary:
    "border-amber-400/70 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 hover:border-amber-300 hover:shadow-amber-500/35",
  secondary:
    "border-cyan-400/40 bg-cyan-400/10 text-cyan-100 hover:border-cyan-300/60 hover:bg-cyan-400/15",
  ghost:
    "border-white/15 bg-white/[0.04] text-white/80 hover:border-white/30 hover:bg-white/[0.07]",
};

export function CommunityAction({
  label,
  href,
  event,
  variant = "ghost",
  icon = "arrow",
  fallbackMessage,
  className = "",
}: CommunityActionProps) {
  const [notice, setNotice] = useState("");
  const Icon = iconMap[icon];
  const resolvedHref = href?.trim();
  const baseClassName = `group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition ${variantClassNames[variant]} ${className}`;

  const handleClick = () => {
    track(event, { href: resolvedHref || null, label });
    if (!resolvedHref && fallbackMessage) {
      setNotice(fallbackMessage);
    }
  };

  if (resolvedHref) {
    return (
      <a href={resolvedHref} onClick={handleClick} className={baseClassName} target={resolvedHref.startsWith("http") ? "_blank" : undefined} rel={resolvedHref.startsWith("http") ? "noreferrer" : undefined}>
        <span>{label}</span>
        <Icon className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </a>
    );
  }

  return (
    <span className="flex flex-col items-stretch gap-2 sm:items-start">
      <button type="button" onClick={handleClick} className={baseClassName}>
        <span>{label}</span>
        <Icon className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </button>
      {notice ? <span className="text-xs leading-5 text-amber-100/70">{notice}</span> : null}
    </span>
  );
}

export function CommunityViewTracker() {
  useEffect(() => {
    track("community_view", { path: "/community" });
  }, []);

  return null;
}
