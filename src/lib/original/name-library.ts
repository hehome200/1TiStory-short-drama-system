/**
 * 英文名 → 中文音译名映射库
 *
 * 用于上传大纲改编流程中，将 adaptedName（英文标准名）转换为
 * name（中文音译显示名），避免 name 直接输出英文。
 */
const ENGLISH_TO_CHINESE_PHONETIC: Record<string, string> = {
  // Male names
  Ethan: "伊森",
  Liam: "利亚姆",
  Noah: "诺亚",
  Mason: "梅森",
  Owen: "欧文",
  Caleb: "凯勒布",
  Adrian: "阿德里安",
  Julian: "朱利安",
  // Female names
  Emma: "艾玛",
  Ava: "艾娃",
  Mia: "米娅",
  Evelyn: "伊芙琳",
  Clara: "克拉拉",
  Nora: "诺拉",
  Grace: "格蕾丝",
  Lydia: "莉迪亚",
  // Unknown/neutral names
  Alex: "亚历克斯",
  Riley: "莱利",
  Jordan: "乔丹",
  Casey: "凯西",
  Morgan: "摩根",
};

/**
 * 将英文标准名转换为中文音译显示名。
 * 如果无对应映射则返回 null。
 */
export function toChinesePhoneticName(englishName: string): string | null {
  const trimmed = englishName.trim();
  const mapped = ENGLISH_TO_CHINESE_PHONETIC[trimmed];
  return mapped ?? null;
}

/**
 * 检查字符串是否为已收录的英文名（存在于映射库中）。
 */
export function isKnownEnglishName(value: string): boolean {
  return value.trim() in ENGLISH_TO_CHINESE_PHONETIC;
}

/**
 * 获取中文音译名；如果无法转换则返回原名。
 * 用于前端展示和 LLM 提示上下文。
 */
export function resolveDisplayName(adaptedName: string): string {
  return toChinesePhoneticName(adaptedName) ?? adaptedName;
}

/**
 * 构建给 LLM 的命名规则文本，列出常用映射供参考。
 */
export function buildPhoneticNameMappingHint(names: string[]): string {
  const entries = names
    .filter((n) => isKnownEnglishName(n))
    .map((n) => `${n}→${toChinesePhoneticName(n)}`);
  if (entries.length === 0) return "";
  return entries.join("、");
}
