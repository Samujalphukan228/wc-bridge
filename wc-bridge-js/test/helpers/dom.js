// test/helpers/dom.js
// Shared jsdom environment for adapter tests. jsdom supports custom
// elements and open shadow roots, but not everything (SVG parsing is
// incomplete), so we mirror the stubs used by the browser smoke tests.

import { JSDOM } from "jsdom";

let dom;

export function setupDom(body = "<!doctype html><html><body></body></html>") {
  dom = new JSDOM(body, {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });

  const w = dom.window;
  const g = globalThis;

  // Mirror the browser globals the adapters touch.
  for (const key of [
    "window",
    "document",
    "customElements",
    "HTMLElement",
    "Element",
    "Node",
    "CustomEvent",
    "Event",
    "ShadowRoot",
    "DocumentFragment",
    "Document",
    "MutationObserver",
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame",
  ]) {
    if (key in w) g[key] = w[key];
  }

  // jsdom lacks these; stubs used by Vue/React internals.
  if (!g.SVGElement) g.SVGElement = class extends g.Element {};
  if (!g.HTMLUnknownElement) g.HTMLUnknownElement = class extends g.HTMLElement {};

  return dom;
}

export function getDom() {
  return dom;
}

export function makeHost(tag, attrs = {}) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  document.body.appendChild(el);
  return el;
}

export function cleanupDom() {
  dom?.window.close();
  dom = undefined;
}

// --- Minimal fake runtimes for the framework adapters ---------------------
// Each adapter only needs a tiny slice of its framework's API. These
// fakes exercise the real adapter code paths without pulling in the
// actual framework.

export function fakeReact() {
  const state = new Map();
  const createElement = (Comp, props, ...children) => ({ Comp, props, children });
  const createRoot = (node) => ({
    render: (vnode) => {
      node.__vnode = vnode;
      const Comp = vnode?.Comp;
      if (typeof Comp === "function") {
        const out = Comp(vnode.props || {});
        node.innerHTML = typeof out === "string" ? out : String(out?.children?.[0] ?? out ?? "");
      }
    },
    unmount: () => {
      node.innerHTML = "";
      node.__vnode = undefined;
    },
  });
  const useState = (initial) => {
    let key = state.size;
    state.set(key, state.has(key) ? state.get(key) : initial);
    const set = (v) => state.set(key, typeof v === "function" ? v(state.get(key)) : v);
    return [state.get(key), set];
  };
  return { createElement, createRoot, useState, _state: state };
}

export function fakeSolid() {
  const render = (fn, mount) => {
    const out = fn();
    if (typeof out === "string" || typeof out === "number") {
      mount.innerHTML = String(out);
    } else if (out && typeof out === "object" && "mount" in out) {
      out.mount(mount);
    }
    return () => {};
  };
  return { render, createStore: () => [{}, () => {}] };
}

export function fakeVue() {
  const h = (type, props, ...children) => ({ type, props, children });
  const createApp = (def) => {
    let container = null;
    // The adapter's wrapper is `render: () => h(VueComponent, props, __emit)`.
    // Mimic Vue: take the vnode's component + props, then run the
    // component's own render with $props bound (like Vue's instance).
    const renderInto = () => {
      if (!container) return;
      const vnode = def.render ? def.render() : def;
      const Comp = vnode?.type;
      const props = vnode?.props || {};
      if (Comp && typeof Comp.render === "function") {
        const out = Comp.render.call({ $props: props });
        container.innerHTML = typeof out === "string" ? out : String(out ?? "");
      } else {
        container.innerHTML = props?.label || "";
      }
    };
    const app = {
      mount: (el) => {
        container = el;
        renderInto();
        return el;
      },
      unmount: () => {
        if (container) container.innerHTML = "";
        container = null;
      },
      _instance: null,
    };
    // Vue adapters call app._instance.proxy.$forceUpdate() to re-render;
    // our fake exposes the same shape so attribute updates work.
    app._instance = {
      proxy: {
        $forceUpdate: () => renderInto(),
      },
    };
    return app;
  };
  return { h, createApp };
}

export function fakeSvelte(props) {
  const inst = {
    target: props.target,
    props: props.props || {},
    _render() {
      const label = this.props.label ?? "";
      const initial = this.props.initialCount ?? 0;
      const text = `${label}:${initial}`;
      // The adapter mounts with target = the shadow root.
      this.target.innerHTML = text;
    },
    $set(newProps) {
      this.props = { ...this.props, ...newProps };
      this._render();
    },
    $destroy() {
      if (this.target) this.target.innerHTML = "";
    },
  };
  inst._render();
  return inst;
}

export function fakePreact() {
  const createElement = (Comp, props, ...children) => ({ Comp, props, children });
  const render = (vnode, container) => {
    const Comp = vnode?.Comp;
    if (typeof Comp === "function") {
      const out = Comp(vnode.props || {});
      container.innerHTML = typeof out === "string" ? out : String(out ?? "");
    }
    return () => {
      container.innerHTML = "";
    };
  };
  return { createElement, render };
}

export function fakeAngularElementCtor(attrs = []) {
  return class FakeAngularElement extends HTMLElement {
    static get observedAttributes() {
      return attrs;
    }
    connectedCallback() {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = "angular";
    }
    disconnectedCallback() {}
  };
}

export const fakeAngularCreateCustomElement = (component, { injector }) => {
  if (!injector) throw new Error("missing injector");
  const Ctor = fakeAngularElementCtor(component._attrs || []);
  return Ctor;
};