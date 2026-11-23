# Find your next client in your LinkedIn network

A step-by-step guide. About 15 minutes of your time, plus a day of waiting on LinkedIn.

The person most likely to become your next client already knows you, already trusts you, and has probably drifted out of your head. This tool reads your LinkedIn connections, asks you two questions about your business, and hands you a short list of who to talk to this week, and the handful worth actually meeting: why each person, what to do next, and a first line you can send.

It all runs on your computer. Nothing gets posted or sent for you. You stay in charge of every message.

## What you need

- A computer. The LinkedIn download doesn't work from the phone app.
- An AI coding agent: Claude Code, Codex, Cursor, Gemini CLI, a Grok-based agent, or any other that can read files and run commands. Any model works; nothing here is tied to one company.
- Python 3.9 or newer. Macs usually have it already; type `python3 --version` in Terminal to check.
- Optional, for the weekly auto-update: a Mac, Google Chrome and [Node.js](https://nodejs.org) 18 or newer.

## Step 1: Download your connections (2 minutes, then wait a day)

1. On LinkedIn, click **Me → Settings & Privacy → Data privacy → Get a copy of your data**.
2. Choose **Connections** only. It arrives faster than the full archive.
3. Click **Request archive**. LinkedIn emails you a download link, usually within a day.
4. Download the file. You can leave it in Downloads: the zip, the folder your Mac unzips it into, or `Connections.csv` all work.

## Step 2: Get the tool (2 minutes)

Open Terminal and run:

```
git clone https://github.com/MontySinger/linkedin-network-leads
cd linkedin-network-leads
claude
```

Using something else? Start your own agent instead of `claude` (`codex`, `cursor`, `gemini`, …). They all read the same instructions. If yours seems lost, say "Read AGENTS.md" first.

## Step 3: Ask for your list (10 minutes)

Tell it:

> Find the people in my LinkedIn network I should talk to. My export is in my Downloads folder.

It imports your connections, then asks you two questions:

1. **What do you sell or do, and who is it for?** Be specific. "AI automation for 10–200 person service businesses" works better than "consulting."
2. **What do you need from your network right now?** Clients, intros, hires, investors, advice. Say who to skip, too (recruiters, competitors, students).

A few minutes later you get `data/top-people.md`: 15 to 25 people grouped into clients, intros and everyone else. Each one comes with why them, why now, a next step, and an opening line.

You also get `data/meet-this-week.md`: the 3 to 5 people worth a call or coffee rather than a message, what you want out of each meeting, a question to open with, and a few patterns in your network worth acting on ("you know 12 people at one firm"). Ask "who should I meet with?" any time to redo it.

Read both the way you'd read a list from a sharp assistant. The export only shows each person's title, company and the date you connected, and titles go stale. Check the profile before you send anything, then send it yourself.

## Step 4 (optional): Keep it current every week

If you add a lot of connections, the tool can pick up new ones every Monday on its own. In the same folder:

```
npm install
npm run login
```

A separate Chrome window opens. Sign in to LinkedIn there yourself; the tool never sees your password. Then turn on the weekly run:

```
sh launchd/install.sh
```

Every Monday at 9:00 (or when your Mac next wakes up), it opens your connections page, reads every connection since the last run, and checks its own work before saving anything:

- It keeps scrolling until it reaches people it already knew last week, so a week with 300 new connections gets read in full.
- It compares LinkedIn's connection count with what it found. If LinkedIn says you grew by 40 and it only found 35, the run is marked FAIL and next week's run covers the gap.
- It writes a short report to `data/refresh-qa-<date>.md` and sends you a Mac notification either way.

The weekly job doesn't use any AI at all, so it works the same whichever agent set it up. Ask "who's new this week?" afterwards and your agent judges the new names the same way as Step 3, including who's worth a meeting.

Check it any time with `sh launchd/install.sh --status`. To turn it off: `sh launchd/install.sh --remove`.

Or skip the commands and tell your agent: "Set up the weekly LinkedIn refresh." It runs all of the above, stops only for you to sign in, then runs a test and shows you the result.

## Step 5 (optional): Send it to a Google Sheet

If your agent has a Google Sheets connection, say:

> Put my LinkedIn connections in a Google Sheet and keep it updated after each weekly refresh.

It uploads your whole network once, then adds only the new rows each week, plus a log of every refresh and whether it passed. It never stores Google passwords or keys on your computer; the connection you already approved does the writing. No Google connection? Ask for the sheet file instead and import it with File → Import in Google Sheets.

## Before you turn on the weekly refresh

LinkedIn's User Agreement restricts automated access. The refresh only reads your own connections page, once a week, at a human pace, in your own signed-in browser. It never messages anyone, never opens profiles in bulk, and stops the moment LinkedIn shows a security check. That keeps the risk low. It doesn't make it zero. Your call.

## If something goes wrong

| What you see | What to do |
|---|---|
| "No Connections.csv inside…" | You pointed it at the wrong folder. Find the file LinkedIn emailed you and give that path. |
| "That is sample data" | You imported the example file. Try it with `--demo` instead, so fake people stay out of your real list. |
| Mac notification: "Sign-in needed" | LinkedIn signed you out. Run `npm run login` and sign in again. |
| Refresh report says FAIL | Nothing is lost. The next run re-reads that week. If it fails twice, open the report: it says which check failed. |
| The list feels off | Your two answers drive everything. Edit `data/about.json` and ask for the list again. |

Built by [Monty Singer](https://www.instagram.com/montyautomates/). MIT license, free to use and change.
