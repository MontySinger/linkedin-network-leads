# Agent instructions

This repo is one skill: find the people in the user's LinkedIn network worth talking to and meeting now.

The full workflow is in `skills/linkedin-network-leads/SKILL.md`. When the user asks anything about their LinkedIn network, connections, leads, who to meet, the weekly refresh, or the Google Sheet, read that file and follow it exactly. It works with any agent and any model that can read files and run commands.

- Run scripts from the repo root: `python3 scripts/network.py ...`, `node scripts/refresh_browser.mjs`.
- Keep everything in `data/`. Never post, message, or send anything for the user.
- Use whatever browser, computer-use, Google Sheets or scheduling tools you have. If you have none, the skill says what to do instead.
- Never type, ask for, or store the user's LinkedIn or Google password, API keys, or tokens.
