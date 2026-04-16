// build-web.js

const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["src/index.tsx"],
  bundle: true,
  outfile: "out/index.js",
  platform: "browser",
  format: "iife",
  loader: {
    ".ts": "ts",
    ".tsx": "tsx"
  },
  define: {
    "process.env.NODE_ENV": '"production"'
  }
}).catch(() => process.exit(1));