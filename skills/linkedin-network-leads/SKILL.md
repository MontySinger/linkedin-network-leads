---
name: linkedin-network-leads
description: Find the people already in your LinkedIn network who are most valuable to you right now, from your LinkedIn data export, and keep the list current by reading your own connections page in your browser. Use for "find leads in my LinkedIn", "who in my network should I reach out to", "import my LinkedIn connections", "refresh my connections", "update my network list", "set up the weekly refresh", "put my connections in a Google Sheet", or "who's new this week", or "who should I meet with".
---

# LinkedIn network leads

Your next client or best intro is usually someone you already know and forgot about. This skill turns your LinkedIn connections into a short, reasoned list of who to talk to this week. Everything stays on your computer in `data/` (git-ignored). Nothing is posted or sent for you.

**Works with any coding agent** that can read files and run commands: Claude Code, Codex, Cursor, Gemini CLI, Grok-based agents, and others. Nothing here depends on one model. Where a step needs a tool (a browser, a Google Sheets connection, a scheduler), use whatever the agent has; if it has none, the step says what to do instead. The scripts themselves (Python and Node) run with no model at all.

## 1. Get your connections (once, ~1–2 days)
LinkedIn on desktop → **Me → Settings & Privacy → Data privacy → Get a copy of your data** → choose **Connections** (faster than the full archive) → Request archive. LinkedIn emails you a download link, usually within a day. Download it and tell the agent where it is. The `.zip`, the folder macOS unzips it into, or `Connections.csv` itself all work. The script reads the zip in memory; it never extracts files.

```
python3 scripts/network.py import ~/Downloads/Basic_LinkedInDataExport_*.zip
```
The export is a snapshot. If it is more than a few weeks old, offer step 4 to pick up newer connections.

## 2. Answer two questions
Ask the user exactly two questions, then write `data/about.json`:
1. **What do you sell or do, and who is it for?** (e.g. "AI automation for 10–200 person service businesses")
2. **What do you need from your network right now?** (clients, intros, hires, investors, advice) and anything to avoid.

```json
{"offer": "...", "goal": "...", "keywords": ["owner", "operations", "clinic", "..."], "avoid": ["recruiters", "..."]}
```
Derive 10–25 keywords from the answers: industries, company types and functions the user wants ("dental", "law firm", "property management", "operations"). Seniority is scored separately, so do not spend keywords on "owner" or "ceo". Use exact phrases and include synonyms; avoid words that appear everywhere ("business", "services", "practice", "consulting", "AI").

`avoid` holds only what the user named plus direct word forms ("recruiter" → "recruiting"). Do not add categories they did not mention. Tell the user the final keywords and avoid list in one line so they can correct it.

If the user cannot be asked (a non-interactive run), use the answers given in the request; if none were given, stop and say the two questions are needed.

## 3. Find who matters
```
python3 scripts/network.py shortlist --top 150
```
If it warns that a keyword is too generic, replace that keyword in `about.json` and rerun before judging.
`data/shortlist.csv` is a keyword/seniority/recency pre-filter, not the answer. The export has only title and company, no industry, so many good fits (an "Owner" of a company whose name says nothing) score low. If the network is under ~3,000 people, also skim the owners and founders the shortlist missed before deciding. Read it, then judge each person against the user's answers:
- **Why them, now:** fit with the offer or goal, seniority, recent connection, company type. Only what the data supports; do not invent facts about people.
- **Best next step:** a specific, low-pressure action (congratulate a new role, ask a question, offer something useful, ask for an intro).
- **Opening line:** one or two sentences in the user's voice. The user sends it themselves. Never promise something the user has not said they have (a write-up, a case study, a free audit). Offer what they can give today: a question, a call, feedback, an intro.

Write `data/top-people.md`: the top 15–25, grouped Clients / Intros / Other, each with name, role, company, why, next step, opening line. Skip anyone matching `avoid`. Say plainly when the export lacks the information to judge (many connections hide email or have old titles).

## 3b. Who to meet with
Messages are cheap; meetings are where clients and intros happen. Run:
```
python3 scripts/network.py insights
```
`data/insights.md` lists facts only: where the user's offer fits in their network, decision-makers connected in the last 90 days, dormant decision-makers (connected over a year ago), and companies where the user knows several people. Turn it into `data/meet-this-week.md`:
- **Meet this week (3–5 people):** the people worth a call or coffee, not just a message. For each: why a meeting (not a DM) is the right move, the one thing the user wants out of it (a pain point, an intro, a referral swap), one question to open with, and what the user can offer first (same rule: nothing they have not said they have). Prefer warm and recent over impressive and cold.
- **Patterns worth knowing (3 bullets):** plain observations a busy person would act on, each backed by a number from `insights.md`. For example: "Most of your fit is in operations titles (32), not owners: pitch the operator, then ask them to bring the owner." Or: "You know 12 people at one firm: one meeting there can lead to the rest."
- **Reconnect list (up to 5):** dormant decision-makers worth a "been a while" note before asking for anything.
Same rule as step 3: only what the data shows. If a pattern is a guess, say so.

## 4. Keep it current from your own browser (optional)
LinkedIn may restrict the export. To pick up new connections without it, read the user's **own** connections page in **their** logged-in browser (whatever browser or computer-use tool the agent has; if it has none, use step 4b, which needs no agent at all):

1. Open `https://www.linkedin.com/mynetwork/invite-connect/connections/` sorted by **Recently added**. The user signs in themselves; never handle their password.
2. Read the visible list (name, headline, "Connected on" date, profile URL). Scroll slowly, page by page, and stop as soon as you reach someone already in `data/connections.csv`.
3. Save as `data/refresh-YYYY-MM-DD.json` (`connected_on` can be copied as shown, e.g. "Connected on November 20, 2026") with fields `[{"first_name","last_name","url","position","company","connected_on"}]`, headline goes in `position`. Then `python3 scripts/network.py refresh data/refresh-YYYY-MM-DD.json`.

Rules: read only the user's own connections list, at human pace, when the user asks. Do not visit profiles in bulk, send messages, accept invites, or run on a schedule without the user's say-so. Automated access can conflict with LinkedIn's User Agreement and put the account at risk; tell the user that before the first refresh.

## 4b. Weekly automatic refresh (optional, macOS)
For people who add tens or hundreds of connections a week. Needs Node and Google Chrome.
1. `npm install`, then `npm run login`: a dedicated Chrome profile opens; the user signs in themselves. Never type their password.
2. `npm run refresh -- --dry-run` once, then read `data/refresh-qa-*.md` with the user.
3. `sh launchd/install.sh` installs a Monday 9:00 job (runs at next wake if the Mac was asleep). `sh launchd/install.sh --remove` uninstalls.

Each run scrolls the connections page until it is past the last successful run (minus 3 days overlap, at least 8 days back) **and** has seen 10 already-known people in a row, so a week with hundreds of new connections is read in full. QA (in `data/refresh-qa-YYYY-MM-DD.md`, summary in `data/refresh-log.csv`) fails if: the scan stopped before that overlap, rows repeat, a row lacks name/link/date, dates go out of order (a skipped batch), or LinkedIn's connection total grew by more than the new people found. A failed run does not move the anchor, so the next run re-covers the gap. A login or checkpoint page stops the run with a macOS notification; nothing tries to get past it.

The weekly job is plain Node, so it runs the same whichever agent set it up. When the user asks "who's new" after a run, read the latest QA report's "New since last run" list, judge those people as in step 3, and say which of them are worth a meeting (step 3b).

## 4c. Google Sheet (optional)
Best with a Google Sheets/Drive connector in the agent. Never ask for or store Google passwords, API keys or service-account files; the connector does the writing. **No connector?** Run `python3 scripts/sheet_sync.py export` and tell the user to open Google Sheets → File → Import → Upload `data/sheet-export.csv`; repeat after each refresh.
1. `python3 scripts/sheet_sync.py export` writes `data/sheet-export.csv` (newest first: Name, Title, Company, Connected on, Profile URL, Email, First seen, Source).
2. Create a Google Sheet from that CSV with the Drive connector (upload as `text/csv` so it converts). Rename the tab "Connections", freeze and bold row 1, add a filter, and add a second tab "Refresh log".
3. Verify the row count matches, then `python3 scripts/sheet_sync.py init <spreadsheet_id>`.
4. Each sync: `python3 scripts/sheet_sync.py pending` gives exactly the rows not yet in the sheet. Append them to "Connections", sort by Connected on (newest first, keep the header), append `new_log_rows` to "Refresh log", read back the Profile URL column to confirm each new row is there once, and only then `python3 scripts/sheet_sync.py mark`. If anything fails, do not mark; the next sync retries the same rows.
5. If the agent can schedule its own runs, offer a Monday job shortly after the 9:00 refresh that runs step 4 and reports PASS/FAIL, new names, and the sheet link. If it cannot, the user says "sync my sheet" after the refresh notification.

## 5. Report
Tell the user: how many connections, how many new since last time (on a first import, say it is the baseline), the 3–5 people to meet this week with one line each, and where the full lists are (`data/top-people.md`, `data/meet-this-week.md`).

## Trying it without real data
Sample data must never go into the user's real list. Use the separate demo store:
`python3 scripts/network.py --demo import examples/Connections.sample.csv` (then `--demo shortlist`, `--demo stats`).
