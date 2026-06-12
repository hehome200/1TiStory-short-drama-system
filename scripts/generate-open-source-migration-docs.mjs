import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const DOC_DIR = path.join(ROOT, "docs", "open-source-migration");
const BASELINE_PATH = path.join(DOC_DIR, "BASELINE_INVENTORY.md");
const DECISIONS_PATH = path.join(DOC_DIR, "FILE_DECISIONS.md");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walkFiles(dir, exts = new Set([".ts", ".tsx"])) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && exts.has(path.extname(entry.name))) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

function walkAllFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

function countMatches(files, predicate) {
  return files.filter(predicate).length;
}

function relative(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, "/");
}

function decisionFor(relPath) {
  const removePrefixes = [
    "src/app/admin/",
    "src/app/api/admin/",
    "src/app/api/internal/",
    "src/components/admin/",
    "src/lib/admin/",
  ];
  const adaptPrefixes = [
    "src/app/api/aura/",
    "src/app/api/provider/",
    "src/app/api/original/",
    "src/app/api/rewrite/",
    "src/app/api/adapt/",
    "src/app/api/model/",
    "src/lib/ai/",
    "src/lib/original/",
    "src/lib/quality-os/",
    "src/lib/server/",
  ];

  if (relPath === "prisma/schema.prisma") return ["ADAPT", "公开基线 schema，需删私有模型并重建"];
  if (relPath === "prisma/seed.ts") return ["ADAPT", "seed 可能包含私有默认数据，需要公开化或删减"];
  if (relPath.startsWith("prisma/migrations/")) return ["REMOVE", "旧 migration 暴露已删除的私有表结构，需要重建公开 baseline"];
  if (relPath.startsWith("scripts/tencent_")) return ["REMOVE", "生产/同步脚本，属于明确私有运维实现"];
  if (removePrefixes.some((prefix) => relPath.startsWith(prefix))) return ["REMOVE", "明确私有后台或内部入口，可整块删除"];
  if (adaptPrefixes.some((prefix) => relPath.startsWith(prefix))) return ["ADAPT", "包含公共职责与私有实现混合，需要逐文件拆分"];
  return ["KEEP", "公开页面、工作台或通用基础能力，默认保留"];
}

function buildInventory() {
  const allSrcFiles = walkFiles(SRC);
  const appFiles = walkFiles(path.join(SRC, "app"));
  const componentFiles = walkFiles(path.join(SRC, "components"));
  const libFiles = walkFiles(path.join(SRC, "lib"));
  const apiRouteFiles = walkFiles(path.join(SRC, "app", "api")).filter((file) => path.basename(file) === "route.ts");
  const workspacePages = walkFiles(path.join(SRC, "app", "workspace")).filter((file) => path.basename(file) === "page.tsx");
  const schemaPath = path.join(ROOT, "prisma", "schema.prisma");
  const schemaText = readText(schemaPath);
  const modelCount = (schemaText.match(/^model\s+/gm) ?? []).length;
  const migrationDir = path.join(ROOT, "prisma", "migrations");
  const migrationCount = fs.existsSync(migrationDir)
    ? fs.readdirSync(migrationDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length
    : 0;
  const packageJson = JSON.parse(readText(path.join(ROOT, "package.json")));
  const depCount = Object.keys(packageJson.dependencies ?? {}).length;

  const lines = [
    "# Baseline Inventory",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| TypeScript files under \`src\` | ${allSrcFiles.length} |`,
    `| \`src/app\` TypeScript files | ${appFiles.length} |`,
    `| \`src/components\` TypeScript files | ${componentFiles.length} |`,
    `| \`src/lib\` TypeScript files | ${libFiles.length} |`,
    `| API route files | ${apiRouteFiles.length} |`,
    `| Workspace page files | ${workspacePages.length} |`,
    `| Prisma models | ${modelCount} |`,
    `| Prisma migration directories | ${migrationCount} |`,
    `| Direct dependencies | ${depCount} |`,
    "",
    "## Notes",
    "",
    "- Counts are collected from the restored full-source tree before any stripping.",
    "- Workspace page count is limited to `src/app/workspace/**/page.tsx`.",
    "- API route count is limited to `src/app/api/**/route.ts`.",
  ].join("\n");

  fs.mkdirSync(DOC_DIR, { recursive: true });
  fs.writeFileSync(BASELINE_PATH, lines);

  const highRiskRoots = [
    "src/app/admin",
    "src/app/api/admin",
    "src/app/api/internal",
    "src/app/api/aura",
    "src/app/api/provider",
    "src/app/api/original",
    "src/app/api/rewrite",
    "src/app/api/adapt",
    "src/app/api/projects",
    "src/app/api/account",
    "src/lib/admin",
    "src/lib/quality-os",
    "src/lib/ai",
    "src/lib/original",
    "src/lib/server",
    "prisma",
    "scripts",
  ];

  const decisionRows = [];
  const tallies = { KEEP: 0, ADAPT: 0, REMOVE: 0 };

  for (const root of highRiskRoots) {
    const absRoot = path.join(ROOT, root);
    if (!fs.existsSync(absRoot)) continue;
    const files = fs.statSync(absRoot).isFile() ? [absRoot] : walkAllFiles(absRoot);

    for (const file of files.sort()) {
      const rel = relative(file);
      const [decision, reason] = decisionFor(rel);
      tallies[decision] += 1;
      decisionRows.push(`| \`${rel}\` | ${decision} | ${reason} |`);
    }
  }

  const decisionDoc = [
    "# File Decisions",
    "",
    "This list covers high-risk files and directories that require explicit KEEP / ADAPT / REMOVE decisions before stripping.",
    "",
    "| Path | Decision | Reason |",
    "| --- | --- | --- |",
    ...decisionRows,
    "",
    "## Tallies",
    "",
    "| Decision | Count |",
    "| --- | ---: |",
    `| KEEP | ${tallies.KEEP} |`,
    `| ADAPT | ${tallies.ADAPT} |`,
    `| REMOVE | ${tallies.REMOVE} |`,
    "",
    "## Decision Rules",
    "",
    "- KEEP: public pages, workspace shell, shared CRUD, and other baseline product capabilities.",
    "- ADAPT: files that mix public responsibilities with private prompt, routing, benchmark, or provider code.",
    "- REMOVE: explicit admin/internal/private/ops areas that have no public-Edition requirement.",
  ].join("\n");

  fs.writeFileSync(DECISIONS_PATH, decisionDoc);
}

buildInventory();
