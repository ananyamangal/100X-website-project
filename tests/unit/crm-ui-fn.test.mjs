// loadUiFn must work on both LF and CRLF checkouts (core.autocrlf=true on Windows gives CRLF).
import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadUiFn } from "./crm/helpers/ui-fn.mjs"

const SRC = [
  `const PAD = 2`,
  `export function demo(input: string): number | null {`,
  `  const m = /^(\\d{1,12})$/.exec(input)`,
  `  if (!m) return null`,
  `  return Number(m[1]) * PAD`,
  `}`,
  `export function other() { return 1 }`,
  ``,
]

for (const [label, eol] of [["LF", "\n"], ["CRLF", "\r\n"]]) {
  test(`loadUiFn extracts a function with a regex quantifier (${label})`, () => {
    const dir = mkdtempSync(join(tmpdir(), "uifn-"))
    try {
      const file = join(dir, "c.tsx")
      writeFileSync(file, SRC.join(eol))
      const demo = loadUiFn(file, "demo", ["const PAD ="])
      assert.equal(demo("21"), 42)
      assert.equal(demo("x"), null)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
}
