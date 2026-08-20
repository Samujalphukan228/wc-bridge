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

let _solidRuntime;

function solidRuntime() {
  if (!_solidRuntime) _solidRuntime = globalThis.__wcSolidRuntime;
  return _solidRuntime;
}

export function defineSolidComponent(tag, Component, { attrs = {}, useShadow = true } = {}) {
  const attrNames = Object.keys(attrs);

  class SolidWebComponent extends HTMLElement {
    static get observedAttributes() {
      return attrNames;
    }

    connectedCallback() {
      if (this._dispose) return;

      const { render } = solidRuntime();
      if (!render) return;

      this._mountNode = useShadow ? this.attachShadow({ mode: "open" }) : this;

      // Forward CSS vars into shadow root for theming consistency
      if (useShadow) {
        const style = this._mountNode.ownerDocument.createElement("style");
        style.textContent = `:host { ${CSS_VARS.map((v) => `${v}: inherit;`).join(" ")} }`;
        this._mountNode.appendChild(style);
      }

      const mountPoint = this._mountNode.ownerDocument.createElement("div");
      this._mountNode.appendChild(mountPoint);

      this._mountPoint = mountPoint;

      const self = this;
      const props = this._readProps();

      // SolidJS render with reactive props
      this._dispose = render(() => Component(props), mountPoint);
    }

    attributeChangedCallback() {
      if (this._mountPoint) {
        // Re-read props — Solid components re-render reactively
        const props = this._readProps();
        Object.assign(this._props, props);
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
      const self = this;
      for (const name of attrNames) {
        props[name] = coerce(this.getAttribute(name), attrs[name]);
      }

      props.__emit = (name, detail) =>
        self.dispatchEvent(new CustomEvent(name, { detail }));

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
