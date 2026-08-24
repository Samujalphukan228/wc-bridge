// test/solid-adapter.test.js
// Solid adapter: runtime registration + scoped injection, mount,
// update, dispose.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupDom, cleanupDom, makeHost } from "./helpers/dom.js";
import {
  defineSolidComponent,
  registerSolidRuntime,
} from "../src/solid-adapter.js";

let n = 0;
function tag() {
  return `sd-test-${++n}`;
}

const ATTRS = { label: "string", initialCount: "number" };

function fakeSolid() {
  return {
    render: (renderFn, node) => {
      // Adapter calls render(() => Component(props), mountPoint).
      node.innerHTML = `Solid:${renderFn()}`;
      return vi.fn();
    },
  };
}

function Component(props) {
  return `${props.label}:${props.initialCount}`;
}

beforeEach(() => {
  setupDom();
  delete globalThis.__wcSolidRuntime;
});

afterEach(() => {
  cleanupDom();
});

describe("solid-adapter", () => {
  it("mounts via registered runtime into shadow DOM", () => {
    registerSolidRuntime(fakeSolid());
    defineSolidComponent(tag(), Component, { attrs: ATTRS });
    const el = makeHost(`sd-test-${n}`, { label: "Hi", "initial-count": "5" });
    expect(el.shadowRoot.querySelector("div").innerHTML).toBe("Solid:Hi:5");
  });

  it("accepts a scoped runtime option", () => {
    defineSolidComponent(tag(), Component, { attrs: ATTRS, runtime: fakeSolid() });
    const el = makeHost(`sd-test-${n}`, { label: "Scoped" });
    expect(el.shadowRoot.querySelector("div").innerHTML).toBe("Solid:Scoped:undefined");
  });

  it("re-reads props on attribute change and disposes on disconnect", () => {
    const solid = fakeSolid();
    registerSolidRuntime(solid);
    defineSolidComponent(tag(), Component, { attrs: ATTRS });
    const el = makeHost(`sd-test-${n}`, { label: "A" });
    const dispose = el._dispose;
    el.setAttribute("initial-count", "7");
    expect(el._props.initialCount).toBe(7);
    el.remove();
    expect(dispose).toHaveBeenCalled();
  });

  it("is a no-op when the registered runtime has no render", () => {
    registerSolidRuntime({});
    expect(() =>
      defineSolidComponent(tag(), Component, { attrs: ATTRS })
    ).not.toThrow();
    const el = makeHost(`sd-test-${n}`, { label: "x" });
    expect(el._mountPoint).toBeUndefined();
  });
});
