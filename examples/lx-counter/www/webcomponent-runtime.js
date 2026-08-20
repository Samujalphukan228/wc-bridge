// webcomponent-runtime.js
//
// Shared, generic runtime for every Leptos component built with
// `#[web_component("tag-name")]`. You never write per-component JS —
// this file reads the __meta_* descriptor exported from wasm and does
// customElements.define() generically for any of them.
//
// Usage (per wasm module):
//   import init, * as wasmExports from "./my_leptos_components.js";
//   import { registerAll } from "./webcomponent-runtime.js";
//   await init();
//   registerAll(wasmExports, ["__meta_CounterButton", "__meta_Toggle"]);

export function registerAll(wasmExports, metaFnNames) {
  for (const metaFnName of metaFnNames) {
    const metaJson = wasmExports[metaFnName]();
    const meta = JSON.parse(metaJson);
    registerOne(wasmExports, meta);
  }
}

function registerOne(wasmExports, meta) {
  const { tag, mount, update, unmount, attrs } = meta;

  class LeptosWebComponent extends HTMLElement {
    static get observedAttributes() {
      return attrs;
    }

    connectedCallback() {
      const props = this._readProps();
      wasmExports[mount](this, JSON.stringify(props));
    }

    attributeChangedCallback() {
      if (!this.isConnected) return;
      const props = this._readProps();
      wasmExports[update](this, JSON.stringify(props));
    }

    disconnectedCallback() {
      wasmExports[unmount](this);
    }

    _readProps() {
      const out = {};
      for (const name of attrs) {
        out[name] = this.getAttribute(name) ?? "";
      }
      return out;
    }
  }

  if (!customElements.get(tag)) {
    customElements.define(tag, LeptosWebComponent);
  }
}
