# Contributing

Thanks for considering contributing to wc-bridge. This project stays
small on purpose: a strict contract, seven adapters, one demo. Here's
how to keep it that way.

## Ground rules

- **Read `CONTRACT.md` first.** Every change must preserve the contract:
  kebab-case attributes in, `CustomEvent` + plain-object `detail` out,
  the four shared CSS variables forwarded across the shadow boundary,
  and full teardown on disconnect. If a change would break one of those
  four rules, it's a breaking change and needs a version bump and a
  CHANGELOG entry.
- **No hard framework dependencies.** Adapters must never import a
  framework at the top level. Consumers pass their framework's runtime
  in via a `register*Runtime()` call (or the adapter takes the pieces
  it needs as parameters, like the Angular adapter does with
  `createCustomElement`). This is what keeps the package tiny and
  version-collision-free.
- **Test before you ship.** Every adapter change needs a test. The suite
  runs on jsdom with small fake runtimes so no real framework install is
  required for CI.

## Setup

```bash
git clone <this repo>
cd wc-bridge-js
npm install
npm test
```

For the Rust side:

```bash
cargo check --workspace
cargo build --release --target wasm32-unknown-unknown -p lx-counter
# generate glue (requires wasm-bindgen-cli):
wasm-bindgen --target web --out-dir examples/lx-counter/www examples/lx-counter/www/lx_counter_bg.wasm
```

## Adding a new framework adapter

1. Copy the structure of the closest existing adapter (`react-adapter.js`
   is the reference).
2. Implement the four contract rules from `CONTRACT.md`.
3. Reuse `src/internal.js` helpers (`kebab`, `coerce`, `cssVarStyle`) —
   do not re-roll them in the new adapter.
4. Add tests in `test/<framework>-adapter.test.js` covering the shared
   contract + framework-specific behavior.
5. Add the adapter to:
   - `wc-bridge-js/src/index.js`
   - `wc-bridge-js/scripts/build.mjs` (entry point list)
   - `wc-bridge-js/package.json` (exports map)
   - `wc-bridge-js/types/` (a `.d.ts` for the adapter) and
     `types/index.d.ts`
6. Update this file's adapter list in `README.md`.

## Committing

- Keep commits small and focused; one logical change per commit.
- Run `npm run lint && npm test && npm run build` and
  `cargo check --workspace` before committing.
- Update `CHANGELOG.md` for user-visible changes.
- Do not push to a shared remote without asking the maintainer.

## Reporting issues

Include: the framework(s) involved, the tag name, the attrs you set, the
event you expected, and a minimal repro. Screenshots of the browser
console help a lot.