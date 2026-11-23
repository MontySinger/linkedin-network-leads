#!/usr/bin/env python3
"""Keep a Google Sheet in step with data/connections.csv, without storing Google credentials here.

An agent with a Google Sheets connector does the writing; this script decides exactly what to write
and remembers what already went up, so nothing is sent twice or skipped.

    sheet_sync.py init SPREADSHEET_ID     # after the first full upload: everything counts as synced
    sheet_sync.py pending                 # JSON: new connection rows + new refresh-log rows to append
    sheet_sync.py mark                    # call only after the append succeeded
    sheet_sync.py export                  # data/sheet-export.csv for a first full upload
"""
import csv, json, sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
STATE = DATA / "sheet-state.json"
HEADER = ["Name", "Title", "Company", "Connected on", "Profile URL", "Email", "First seen", "Source"]
LOG_HEADER = ["date", "result", "linkedin_total", "scanned", "new", "cutoff", "stop"]


def connections():
    with (DATA / "connections.csv").open() as f:
        return list(csv.DictReader(f))


def row(x):
    return [f"{x['first_name']} {x['last_name']}".strip(), x["position"], x["company"], x["connected_on"],
            x["url"], x["email"], x["first_seen"], x["source"]]


def log_rows():
    p = DATA / "refresh-log.csv"
    if not p.exists():
        return []
    with p.open() as f:
        return [list(r.values()) for r in csv.DictReader(f)]


def load():
    if not STATE.exists():
        sys.exit("No data/sheet-state.json. Run: sheet_sync.py init SPREADSHEET_ID")
    return json.loads(STATE.read_text())


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "pending"
    if cmd == "export":
        rows = sorted(connections(), key=lambda x: x["connected_on"], reverse=True)
        with (DATA / "sheet-export.csv").open("w", newline="") as f:
            w = csv.writer(f); w.writerow(HEADER); w.writerows(row(x) for x in rows)
        print(f"wrote {DATA / 'sheet-export.csv'} ({len(rows)} rows)")
    elif cmd == "init":
        STATE.write_text(json.dumps({"spreadsheet_id": sys.argv[2], "synced": sorted(x["key"] for x in connections()),
                                     "log_rows_synced": 0}, indent=1))
        print(f"initialised: {len(connections())} rows marked as already in the sheet")
    elif cmd == "pending":
        st = load(); done = set(st["synced"])
        new = sorted((x for x in connections() if x["key"] not in done), key=lambda x: x["connected_on"], reverse=True)
        logs = log_rows()[st["log_rows_synced"]:]
        print(json.dumps({"spreadsheet_id": st["spreadsheet_id"], "connections_tab": "Connections",
                          "log_tab": "Refresh log", "log_header": LOG_HEADER,
                          "new_rows": [row(x) for x in new], "new_keys": [x["key"] for x in new],
                          "new_log_rows": logs}, indent=1))
    elif cmd == "mark":
        st = load()
        st["synced"] = sorted(set(st["synced"]) | {x["key"] for x in connections()})
        st["log_rows_synced"] = len(log_rows())
        STATE.write_text(json.dumps(st, indent=1))
        print(f"marked: {len(st['synced'])} rows, {st['log_rows_synced']} log rows synced")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
