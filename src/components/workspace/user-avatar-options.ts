/** Shared avatar options — single source of truth for account center & sidebar */

export const USER_AVATAR_STORAGE_KEY = "sboard:avatarKey";

export const USER_AVATAR_OPTIONS = [
  { key: "ragdoll-cyber",      label: "布偶 · 赛博",   src: "/avatars/cats/ragdoll-cyber.png" },
  { key: "calico-xianxia",     label: "三花 · 玄幻",   src: "/avatars/cats/calico-xianxia.png" },
  { key: "tabby-westcoast",    label: "狸花 · 西海岸", src: "/avatars/cats/tabby-westcoast.png" },
  { key: "devon-dark",         label: "德文 · 暗黑",   src: "/avatars/cats/devon-dark.png" },
  { key: "american-space",     label: "美短 · 太空",   src: "/avatars/cats/american-space.png" },
  { key: "british-library",    label: "英短 · 书房",   src: "/avatars/cats/british-library.png" },
  { key: "golden-ceo",         label: "金渐层 · 霸总", src: "/avatars/cats/golden-ceo.png" },
  { key: "maine-adventurer",   label: "缅因 · 冒险",   src: "/avatars/cats/maine-adventurer.png" },
  { key: "siamese-detective",  label: "暹罗 · 侦探",   src: "/avatars/cats/siamese-detective.png" },
] as const;

export type UserAvatarKey = (typeof USER_AVATAR_OPTIONS)[number]["key"];

export function getUserAvatarByKey(key?: string | null) {
  return USER_AVATAR_OPTIONS.find((item) => item.key === key) ?? USER_AVATAR_OPTIONS[0];
}

/** Map legacy numeric index (0/1/2) to new avatar keys */
const LEGACY_MAP: Record<number, UserAvatarKey> = {
  0: "ragdoll-cyber",
  1: "calico-xianxia",
  2: "golden-ceo",
};

export function resolveAvatarKey(stored: string | null): UserAvatarKey {
  if (!stored) return "ragdoll-cyber";
  // New key format — direct match
  if (USER_AVATAR_OPTIONS.some((o) => o.key === stored)) return stored as UserAvatarKey;
  // Legacy numeric index
  const num = parseInt(stored, 10);
  if (!isNaN(num) && num in LEGACY_MAP) return LEGACY_MAP[num];
  return "ragdoll-cyber";
}
