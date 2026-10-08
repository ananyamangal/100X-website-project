import { createRequire } from "module";
import { createHash } from "crypto";
import fs from "fs";
const req = createRequire("F:/dev/100X-website-project/package.json");
const { JSDOM } = req("jsdom");
const BASE = "https://www.100xcircle.com";
const OUT = process.argv[2];
const sm = await (await fetch(BASE + "/sitemap.xml")).text();
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
fs.writeFileSync(OUT + "/sitemap-urls.txt", urls.join("\n") + "\n");
const sha = s => createHash("sha256").update(s).digest("hex").slice(0, 16);
const norm = s => (s || "").replace(/\s+/g, " ").trim();
async function snap(url) {
  const chain = []; let cur = url, res;
  for (let i = 0; i < 10; i++) {
    res = await fetch(cur, { redirect: "manual", headers: { "user-agent": "100x-seo-baseline/1.0" } });
    chain.push(res.status + " " + cur.replace(BASE, ""));
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) { cur = new URL(loc, cur).href; continue; }
    break;
  }
  const r = { url: url.replace(BASE, "") || "/", status: chain[0] ? +chain[0].split(" ")[0] : 0, finalUrl: cur.replace(BASE, "") || "/", finalStatus: res.status, redirectChain: chain };
  if (!(res.headers.get("content-type") || "").includes("text/html")) return r;
  const doc = new JSDOM(await res.text()).window.document;
  const meta = n => doc.querySelector(`meta[name="${n}"]`)?.getAttribute("content") ?? null;
  r.title = norm(doc.querySelector("title")?.textContent);
  r.metaDescription = meta("description");
  r.canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;
  r.metaRobots = meta("robots");
  r.h1 = [...doc.querySelectorAll("h1")].map(e => norm(e.textContent));
  r.h2 = [...doc.querySelectorAll("h2")].map(e => norm(e.textContent));
  r.hreflang = [...doc.querySelectorAll('link[rel="alternate"][hreflang]')].map(e => e.getAttribute("hreflang") + " " + e.getAttribute("href"));
  const ld = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(e => e.textContent);
  r.jsonLd = ld.map(t => { let types = []; try { const j = JSON.parse(t); const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === "object") { if (o["@type"]) types.push([].concat(o["@type"]).join("|")); if (o["@graph"]) walk(o["@graph"]); } }; walk(j); } catch { types = ["PARSE_ERROR"]; } return { types, hash: sha(t) }; });
  doc.querySelectorAll("script,style,noscript,template").forEach(e => e.remove());
  r.wordCount = norm(doc.body?.textContent).split(" ").filter(Boolean).length;
  const links = [];
  for (const a of doc.querySelectorAll("a[href]")) {
    const h = a.getAttribute("href"); if (!h || /^(mailto:|tel:|#|javascript:)/i.test(h)) continue;
    let u; try { u = new URL(h, BASE + r.finalUrl); } catch { continue; }
    if (u.hostname.replace(/^www\./, "") !== "100xcircle.com") continue;
    links.push({ href: u.pathname + u.search + u.hash, anchor: norm(a.textContent) || norm(a.getAttribute("aria-label")) || (a.querySelector("img")?.getAttribute("alt") ? "[img] " + a.querySelector("img").getAttribute("alt") : "") });
  }
  r.internalLinkCount = links.length;
  r.internalLinks = links;
  return r;
}
const pages = {}; let i = 0, fails = 0;
async function worker() { while (i < urls.length) { const u = urls[i++]; for (let t = 0; t < 3; t++) { try { pages[u.replace(BASE, "") || "/"] = await snap(u); break; } catch (e) { if (t === 2) { fails++; pages[u] = { url: u, error: String(e) }; } else await new Promise(s => setTimeout(s, 2000)); } } } }
await Promise.all([worker(), worker()]);
const sorted = Object.fromEntries(Object.keys(pages).sort().map(k => [k, pages[k]]));
fs.writeFileSync(OUT + "/pre-program-baseline-2026-10-08.json", JSON.stringify({ base: BASE, capturedAt: new Date().toISOString(), source: "live sitemap.xml", urlCount: urls.length, pages: sorted }, null, 1));
const st = {}; for (const p of Object.values(pages)) st[p.finalStatus ?? "ERR"] = (st[p.finalStatus ?? "ERR"] || 0) + 1;
console.log("urls", urls.length, "fails", fails, "finalStatus", JSON.stringify(st));
