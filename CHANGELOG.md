# Changelog

All notable changes to wc-bridge are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/).

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

## [Unreleased]

### Added

- WASM glue verification (`__meta_Card`/`__mount_Card`/`__update_Card`/
  `__unmount_Card` exported by wasm-bindgen from the built crate).

[1.0.0]: https://github.com/example/wc-bridge/releases/tag/v1.0.0