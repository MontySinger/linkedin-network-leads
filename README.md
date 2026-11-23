# LinkedIn network leads

**New here? Start with the [step-by-step guide](GUIDE.md).**

Your next client is probably already in your network. You just forgot about them.

This is a skill for any AI coding agent (Claude Code, Codex, Cursor, Gemini CLI, Grok-based agents, and others). It reads your LinkedIn connections, asks you two questions about your business, and gives you a short list of people worth talking to this week, plus the few worth actually meeting, with why each one matters and a first line you can send. It can also keep the list current by reading your own connections page in your browser, so you are not stuck waiting on LinkedIn's export.

Everything runs on your computer. Your connections never leave the `data/` folder, and nothing is sent or posted for you.

## What you need
- An AI coding agent that can read files and run commands (Claude Code, Codex, Cursor, Gemini CLI, a Grok-based agent, …). Any model works.
- Python 3.9+ (no packages to install)
- For the weekly refresh only: macOS, Google Chrome, Node.js 18+
- Your LinkedIn data export (free, takes about a day)

## Setup
1. **Request your data.** On desktop: Me → Settings & Privacy → Data privacy → Get a copy of your data → **Connections** → Request archive. LinkedIn emails you a link, usually within a day. It does not work from the phone app.
2. **Get the skill.**
   ```
   git clone https://github.com/MontySinger/linkedin-network-leads
   cd linkedin-network-leads
   claude      # or: codex, cursor, gemini, your Grok agent, …
   ```
3. **Run it.** Every agent finds the same workflow: `AGENTS.md` (read by most agents) and `CLAUDE.md`/`GEMINI.md` point to `skills/linkedin-network-leads/SKILL.md`. If yours doesn't pick it up, start with "Read AGENTS.md". Then tell it: "Find the people in my LinkedIn network I should talk to. My export is at ~/Downloads/…" (the .zip, the unzipped folder, or Connections.csv). It imports the file, asks you two questions, and writes `data/top-people.md`.

## What you get
- `data/top-people.md`: 15–25 people grouped by clients, intros and other, each with why now, a next step and an opening line.
- `data/connections.csv`: your full network, with when each person first showed up.
- `data/meet-this-week.md`: the 3–5 people worth a call or coffee, what to get out of each meeting, and patterns in your network worth acting on.
- `data/shortlist.csv` and `data/insights.md`: the facts your agent reads before it judges.

## Keeping it current
Say "refresh my LinkedIn connections". Your agent opens your connections page in your own signed-in browser, reads the newest connections until it reaches people it already knows, and merges them in. You sign in yourself; it never touches your password.

**Google Sheet.** If your agent has a Google Sheets connection, ask it to put your connections in a sheet. It uploads everything once, then appends only new rows after each refresh, with a log tab showing whether each refresh passed. No connection? It gives you a CSV to import with File → Import.

**Weekly, automatically (macOS).** If you add a lot of connections, `npm install && npm run login` (sign in once in the window that opens), then `sh launchd/install.sh`. Every Monday it reads every connection since the last run, checks its own work (stops early? skipped a batch? LinkedIn's total grew more than it found?), merges them, and writes a QA report to `data/`. You get a Mac notification either way.

Read this before you use it: automated access to LinkedIn can conflict with LinkedIn's User Agreement. The skill only reads your own connections list, slowly, when you ask, and never messages anyone or visits profiles in bulk. That lowers the risk; it does not remove it. Your call.

## How it decides
A simple script ranks everyone by fit with your answers, seniority and how recently you connected. Your agent then reads that shortlist and makes the actual judgment, using only what the data shows. Old job titles and hidden emails are common, so it tells you when it cannot judge.

## Files
```
skills/linkedin-network-leads/SKILL.md          the workflow any agent follows
AGENTS.md, CLAUDE.md, GEMINI.md                 point each agent to that workflow
.claude/skills, .agents/skills                  links to the same skill for agents that load skills from those folders
scripts/refresh_browser.mjs                     optional weekly browser refresh with QA
launchd/install.sh                              schedules it on macOS (Mondays 9:00)
scripts/sheet_sync.py                           decides what to append to a Google Sheet, so nothing is sent twice
GUIDE.md                                        step-by-step setup guide for anyone
scripts/network.py                              import, refresh, shortlist, insights, stats
scripts/test_refresh.mjs                        tests for the refresh stop rule (npm test)
examples/Connections.sample.csv                 fake data to try it without an export
```

Try it without your own data: `python3 scripts/network.py --demo import examples/Connections.sample.csv`. The `--demo` flag keeps fake people in `data/demo/`, away from your real list.

MIT license. Built by [Monty Singer](https://www.instagram.com/montyautomates/).
