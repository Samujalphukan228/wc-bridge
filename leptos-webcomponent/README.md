# Multi-framework components — leptos-webcomponent + wc-bridge

Build a component once in whichever framework fits, ship it as a
plain custom element, and use it from **any** other framework on the
same page. This repo is a production-ready implementation of that idea:

- `leptos-webcomponent-macro/` + `leptos-webcomponent/` — a real Rust
  proc-macro + runtime crate. `#[web_component("tag-name")]` on a
  Leptos `#[component]` generates everything needed to register it as
  a custom element — no hand-written JS per component. The wasm-bindgen
  glue it produces is verified working in the browser.
- `wc-bridge-js/` — the JS-side counterpart: `react-adapter.js`,
  `svelte-adapter.js`, `vue-adapter.js`, `solid-adapter.js`,
  `preact-adapter.js`, `angular-adapter.js`, `astro-adapter.js`, and
  `nextjs-adapter.js` (SSR-safe React), so components built in those
  frameworks follow the exact same contract (attrs, events, style vars)
  as the Leptos macro. Ships as an npm package with TypeScript types
  and per-adapter entry points.
- `CONTRACT.md` — the spec all adapters implement. This is what makes
  them interchangeable — read this first if you're adding a new
  framework.
- `examples/lx-counter/` — a full example component, ~15 lines,
  proving the macro's ergonomics.
- `demo.html` — a live black & white landing page loading all six
  framework cards side by side, each in its own isolated script block
  with a per-framework status line and a live attribute editor.

## Status

| Piece | Status |
|---|---|
| `leptos-webcomponent-macro` (proc-macro) | ✅ Compiles clean, publishable crate metadata |
| `leptos-webcomponent` (runtime) | ✅ Compiles clean, publishable crate metadata |
| `examples/lx-counter` | ✅ Compiles clean on native + wasm32 targets |
| Real WASM glue | ✅ Verified — wasm-bindgen glue exports `__meta_Card` / `__mount_Card` / `__update_Card` / `__unmount_Card` and mounts a real Leptos component |
| `wc-bridge-js` adapters | ✅ 54 tests pass (`npm test`, all nine adapters) + esbuild bundles clean + ESLint clean |
| TypeScript declarations | ✅ Generated for every adapter (`npm run types`) |
| CI | ✅ GitHub Actions workflow (JS tests, Rust check + wasm build, wasm glue, demo smoke test) |
| End-to-end demo page | ✅ All six cards render in `demo.html`; real WASM preferred, JS fallback when the `.wasm` is absent |
| Leptos events / reactive & JSON attrs | ✅ `#[event]`, `#[attr(reactive)]` (push updates, no remount), `#[attr(json)]`, `Option<T>` |
| Slots (children) | ✅ Light-DOM children captured pre-mount, cloned into `data-wc-slot` drop points (CONTRACT.md §7) |
| Diagnostics | ✅ `data-wc-strict` mode, duplicate-tag errors, panic-safe builds |
| TS types from `__meta_` | ✅ `npm run types:widgets` generates `.d.ts` from the built glue (see `examples/lx-counter/www/lx-widgets.d.ts`) |

Run the demo locally (serve from the repo root):

```bash
python3 -m http.server 8000
# open http://localhost:8000/demo.html
```

React, Vue, SolidJS and Preact load their runtimes from `esm.sh`, so
those need internet. Svelte works offline, and Leptos renders via the
real WASM glue when present (run the build below) or a JS fallback
otherwise.

Rebuild the Leptos WASM glue locally:

```bash
cargo build --release --target wasm32-unknown-unknown -p lx-counter
cp target/wasm32-unknown-unknown/release/lx_counter.wasm examples/lx-counter/www/lx_counter_bg.wasm
wasm-bindgen --target web --out-dir examples/lx-counter/www examples/lx-counter/www/lx_counter_bg.wasm
```

## The core idea (one paragraph)

Every adapter — the Leptos macro, the React wrapper, the Angular
wrapper, and the Svelte/Vue/Solid/Preact/Astro/Next.js wrappers —
produces a `customElements.define()`'d tag that speaks the same three
things: kebab-case HTML attributes in, `CustomEvent`s with a
plain-object `detail` out, and four shared CSS variables for theming
across the Shadow DOM boundary. Because the *contract* is
framework-agnostic even though each *adapter* isn't, `<rx-counter>`,
`<sv-counter>`, `<vu-counter>`, `<sd-counter>`, `<pc-counter>`,
`<ng-counter>`, and `<lx-counter>` are interchangeable from the host
page's point of view — swap one for another during a migration without
touching surrounding code.

## Using the npm package

```js
// wc-bridge-react.js
import { defineReactComponent, registerReactRuntime } from "wc-bridge/react-adapter.js";
import React from "react";
import { createRoot } from "react-dom/client";

registerReactRuntime(React, createRoot);
defineReactComponent("rx-counter", Counter, {
  attrs: { label: "string", initialCount: "number" },
});
```

```html
<rx-counter label="Hello" initial-count="3"></rx-counter>
```

For Next.js use `defineReactComponentSafe` + `initWebComponents()` from
`wc-bridge/nextjs-adapter.js` so registration is deferred safely through
SSR. For Astro use `astroComponentProps` from
`wc-bridge/astro-adapter.js` to generate server-rendered kebab-case
attributes.

## Development

```bash
cd wc-bridge-js
npm install
npm test          # vitest (34 tests across all adapters + contract)
npm run build     # esbuild bundles + TypeScript declarations
npm run lint      # ESLint
cargo check --workspace
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).