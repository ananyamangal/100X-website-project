import { existsSync, statSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import path from "node:path"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const tryFile = (p) => {
  for (const cand of [p, p + ".ts", p + ".tsx", path.join(p, "index.ts")]) {
    if (existsSync(cand) && statSync(cand).isFile()) return pathToFileURL(cand).href
  }
  return null
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const hit = tryFile(path.join(ROOT, specifier.slice(2)))
    if (hit) return next(hit, context)
  } else if (/^\.{1,2}\//.test(specifier) && context.parentURL?.startsWith("file:")) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
    if (!path.extname(base) || !/\.(m?js|cjs|json|tsx?)$/.test(base)) {
      const hit = tryFile(base)
      if (hit) return next(hit, context)
    }
  }
  return next(specifier, context)
}
