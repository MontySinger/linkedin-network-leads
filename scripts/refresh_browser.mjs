#!/usr/bin/env node
// Weekly refresh: read your own LinkedIn connections page (Recently added) in a dedicated, signed-in
// Chrome profile, scroll until it is certain every connection since the last run has been seen,
// merge them with network.py, and write a QA report that fails loudly if anything may be missing.
//
//   node scripts/refresh_browser.mjs --login     # once: opens Chrome, you sign in yourself
//   node scripts/refresh_browser.mjs             # the weekly run (launchd calls this)
//   node scripts/refresh_browser.mjs --dry-run   # scan + QA, do not merge
//
// Reads only your own connections list, at human pace. Never messages, never visits profiles,
// never types a password. If LinkedIn shows a login or checkpoint page, it stops and tells you.

import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const STORE = path.join(DATA, "connections.csv");
const STATE = path.join(DATA, "refresh-state.json");
const LOG = path.join(DATA, "refresh-log.csv");
const PROFILE = path.join(os.homedir(), "Library", "Application Support", "linkedin-network-leads", "chrome-profile");
const URL = "https://www.linkedin.com/mynetwork/invite-connect/connections/";

const args = new Set(process.argv.slice(2));
const LOGIN = args.has("--login");
const DRY = args.has("--dry-run");
const HEADLESS = args.has("--headless"); // not recommended: LinkedIn flags headless browsers

const OVERLAP_DAYS = 3;        // re-read this many days before the last successful run
const MIN_WINDOW_DAYS = 8;     // always cover at least a week plus a day
const KNOWN_STREAK = 10;       // stop only after this many already-known people in a row, past the cutoff
const MAX_SCROLLS = 200;       // ~2,000 people; hitting this is a QA failure, not a silent stop
const STALL_LIMIT = 4;         // scrolls with no new rows before we call the list stalled

// Decide whether the scan has provably covered every connection since `cutoff`.
// Exported so it can be tested without a browser (scripts/test_refresh.mjs).
export function decideStop({ rows, known, cutoff, header, scrolls, stalls, maxScrolls }) {
  const oldest = rows.at(-1)?.date || "";
  let streak = 0;
  for (let i = rows.length - 1; i >= 0 && known.has(rows[i].key) && rows[i].date < cutoff; i--) streak++;
  if (known.size && oldest && oldest < cutoff && streak >= KNOWN_STREAK) return "overlap";
  // The list stopped growing. That is a real end only if we have nearly everyone LinkedIn counts
  // (a few percent are hidden accounts the page never shows); otherwise loading broke mid-list.
  if (stalls >= STALL_LIMIT) return header && rows.length >= 0.95 * header ? "end_of_list" : "stalled";
  if (scrolls >= maxScrolls) return "max_scrolls";
  return "";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const human = () => sleep(2500 + Math.random() * 2000);
const today = () => new Date().toISOString().slice(0, 10);
const daysBefore = (iso, n) => new Date(Date.parse(iso) - n * 864e5).toISOString().slice(0, 10);
const norm = (u) => (u || "").split("?")[0].trim().replace(/\/+$/, "").toLowerCase();

function parseDate(s) {
  const m = (s || "").replace(/^connected( on)?\s+/i, "").trim();
  const d = new Date(m + " 12:00");
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}

function readStore() {
  if (!fs.existsSync(STORE)) return new Map();
  const [head, ...lines] = fs.readFileSync(STORE, "utf8").split(/\r?\n/).filter(Boolean);
  const cols = head.split(",");
  const iKey = cols.indexOf("key"), iDate = cols.indexOf("connected_on");
  const map = new Map();
  for (const l of lines) {
    const f = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((x) => x.replace(/,$/, "").replace(/^"|"$/g, ""));
    map.set(f[iKey], f[iDate]);
  }
  return map;
}

function notify(title, msg) {
  try {
    execFileSync("osascript", ["-e", `display notification ${JSON.stringify(msg)} with title ${JSON.stringify(title)}`]);
  } catch {}
}

const EXTRACT = () => {
  const main = document.querySelector("main") || document.body;
  const out = [];
  const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.trim();
    if (!/^Connected on /.test(t)) continue;
    let card = n.parentElement;
    while (card && !card.querySelector('a[href*="/in/"]')) card = card.parentElement;
    if (!card) continue;
    const texts = [...new Set([...card.querySelectorAll("p, span")].map((e) => (e.innerText || "").trim()).filter(Boolean))];
    const name = texts.find((x) => !/^Connected on /.test(x)) || "";
    const headline = texts.find((x) => x !== name && !/^Connected on /.test(x) && x !== "Message") || "";
    out.push({ url: card.querySelector('a[href*="/in/"]').href, name, headline, connected: t });
  }
  const header = (main.innerText.match(/([\d,]+)\s+connections/) || [])[1] || "";
  return { rows: out, header: Number(header.replace(/,/g, "")) || null };
};

async function main() {
  fs.mkdirSync(PROFILE, { recursive: true });
  fs.mkdirSync(DATA, { recursive: true });
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: HEADLESS && !LOGIN,
    viewport: { width: 1280, height: 900 },
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(URL, { waitUntil: "domcontentloaded" });

  if (LOGIN) {
    console.log("Sign in to LinkedIn in the Chrome window that opened. Waiting up to 10 minutes…");
    const until = Date.now() + 10 * 60e3;
    while (Date.now() < until) {
      if (page.url().startsWith(URL) && (await page.evaluate(EXTRACT)).header) {
        console.log("Signed in. This profile is saved; weekly runs will reuse it.");
        await ctx.close();
        return 0;
      }
      await sleep(3000);
    }
    console.log("Timed out waiting for sign-in.");
    await ctx.close();
    return 2;
  }

  await sleep(4000);
  const signedOut = /\/(login|checkpoint|authwall|uas)\b/.test(page.url());
  if (signedOut || !(await page.evaluate(EXTRACT)).header) {
    const why = signedOut
      ? "Sign-in needed. Run: npm run login"
      : "Could not read the connections page. LinkedIn may have changed its layout, or its language is not English (Settings > Account preferences > Language).";
    notify("LinkedIn refresh stopped", why);
    console.error(`${why} (page: ${page.url()})`);
    await ctx.close();
    return 2;
  }

  const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
  const store = readStore();
  const newestKnown = [...store.values()].filter(Boolean).sort().at(-1) || today();
  const anchor = state.last_success || newestKnown;
  const cutoff = [daysBefore(anchor, OVERLAP_DAYS), daysBefore(today(), MIN_WINDOW_DAYS)].sort()[0];

  // Scroll until we are past the cutoff AND have seen KNOWN_STREAK already-known people in a row.
  let snap = await page.evaluate(EXTRACT);
  // With an empty store (no export imported) this is a full backfill: read to the end of the list.
  const maxScrolls = Math.max(MAX_SCROLLS, Math.ceil((snap.header || 0) / 10) + 30);
  let stalls = 0, scrolls = 0, stop = "";
  for (;;) {
    const rows = snap.rows.map((r) => ({ ...r, date: parseDate(r.connected), key: norm(r.url) }));
    stop = decideStop({ rows, known: store, cutoff, header: snap.header, scrolls, stalls, maxScrolls });
    if (stop) break;
    const before = snap.rows.length;
    await page.evaluate(() => { const m = document.querySelector("main"); m.scrollTo(0, m.scrollHeight); window.scrollTo(0, document.body.scrollHeight); });
    await human();
    const more = page.getByRole("button", { name: /show more results/i });
    if (await more.count()) { await more.first().click(); await human(); }
    scrolls++;
    snap = await page.evaluate(EXTRACT);
    stalls = snap.rows.length > before ? 0 : stalls + 1;
  }
  await ctx.close();

  // ---------- QA ----------
  const rows = snap.rows.map((r) => ({ ...r, date: parseDate(r.connected), key: norm(r.url) }));
  const inWindow = rows.filter((r) => r.date >= cutoff);
  const fresh = rows.filter((r) => !store.has(r.key));
  const checks = [];
  const check = (name, ok, detail, severity = "FAIL") => checks.push({ name, status: ok ? "PASS" : severity, detail });

  const covered = stop === "overlap" || stop === "end_of_list";
  check("Read far enough to cover the whole window", covered,
    stop === "overlap" ? `read past ${cutoff} and hit ${KNOWN_STREAK} known people in a row`
      : stop === "end_of_list" ? `read to the end of the list (${rows.length} of ${snap.header} LinkedIn counts)`
      : `stopped early: ${stop}`);
  const urls = rows.map((r) => r.key);
  check("No duplicate rows", new Set(urls).size === urls.length, `${urls.length - new Set(urls).size} duplicates`);
  const bad = rows.filter((r) => !r.key || !r.name || !r.date);
  check("Every row has name, link and date", bad.length === 0, bad.length ? `${bad.length} incomplete: ${bad.slice(0, 3).map((b) => b.name || b.url).join("; ")}` : `${rows.length} rows`);
  let order = 0;
  for (let i = 1; i < rows.length; i++) if (rows[i].date > rows[i - 1].date) order++;
  check("Dates never go up while scrolling (no skipped batch)", order === 0, `${order} out-of-order rows`);
  if (state.header_count) {
    const grew = snap.header - state.header_count;
    check("LinkedIn's total grew by no more than we found", fresh.length >= grew,
      `total ${state.header_count} → ${snap.header} (+${grew}); found ${fresh.length} new` +
        (fresh.length > grew ? " (more found than growth: someone removed a connection, or the store was behind)" : ""));
  } else {
    check("LinkedIn total recorded as baseline", true, `${snap.header} on LinkedIn vs ${store.size} in store (the export omits hidden accounts, so a gap is normal)`, "INFO");
  }
  const stale = fresh.filter((r) => r.date < cutoff);
  check("New people all fall inside the window", stale.length === 0,
    stale.length ? `${stale.length} new people older than ${cutoff} (store was missing them; merged anyway)` : "yes", "WARN");

  const failed = checks.some((c) => c.status === "FAIL");
  const stamp = today();
  const outJson = path.join(DATA, `refresh-${stamp}.json`);
  fs.writeFileSync(outJson, JSON.stringify(inWindow.concat(stale.filter((s) => !inWindow.includes(s))).map((r) => {
    const [first, ...rest] = r.name.split(" ");
    return { first_name: first, last_name: rest.join(" "), url: r.url, position: r.headline, company: "", connected_on: r.date };
  }), null, 2));

  let merged = "not merged (dry run)";
  if (!DRY) merged = execFileSync("python3", [path.join(ROOT, "scripts", "network.py"), "refresh", outJson], { encoding: "utf8" }).trim();

  const report = [
    `# LinkedIn refresh QA · ${stamp}`, "",
    `**Result: ${failed ? "FAIL: some connections may be missing" : "PASS"}**`, "",
    `Window: connections since ${cutoff} (last successful run ${state.last_success || "none"}, minus ${OVERLAP_DAYS} days overlap).`,
    `Scanned ${rows.length} people in ${scrolls} scrolls. Oldest seen: ${rows.at(-1)?.date || "n/a"}. ${merged}.`, "",
    "| Check | Status | Detail |", "|---|---|---|",
    ...checks.map((c) => `| ${c.name} | ${c.status} | ${c.detail} |`), "",
    `## New since last run (${fresh.length})`, "",
    ...(fresh.length ? fresh.map((r) => `- ${r.date} · ${r.name} · ${r.headline} · ${r.url}`) : ["None."]), "",
  ].join("\n");
  fs.writeFileSync(path.join(DATA, `refresh-qa-${stamp}.md`), report);
  if (!DRY && !fs.existsSync(LOG)) fs.writeFileSync(LOG, "date,result,linkedin_total,scanned,new,cutoff,stop\n");
  if (!DRY) fs.appendFileSync(LOG, `${stamp},${failed ? "FAIL" : "PASS"},${snap.header},${rows.length},${fresh.length},${cutoff},${stop}\n`);

  if (!DRY) {
    const next = { ...state, last_run: stamp, header_count: snap.header };
    if (!failed) next.last_success = stamp; // a failed run keeps the old anchor, so next week re-covers the gap
    fs.writeFileSync(STATE, JSON.stringify(next, null, 2));
  }
  console.log(report);
  notify(failed ? "LinkedIn refresh: CHECK NEEDED" : "LinkedIn refresh done",
    failed ? `QA failed. See data/refresh-qa-${stamp}.md` : `${fresh.length} new connections. ${snap.header} total.`);
  return failed ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code)).catch((e) => {
    notify("LinkedIn refresh error", String(e.message || e).slice(0, 120));
    console.error(e);
    process.exit(3);
  });
}
