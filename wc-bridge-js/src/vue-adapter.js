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
//   import { defineVueComponent } from "wc-bridge/vue-adapter.js";
//   import { createApp, h } from "vue";
//   import Counter from "./Counter.vue";
//
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

export function defineVueComponent(tag, VueComponent, { attrs = {}, useShadow = true } = {}) {
  const attrNames = Object.keys(attrs);

  class VueWebComponent extends HTMLElement {
    static get observedAttributes() {
      return attrNames;
    }

    connectedCallback() {
      const mountNode = useShadow ? this.attachShadow({ mode: "open" }) : this;

      // Forward CSS vars into shadow root for theming consistency
      if (useShadow) {
        const style = mountNode.ownerDocument.createElement("style");
        style.textContent = `:host { ${CSS_VARS.map((v) => `${v}: inherit;`).join(" ")} }`;
        mountNode.appendChild(style);
        const slot = mountNode.ownerDocument.createElement("div");
        mountNode.appendChild(slot);

        // @ts-ignore - Vue app creation
        const app = createApp({
          render: () => h(VueComponent, this._readProps()),
        });

        app.config.globalProperties.__emit = (name, detail) =>
          this.dispatchEvent(new CustomEvent(name, { detail }));

        this._app = app;
        this._mountNode = slot;
        app.mount(slot);
      }
    }

    attributeChangedCallback() {
      // No-op: props are read fresh on each render. For live updates,
      // you'd trigger a re-render here by updating a reactive proxy.
    }

    disconnectedCallback() {
      if (this._app) {
        this._app.unmount();
        this._app = null;
      }
    }

    _readProps() {
      const props = {};
      for (const name of attrNames) {
        props[name] = coerce(this.getAttribute(name), attrs[name]);
      }

      // Provide __emit callback for CustomEvent contract compliance
      props.__emit = (name, detail) =>
        this.dispatchEvent(new CustomEvent(name, { detail }));

      return props;
    }
  }

  if (!customElements.get(tag)) {
    customElements.define(tag, VueWebComponent);
  }
}
