#!/bin/bash
set -e

# ── Validate argument ─────────────────────────────────────────────────────────
if [ -z "$1" ]; then
  echo "Usage: ./create-beta.sh <email>"
  echo "Example: ./create-beta.sh marc.pierson@gmail.com"
  exit 1
fi

EMAIL="$1"
cd "$(dirname "$0")"

# ── Find most recent beta-keys file ──────────────────────────────────────────
KEYS_FILE=$(ls beta-keys-*.json 2>/dev/null | sort | tail -1)
if [ -z "$KEYS_FILE" ]; then
  echo "ERROR: No beta-keys-*.json file found in project root"
  exit 1
fi
echo "Using keys file: $KEYS_FILE"

# ── Derive name from email ────────────────────────────────────────────────────
EMAIL_PREFIX="${EMAIL%%@*}"
NAME=$(echo "$EMAIL_PREFIX" | sed 's/[._-]/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2)); print}')
echo "Tester name: $NAME"
echo "Tester email: $EMAIL"

# ── Read beta keys ────────────────────────────────────────────────────────────
OPENAI_KEY=$(node -e "console.log(require('./$KEYS_FILE').openaiApiKey)")
ANTHROPIC_KEY=$(node -e "console.log(require('./$KEYS_FILE').anthropicApiKey)")

# ── Back up dev config ────────────────────────────────────────────────────────
cp config.json config.dev.json
echo "Development config backed up to config.dev.json"

# ── Write beta config ─────────────────────────────────────────────────────────
node -e "
const fs = require('fs');
const config = {
  openaiApiKey: '$OPENAI_KEY',
  anthropicApiKey: '$ANTHROPIC_KEY',
  user: {
    name: '$NAME',
    email: '$EMAIL',
    context: 'Beta tester of PACT, a structured AI research tool that runs as a VSCode extension.'
  }
};
fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
"
echo "Beta config written"

# ── Build ─────────────────────────────────────────────────────────────────────
echo "Building..."
npm run build

# ── Package ───────────────────────────────────────────────────────────────────
VSIX_NAME="pact-${EMAIL_PREFIX}-0.0.1.vsix"
echo "Packaging as $VSIX_NAME..."
vsce package \
  --allow-missing-repository \
  --allow-star-activation \
  --allow-package-secrets openai \
  --out "$VSIX_NAME"

# ── Restore dev config ────────────────────────────────────────────────────────
mv config.dev.json config.json
echo "Development config restored"

echo ""
echo "✓ Done: $VSIX_NAME"
echo "  Tester: $NAME <$EMAIL>"
echo "  Keys:   $KEYS_FILE"
