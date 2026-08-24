// test/preact-adapter.test.js
// Preact adapter: runtime registration + scoped injection, mount,
// update, unmount.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupDom, cleanupDom, makeHost } from "./helpers/dom.js";
import {
  definePreactComponent,
  registerPreactRuntime,
} from "../src/preact-adapter.js";

let n = 0;
function tag() {
  return `pc-test-${++n}`;
}

const ATTRS = { label: "string", initialCount: "number" };

function fakePreact() {
  return {
    preact: {
      createElement: (Comp, props) => ({ Comp, props }),
    },
    render: (vnode, node) => {
      const p = vnode.props || {};
      node.innerHTML = `Preact:${p.label}:${p.initialCount}`;
      return vi.fn();
    },
  };
}

beforeEach(() => {
  setupDom();
  delete globalThis.__wcPreact;
  delete globalThis.__wcPreactRender;
});

afterEach(() => {
  cleanupDom();
});

describe("preact-adapter", () => {
  it("mounts via registered runtime into shadow DOM", () => {
    registerPreactRuntime(fakePreact().preact, fakePreact().render);
    definePreactComponent(tag(), function Counter() {}, { attrs: ATTRS });
    const el = makeHost(`pc-test-${n}`, { label: "Hi", "initial-count": "2" });
    expect(el.shadowRoot.querySelector("div").innerHTML).toBe("Preact:Hi:2");
  });

  it("accepts a scoped runtime option", () => {
    definePreactComponent(tag(), function Counter() {}, {
      attrs: ATTRS,
      runtime: fakePreact(),
    });
    const el = makeHost(`pc-test-${n}`, { label: "Scoped" });
    expect(el.shadowRoot.querySelector("div").innerHTML).toBe("Preact:Scoped:undefined");
    // Scoped injection must not have touched the global registry.
    expect(globalThis.__wcPreact).toBeUndefined();
  });

  it("re-renders on attribute change", () => {
    registerPreactRuntime(fakePreact().preact, fakePreact().render);
    definePreactComponent(tag(), function Counter() {}, { attrs: ATTRS });
    const el = makeHost(`pc-test-${n}`, { label: "A", "initial-count": "1" });
    el.setAttribute("label", "B");
    expect(el.shadowRoot.querySelector("div").innerHTML).toBe("Preact:B:1");
  });

  it("unmounts cleanly on disconnect", () => {
    const renderSpy = fakePreact().render;
    registerPreactRuntime(fakePreact().preact, renderSpy);
    definePreactComponent(tag(), function Counter() {}, { attrs: ATTRS });
    const el = makeHost(`pc-test-${n}`, { label: "x" });
    const unmount = el._root.unmount;
    el.remove();
    expect(unmount).toHaveBeenCalled();
  });
});
