import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const srcDir = path.resolve(process.cwd(), "src");

// By default in test runner, enable mock storage fallback for offline test suites unless in production
if (process.env.NODE_ENV !== "production" && process.env.ENABLE_MOCK_STORAGE_FALLBACK === undefined) {
  process.env.ENABLE_MOCK_STORAGE_FALLBACK = "true";
}

export async function resolve(specifier, context, nextResolve) {
  let target = specifier;

  if (target.startsWith("@/")) {
    const subpath = target.slice(2);
    const candidateTs = path.join(srcDir, `${subpath}.ts`);
    const candidateIndex = path.join(srcDir, subpath, "index.ts");
    const candidateRaw = path.join(srcDir, subpath);

    if (fs.existsSync(candidateTs)) {
      return { url: pathToFileURL(candidateTs).href, shortCircuit: true };
    } else if (fs.existsSync(candidateIndex)) {
      return { url: pathToFileURL(candidateIndex).href, shortCircuit: true };
    } else if (fs.existsSync(candidateRaw)) {
      return { url: pathToFileURL(candidateRaw).href, shortCircuit: true };
    }
  }

  // Resolve relative imports without extension (e.g. ./prisma -> ./prisma.ts)
  if (target.startsWith(".") && context.parentURL) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const candidateTs = path.join(parentDir, `${target}.ts`);
    if (fs.existsSync(candidateTs)) {
      return { url: pathToFileURL(candidateTs).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}
