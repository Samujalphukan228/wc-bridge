// test/vue-adapter.test.js
// Vue adapter specifics: runtime registration, mount, update, unmount,
// and the shared CSS-var forwarding.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  setupDom,
  cleanupDom,
  makeHost,
  fakeVue,
} from "./helpers/dom.js";
import { defineVueComponent, registerVueRuntime } from "../src/vue-adapter.js";

let n = 0;
function tag() {
  return `vu-test-${++n}`;
}

const VueC = {
  render() {
    return `Vue:${this.$props.label}:${this.$props.initialCount}`;
  },
};

const ATTRS = { label: "string", initialCount: "number" };

beforeEach(() => {
  setupDom();
  registerVueRuntime(fakeVue());
});

afterEach(() => {
  cleanupDom();
});

describe("vue-adapter", () => {
  it("mounts a Vue component into shadow DOM with kebab-case props", () => {
    defineVueComponent(tag(), VueC, { attrs: ATTRS });
    const el = makeHost(`vu-test-${n}`, { label: "Hello", "initial-count": "3" });
    expect(el.shadowRoot.querySelector("div").innerHTML).toContain("Vue:Hello:3");
  });

  it("re-renders when an observed attribute changes", () => {
    defineVueComponent(tag(), VueC, { attrs: ATTRS });
    const el = makeHost(`vu-test-${n}`, { label: "A", "initial-count": "1" });
    const mount = el.shadowRoot.querySelector("div");
    // Attribute change forces the wrapper app's render to pick up new props.
    el.setAttribute("initial-count", "9");
    // The wrapper re-renders because attributeChangedCallback forces an update.
    expect(mount.innerHTML).toContain("Vue:A:9");
  });

  it("renders into light DOM when useShadow=false", () => {
    defineVueComponent(tag(), VueC, { attrs: ATTRS, useShadow: false });
    const el = makeHost(`vu-test-${n}`, { label: "L", "initial-count": "2" });
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector("div").innerHTML).toContain("Vue:L:2");
  });

  it("unmounts cleanly on disconnect", () => {
    const unmount = vi.fn();
    const vue = fakeVue();
    const createApp = vue.createApp;
    vue.createApp = (def) => {
      const app = createApp(def);
      app.unmount = () => {
        unmount();
        if (app._mountNode) app._mountNode.innerHTML = "";
      };
      return app;
    };
    registerVueRuntime(vue);

    defineVueComponent(tag(), VueC, { attrs: ATTRS });
    const el = makeHost(`vu-test-${n}`, { label: "x" });
    el.remove();
    expect(unmount).toHaveBeenCalled();
  });

  it("is a no-op without a registered runtime", () => {
    registerVueRuntime({});
    expect(() => defineVueComponent(tag(), VueC, { attrs: ATTRS })).not.toThrow();
  });
});