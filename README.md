# LinkedIn network leads

Your next client is probably already in your network. You just forgot about them.

This is a Claude Code skill that reads your LinkedIn connections, asks you two questions about your business, and gives you a short list of people worth talking to this week, with why each one matters and a first line you can send. It can also keep the list current by reading your own connections page in your browser, so you are not stuck waiting on LinkedIn's export.

Everything runs on your computer. Your connections never leave the `data/` folder, and nothing is sent or posted for you.

## What you need
- [Claude Code](https://claude.com/claude-code) (or another agent that can read a skill file and run Python)
- Python 3.9+ (no packages to install)
- Your LinkedIn data export (free, takes about a day)

## Setup
1. **Request your data.** On desktop: Me → Settings & Privacy → Data privacy → Get a copy of your data → **Connections** → Request archive. LinkedIn emails you a link, usually within a day. It does not work from the phone app.
2. **Get the skill.**
   ```
   git clone https://github.com/MontySinger/linkedin-network-leads
   cd linkedin-network-leads
   claude
   ```
3. **Run it.** Tell Claude: "Find the people in my LinkedIn network I should talk to. My export is at ~/Downloads/…zip". It imports the file, asks you two questions, and writes `data/top-people.md`.

## What you get
- `data/top-people.md`: 15–25 people grouped by clients, intros and other, each with why now, a next step and an opening line.
- `data/connections.csv`: your full network, with when each person first showed up.
- `data/shortlist.csv`: the pre-filter Claude reads before it judges.

## Keeping it current
Say "refresh my LinkedIn connections". Claude opens your connections page in your own signed-in browser, reads the newest connections until it reaches people it already knows, and merges them in. You sign in yourself; it never touches your password.

Read this before you use it: automated access to LinkedIn can conflict with LinkedIn's User Agreement. The skill only reads your own connections list, slowly, when you ask, and never messages anyone or visits profiles in bulk. That lowers the risk; it does not remove it. Your call.

## How it decides
A simple script ranks everyone by fit with your answers, seniority and how recently you connected. Claude then reads that shortlist and makes the actual judgment, using only what the data shows. Old job titles and hidden emails are common, so it tells you when it cannot judge.

## Files
```
.claude/skills/linkedin-network-leads/SKILL.md   the workflow Claude follows
scripts/network.py                              import, refresh, shortlist, stats
examples/Connections.sample.csv                 fake data to try it without an export
```

Try it without your own data: `python3 scripts/network.py import examples/Connections.sample.csv`.

MIT license. Built by [Monty Singer](https://www.instagram.com/montyautomates/).
