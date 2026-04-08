#!/usr/bin/env bash

echo "🚀 PACT DEV START"

# Absolute cleanup
unset npm_config_prefix
unset NPM_CONFIG_PREFIX

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# 🔥 THIS IS THE KEY LINE (fixes everything)
nvm use --delete-prefix node

# Verify
echo "Node: $(node -v)"
echo "NPM: $(npm -v)"
echo "Prefix: $(npm config get prefix)"

# Build
npm run build:web
npm run build:ext

# Run VSCode
code \
--extensionDevelopmentPath="$(pwd)" \
--disable-extensions