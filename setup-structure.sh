#!/bin/bash

set -e

echo "📁 Creating PACT structure..."

mkdir -p src/app
mkdir -p src/components
mkdir -p src/state
mkdir -p src/types

echo "📄 Creating files..."

touch src/app/App.tsx

touch src/components/MenuBar.tsx
touch src/components/PromptList.tsx
touch src/components/PromptEditor.tsx
touch src/components/ExecutionHistory.tsx
touch src/components/DiffView.tsx

touch src/state/useNotebook.ts
touch src/types/types.ts

echo "🧹 Rewiring main.tsx..."

cat > src/main.tsx <<EOF
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

echo "🧽 Removing default App files..."

rm -f src/App.tsx
rm -f src/App.css

echo "✅ Structure ready!"