"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  USER_AVATAR_OPTIONS,
  USER_AVATAR_STORAGE_KEY,
  resolveAvatarKey,
} from "@/components/workspace/user-avatar-options";
import type { UserAvatarKey } from "@/components/workspace/user-avatar-options";
import { useWorkspaceShell } from "@/components/workspace/workspace-shell-context";
import Image from "next/image";

const DISPLAY_NAME_KEY = "sboard:displayName";

export type WorkspaceSidebarIcon =
  | "original"
  | "rewrite"
  | "settings"
  | "vip"
  | "credit"
  | "community"
  | "creation"
  | "material"
  | "aura";

export type WorkspaceSidebarItem = {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void;
  icon: WorkspaceSidebarIcon;
  active?: boolean;
};

function SidebarIcon({ icon }: { icon: WorkspaceSidebarIcon }) {
  const svgClass = "size-[22px] shrink-0";

  switch (icon) {
    case "original":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={svgClass}>
          <rect x="5" y="4" width="10" height="14" rx="2" stroke="currentColor" />
          <path d="M9 8h3M9 12h6M9 16h6" stroke="currentColor" strokeLinecap="round" />
          <rect x="11" y="8" width="8" height="12" rx="2" stroke="currentColor" />
        </svg>
      );
    case "rewrite":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={svgClass}>
          <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeLinecap="round" />
          <path
            d="M6.5 3.5l3 1 1 3-4 4-3-1-1-3 4-4zM17.5 12.5l3 1 1 3-4 4-3-1-1-3 4-4z"
            stroke="currentColor"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "vip":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={svgClass}>
          <path
            d="M5 9l3 9h8l3-9-4 3-3-5-3 5-4-3z"
            stroke="currentColor"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "credit":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={svgClass}>
          <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" />
          <path d="M3 10h18M7 15h4" stroke="currentColor" strokeLinecap="round" />
          <circle cx="18" cy="18" r="3" stroke="currentColor" />
          <path d="M18 16.5v3M16.5 18h3" stroke="currentColor" strokeLinecap="round" />
        </svg>
      );
    case "community":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={svgClass}>
          <circle cx="9" cy="9" r="3" stroke="currentColor" />
          <circle cx="17" cy="7" r="2.5" stroke="currentColor" />
          <path
            d="M4 19a5 5 0 0110 0M14 18a4 4 0 014-3 4 4 0 014 4"
            stroke="currentColor"
            strokeLinecap="round"
          />
        </svg>
      );
    case "creation":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={svgClass}>
          <path d="M5 19h14" stroke="currentColor" strokeLinecap="round" />
          <path
            d="M7 16.5l1.2-4.4L15.8 4.5a2.1 2.1 0 013 3l-7.6 7.6L7 16.5z"
            stroke="currentColor"
            strokeLinejoin="round"
          />
          <path d="M14.5 5.8l3.7 3.7" stroke="currentColor" strokeLinecap="round" />
          <path d="M8.3 12.1l3.6 3.6" stroke="currentColor" strokeLinecap="round" />
        </svg>
      );
    case "material":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={svgClass}>
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" stroke="currentColor" />
          <path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2M7 12h10M7 16h6" stroke="currentColor" strokeLinecap="round" />
        </svg>
      );
    case "aura":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={svgClass}>
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "settings":
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={svgClass}>
          <path d="M12 8.5A3.5 3.5 0 1112 15.5 3.5 3.5 0 0112 8.5z" stroke="currentColor" />
          <path
            d="M19 12a7.7 7.7 0 00-.12-1.32l2.02-1.57-2-3.46-2.43.86a7.95 7.95 0 00-2.3-1.33L13.8 2h-3.6l-.37 3.18a7.95 7.95 0 00-2.3 1.33l-2.43-.86-2 3.46 2.02 1.57A7.7 7.7 0 005 12c0 .45.04.9.12 1.32L3.1 14.9l2 3.46 2.43-.86c.7.56 1.47 1 2.3 1.33L10.2 22h3.6l.37-3.18a7.95 7.95 0 002.3-1.33l2.43.86 2-3.46-2.02-1.58c.08-.42.12-.86.12-1.31z"
            stroke="currentColor"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

/** Chinese uppercase abbreviation for aura count (sidebar use) */
function formatAuraShort(n: number | null | undefined): string {
  if (n == null) return "--";
  if (n < 1000) return String(n);
  if (n < 10000) return "壹仟+";
  if (n < 100000) return "壹万+";
  if (n < 1000000) return "拾万+";
  if (n < 10000000) return "佰万+";
  return "千万+";
}

const CN = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];

/** Compact Chinese vertical number for collapsed sidebar (max 3 chars) */
function formatAuraVerticalShort(value: number | null | undefined): string {
  if (value == null) return "--";
  const n = Math.round(value);
  if (n <= 0) return "零";

  /* format 10-99 */
  const fmt2 = (num: number): string => {
    const t = Math.floor(num / 10);
    const o = num % 10;
    if (t === 1) return o === 0 ? "拾" : `拾${CN[o]}`;
    return o === 0 ? `${CN[t]}拾` : `${CN[t]}拾${CN[o]}`;
  };

  if (n < 10) return CN[n];                    // "伍"
  if (n < 100) return fmt2(n);                 // "伍拾壹"
  if (n < 1000) {                               // "叁佰贰"
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    return t === 0 ? `${CN[h]}佰` : `${CN[h]}佰${CN[t]}`;
  }
  if (n < 10000) {                              // "壹仟叁"
    const th = Math.floor(n / 1000);
    const h = Math.floor((n % 1000) / 100);
    return h === 0 ? `${CN[th]}仟` : `${CN[th]}仟${CN[h]}`;
  }
  if (n < 100000) {                             // "伍万叁"
    const tth = Math.floor(n / 10000);
    const th = Math.floor((n % 10000) / 1000);
    return th === 0 ? `${CN[tth]}万` : `${CN[tth]}万${CN[th]}`;
  }
  if (n < 1000000) {                            // "拾贰万" / "伍拾万" (capped ≤3 chars)
    const wan = Math.floor(n / 10000); // 10-99
    const t = Math.floor(wan / 10);
    const o = wan % 10;
    if (t === 1) return o === 0 ? "拾万" : `拾${CN[o]}万`;
    if (o === 0) return `${CN[t]}拾万`;
    return `${CN[t]}拾万`;                     // drop ones digit to stay ≤3 chars
  }
  if (n < 10000000) {                           // "叁佰万"
    const m = Math.floor(n / 1000000);
    return m === 1 ? "佰万" : `${CN[m]}佰万`;
  }
  return "千万";
}

function NavItem({
  item,
  isActive,
  disabled = false,
}: {
  item: WorkspaceSidebarItem;
  isActive: boolean;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <SidebarIcon icon={item.icon} />
      <span className="transition-[opacity,width] duration-200 ease-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden">{item.label}</span>
    </>
  );

  if (disabled) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={false}
          tooltip={`${item.label}（暂未开放）`}
          className="h-10 text-[15px] opacity-40 cursor-not-allowed transition-[width,height,padding] duration-200 ease-out group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center [&_svg]:size-[22px] [&_svg]:shrink-0"
        >
          {inner}
          <span className="transition-[opacity,width] duration-200 ease-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden">
            <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">暂未开放</Badge>
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={isActive} tooltip={item.label} render={item.href ? <Link href={item.href} /> : undefined} className="h-10 text-[15px] transition-[width,height,padding] duration-200 ease-out group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center [&_svg]:size-[22px] [&_svg]:shrink-0">
        {inner}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarToggleButton() {
  return (
    <SidebarTrigger className="absolute -right-3 top-5 z-50 h-6 w-6 rounded-full border border-white/10 bg-zinc-950/95 text-white/60 shadow-md shadow-black/30 hover:text-cyan-200 hover:border-cyan-300/40 hover:bg-zinc-900 transition-transform duration-200 ease-out [&_svg]:size-3.5" />
  );
}

function SidebarAvatar({ sizeClass = "size-10" }: { sizeClass?: string }) {
  const [avatarKey, setAvatarKey] = useState<UserAvatarKey>("ragdoll-cyber");

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem(USER_AVATAR_STORAGE_KEY);
        setAvatarKey(resolveAvatarKey(stored));
      } catch {
        // ignore
      }
    };
    load();

    const onStorage = (e: StorageEvent) => {
      if (e.key === USER_AVATAR_STORAGE_KEY && e.newValue) {
        setAvatarKey(resolveAvatarKey(e.newValue));
      }
    };
    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<{ avatarKey?: string }>;
      if (ce.detail?.avatarKey) {
        setAvatarKey(resolveAvatarKey(ce.detail.avatarKey));
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("sboard-avatar-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sboard-avatar-change", onCustom);
    };
  }, []);

  const av = USER_AVATAR_OPTIONS.find((o) => o.key === avatarKey) ?? USER_AVATAR_OPTIONS[0];

  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full overflow-hidden ${sizeClass}`}>
      <Image
        src={av.src}
        alt={av.label}
        width={40}
        height={40}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export function WorkspaceSidebar({
  primaryItems,
  secondaryItems = [],
  auraCount,
}: {
  primaryItems: WorkspaceSidebarItem[];
  secondaryItems?: WorkspaceSidebarItem[];
  auraCount?: number | null;
}) {
  const pathname = usePathname();
  const { sessionUser } = useWorkspaceShell();

  const matchesHref = (href?: string) => {
    if (!href) return false;
    if (href === "/workspace") {
      return (
        pathname === "/workspace" ||
        /^\/workspace\/(?!rewrite(?:\/|$)|settings(?:\/|$))[^/]+$/.test(
          pathname,
        )
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const resourceItems = secondaryItems.filter((item) => item.key !== "settings");
  const footerSettingsItems = secondaryItems.filter((item) => item.key === "settings");

  const [displayName, setDisplayName] = useState<string | null>(null);
  useEffect(() => {
    const load = () => {
      try { setDisplayName(localStorage.getItem(DISPLAY_NAME_KEY)); } catch { /* ignore */ }
    };
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === DISPLAY_NAME_KEY) setDisplayName(e.newValue);
    };
    const onCustom = (e: Event) => {
      const ce = e as CustomEvent<{ displayName?: string }>;
      if (ce.detail?.displayName !== undefined) setDisplayName(ce.detail.displayName);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("sboard-display-name-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sboard-display-name-change", onCustom);
    };
  }, []);

  const userName = displayName || sessionUser?.name || sessionUser?.email?.split("@")[0] || "未设置";
  const userSubtitle = sessionUser?.email || "免费用户";

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="relative">
      {/* Header: Logo (fixed height to prevent jump) */}
      <SidebarHeader className="px-3 h-14 justify-center">
        <Link
          href="/workspace"
          aria-label="返回工作台首页"
          className="flex h-12 w-full items-center rounded-lg px-2 transition-opacity hover:opacity-85 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          onClick={(event) => event.stopPropagation()}
        >
          {/* Expanded logo */}
          <img
            src="/1tis.png"
            alt="1TiStory"
            className="h-7 w-auto max-w-[140px] object-contain group-data-[collapsible=icon]:hidden"
          />
          {/* Collapsed logo */}
          <img
            src="/1tisL.png"
            alt="1TiStory"
            className="hidden h-7 w-7 object-contain group-data-[collapsible=icon]:block"
          />
        </Link>
      </SidebarHeader>

      {/* Toggle button on sidebar right edge */}
      <SidebarToggleButton />

      {/* Content: Primary nav + Resource group */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map((item) => (
                <NavItem
                  key={item.key}
                  item={item}
                  isActive={item.href ? matchesHref(item.href) : !!item.active}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

          {resourceItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>资源</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {resourceItems.map((item) => (
                  <NavItem
                    key={item.key}
                    item={item}
                    isActive={item.href ? matchesHref(item.href) : !!item.active}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer: Aura + Settings */}
      <SidebarFooter className="pb-8">
        <SidebarMenu>
          {/* Aura item */}
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 h-10 text-[15px] text-sidebar-foreground group-data-[collapsible=icon]:px-0">
              {/* Expanded: icon + label */}
              <span className="flex items-center gap-2 transition-[opacity,width] duration-200 ease-out group-data-[collapsible=icon]:hidden">
                <SidebarIcon icon="aura" />
                <span>灵气</span>
              </span>
              {/* Expanded: number */}
              <span className="font-bold tabular-nums shrink-0 group-data-[collapsible=icon]:hidden">
                {formatAuraShort(auraCount)}
              </span>
              {/* Collapsed: vertical short in 40x40 centered box */}
              <span
                className="hidden group-data-[collapsible=icon]:flex size-10 mx-auto items-center justify-center"
                title={auraCount != null ? `灵气余额：${auraCount}` : undefined}
              >
                <span
                  className="font-bold shrink-0 text-[12px] leading-none tracking-tight text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.28)]"
                  style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
                >
                  {formatAuraVerticalShort(auraCount)}
                </span>
              </span>
            </div>
          </SidebarMenuItem>

          {/* Account center avatar entry — collapsed: avatar only; expanded: user info */}
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={matchesHref("/workspace/settings")}
              tooltip="账户中心"
              render={<Link href="/workspace/settings" />}
              className="h-auto py-2 text-[15px] transition-[width,height,padding] duration-200 ease-out group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-transparent"
            >
              <SidebarAvatar sizeClass="size-10 group-data-[collapsible=icon]:size-10" />
              <span className="flex-1 min-w-0 transition-[opacity,width] duration-200 ease-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:overflow-hidden">
                <div className="text-[13px] font-medium text-white leading-tight truncate">{userName}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant="secondary" className="text-[9px] px-1 py-0">免费用户</Badge>
                </div>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
