import fs from "node:fs";
import path from "node:path";
import "./check-local-first.mjs";

const ROOT = process.cwd();

function requireExists(relPath, errors) {
  if (!fs.existsSync(path.join(ROOT, relPath))) {
    errors.push(`missing required path: ${relPath}`);
  }
}

const errors = [];

for (const relPath of [
  "src/lib/local-db/database.ts",
  "src/lib/local-db/project-repository.ts",
  "src/lib/local-db/settings-repository.ts",
  "src/lib/local-db/backup-service.ts",
  "src/lib/local-ai/openai-compatible-provider.ts",
  "src/lib/local-ai/generation-service.ts",
  "src/hooks/use-provider-config.ts",
  "src/components/workspace/workspace-shell-context.tsx",
  "src/components/workspace/workspace-shell-layout.tsx",
  "src/components/workspace/settings-panel.tsx",
  "src/app/workspace/original/page.tsx",
  "src/app/workspace/rewrite/page.tsx",
]) {
  requireExists(relPath, errors);
}

const keyFiles = [
  "src/components/workspace/original-studio.tsx",
  "src/components/workspace/rewrite-studio.tsx",
  "src/components/workspace/project-list-page.tsx",
];

for (const relPath of keyFiles) {
  if (!fs.existsSync(path.join(ROOT, relPath))) continue;
  const text = fs.readFileSync(path.join(ROOT, relPath), "utf8");
  if (/workspace-demo/i.test(text)) {
    errors.push(`${relPath} references workspace-demo`);
  }
  if (/PrismaClient|next-auth|@auth\/prisma-adapter/i.test(text)) {
    errors.push(`${relPath} still references Auth/Prisma packages`);
  }
  if (/\/api\/projects\b/.test(text)) {
    errors.push(`${relPath} still calls /api/projects`);
  }
  if (/fixture/i.test(text)) {
    errors.push(`${relPath} still references fixture data`);
  }
  if (/API_PREFIX|LOCAL_API_PREFIX|local-api-bridge|local-api-router|dispatchLocalApi|handleLocalApi|localApiFetch/.test(text)) {
    errors.push(`${relPath} still references compatibility symbols`);
  }
  if (/fetch\s*\(/.test(text)) {
    errors.push(`${relPath} still contains fetch()`);
  }
}

for (const relPath of [
  "src/components/local-api-bridge.tsx",
  "src/lib/local-api-router.ts",
]) {
  if (fs.existsSync(path.join(ROOT, relPath))) {
    errors.push(`${relPath} should be removed`);
  }
}

if (errors.length > 0) {
  console.error("functional integrity check failed");
  for (const error of errors.slice(0, 200)) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("functional integrity check passed");
