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
//
// Extras beyond plain mounting:
//   - Slots: original light-DOM children are captured before mount and
//     cloned into `<element data-wc-slot="name">` drop points rendered
//     by the component (`slot="name"` on a child selects its slot;
//     everything else lands in the default slot). See CONTRACT.md §7.
//   - Strict mode: adding `data-wc-strict` to an element turns silent
//     problems (unknown attributes, failed mounts) into console errors.
//   - Duplicate tag registration logs an error instead of skipping
//     silently.

const RESERVED_ATTRS = new Set(["data-wc-id", "data-wc-strict", "slot"]);

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
      this._captureChildren();

      if (this._strict === undefined) {
        this._strict = this.hasAttribute("data-wc-strict");
        if (this._strict) this._warnUnknownAttrs();
      }

      const props = this._readProps();
      try {
        wasmExports[mount](this, JSON.stringify(props));
      } catch (err) {
        this._fail(`mount failed`, err);
        return;
      }
      this._fillSlots();
    }

    attributeChangedCallback() {
      if (!this.isConnected) return;
      const props = this._readProps();
      try {
        wasmExports[update](this, JSON.stringify(props));
      } catch (err) {
        this._fail(`update failed`, err);
        return;
      }
      this._fillSlots();
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

    // Capture the page author's children once, before first mount, so
    // they survive remounts and reconnects. They stay in memory only —
    // the component's rendered output owns the light DOM afterwards.
    _captureChildren() {
      if (this._wcChildren) return;
      const frag = this.ownerDocument.createDocumentFragment();
      while (this.firstChild) frag.appendChild(this.firstChild);
      this._wcChildren = frag;
    }

    // Clone captured children into the component's drop points.
    // Placeholders are emptied first so repeated mounts never duplicate.
    _fillSlots() {
      if (!this._wcChildren) return;

      const named = Object.create(null);
      const defaults = [];
      for (const node of Array.from(this._wcChildren.childNodes)) {
        const name =
          node.nodeType === Node.ELEMENT_NODE ? node.getAttribute("slot") || "" : "";
        (named[name] ||= []).push(node.cloneNode(true));
      }

      const placeholders = this.querySelectorAll("[data-wc-slot]");
      placeholders.forEach((el) => {
        el.textContent = "";
        const name = el.getAttribute("data-wc-slot") || "";
        for (const node of named[name] || []) el.appendChild(node.cloneNode(true));
      });
      void defaults;
    }

    _warnUnknownAttrs() {
      const unknown = Array.from(this.attributes)
        .map((a) => a.name)
        .filter((n) => !attrs.includes(n) && !RESERVED_ATTRS.has(n));
      if (unknown.length) {
        console.error(
          `[wc-bridge] <${tag}> strict: unknown attribute(s) ${unknown.join(", ")} — ` +
            `declared attrs are: ${attrs.join(", ")}`
        );
      }
    }

    _fail(msg, err) {
      const line = `[wc-bridge] <${tag}> ${msg}`;
      if (this._strict) console.error(line, err);
      else console.warn(line, err);
    }
  }

  if (customElements.get(tag)) {
    console.error(
      `[wc-bridge] <${tag}> is already registered — skipping duplicate ` +
        `definition. Use a different vendor prefix per bundle.`
    );
    return;
  }
  customElements.define(tag, LeptosWebComponent);
}
