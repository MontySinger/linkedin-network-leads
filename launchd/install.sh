#!/bin/sh
# Weekly LinkedIn refresh on macOS (Mondays 9:00; runs at next wake if the Mac was asleep).
#   sh launchd/install.sh            install (checks everything it needs first)
#   sh launchd/install.sh --status   show whether it is installed and how the last run went
#   sh launchd/install.sh --remove   uninstall
set -e
LABEL=com.linkedin-network-leads.weekly-refresh
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE="$HOME/Library/Application Support/linkedin-network-leads/chrome-profile"

if [ "$1" = "--remove" ]; then
  launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"; echo "removed $LABEL"; exit 0
fi
if [ "$1" = "--status" ]; then
  if launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1; then
    echo "installed: $LABEL (Mondays 9:00)"
    launchctl print "gui/$(id -u)/$LABEL" | grep -E "last exit code" || true
  else
    echo "not installed"
  fi
  [ -f "$ROOT/data/refresh-log.csv" ] && { echo "recent runs:"; tail -3 "$ROOT/data/refresh-log.csv"; } || echo "no runs logged yet"
  exit 0
fi

fail() { echo "Not installed: $1" >&2; exit 1; }
[ "$(uname)" = "Darwin" ] || fail "this scheduler is macOS-only. On Linux/Windows, run 'node scripts/refresh_browser.mjs' weekly with cron or Task Scheduler."
NODE="$(command -v node || true)"
[ -n "$NODE" ] || fail "Node.js not found. Install Node 18+ from nodejs.org, then rerun."
"$NODE" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' || fail "Node $("$NODE" -v) is too old; need 18+."
[ -d "/Applications/Google Chrome.app" ] || [ -d "$HOME/Applications/Google Chrome.app" ] || fail "Google Chrome not found."
[ -d "$ROOT/node_modules/playwright-core" ] || fail "run 'npm install' in $ROOT first."
[ -d "$PROFILE" ] || fail "run 'npm run login' and sign in to LinkedIn first."
[ -f "$ROOT/data/connections.csv" ] || echo "Note: no connections imported yet. The first run will read your whole list (slow, once)."

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$NODE</string><string>$ROOT/scripts/refresh_browser.mjs</string></array>
  <key>WorkingDirectory</key><string>$ROOT</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>$(dirname "$NODE"):/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string></dict>
  <key>StartCalendarInterval</key><dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$ROOT/data/refresh.log</string>
  <key>StandardErrorPath</key><string>$ROOT/data/refresh.log</string>
</dict></plist>
PL
plutil -lint "$PLIST" >/dev/null || fail "generated plist is invalid."
launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || fail "launchd did not accept the job."
echo "installed $LABEL: Mondays 9:00."
echo "Test it now: launchctl kickstart gui/$(id -u)/$LABEL   then: sh launchd/install.sh --status"
