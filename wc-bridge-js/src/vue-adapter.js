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

let _vueRuntime;

function vueRuntime() {
  if (!_vueRuntime) _vueRuntime = globalThis.__wcVueRuntime;
  return _vueRuntime;
}

export function defineVueComponent(tag, VueComponent, { attrs = {}, useShadow = true } = {}) {
  const attrFor = Object.fromEntries(Object.keys(attrs).map((p) => [p, kebab(p)]));
  const attrNames = Object.values(attrFor);

  class VueWebComponent extends HTMLElement {
    static get observedAttributes() {
      return attrNames;
    }

    connectedCallback() {
      if (this._app) return;

      const { createApp, h, reactive } = vueRuntime();
      if (!createApp) return;

      this._mountNode = useShadow ? this.attachShadow({ mode: "open" }) : this;

      // Forward CSS vars into shadow root for theming consistency
      if (useShadow) {
        const style = this._mountNode.ownerDocument.createElement("style");
        style.textContent = `:host { ${CSS_VARS.map((v) => `${v}: inherit;`).join(" ")} }`;
        this._mountNode.appendChild(style);
      }

      const mountPoint = this._mountNode.ownerDocument.createElement("div");
      this._mountNode.appendChild(mountPoint);

      const self = this;
      const emit = (name, detail) =>
        self.dispatchEvent(new CustomEvent(name, { detail }));

      // Create a simple wrapper that renders the Vue component directly
      const app = createApp({
        render: () => h(VueComponent, {
          ...self._readProps(),
          __emit: emit
        })
      });

      this._app = app;
      app.mount(mountPoint);
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
      for (const [prop, attr] of Object.entries(attrFor)) {
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
