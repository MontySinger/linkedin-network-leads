---
name: linkedin-network-leads
description: Find the people already in your LinkedIn network who are most valuable to you right now, from your LinkedIn data export, and keep the list current by reading your own connections page in your browser. Use for "find leads in my LinkedIn", "who in my network should I reach out to", "import my LinkedIn connections", "refresh my connections", or "update my network list".
---

# LinkedIn network leads

Your next client or best intro is usually someone you already know and forgot about. This skill turns your LinkedIn connections into a short, reasoned list of who to talk to this week. Everything stays on your computer in `data/` (git-ignored). Nothing is posted or sent for you.

## 1. Get your connections (once, ~1–2 days)
LinkedIn on desktop → **Me → Settings & Privacy → Data privacy → Get a copy of your data** → choose **Connections** (faster than the full archive) → Request archive. LinkedIn emails you a download link, usually within a day. Download it and tell the agent where it is. The `.zip`, the folder macOS unzips it into, or `Connections.csv` itself all work.

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
Derive 10–25 keywords from the answers: titles, industries, company types the user would want. Include synonyms.

## 3. Find who matters
```
python3 scripts/network.py shortlist --top 100
```
`data/shortlist.csv` is a keyword/seniority/recency pre-filter, not the answer. Read it, then judge each person against the user's answers:
- **Why them, now:** fit with the offer or goal, seniority, recent connection, company type. Only what the data supports; do not invent facts about people.
- **Best next step:** a specific, low-pressure action (congratulate a new role, ask a question, offer something useful, ask for an intro).
- **Opening line:** one or two sentences in the user's voice. The user sends it themselves.

Write `data/top-people.md`: the top 15–25, grouped Clients / Intros / Other, each with name, role, company, why, next step, opening line. Skip anyone matching `avoid`. Say plainly when the export lacks the information to judge (many connections hide email or have old titles).

## 4. Keep it current from your own browser (optional)
LinkedIn may restrict the export. To pick up new connections without it, read the user's **own** connections page in **their** logged-in browser (Claude in Chrome, or computer use):

1. Open `https://www.linkedin.com/mynetwork/invite-connect/connections/` sorted by **Recently added**. The user signs in themselves; never handle their password.
2. Read the visible list (name, headline, "Connected on" date, profile URL). Scroll slowly, page by page, and stop as soon as you reach someone already in `data/connections.csv`.
3. Save as `data/refresh-YYYY-MM-DD.json` (`connected_on` can be copied as shown, e.g. "Connected on November 20, 2026") ; fields `[{"first_name","last_name","url","position","company","connected_on"}]`, headline goes in `position`,, then `python3 scripts/network.py refresh data/refresh-YYYY-MM-DD.json`.

Rules: read only the user's own connections list, at human pace, when the user asks. Do not visit profiles in bulk, send messages, accept invites, or run on a schedule without the user's say-so. Automated access can conflict with LinkedIn's User Agreement and put the account at risk; tell the user that before the first refresh.

## 5. Report
Tell the user: how many connections, how many new since last time, the top 5 with one line each, and where the full list is.

## Trying it without real data
Sample data must never go into the user's real list. Use the separate demo store:
`python3 scripts/network.py --demo import examples/Connections.sample.csv` (then `--demo shortlist`, `--demo stats`).
