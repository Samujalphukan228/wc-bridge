# The Web Component Contract

Every adapter (Leptos macro, React helper, Angular helper) produces a
custom element that follows this exact contract, so components from
different frameworks are interchangeable from the outside.

## 1. Props in → HTML attributes
- Every prop is exposed as a **kebab-case attribute**: `initialCount` prop
  → `initial-count` attribute.
- Attributes are always strings. Numbers/bools/JSON are parsed by the
  adapter on the way in (`initial-count="4"` → `4: i32` / `number`).
- Structured data may be passed as a **JSON document inside the
  attribute** (`events-json='[...]'`), parsed by adapters that opt in
  (`#[attr(json)]` on the Leptos side).
- Removing an attribute reports an empty string (`""`) to the adapter —
  `Option<T>` attrs map that to `None`; JS-side coercions map it to
  `undefined` (numbers) / `false` (booleans).
- Changing the attribute after mount updates the component
  (`attributeChangedCallback` / `observedAttributes` on the JS side):
  - components with only plain attrs are **remounted** with fresh props;
  - components declaring **reactive** attrs (`#[attr(reactive)]`)
    receive pushed signal updates instead — no remount, state preserved.
    Note: once a component declares any reactive attr, updates use the
    push path exclusively; its plain attrs no longer live-update.

## 2. Data out → CustomEvents
- Every callback prop / emitted value fires a `CustomEvent` on the
  host element itself (not on `document`), named in kebab-case:
  `onCountChanged` → `count-changed`.
- Payload always goes in `event.detail`, always a plain JSON-serializable
  object: `{ count: 4 }`, never a class instance or framework-specific type.
- On the Leptos side events are declared with `#[event] name:
  EventEmitter`; declared event names appear in the meta descriptor
  under `"events"` so host tooling can discover them.

## 3. Style boundary
- Theming goes through the shared CSS custom properties in both
  directions, regardless of containment strategy:
  `--wc-color-primary`, `--wc-color-text`, `--wc-color-accent`,
  `--wc-surface`, `--wc-radius`, `--wc-font`.
- Adapters must NOT hardcode colors/fonts — they read these vars with
  sane fallbacks.
- **Containment strategy is per adapter, documented here:**
  - *Leptos/Rust* mounts into the host's light DOM and ships
    self-contained styling (inline styles + the shared vars). Chosen
    deliberately: Tailwind utilities keep working inside components,
    and late style injection causes no layout shift.
  - *JS adapters* default to Shadow DOM with var forwarding
    (`useShadow: false` opts out).
- Either way, a component must render correctly when the page sets
  only the six vars above.

## 4. Lifecycle
- `connectedCallback` mounts. `disconnectedCallback` must fully tear
  down the framework's runtime for that instance (unmount React root /
  dispose Leptos reactive scope) — no leaked reactivity across remounts.

## 5. Naming
- Tag names are always `<vendor-prefix>-<component-name>`, e.g.
  `rx-counter` (React), `lx-counter` (Leptos), `ng-counter` (Angular).
  This avoids collisions when the same logical component exists in
  multiple frameworks during a migration.

## 6. Discovery
- Every Leptos component exposes a `__meta_<Name>()` export returning a
  JSON descriptor: `{ tag, mount, update, unmount, attrs, events }`.
  The generic runtime (`webcomponent-runtime.js`) registers custom
  elements from it; host tooling uses it to generate types/docs.

## 7. Slots (children)
- A component declares drop points as elements carrying
  `data-wc-slot="name"` (an empty value or no value is the default
  slot). Example: `<div data-wc-slot="body"></div>`.
- The host page writes plain light-DOM children inside the tag; before
  first mount they are captured, and children with `slot="name"`
  are cloned into the matching `data-wc-slot` drop point. All other
  nodes land in the default slot.
- Cloning happens after every mount/update, so slots survive remounts.
  If several drop points share a name, only the first is filled.
- Content inside drop points participates in the host page normally:
  it inherits the page's styles and its events bubble through the tag.

## 8. Diagnostics
- Adding `data-wc-strict` to an element turns silent problems into
  console errors: unknown attributes are reported at connect, and
  mount/update failures log with `console.error` instead of `warn`.
- Registering a tag that already exists logs an error naming both
  bundles' problem instead of skipping silently.
