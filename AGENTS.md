# Agent instructions

This repo is a single skill: find the people in the user's LinkedIn network worth talking to now.

When the user asks to find leads in their LinkedIn network, import their LinkedIn connections, or refresh or update their network list, read and follow `.claude/skills/linkedin-network-leads/SKILL.md` exactly. It is written for any agent that can run Python, not only Claude.

- Run scripts from the repo root: `python3 scripts/network.py ...`
- Keep everything in `data/`. Never post, message, or send anything for the user.
- For the browser refresh, use whatever browser or computer-use tool you have, in the user's own signed-in session. Never handle their password.
