#!/bin/bash
set -e

# ── Validate argument ─────────────────────────────────────────────────────────
if [ -z "$1" ]; then
  echo "Usage: ./uninstall-beta.sh <email>"
  echo "Example: ./uninstall-beta.sh marc.pierson@gmail.com"
  exit 1
fi

EMAIL="$1"
EMAIL_PREFIX="${EMAIL%%@*}"
EXT_DIR="$HOME/.vscode/extensions/adriatic.pact-react-2-0.0.1"
cd "$(dirname "$0")"

# ── Remove installed extension ────────────────────────────────────────────────
if [ -d "$EXT_DIR" ]; then
  rm -rf "$EXT_DIR"
  echo "Removed: $EXT_DIR"
else
  echo "Not found: $EXT_DIR"
fi

# ── Clear extension registry ──────────────────────────────────────────────────
echo '[]' > ~/.vscode/extensions/extensions.json
echo "Extension registry cleared"

echo ""
echo "✓ Uninstalled beta for: $EMAIL"
echo "  Restart VSCode to take effect."
