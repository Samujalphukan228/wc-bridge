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

import { coerce, attrFor, cssVarStyle } from "./internal.js";

export function defineSvelteComponent(tag, SvelteComponent, { attrs = {}, useShadow = true } = {}) {
  const attrForMap = attrFor(attrs);
  const attrNames = Object.values(attrForMap);

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
          this._mountNode.appendChild(cssVarStyle(this._mountNode.ownerDocument));
        }

        // Svelte components get props via constructor target + props pattern
        try {
          this._component = new SvelteComponent({
            target: this._mountNode,
            props: this._readProps(),
          });
        } catch (err) {
          console.error(`[wc-bridge:svelte] failed to mount <${tag}>`, err);
        }
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
      for (const [prop, attr] of Object.entries(attrForMap)) {
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
