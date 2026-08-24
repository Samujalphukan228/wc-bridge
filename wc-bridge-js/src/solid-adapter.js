// solid-adapter.js
//
// Wraps a SolidJS component as a custom element following the SAME
// contract as the Leptos #[web_component] macro (see ../CONTRACT.md):
//   - kebab-case attrs in, parsed by declared type
//   - CustomEvents out, fired on the host element, detail = plain object
//   - Shadow DOM by default, CSS vars forwarded across the boundary
//   - disconnectedCallback fully unmounts (no leaked state)
//
// Usage:
//   import { defineSolidComponent, registerSolidRuntime } from "wc-bridge/solid-adapter.js";
//   import { render } from "solid-js/web";
//   import { createStore } from "solid-js/store";
//
//   registerSolidRuntime({ render, createStore });
//   defineSolidComponent("sd-counter", Counter, {
//     attrs: { label: "string", initial: "number" },
//   });

import { coerce, attrFor, cssVarStyle } from "./internal.js";

let _solidRuntime;

function solidRuntime() {
  if (!_solidRuntime) _solidRuntime = globalThis.__wcSolidRuntime;
  return _solidRuntime;
}

export function defineSolidComponent(tag, Component, { attrs = {}, useShadow = true, runtime } = {}) {
  const attrForMap = attrFor(attrs);
  const attrNames = Object.values(attrForMap);

  class SolidWebComponent extends HTMLElement {
    static get observedAttributes() {
      return attrNames;
    }

    connectedCallback() {
      if (this._dispose) return;

      // Per-definition `runtime` option takes precedence over the
      // registered/global runtime.
      const { render } = runtime || solidRuntime();
      if (!render) return;

      this._mountNode = useShadow ? this.attachShadow({ mode: "open" }) : this;

      // Forward CSS vars into shadow root for theming consistency
      if (useShadow) {
        this._mountNode.appendChild(cssVarStyle(this._mountNode.ownerDocument));
      }

      const mountPoint = this._mountNode.ownerDocument.createElement("div");
      this._mountNode.appendChild(mountPoint);

      this._mountPoint = mountPoint;

      const props = this._readProps();

      // SolidJS render with reactive props
      try {
        this._dispose = render(() => Component(props), mountPoint);
      } catch (err) {
        console.error(`[wc-bridge:solid] failed to mount <${tag}>`, err);
      }
    }

    attributeChangedCallback() {
      if (this._mountPoint) {
        // Re-read props for Solid.js — triggers re-render through reactivity
        this._props = this._readProps();
      }
    }

    disconnectedCallback() {
      if (this._dispose) {
        this._dispose();
        this._dispose = null;
      }
      if (this._mountNode) {
        this._mountNode.innerHTML = "";
      }
    }

    _readProps() {
      const props = {};
      for (const [prop, attr] of Object.entries(attrForMap)) {
        props[prop] = coerce(this.getAttribute(attr), attrs[prop]);
      }

      props.__emit = (name, detail) =>
        this.dispatchEvent(new CustomEvent(name, { detail }));

      return props;
    }
  }

  if (!customElements.get(tag)) {
    customElements.define(tag, SolidWebComponent);
  }
}

/**
 * Call once at app startup so the adapter can find your app's Solid
 * instance instead of bundling its own.
 */
export function registerSolidRuntime(solidModule) {
  globalThis.__wcSolidRuntime = solidModule;
  _solidRuntime = solidModule;
}
