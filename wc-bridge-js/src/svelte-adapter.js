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
  const attrNames = Object.keys(attrs);

  class SvelteWebComponent extends HTMLElement {
    static get observedAttributes() {
      return attrNames;
    }

    connectedCallback() {
      if (!this._component) {
        this._component = new SvelteComponent({
          target: useShadow ? this.attachShadow({ mode: "open" }) : this,
          anchor: this,
          props: this._readProps(),
        });
      }
    }

    attributeChangedCallback() {
      if (this._component) {
        const props = this._readProps();
        this._component.$set(props);
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
      const emit = (name, detail) =>
        this.dispatchEvent(new CustomEvent(name, { detail }));

      for (const name of attrNames) {
        props[name] = coerce(this.getAttribute(name), attrs[name]);
      }

      // Forward the shared CSS var contract into the shadow root so
      // this component themes the same way as a Leptos/Angular sibling.
      if (useShadow && !this.shadowRoot) {
        const shadow = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = `:host { ${CSS_VARS.map((v) => `${v}: inherit;`).join(" ")} }`;
        shadow.appendChild(style);
      }

      // Svelte convention: onXxx callbacks are passed as props;
      // __emit lets the component fire them as CustomEvents.
      props.__emit = emit;
      return props;
    }
  }

  if (!customElements.get(tag)) {
    customElements.define(tag, SvelteWebComponent);
  }
}
