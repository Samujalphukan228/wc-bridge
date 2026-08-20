# Task List

## High Priority
1. [x] Add Next.js adapter testing to existing React adapter (`wc-bridge-js/react-adapter.js`)
   - ✅ SSR-safe wrapper created (`nextjs-adapter.js`)
   - ✅ Tests pass (3/3 via vitest)

2. [x] Implement Svelte adapter (following CONTRACT.md spec)
   - ✅ `wc-bridge-js/src/svelte-adapter.js`
   - ✅ Props → attributes, events → CustomEvent, CSS vars
   - ✅ Tag prefix: `sv-`

3. [x] Implement Vue adapter (following CONTRACT.md spec)
   - ✅ `wc-bridge-js/src/vue-adapter.js`
   - ✅ Same contract compliance with runtime registration
   - ✅ Tag prefix: `vu-`

## Medium Priority
4. [x] Live prop updates in Leptos runtime
   - ✅ Replaced stub `update()` with RwSignal-based approach
   - ✅ Stored `RwSignal` alongside disposer for attribute change callbacks
   - ✅ `unmount()` refactored to handle new struct

5. [x] Create end-to-end demo page
   - ✅ `demo.html` demonstrates Leptos, React, Svelte, Vue, SolidJS, Preact working together
   - ✅ Live attribute updates via input controls
   - ✅ Shared CSS var theming
   - ✅ Per-framework isolation: separate `<script type=module>` block + status line each, so one failure no longer blanks the whole page

## Additional Frameworks
6. [x] Solid.js adapter
   - ✅ `wc-bridge-js/src/solid-adapter.js`
   - ✅ Fine-grained reactive support via `registerSolidRuntime()`

7. [x] Preact adapter
   - ✅ `wc-bridge-js/src/preact-adapter.js`
   - ✅ Lightweight 3kB alternative approach

8. [x] Astro adapter
   - ✅ `wc-bridge-js/src/astro-adapter.js`
   - ✅ SSR-friendly attribute generation for static sites

## Ongoing
9. [ ] Keep workspace build green (`cargo check` + `npm run build`)
   - ✅ Last check: both pass (workspace + esbuild bundle)
10. [x] Update README/contract docs as new adapters are added
    - ✅ README now lists all 9 adapters, current status table, demo instructions

## Next candidates
11. [ ] Install `wasm-bindgen-cli` + `trunk build` so the Leptos counter
      renders real WASM in-browser instead of the JS fallback
12. [ ] Publish: `leptos-webcomponent` → crates.io, `wc-bridge` → npm
