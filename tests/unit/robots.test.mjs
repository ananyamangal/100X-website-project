// Run: node --import ./tests/support/register.mjs --test tests/unit/robots.test.mjs
// B7: named bot groups repeat the generic disallows; AI bots stay allowed.
import test from "node:test"
import assert from "node:assert/strict"
import robots from "../../app/robots.ts"
import { GENERIC_DISALLOW } from "../../lib/seo/robotsRules.ts"

const BEFORE_GENERIC = [
  "/admin", "/admin/", "/api/admin/", "/api/submissions", "/api/brochure",
  "/brochure-thank-you", "/thank-you", "/*?utm_*", "/*?fbclid=*", "/*?gclid=*", "/*?msclkid=*",
]
const NAMED = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "anthropic-ai",
  "Google-Extended", "Googlebot", "PerplexityBot", "FacebookBot", "Twitterbot", "cohere-ai",
  "YouBot", "Diffbot",
]

const r = robots()
const rules = Array.isArray(r.rules) ? r.rules : [r.rules]
const byAgent = new Map(rules.map((g) => [g.userAgent, g]))

test("the * group is unchanged", () => {
  const star = byAgent.get("*")
  assert.deepEqual([...star.disallow], BEFORE_GENERIC)
  assert.deepEqual([...GENERIC_DISALLOW], BEFORE_GENERIC)
  assert.deepEqual(star.allow, ["/", "/api/ai/", "/api/mcp", "/llms.txt"])
})

test("every named group keeps its rules, gains every generic disallow, stays allowed", () => {
  assert.deepEqual(rules.map((g) => g.userAgent), ["*", ...NAMED])
  for (const name of NAMED) {
    const g = byAgent.get(name)
    assert.deepEqual(g.allow, ["/"], name)
    assert.deepEqual(g.disallow.slice(0, 2), ["/admin", "/api/admin/"], name)
    for (const p of BEFORE_GENERIC) assert.ok(g.disallow.includes(p), `${name} lacks ${p}`)
    assert.equal(new Set(g.disallow).size, g.disallow.length, name)
    assert.ok(!g.disallow.includes("/"), name)
  }
})

test("sitemap and host unchanged", () => {
  assert.match(String(r.sitemap), /\/sitemap\.xml$/)
  assert.ok(r.host)
})
