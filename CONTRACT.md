# The Web Component Contract

Every adapter (Leptos macro, React helper, Angular helper) produces a
custom element that follows this exact contract, so components from
different frameworks are interchangeable from the outside.

## 1. Props in → HTML attributes
- Every prop is exposed as a **kebab-case attribute**: `initialCount` prop
  → `initial-count` attribute.
- Attributes are always strings. Numbers/bools/JSON are parsed by the
  adapter on the way in (`initial-count="4"` → `4: i32` / `number`).
- Changing the attribute after mount updates the component
  (`attributeChangedCallback` / `observedAttributes` on the JS side).

## 2. Data out → CustomEvents
- Every callback prop / emitted value fires a `CustomEvent` on the
  host element itself (not on `document`), named in kebab-case:
  `onCountChanged` → `count-changed`.
- Payload always goes in `event.detail`, always a plain JSON-serializable
  object: `{ count: 4 }`, never a class instance or framework-specific type.

## 3. Style boundary
- Shadow DOM is the default (style isolation).
- Every adapter forwards a fixed set of CSS custom properties from the
  light DOM into the shadow root, so host pages can theme any component
  the same way regardless of framework:
  `--wc-color-primary`, `--wc-color-text`, `--wc-radius`, `--wc-font`.
- Adapters must NOT hardcode colors/fonts — they read these vars with
  sane fallbacks.

## 4. Lifecycle
- `connectedCallback` mounts. `disconnectedCallback` must fully tear
  down the framework's runtime for that instance (unmount React root /
  dispose Leptos reactive scope) — no leaked reactivity across remounts.

## 5. Naming
- Tag names are always `<vendor-prefix>-<component-name>`, e.g.
  `rx-counter` (React), `lx-counter` (Leptos), `ng-counter` (Angular).
  This avoids collisions when the same logical component exists in
  multiple frameworks during a migration.
