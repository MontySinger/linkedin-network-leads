// Tests for the refresh stop rule, no browser needed: node scripts/test_refresh.mjs
import assert from "node:assert/strict";
import { decideStop } from "./refresh_browser.mjs";

const day = (n) => new Date(Date.UTC(2026, 10, 23) - n * 864e5).toISOString().slice(0, 10);
// A list of `n` people, newest first, one every `gap` days; the first `fresh` are unknown to the store.
function list(n, fresh, gap = 0.5) {
  const rows = [], known = new Set();
  for (let i = 0; i < n; i++) {
    const key = `p${i}`;
    rows.push({ key, date: day(Math.floor(i * gap)) });
    if (i >= fresh) known.add(key);
  }
  return { rows, known };
}
const base = { cutoff: day(10), header: 2341, scrolls: 5, stalls: 0, maxScrolls: 200 };
const cases = [];
const t = (name, fn) => cases.push([name, fn]);

t("normal week: past cutoff with 10 known in a row", () => {
  const { rows, known } = list(40, 12);
  assert.equal(decideStop({ ...base, rows, known }), "overlap");
});
t("not yet past the cutoff: keep scrolling", () => {
  const { rows, known } = list(15, 3);
  assert.equal(decideStop({ ...base, rows, known }), "");
});
t("known people but fewer than 10 in a row at the bottom: keep scrolling", () => {
  const { rows, known } = list(40, 12);
  known.delete(rows.at(-3).key);
  assert.equal(decideStop({ ...base, rows, known }), "");
});
t("300 new in one week: does not stop on the first known person", () => {
  const { rows, known } = list(310, 300, 0.02);
  known.add(rows[5].key); // a known person mixed in near the top
  assert.equal(decideStop({ ...base, rows, known }), "");
});
t("empty store (no export): never claims overlap", () => {
  const { rows } = list(500, 500);
  assert.equal(decideStop({ ...base, rows, known: new Set() }), "");
});
t("empty store: reaching the end of the list counts as complete", () => {
  const { rows } = list(2310, 2310);
  assert.equal(decideStop({ ...base, rows, known: new Set(), stalls: 4 }), "end_of_list");
});
t("list stops loading halfway: FAIL, not complete", () => {
  const { rows } = list(1100, 1100);
  assert.equal(decideStop({ ...base, rows, known: new Set(), stalls: 4 }), "stalled");
});
t("small network that fits on a few screens", () => {
  const { rows, known } = list(48, 48);
  assert.equal(decideStop({ ...base, header: 50, rows, known, stalls: 4 }), "end_of_list");
});
t("scroll cap reached: FAIL", () => {
  const { rows } = list(100, 100);
  assert.equal(decideStop({ ...base, rows, known: new Set(), scrolls: 200 }), "max_scrolls");
});

let failed = 0;
for (const [name, fn] of cases) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); }
}
console.log(`${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
