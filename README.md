# Multi-framework components — leptos-webcomponent + wc-bridge

Build a component once in whichever framework fits, ship it as a
plain custom element, and use it from **any** other framework on the
same page. This repo is the first working version:

- `leptos-webcomponent-macro/` + `leptos-webcomponent/` — a real Rust
  proc-macro + runtime crate. `#[web_component("tag-name")]` on a
  Leptos `#[component]` generates everything needed to register it as
  a custom element — no hand-written JS per component.
- `wc-bridge-js/` — the JS-side counterpart: `react-adapter.js` and
  `angular-adapter.js`, so React/Angular components follow the exact
  same contract (attrs, events, style vars) as the Leptos macro.
- `CONTRACT.md` — the spec all three adapters implement. This is what
  makes them interchangeable — read this first if you're adding a
  fourth framework later (Svelte, Vue, etc.).
- `examples/lx-counter/` — a full example component, ~15 lines,
  proving the macro's ergonomics.

## Status — what's verified vs. what needs your machine

| Piece | Status |
|---|---|
| `leptos-webcomponent-macro` (proc-macro) | ✅ Compiles clean on native target |
| `leptos-webcomponent` (runtime) | ✅ Compiles clean on native target |
| `examples/lx-counter` | ✅ Compiles clean on native target |
| Actual `.wasm` output | ❌ Needs `wasm32-unknown-unknown` target — this sandbox has neither the target nor network access to install it. Run `rustup target add wasm32-unknown-unknown && trunk build --release` in `examples/lx-counter` on your machine. |
| `wc-bridge-js` adapters | ✅ Syntax-verified via esbuild bundling |
| End-to-end page with all 3 frameworks | Not yet built — natural next step once wasm output exists |

The native-target compile isn't a formality — it already caught two
real bugs during development (a `Send`/`Sync` misuse with `once_cell`,
and calling the post-macro-expansion Leptos function with positional
args instead of its generated `Props` struct). Both are fixed in the
current source.

## The core idea (one paragraph)

Every adapter — the Leptos macro, the React wrapper, the Angular
wrapper — produces a `customElements.define()`'d tag that speaks the
same three things: kebab-case HTML attributes in, `CustomEvent`s with
a plain-object `detail` out, and four shared CSS variables for theming
across the Shadow DOM boundary. Because the *contract* is
framework-agnostic even though each *adapter* isn't, `<rx-counter>`,
`<ng-counter>`, and `<lx-counter>` are interchangeable from the host
page's point of view — swap one for another during a migration without
touching surrounding code.

## Next steps (design decisions still open)

1. **Live prop updates after mount** — `leptos-webcomponent::update()`
   is currently a no-op stub. Needs a per-instance `RwSignal` stored
   alongside the disposer so `attributeChangedCallback` can push new
   values in without a full remount.
2. **Slots / children** — none of the three adapters handle passing
   child content through yet (Angular Elements has partial support;
   React and Leptos need `<slot>` wiring).
3. **Publishing** — `leptos-webcomponent` → crates.io,
   `wc-bridge` → npm, once the wasm path is verified end-to-end.
4. **A Svelte or Vue adapter** — good test of whether `CONTRACT.md` is
   actually complete, or just complete enough for these three.
