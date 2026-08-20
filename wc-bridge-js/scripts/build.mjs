import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });

await build({
  entryPoints: ["src/index.js"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  outfile: "dist/index.js",
  target: ["es2020"],
  legalComments: "none",
  banner: { js: "/* wc-bridge — MIT license. See LICENSE. */" },
  logLevel: "info",
});

// Per-adapter ESM entry points so bundlers can tree-shake and Node
// can import a single adapter without pulling the rest.
const adapters = [
  "react-adapter.js",
  "nextjs-adapter.js",
  "svelte-adapter.js",
  "vue-adapter.js",
  "solid-adapter.js",
  "preact-adapter.js",
  "angular-adapter.js",
  "astro-adapter.js",
];

for (const file of adapters) {
  await build({
    entryPoints: [`src/${file}`],
    bundle: true,
    format: "esm",
    platform: "neutral",
    outfile: `dist/${file}`,
    target: ["es2020"],
    legalComments: "none",
    logLevel: "silent",
  });
}

console.log("✅ built dist/index.js + 8 adapter bundles");