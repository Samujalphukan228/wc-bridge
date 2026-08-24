# Changelog

All notable changes to wc-bridge are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/).

## [1.2.0] - 2026-08-24

### Added

- **`#[event]` support (contract §2).** Component params marked
  `#[event] name: EventEmitter` emit `CustomEvent`s on the host with a
  JSON-serializable `detail`. Declared events appear in the meta
  descriptor under `"events"`.
- **Reactive attrs: `#[attr(reactive)]`.** The param becomes an
  `RwSignal<T>`; attribute changes push new values into the live signal
  instead of remounting — component state survives updates. Components
  using reactive attrs update via the push path only (plain attrs of
  the same component no longer live-update).
- **JSON attrs: `#[attr(json)]`.** Attributes holding a JSON document
  are parsed into any `Deserialize` type (`T: Default` fallback).
- `parse_json_prop<T>()` helper and `PropParse for Option<T>` (absent
  attribute → `None`).
- Contract §3 now documents per-adapter style containment (Leptos =
  light DOM, self-styled; JS adapters = Shadow DOM by default) and adds
  `--wc-color-accent` / `--wc-surface` to the shared theming vars.
- Contract §6 documents meta-descriptor discovery.
- `lx-counter` example now exercises all four param kinds.

### Fixed

- **Leptos live attribute updates.** `__update_*` previously only
  handled a single hardcoded `"initial"` prop pushed into a demo-only
  signal, so observed-attribute changes had no effect on real
  components (violating the contract's update rule). The runtime now
  stores a generic builder closure per instance: updates dispose the
  old reactive scope and remount with all props freshly parsed from
  the attribute JSON, or push into reactive signals when present.
  Works for every `#[attr]` prop and every supported type.
- Debug-build console warnings for missing/unparsable props and for
  mount/update lifecycle misuse (double-mount, update before mount).

### Changed

- `leptos_webcomponent::parse_prop` takes the raw JSON string instead
  of a `JsValue`; `mount`/`update`/`unmount` replaced by
  `mount_instance(host, json, setters, build)` /
  `update_instance` / `unmount_instance`, plus a public `mount_view`
  helper used by macro-generated code.
- Host-side unit tests for prop parsing and fallback behavior.

## [1.2.0] - 2026-08-24

### Added

- **Slots (children) — CONTRACT.md §7.** The generic runtime captures a
  tag's light-DOM children before first mount and clones them into
  `data-wc-slot="name"` drop points rendered by the component; children
  with `slot="name"` pick their slot, everything else fills the default.
  Slots are re-filled after every mount/update and survive remounts and
  reconnects.
- **Diagnostics — CONTRACT.md §8.** `data-wc-strict` on an element turns
  silent problems into console errors (unknown attributes at connect,
  mount/update failures). Registering an already-registered tag now logs
  an error naming the collision instead of skipping silently.
- **Scoped runtime injection for JS adapters.** `defineReactComponent`,
  `definePreactComponent`, `defineSolidComponent` and
  `defineVueComponent` accept `{ runtime }` per definition; it takes
  precedence over the registered/global runtime so apps can avoid
  global state entirely. Global registration remains supported.
- **TS type generation from `__meta_`.**
  `wc-bridge-js/scripts/generate-types.mjs` loads built wasm-bindgen
  glue (via `initSync`, no browser needed), reads every component's
  meta descriptor and emits JSX-typed `.d.ts` declarations
  (`npm run types:widgets`). Sample output:
  `examples/lx-counter/www/lx-widgets.d.ts`.
- Adapter test suites for React, Preact, Solid, Svelte and Angular —
  all nine adapters now covered (54 JS tests).
- Panic-safe builds in the Rust runtime: a panicking builder leaves the
  host empty with a console error instead of tearing the instance store.

## [1.0.0] - 2026-08-20

### Added

- MIT license (`LICENSE`).
- GitHub Actions CI: JS tests + build + types, Rust check + wasm build,
  wasm-bindgen glue verification, demo smoke test (`.github/workflows/ci.yml`).
- TypeScript declarations for every adapter (`wc-bridge-js/types/`).
- Publishable crate metadata for `leptos-webcomponent` and
  `leptos-webcomponent-macro` (version 1.0.0, license, repository,
  keywords, categories, rust-version).
- Shared internal module (`wc-bridge-js/src/internal.js`) centralizing
  the kebab-case mapping, attribute coercion, and CSS-var forwarding so
  the contract can't drift between adapters.
- Adapter hardening: robust number/boolean/JSON coercion (empty/invalid
  numbers become undefined, boolean attribute presence means `true`),
  per-adapter error guards around mount/render, and safer lifecycle
  teardown.
- Comprehensive test suite: 34 tests covering the shared contract
  (kebab-case mapping, coercion, re-render on attribute change, CSS-var
  forwarding, CustomEvent output, lifecycle teardown) plus adapter
  specifics (Vue, Astro SSR props, Angular).

### Changed

- `demo.html` rewritten as a full black & white landing page showcasing
  all six frameworks as themed cards with a live attribute editor.
- Real wasm-bindgen glue preferred by `wasm-loader.js`, with the JS
  polyfill retained as a fallback.
- `wc-bridge-js/package.json` rewritten for publishing (exports map,
  per-adapter entry points, `files`, build/types/lint scripts).

### Fixed

- Kebab-case attribute mapping in all JS adapters (`initialCount` →
  `initial-count`) per CONTRACT.md.
- React adapter: style prop passed as a CSS string caused React 18
  Minified error #62; components now render correctly.
- Solid adapter: demo render wrapper now invokes the component's
  returned closure with the mount target; removed the non-existent
  `count.subscribe`.
- Preact adapter: `useState` now imported from `preact/hooks` (not
  `preact`), and the render stub was replaced with real `preact.render`
  so components actually mount.
- Leptos example: component renamed to `Card` (`lx-card`) with
  `label`/`description` attrs to match the landing-page demo.

## [1.2.0] - 2026-08-24

### Added

- WASM glue verification (`__meta_Card`/`__mount_Card`/`__update_Card`/
  `__unmount_Card` exported by wasm-bindgen from the built crate).

[1.0.0]: https://github.com/example/wc-bridge/releases/tag/v1.0.0