# Multi-framework components — leptos-webcomponent + wc-bridge

Build a component once in whichever framework fits, ship it as a
plain custom element, and use it from **any** other framework on the
same page. This repo is the first working version:

- `leptos-webcomponent-macro/` + `leptos-webcomponent/` — a real Rust
  proc-macro + runtime crate. `#[web_component("tag-name")]` on a
  Leptos `#[component]` generates everything needed to register it as
  a custom element — no hand-written JS per component.
- `wc-bridge-js/` — the JS-side counterpart: `react-adapter.js`,
  `svelte-adapter.js`, `vue-adapter.js`, `solid-adapter.js`,
  `preact-adapter.js`, `angular-adapter.js`, `astro-adapter.js`, and
  `nextjs-adapter.js` (SSR-safe React), so components built in those
  frameworks follow the exact same contract (attrs, events, style vars)
  as the Leptos macro.
- `CONTRACT.md` — the spec all adapters implement. This is what makes
  them interchangeable — read this first if you're adding a new
  framework.
- `examples/lx-counter/` — a full example component, ~15 lines,
  proving the macro's ergonomics.
- `demo.html` — a live page loading all six JS/Leptos counters side by
  side, each in its own isolated script block with a per-framework
  status line.

## Status — what's verified vs. what needs your machine

| Piece | Status |
|---|---|
| `leptos-webcomponent-macro` (proc-macro) | ✅ Compiles clean on native target |
| `leptos-webcomponent` (runtime) | ✅ Compiles clean on native target |
| `examples/lx-counter` | ✅ Compiles clean on native target |
| Actual `.wasm` output | ✅ Built locally via `cargo build --release --target wasm32-unknown-unknown -p lx-counter` |
| `wc-bridge-js` adapters | ✅ Tests pass (`npx vitest run`, 3/3) + esbuild bundles clean |
| End-to-end demo page | ✅ All six counters render in `demo.html`; per-framework status per section |

Run the demo locally (serve from the repo root):

```bash
python3 -m http.server 8000
# open http://localhost:8000/demo.html
```

React, Vue, SolidJS and Preact load their runtimes from `esm.sh`, so
those need internet. Svelte and Leptos (which falls back to a JS
polyfill counter if the WASM glue isn't available) work fully offline.

The native-target compile isn't a formality — it already caught two
real bugs during development (a `Send`/`Sync` misuse with `once_cell`,
and calling the post-macro-expansion Leptos function with positional
args instead of its generated `Props` struct). Both are fixed in the
current source.

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

## Next steps (design decisions still open)

1. **Real WASM glue in the browser** — the `.wasm` builds, and the demo
   currently renders the Leptos counter via `wasm-loader.js`, which
   tries `WebAssembly.instantiate` and falls back to a JS polyfill.
   Wiring the actual wasm-bindgen glue needs `wasm-bindgen-cli`
   (`cargo install wasm-bindgen-cli`) followed by `trunk build`.
2. **Slots / children** — none of the adapters handle passing child
   content through yet (Angular Elements has partial support; React and
   Leptos need `<slot>` wiring).
3. **Publishing** — `leptos-webcomponent` → crates.io, `wc-bridge` →
   npm, once the wasm path is verified end-to-end.
4. **Ember, Alpine, Dioxus, Yew, Sycamore, Seed, Iced, Sauron** — more
   adapters. CONTRACT.md has so far proven complete enough for seven
   frameworks.
