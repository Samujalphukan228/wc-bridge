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
  const attrNames = Object.keys(attrs);

  class VueWebComponent extends HTMLElement {
    static get observedAttributes() {
      return attrNames;
    }

    connectedCallback() {
      if (this._app) return;

      const { createApp, h, reactive, watch } = vueRuntime();
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

      // Vue 3 component wrapper with reactive props
      const app = createApp({
        setup() {
          const props = reactive(self._readProps());

          // Watch for external prop updates and sync them
          watch(
            () => self._externalProps,
            (newProps) => {
              if (newProps) {
                Object.keys(newProps).forEach((key) => {
                  props[key] = newProps[key];
                });
              }
            }
          );

          return () => h(VueComponent, { ...props, __emit: emit });
        },
      });

      app.config.globalProperties.__emit = emit;
      this._app = app;
      app.mount(mountPoint);
    }

    attributeChangedCallback() {
      // Trigger re-render by syncing external props
      this._externalProps = this._readProps();
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
      for (const name of attrNames) {
        props[name] = coerce(this.getAttribute(name), attrs[name]);
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
