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
   - ✅ Same contract compliance
   - ✅ Tag prefix: `vu-`

## Medium Priority
4. [x] Live prop updates in Leptos runtime
   - ✅ Replaced stub `update()` with live signal-based approach
   - ✅ Stored `RwSignal` alongside disposer for attribute change callbacks
   - ✅ `unmount()` refactored to handle new struct

5. [x] Create end-to-end demo page
   - ✅ `demo.html` demonstrates React, Svelte, Vue working together
   - ✅ Leptos placeholder included (needs WASM target to build)
   - ✅ Shared CSS var theming, live attribute updates

## Ongoing
6. [ ] Keep workspace build green (`cargo check` + `npm run build`)
7. [ ] Update README/contract docs as new adapters are added
