# Task List

## High Priority
1. [ ] Add Next.js adapter testing to existing React adapter (`wc-bridge-js/react-adapter.js`)
   - Verify it works with Next.js client components (`'use client'`)
   - Add SSR guards if needed (`typeof window !== 'undefined'` checks)
   - Ensure no side-effects during server-side rendering

## Medium Priority
2. [ ] Implement Svelte adapter (following CONTRACT.md spec)
   - Create `wc-bridge-js/svelte-adapter.js`
   - Expose props → attributes, events → CustomEvent, CSS vars
   - Tag prefix: `sv-`

3. [ ] Implement Vue adapter (following CONTRACT.md spec)
   - Create `wc-bridge-js/vue-adapter.js`
   - Same contract compliance
   - Tag prefix: `vu-`

## Low Priority
4. [ ] Create end-to-end demo page showcasing all adapters
   - HTML page using `<lx-counter>`, `<rx-counter>`, `<ng-svelte>`, `<sv-counter>`, `<vu-counter>`
   - Demonstrates cross-framework interoperability

## Ongoing
5. [ ] Keep workspace build green (`cargo check` + `npm run build`)
6. [ ] Update README/contract docs as new adapters are added
