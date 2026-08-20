// react-adapter.js
//
// Wraps a React component as a custom element following the SAME
// contract as the Leptos #[web_component] macro (see ../CONTRACT.md):
//   - kebab-case attrs in, parsed by declared type
//   - CustomEvents out, fired on the host element, detail = plain object
//   - Shadow DOM by default, CSS vars forwarded across the boundary
//   - disconnectedCallback fully unmounts (no leaked state)
//
// Usage:
//   import { defineReactComponent } from "wc-bridge/react-adapter.js";
//   import { createRoot } from "react-dom/client";
//   import React from "react";
//
//   function Counter({ label, initial }) {
//     const [count, setCount] = React.useState(initial);
//     ...
//   }
//
//   defineReactComponent("rx-counter", Counter, {
//     attrs: { label: "string", initial: "number" },
//   });

import { coerce, attrFor, cssVarStyle } from "./internal.js";

export function defineReactComponent(tag, ReactComponent, { attrs = {}, useShadow = true } = {}) {
  // propName -> kebab-case attribute name
  const attrForMap = attrFor(attrs);
  const attrNames = Object.values(attrForMap);

  class ReactWebComponent extends HTMLElement {
    static get observedAttributes() {
      return attrNames;
    }

    connectedCallback() {
      if (useShadow && !this.shadowRoot) {
        this.attachShadow({ mode: "open" });
        // Forward the shared CSS var contract into the shadow root so
        // this component themes the same way a Leptos/Angular sibling
        // would, via inherited custom properties.
        this.shadowRoot.appendChild(cssVarStyle(document));
        this._mountPoint = document.createElement("div");
        this.shadowRoot.appendChild(this._mountPoint);
      }
      try {
        this._root = createRootFor(this._mountPoint || this);
        this._render();
      } catch (err) {
        console.error(`[wc-bridge:react] failed to mount <${tag}>`, err);
      }
    }

    attributeChangedCallback() {
      if (this._root) this._render();
    }

    disconnectedCallback() {
      this._root?.unmount();
      this._root = null;
    }

    _readProps() {
      const props = {};
      for (const [prop, attr] of Object.entries(attrForMap)) {
        props[prop] = coerce(this.getAttribute(attr), attrs[prop]);
      }
      return props;
    }

    _emit(eventName, detail) {
      this.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    _render() {
      if (!this._root) return;
      const props = this._readProps();
      // Any prop the consumer wants to expose as an outgoing event
      // should be named onXxx in the component and passed a callback
      // that calls host._emit under the hood — see counter example.
      props.__emit = (name, detail) => this._emit(name, detail);
      this._root.render(reactCreateElement(ReactComponent, props));
    }
  }

  if (!customElements.get(tag)) {
    customElements.define(tag, ReactWebComponent);
  }
}

// Lazily resolved so this file has no hard import-time dependency on
// react/react-dom versions beyond what the consuming app already uses.
let _React, _createRoot;
function reactCreateElement(...args) {
  if (!_React) _React = globalThis.__wcReact;
  return _React.createElement(...args);
}
function createRootFor(node) {
  if (!_createRoot) _createRoot = globalThis.__wcReactDOMCreateRoot;
  return _createRoot(node);
}

/**
 * Call once at app startup so the adapter can find your app's React
 * instance instead of bundling its own (avoids "two React copies").
 */
export function registerReactRuntime(React, createRoot) {
  globalThis.__wcReact = React;
  globalThis.__wcReactDOMCreateRoot = createRoot;
}
