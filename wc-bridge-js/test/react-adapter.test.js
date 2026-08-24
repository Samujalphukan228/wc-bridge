// test/react-adapter.test.js
// React adapter specifics: runtime registration + scoped injection,
// mount, update, unmount, light-DOM mode.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  setupDom,
  cleanupDom,
  makeHost,
} from "./helpers/dom.js";
import {
  defineReactComponent,
  registerReactRuntime,
} from "../src/react-adapter.js";

let n = 0;
function tag() {
  return `rx-test-${++n}`;
}

const ATTRS = { label: "string", initialCount: "number" };

function fakeReact() {
  return {
    React: {
      createElement: (Comp, props) => ({ Comp, props }),
    },
    createRoot: (node) => ({
      render(vnode) {
        const p = vnode.props || {};
        node.innerHTML = `React:${p.label}:${p.initialCount}`;
        vnode.props?.__emit?.("mounted", {});
      },
      unmount: vi.fn(() => {
        node.innerHTML = "";
      }),
    }),
  };
}

beforeEach(() => {
  setupDom();
});

afterEach(() => {
  cleanupDom();
});

describe("react-adapter", () => {
  it("mounts via registered runtime into shadow DOM", () => {
    const rt = fakeReact();
    registerReactRuntime(rt.React, rt.createRoot);
    defineReactComponent(tag(), function Counter() {}, { attrs: ATTRS });
    const el = makeHost(`rx-test-${n}`, { label: "Hello", "initial-count": "3" });
    expect(el.shadowRoot.querySelector("div").innerHTML).toBe("React:Hello:3");
  });

  it("accepts a scoped runtime option without touching globals", () => {
    delete globalThis.__wcReact;
    delete globalThis.__wcReactDOMCreateRoot;
    const rt = fakeReact();
    defineReactComponent(tag(), function Counter() {}, {
      attrs: ATTRS,
      runtime: rt,
    });
    const el = makeHost(`rx-test-${n}`, { label: "Scoped", "initial-count": "1" });
    expect(el.shadowRoot.querySelector("div").innerHTML).toBe("React:Scoped:1");
    expect(globalThis.__wcReact).toBeUndefined();
  });

  it("re-renders when an observed attribute changes", () => {
    const rt = fakeReact();
    registerReactRuntime(rt.React, rt.createRoot);
    defineReactComponent(tag(), function Counter() {}, { attrs: ATTRS });
    const el = makeHost(`rx-test-${n}`, { label: "A", "initial-count": "1" });
    el.setAttribute("initial-count", "9");
    expect(el.shadowRoot.querySelector("div").innerHTML).toBe("React:A:9");
  });

  it("unmounts cleanly on disconnect", () => {
    const rt = fakeReact();
    registerReactRuntime(rt.React, rt.createRoot);
    defineReactComponent(tag(), function Counter() {}, { attrs: ATTRS });
    const el = makeHost(`rx-test-${n}`, { label: "x" });
    const root = el._root;
    el.remove();
    expect(root.unmount).toHaveBeenCalled();
  });

  it("renders into light DOM when useShadow=false", () => {
    const rt = fakeReact();
    registerReactRuntime(rt.React, rt.createRoot);
    defineReactComponent(tag(), function Counter() {}, {
      attrs: ATTRS,
      useShadow: false,
    });
    const el = makeHost(`rx-test-${n}`, { label: "L" });
    expect(el.shadowRoot).toBeNull();
    expect(el.innerHTML).toBe("React:L:undefined");
  });
});
