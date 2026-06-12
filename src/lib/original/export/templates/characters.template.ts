import type { OriginalDraft } from "@/lib/types";

export type CharactersData = {
  characters: Array<{
    name: string;
    role: string;
    gender: string;
    age: number;
    traits: string;
    background: string;
    relationToMaleLead?: string;
    relationToFemaleLead?: string;
  }>;
};

export function extractCharacters(draft: OriginalDraft): CharactersData {
  return {
    characters: (draft.characters ?? []).map((c) => ({
      name: c.name || "",
      role: c.role || "",
      gender: c.gender === "male" ? "男" : c.gender === "female" ? "女" : "未知",
      age: c.age ?? 0,
      traits: c.traits || "",
      background: c.background || "",
      relationToMaleLead: c.relationToMaleLead,
      relationToFemaleLead: c.relationToFemaleLead,
    })),
  };
}

export function renderCharacters(data: CharactersData): string {
  const lines: string[] = [];
  lines.push("# 人物小传");
  lines.push("");

  if (!data.characters.length) {
    lines.push("暂无人物小传");
    lines.push("");
    return lines.join("\n");
  }

  data.characters.forEach((c, i) => {
    const ageStr = c.age > 0 ? `${c.age}岁` : "年龄未填";
    lines.push(`## ${i + 1}. ${c.name}`);
    lines.push("");
    lines.push(`- **角色**：${c.role || "未填写"}`);
    lines.push(`- **性别**：${c.gender}`);
    lines.push(`- **年龄**：${ageStr}`);
    if (c.traits) lines.push(`- **性格**：${c.traits}`);
    if (c.background) lines.push(`- **背景**：${c.background}`);
    lines.push("");
  });

  return lines.join("\n");
}
