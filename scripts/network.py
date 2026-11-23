#!/usr/bin/env python3
"""Local store of your LinkedIn connections + a shortlist for Claude to judge.

    network.py import PATH            # LinkedIn export .zip or Connections.csv
    network.py refresh PATH.json      # connections read from your own browser (see SKILL.md)
    network.py shortlist [--top 60]   # rank against data/about.json, write data/shortlist.csv
    network.py stats
    network.py --demo ...             # same commands on a separate demo store (data/demo)

Everything stays in ./data (git-ignored). Standard library only.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
STORE = DATA / "connections.csv"
FIELDS = ["key", "first_name", "last_name", "url", "email", "company", "position",
          "connected_on", "first_seen", "last_seen", "source"]
DECIDER = re.compile(r"\b(founder|co-?founder|owner|ceo|president|principal|managing partner|proprietor)\b", re.I)
SENIOR = re.compile(r"\b(coo|cto|cfo|partner|director|head|vp|vice president|managing|chief|gm|general manager)\b", re.I)


def use_store(data: Path) -> None:
    global DATA, STORE
    DATA, STORE = data, data / "connections.csv"


def today() -> str:
    return dt.date.today().isoformat()


def key_of(r: dict) -> str:
    url = (r.get("url") or "").strip().rstrip("/").lower()
    return url or f"{r.get('first_name','').lower()} {r.get('last_name','').lower()}|{r.get('company','').lower()}"


def load() -> dict[str, dict]:
    if not STORE.exists():
        return {}
    with STORE.open() as f:
        return {r["key"]: r for r in csv.DictReader(f)}


def save(rows: dict[str, dict]) -> None:
    DATA.mkdir(exist_ok=True)
    with STORE.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for r in sorted(rows.values(), key=lambda r: r.get("connected_on") or "", reverse=True):
            w.writerow({k: r.get(k, "") for k in FIELDS})


def read_export(path: Path) -> list[dict]:
    """LinkedIn's Connections.csv starts with a few 'Notes' lines before the header."""
    if path.is_dir():  # macOS often unzips the download into a folder
        found = sorted(path.rglob("[Cc]onnections.csv"))
        if not found:
            sys.exit(f"No Connections.csv inside {path}")
        path = found[0]
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as z:
            name = next(n for n in z.namelist() if n.lower().endswith("connections.csv"))
            text = z.read(name).decode("utf-8-sig")
    else:
        text = path.read_text(encoding="utf-8-sig")
    lines = text.splitlines()
    start = next(i for i, l in enumerate(lines) if l.lower().startswith("first name"))
    out = []
    for r in csv.DictReader(io.StringIO("\n".join(lines[start:]))):
        if not (r.get("First Name", "").strip() or r.get("Last Name", "").strip() or r.get("URL", "").strip()):
            continue  # deleted or hidden accounts come through as blank rows
        out.append({"first_name": r.get("First Name", "").strip(), "last_name": r.get("Last Name", "").strip(),
                    "url": r.get("URL", "").strip(), "email": r.get("Email Address", "").strip(),
                    "company": r.get("Company", "").strip(), "position": r.get("Position", "").strip(),
                    "connected_on": parse_date(r.get("Connected On", ""))})
    return out


def parse_date(s: str) -> str:
    s = re.sub(r"^connected( on)?\s+", "", s.strip(), flags=re.I)
    for fmt in ("%d %b %Y", "%d %B %Y", "%Y-%m-%d", "%b %d, %Y", "%B %d, %Y", "%m/%d/%Y"):
        try:
            return dt.datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            pass
    return s


def merge(new: list[dict], source: str) -> tuple[int, int]:
    rows, added, updated = load(), 0, 0
    for r in new:
        r["url"] = (r.get("url") or "").split("?")[0].strip().rstrip("/")
        k = key_of(r)
        if k in rows:
            old = rows[k]
            for f in ("company", "position", "email", "url", "connected_on"):
                if r.get(f) and r[f] != old.get(f):
                    old[f] = r[f]; updated += 1
            old["last_seen"] = today()
        else:
            rows[k] = {**r, "key": k, "first_seen": today(), "last_seen": today(), "source": source}
            added += 1
    save(rows)
    return added, updated


def tokens(s: str) -> set[str]:
    return {t for t in re.findall(r"[a-z][a-z0-9+&-]{2,}", s.lower())} - {"and", "the", "for", "with", "who", "that"}


def shortlist(top: int) -> Path:
    about_p = DATA / "about.json"
    if not about_p.exists():
        sys.exit("Missing data/about.json. Run the skill: it asks two questions and writes this file.")
    about = json.loads(about_p.read_text())
    want = tokens(" ".join(about.get("keywords", [])) + " " + about.get("offer", "") + " " + about.get("goal", ""))
    rows = list(load().values())
    now = dt.date.today()
    scored = []
    avoid = [a.lower() for a in about.get("avoid", [])]
    for r in rows:
        text = f"{r.get('position','')} {r.get('company','')}"
        if any(a in text.lower() for a in avoid):
            continue
        overlap = len(tokens(text) & want)
        pos = r.get("position", "")
        senior = 2 if DECIDER.search(pos) else 1 if SENIOR.search(pos) else 0
        try:
            age = (now - dt.date.fromisoformat(r.get("connected_on", ""))).days
        except ValueError:
            age = 9999
        recency = 1.0 if age < 90 else 0.5 if age < 365 else 0.0
        score = 2.0 * overlap + 1.0 * senior + recency
        scored.append((score, overlap, senior, age, r))
    # ties: more keyword hits, then more senior, then more recently connected
    scored.sort(key=lambda x: (-x[0], -x[1], -x[2], x[3]))
    out = DATA / "shortlist.csv"
    with out.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["score", "keyword_hits", "senior", "days_connected", "name", "position", "company", "url", "connected_on"])
        for s, o, sen, age, r in scored[:top]:
            w.writerow([round(s, 1), o, sen, age, f"{r['first_name']} {r['last_name']}", r["position"], r["company"], r["url"], r["connected_on"]])
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--demo", action="store_true", help="use data/demo so sample data never mixes with yours")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("import").add_argument("path", type=Path)
    sub.add_parser("refresh").add_argument("path", type=Path)
    sub.add_parser("shortlist").add_argument("--top", type=int, default=100)
    sub.add_parser("stats")
    a = ap.parse_args()
    if a.demo:
        use_store(DATA / "demo")
    if a.cmd == "import" and not a.demo and "examples" in a.path.resolve().parts:
        sys.exit("That is sample data. Run it with --demo so it stays out of your real list.")
    if a.cmd == "import":
        added, updated = merge(read_export(a.path), "linkedin-export")
        print(f"imported: {added} new, {updated} field updates, {len(load())} total")
    elif a.cmd == "refresh":
        new = [{**r, "connected_on": parse_date(r.get("connected_on", ""))} for r in json.loads(a.path.read_text())]
        added, updated = merge(new, "browser-refresh")
        print(f"refreshed: {added} new, {updated} field updates, {len(load())} total")
    elif a.cmd == "shortlist":
        print(f"wrote {shortlist(a.top)}")
    else:
        rows = list(load().values())
        recent = sorted((r.get("connected_on", "") for r in rows), reverse=True)[:1]
        print(f"{len(rows)} connections; newest connected {recent[0] if recent else 'n/a'}; "
              f"{sum(1 for r in rows if r.get('source') == 'browser-refresh')} added by browser refresh")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
