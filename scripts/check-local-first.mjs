import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function walkFiles(dir) {
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
  return out;
}

function rel(absPath) {
  return absPath.slice(ROOT.length + 1).replaceAll(path.sep, "/");
}

const errors = [];
const srcFiles = walkFiles(path.join(ROOT, "src")).filter((file) => /\.(ts|tsx)$/i.test(file));
const allowedFetchFiles = new Set([
  "src/lib/local-ai/openai-compatible-provider.ts",
  "src/lib/ai/openai-compatible.ts",
]);

if (srcFiles.length < 150) {
  errors.push(`TypeScript file count is too small for local-first edition: ${srcFiles.length}`);
}

for (const required of [
  "src/lib/local-db/database.ts",
  "src/lib/local-db/project-repository.ts",
  "src/lib/local-db/backup-service.ts",
  "src/lib/local-ai/openai-compatible-provider.ts",
  "src/hooks/use-provider-config.ts",
]) {
  if (!fs.existsSync(path.join(ROOT, required))) {
    errors.push(`missing required local-first file: ${required}`);
  }
}

for (const file of srcFiles) {
  const relative = rel(file);
  if (relative.startsWith("src/app/api/") && relative.endsWith("/route.ts")) {
    continue;
  }

  const text = fs.readFileSync(file, "utf8");
  if (/\b(next-auth|@auth\/prisma-adapter|@prisma\/client|PrismaClient|PrismaAdapter)\b/i.test(text)) {
    errors.push(`${relative} still references Auth/Prisma packages`);
  }
  if (/workspace-demo/i.test(text)) {
    errors.push(`${relative} references workspace-demo`);
  }
  if (/fake repository/i.test(text) || /固定 JSON/.test(text) || /内存数组/.test(text)) {
    errors.push(`${relative} references mock/fixed data`);
  }
  if (/Prisma\s+Proxy/i.test(text) || /new\s+Proxy\s*\(/.test(text)) {
    errors.push(`${relative} references Prisma Proxy`);
  }
  if (/API_PREFIX|LOCAL_API_PREFIX|local-api-bridge|local-api-router|dispatchLocalApi|handleLocalApi|localApiFetch/.test(text)) {
    errors.push(`${relative} still references compatibility symbols`);
  }
  if (/window\.fetch\s*=|globalThis\.fetch\s*=/.test(text)) {
    errors.push(`${relative} overrides fetch`);
  }
  if (/new\s+Response\s*\(/.test(text)) {
    errors.push(`${relative} still constructs Response directly`);
  }
  if (/fetch\s*\(/.test(text) && !allowedFetchFiles.has(relative)) {
    errors.push(`${relative} still contains fetch() outside provider modules`);
  }
}

if (fs.existsSync(path.join(ROOT, "src/app/api"))) {
  errors.push("src/app/api still exists; legacy route handlers should be removed or bridged locally");
}

for (const removedPath of [
  "src/app/workspace/outline",
  "src/lib/agents",
  "src/lib/module-system",
]) {
  if (fs.existsSync(path.join(ROOT, removedPath))) {
    errors.push(`removed capability path still exists: ${removedPath}`);
  }
}

const prismaStubPath = path.join(ROOT, "src/lib/prisma.ts");
if (fs.existsSync(prismaStubPath)) {
  const prismaStub = fs.readFileSync(prismaStubPath, "utf8");
  if (/PrismaClient/.test(prismaStub) || /new\s+PrismaClient/.test(prismaStub)) {
    errors.push("src/lib/prisma.ts still instantiates PrismaClient");
  }
}

if (errors.length > 0) {
  console.error("local-first check failed");
  for (const error of errors.slice(0, 200)) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`local-first check passed with ${srcFiles.length} TypeScript files`);
