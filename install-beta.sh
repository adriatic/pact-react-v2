#!/bin/bash
set -e

# ── Validate argument ─────────────────────────────────────────────────────────
if [ -z "$1" ]; then
  echo "Usage: ./install-beta.sh <email>"
  echo "Example: ./install-beta.sh marc.pierson@gmail.com"
  exit 1
fi

EMAIL="$1"
EMAIL_PREFIX="${EMAIL%%@*}"
VSIX_NAME="pact-${EMAIL_PREFIX}-0.0.1.vsix"
cd "$(dirname "$0")"

if [ ! -f "$VSIX_NAME" ]; then
  echo "ERROR: $VSIX_NAME not found in project root"
  exit 1
fi

echo "Installing $VSIX_NAME..."
echo '[]' > ~/.vscode/extensions/extensions.json
code --install-extension "$VSIX_NAME"

echo ""
echo "✓ Installed: $VSIX_NAME"
echo "  Quit VSCode completely and reopen to activate."
