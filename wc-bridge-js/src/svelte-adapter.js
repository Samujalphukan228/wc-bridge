// svelte-adapter.js
//
// Wraps a Svelte component as a custom element following the SAME
// contract as the Leptos #[web_component] macro (see ../CONTRACT.md):
//   - kebab-case attrs in, parsed by declared type
//   - CustomEvents out, fired on the host element, detail = plain object
//   - Shadow DOM by default, CSS vars forwarded across the boundary
//   - disconnectedCallback fully unmounts (no leaked state)
//
// Usage:
//   import { defineSvelteComponent } from "wc-bridge/svelte-adapter.js";
//   import Counter from "./Counter.svelte";
//
//   defineSvelteComponent("sv-counter", Counter, {
//     attrs: { label: "string", initial: "number" },
//   });

const CSS_VARS = ["--wc-color-primary", "--wc-color-text", "--wc-radius", "--wc-font"];

// CONTRACT.md: camelCase prop -> kebab-case attribute ("initialCount" -> "initial-count")
function kebab(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function coerce(raw, kind) {
  if (raw === null) return kind === "boolean" ? false : undefined;
  switch (kind) {
    case "number":
      return Number(raw);
    case "boolean":
      return raw === "true" || raw === "";
    default:
      return raw;
  }
}

export function defineSvelteComponent(tag, SvelteComponent, { attrs = {}, useShadow = true } = {}) {
  const attrFor = Object.fromEntries(Object.keys(attrs).map((p) => [p, kebab(p)]));
  const attrNames = Object.values(attrFor);

  class SvelteWebComponent extends HTMLElement {
    static get observedAttributes() {
      return attrNames;
    }

    connectedCallback() {
      if (!this._component) {
        this._mountNode = useShadow ? this.attachShadow({ mode: "open" }) : this;

        // Forward the shared CSS var contract into the shadow root so
        // this component themes the same way a Leptos/Angular sibling
        // would, via inherited custom properties.
        if (useShadow) {
          const style = this._mountNode.ownerDocument.createElement("style");
          style.textContent = `:host { ${CSS_VARS.map((v) => `${v}: inherit;`).join(" ")} }`;
          this._mountNode.appendChild(style);
        }

        // Svelte components get props via constructor target + props pattern
        this._component = new SvelteComponent({
          target: this._mountNode,
          props: this._readProps(),
        });
      }
    }

    attributeChangedCallback() {
      if (this._component) {
        // Svelte components use $set() for prop updates
        this._component.$set(this._readProps());
      }
    }

    disconnectedCallback() {
      if (this._component) {
        this._component.$destroy();
        this._component = null;
      }
    }

    _readProps() {
      const props = {};
      for (const [prop, attr] of Object.entries(attrFor)) {
        props[prop] = coerce(this.getAttribute(attr), attrs[prop]);
      }

      // Custom event forwarding for Svelte's dispatch system
      props.__emit = (eventName, detail) => {
        this.dispatchEvent(new CustomEvent(eventName, { detail }));
      };

      return props;
    }
  }

  if (!customElements.get(tag)) {
    customElements.define(tag, SvelteWebComponent);
  }
}
