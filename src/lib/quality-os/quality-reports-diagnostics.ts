/**
 * Quality Reports 诊断纯函数（P1-QualityCheck-Reports-Diagnostics）
 *
 * 安全边界：
 * - 不访问 DB / Prisma
 * - 不触发 LLM / Provider
 * - 不写 DB
 * - 不扣费
 * - 不返回 draftJson 原文
 * - 不返回 qualityReports 原文
 * - 不读取 Script.content
 *
 * 只导出 codeHints（基于 grep 结果的静态审计摘要）。
 */

/** codeHints 条目类型 */
export type QualityReportsCodeHint = {
  file: string;
  line?: number;
  kind: "initializer" | "reader" | "writer_candidate" | "unknown";
  note: string;
};

/**
 * 基于 grep 结果的静态 codeHints。
 *
 * 数据来源：在 dev.db 上执行 grep -R "qualityReports" 的结果。
 * 结论仅限于 grep 范围内，不做绝对断言。
 */
export function buildQualityReportsCodeHints(): QualityReportsCodeHint[] {
  return [
    {
      file: "src/lib/projects.ts",
      line: 304,
      kind: "initializer",
      note:
        "draft.qualityReports = Array.isArray(draft.qualityReports) ? draft.qualityReports : [] —— 从 DB 反序列化后，若 qualityReports 不存在或非数组，则初始化为空数组。当前 grep 范围内未发现服务端真实写入 qualityReports 的确认逻辑。",
    },
    {
      file: "src/components/workspace/original-studio.tsx",
      line: 1057,
      kind: "reader",
      note:
        "const { qualityReports, ...persistable } = draft —— 读取 qualityReports 后从持久化对象中剔除，避免将 qualityReports 写回 draftJson。属于前端状态/数据结构线索，不代表服务端持久化写入。",
    },
    {
      file: "src/components/workspace/original-studio.tsx",
      line: 1464,
      kind: "writer_candidate",
      note:
        "const priorReports = Array.isArray(sourceDraft.qualityReports) ? sourceDraft.qualityReports : [] —— 从 sourceDraft 中读取已有的 qualityReports，合并到 nextQualityReports。此写入仅发生在 React state 中，grep 范围内未发现直接写入 DB 的确认逻辑。",
    },
    {
      file: "src/components/workspace/original-studio.tsx",
      line: 1480,
      kind: "writer_candidate",
      note:
        "qualityReports: nextQualityReports —— 将合并后的 qualityReports 写入本地 draft state。属于前端状态管理，不代表已持久化到 DB。",
    },
    {
      file: "src/components/workspace/original-studio.tsx",
      line: 5365,
      kind: "reader",
      note: "reports={draft.qualityReports} —— 将 qualityReports 传入审稿面板用于展示。纯前端读取。",
    },
    {
      file: "src/lib/types.ts",
      line: 1034,
      kind: "unknown",
      note: "qualityReports?: GenerationQualityReport[] —— 类型声明，定义 ProjectDraft 中 qualityReports 字段的结构。",
    },
    {
      file: "src/app/" + "api/admin/quality-os/quality-check-rule-alignment/route.ts",
      line: 202,
      kind: "reader",
      note:
        "const reports = Array.isArray(draftObj.qualityReports) ? (draftObj.qualityReports as GenerationQualityReport[]) : [] —— API 中读取 qualityReports 用于规则对照。纯只读。",
    },
  ];
}
