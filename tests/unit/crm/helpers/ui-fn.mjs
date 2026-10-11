// Loads a pure exported function (plus optional one-line helper consts) out of a .tsx component without a bundler.
// The function's signature must fit on one line that ends with "{".
import { readFileSync } from "node:fs"
import { stripTypeScriptTypes } from "node:module"

export function loadUiFn(file, name, helperLines = []) {
  const src = readFileSync(file, "utf8")
  const i = src.indexOf("export function " + name + "(")
  if (i < 0) throw new Error("function not found: " + name)
  const eol = src.indexOf("\n", i)
  // Start at the signature's opening brace, not eol - 1: on a CRLF checkout that char is "\r".
  let depth = 0, k = src.lastIndexOf("{", eol)
  if (k < i) throw new Error("signature of " + name + " must end with { on one line")
  for (; k < src.length; k++) { if (src[k] === "{") depth++; else if (src[k] === "}" && --depth === 0) break }
  const helpers = helperLines.map(h => { const j = src.indexOf(h); if (j < 0) throw new Error("helper not found: " + h); return src.slice(j, src.indexOf("\n", j)) }).join("\n")
  const code = stripTypeScriptTypes(helpers + "\n" + src.slice(i, k + 1).replace("export function", "function"))
  return new Function(code + "\nreturn " + name)()
}
