// vue-adapter.js
//
// Wraps a Vue component as a custom element following the SAME
// contract as the Leptos #[web_component] macro (see ../CONTRACT.md):
//   - kebab-case attrs in, parsed by declared type
//   - CustomEvents out, fired on the host element, detail = plain object
//   - Shadow DOM by default, CSS vars forwarded across the boundary
//   - disconnectedCallback fully unmounts (no leaked state)
//
// Usage:
//   import { defineVueComponent, registerVueRuntime } from "wc-bridge/vue-adapter.js";
//   import { createApp, h, reactive, watch } from "vue";
//   import Counter from "./Counter.vue";
//
//   registerVueRuntime({ createApp, h, reactive, watch });
//   defineVueComponent("vu-counter", Counter, {
//     attrs: { label: "string", initial: "number" },
//   });

import { coerce, attrFor, cssVarStyle } from "./internal.js";

let _vueRuntime;

function vueRuntime() {
  if (!_vueRuntime) _vueRuntime = globalThis.__wcVueRuntime;
  return _vueRuntime;
}

export function defineVueComponent(tag, VueComponent, { attrs = {}, useShadow = true } = {}) {
  const attrForMap = attrFor(attrs);
  const attrNames = Object.values(attrForMap);

  class VueWebComponent extends HTMLElement {
    static get observedAttributes() {
      return attrNames;
    }

    connectedCallback() {
      if (this._app) return;

      const { createApp, h } = vueRuntime();
      if (!createApp) return;

      this._mountNode = useShadow ? this.attachShadow({ mode: "open" }) : this;

      // Forward CSS vars into shadow root for theming consistency
      if (useShadow) {
        this._mountNode.appendChild(cssVarStyle(this._mountNode.ownerDocument));
      }

      const mountPoint = this._mountNode.ownerDocument.createElement("div");
      this._mountNode.appendChild(mountPoint);

      const self = this;
      const emit = (name, detail) =>
        self.dispatchEvent(new CustomEvent(name, { detail }));

      // Create a simple wrapper that renders the Vue component directly
      try {
        const app = createApp({
          render: () => h(VueComponent, {
            ...self._readProps(),
            __emit: emit
          })
        });

        this._app = app;
        app.mount(mountPoint);
      } catch (err) {
        console.error(`[wc-bridge:vue] failed to mount <${tag}>`, err);
      }
    }

    attributeChangedCallback() {
      if (this._app) {
        // Force Vue to re-render by triggering a reactive update
        const newProps = this._readProps();
        // Store reference for render function to pick up
        this._lastProps = newProps;
        // Mark component as needing update
        this._app._instance?.proxy?.$forceUpdate?.();
      }
    }

    disconnectedCallback() {
      if (this._app) {
        this._app.unmount();
        this._app = null;
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
      return props;
    }
  }

  if (!customElements.get(tag)) {
    customElements.define(tag, VueWebComponent);
  }
}

/**
 * Call once at app startup so the adapter can find your app's Vue
 * instance instead of bundling its own.
 */
export function registerVueRuntime(vueModule) {
  globalThis.__wcVueRuntime = vueModule;
  _vueRuntime = vueModule;
}
