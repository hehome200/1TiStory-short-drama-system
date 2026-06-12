import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

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
  return out;
}

const forbiddenPathPrefixes = [
  "src/app/admin/",
  "src/app/api/admin/",
  "src/app/api/internal/",
  "src/components/admin/",
  "src/lib/admin/",
  "scripts/tencent_",
];

const forbiddenContentPatterns = [
  /workspace-demo/i,
  /Prisma Proxy/i,
  /fake repository/i,
  /固定 JSON/,
  /内存数组/,
  /统一 501/,
  /\b(InviteCode|InviteRedemption|AuraRule|FeatureFlag|PlatformProviderConfig|PlatformModelConfig|ModuleModelConfig|ModelUsageLog|PointTransaction|PromotionRelation|CommissionRecord|GrowthTask)\b/,
  /return\s+NextResponse\.json\([^)]*status:\s*501/si,
  /return\s+new\s+Response\([^)]*status:\s*501/si,
  /ALIYUN_IMS_ENABLE_REAL_CALL\s*=\s*true/i,
  /LLM_REAL_CALL_ENABLED\s*=\s*true/i,
];

const schemaForbiddenModels = [
  "InviteCode",
  "InviteRedemption",
  "AuraRule",
  "FeatureFlag",
  "PlatformProviderConfig",
  "PlatformModelConfig",
  "ModuleModelConfig",
  "ModelUsageLog",
  "PointTransaction",
  "PromotionRelation",
  "CommissionRecord",
  "GrowthTask",
];

const scannedRoots = ["src", "scripts"];
const offenders = [];

for (const root of scannedRoots) {
  for (const absPath of walkAllFiles(path.join(ROOT, root))) {
    const rel = absPath.slice(ROOT.length + 1).replaceAll(path.sep, "/");
    if (
      rel.startsWith("scripts/check-") ||
      rel.startsWith("scripts/generate-open-source-migration-docs.mjs")
    ) {
      continue;
    }
    if (forbiddenPathPrefixes.some((prefix) => rel.startsWith(prefix))) {
      offenders.push({ path: rel, reason: "forbidden path" });
      continue;
    }

    if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|prisma|sql|sh|md)$/i.test(rel)) continue;
    const text = fs.readFileSync(absPath, "utf8");
    for (const pattern of forbiddenContentPatterns) {
      if (pattern.test(text)) {
        offenders.push({ path: rel, reason: `matched ${pattern}` });
        break;
      }
    }
  }
}

const schemaPath = path.join(ROOT, "prisma/schema.prisma");
if (fs.existsSync(schemaPath)) {
  const schemaText = fs.readFileSync(schemaPath, "utf8");
  for (const modelName of schemaForbiddenModels) {
    const modelRe = new RegExp(`\\b${modelName}\\b`);
    if (modelRe.test(schemaText)) {
      offenders.push({ path: "prisma/schema.prisma", reason: `contains forbidden model ${modelName}` });
      break;
    }
  }
  if (/Prisma\s+Proxy/i.test(schemaText) || /new\s+Proxy\s*\(/.test(schemaText)) {
    offenders.push({ path: "prisma/schema.prisma", reason: "contains Prisma Proxy" });
  }
}

if (offenders.length > 0) {
  console.error("public boundary check failed");
  for (const offender of offenders.slice(0, 200)) {
    console.error(`- ${offender.path}: ${offender.reason}`);
  }
  process.exit(1);
}

console.log("public boundary check passed");
