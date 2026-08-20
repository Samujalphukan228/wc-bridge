// preact-adapter.js
//
// Wraps a Preact component as a custom element following the SAME
// contract as the Leptos #[web_component] macro (see ../CONTRACT.md):
//   - kebab-case attrs in, parsed by declared type
//   - CustomEvents out, fired on the host element, detail = plain object
//   - Shadow DOM by default, CSS vars forwarded across the boundary
//   - disconnectedCallback fully unmounts (no leaked state)
//
// Usage:
//   import { definePreactComponent, registerPreactRuntime } from "wc-bridge/preact-adapter.js";
//   import * as preact from "preact";
//   import { render } from "preact/compat";
//
//   registerPreactRuntime(preact, render);
//   definePreactComponent("pc-counter", Counter, {
//     attrs: { label: "string", initial: "number" },
//   });

import { coerce, attrFor, cssVarStyle } from "./internal.js";

let _preact, _renderFn;

export function definePreactComponent(tag, PreactComponent, { attrs = {}, useShadow = true } = {}) {
  const attrForMap = attrFor(attrs);
  const attrNames = Object.values(attrForMap);

  class PreactWebComponent extends HTMLElement {
    static get observedAttributes() {
      return attrNames;
    }

    connectedCallback() {
      if (!this._root) {
        this._mountNode = useShadow ? this.attachShadow({ mode: "open" }) : this;

        // Forward CSS vars into shadow root for theming consistency
        if (useShadow) {
          this._mountNode.appendChild(cssVarStyle(this._mountNode.ownerDocument));
        }

        const mountPoint = this._mountNode.ownerDocument.createElement("div");
        this._mountNode.appendChild(mountPoint);
        this._mountPoint = mountPoint;

        this._render();
      }
    }

    attributeChangedCallback() {
      if (this._root) {
        this._render();
      }
    }

    disconnectedCallback() {
      if (this._root) {
        this._root.unmount();
        this._root = null;
      }
    }

    _readProps() {
      const props = {};
      for (const [prop, attr] of Object.entries(attrForMap)) {
        props[prop] = coerce(this.getAttribute(attr), attrs[prop]);
      }

      // Custom event forwarding
      props.__emit = (name, detail) =>
        this.dispatchEvent(new CustomEvent(name, { detail }));

      return props;
    }

    _render() {
      const render = globalThis.__wcPreactRender || _renderFn;
      if (!render) return;

      const props = this._readProps();
      const { createElement } = globalThis.__wcPreact || _preact;
      if (!createElement) return;

      try {
        // Preact uses a similar createRoot pattern to React 18
        const root = render(createElement(PreactComponent, props), this._mountPoint);
        this._root = { unmount: root };
      } catch (err) {
        console.error(`[wc-bridge:preact] failed to mount <${tag}>`, err);
      }
    }
  }

  if (!customElements.get(tag)) {
    customElements.define(tag, PreactWebComponent);
  }
}

/**
 * Call once at app startup so the adapter can find your app's Preact
 * instance instead of bundling its own (avoids "two copies" issues).
 */
export function registerPreactRuntime(preactModule, renderFunction) {
  globalThis.__wcPreact = preactModule;
  globalThis.__wcPreactRender = renderFunction;
  _preact = preactModule;
  _renderFn = renderFunction;
}
