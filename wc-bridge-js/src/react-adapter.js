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

export function defineReactComponent(tag, ReactComponent, { attrs = {}, useShadow = true } = {}) {
  const attrNames = Object.keys(attrs);

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
        const style = document.createElement("style");
        style.textContent = `:host { ${CSS_VARS.map((v) => `${v}: inherit;`).join(" ")} }`;
        this.shadowRoot.appendChild(style);
        this._mountPoint = document.createElement("div");
        this.shadowRoot.appendChild(this._mountPoint);
      }
      this._root = createRootFor(this._mountPoint || this);
      this._render();
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
      for (const name of attrNames) {
        props[name] = coerce(this.getAttribute(name), attrs[name]);
      }
      return props;
    }

    _emit(eventName, detail) {
      this.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    _render() {
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
