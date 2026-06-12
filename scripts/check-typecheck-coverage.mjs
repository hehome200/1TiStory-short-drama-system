import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const tsconfigPath = path.join(ROOT, "tsconfig.json");
const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));

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
      } else if (entry.isFile() && /\.(ts|tsx|mts)$/i.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

function matchesGlobLike(filePath, pattern) {
  const rel = filePath.replaceAll(path.sep, "/");
  if (pattern === "**/*.ts" || pattern === "**/*.tsx" || pattern === "**/*.mts") {
    return /\.(ts|tsx|mts)$/.test(rel);
  }
  if (pattern === "next-env.d.ts") return rel === "next-env.d.ts";
  if (pattern === ".next/types/**/*.ts" || pattern === ".next/dev/types/**/*.ts") {
    return rel.startsWith(".next/types/") || rel.startsWith(".next/dev/types/");
  }
  if (pattern === "dist/types/**/*.ts" || pattern === "dist/dev/types/**/*.ts") {
    return rel.startsWith("dist/types/") || rel.startsWith("dist/dev/types/");
  }
  return false;
}

const include = Array.isArray(tsconfig.include) ? tsconfig.include : [];
const srcFiles = walkFiles(path.join(ROOT, "src"));
const uncovered = srcFiles.filter((absPath) => {
  const rel = path.relative(ROOT, absPath).replaceAll(path.sep, "/");
  return !include.some((pattern) => matchesGlobLike(rel, pattern));
});

if (uncovered.length > 0) {
  console.error("typecheck coverage failed");
  for (const file of uncovered.slice(0, 200)) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log(`typecheck coverage passed for ${srcFiles.length} source files`);
