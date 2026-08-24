// test/svelte-adapter.test.js
// Svelte adapter: constructor/target mounting, $set updates,
// $destroy teardown.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setupDom, cleanupDom, makeHost } from "./helpers/dom.js";
import { defineSvelteComponent } from "../src/svelte-adapter.js";

let n = 0;
function tag() {
  return `sv-test-${++n}`;
}

const ATTRS = { label: "string", initialCount: "number" };

function FakeSvelteComponent({ target, props }) {
  this.$props = { ...props };
  this.$target = target;
  this.render = () => {
    this.$target.innerHTML = `Svelte:${this.$props.label}:${this.$props.initialCount}`;
  };
  this.render();
}
FakeSvelteComponent.prototype.$set = function (props) {
  Object.assign(this.$props, props);
  this.render();
};
FakeSvelteComponent.prototype.$destroy = vi.fn(function () {
  this.$target.innerHTML = "";
});

beforeEach(() => {
  setupDom();
});

afterEach(() => {
  cleanupDom();
});

describe("svelte-adapter", () => {
  it("mounts via constructor into shadow DOM with coerced props", () => {
    defineSvelteComponent(tag(), FakeSvelteComponent, { attrs: ATTRS });
    const el = makeHost(`sv-test-${n}`, { label: "Hi", "initial-count": "4" });
    expect(el.shadowRoot.innerHTML).toContain("Svelte:Hi:4");
  });

  it("updates via $set on attribute change", () => {
    defineSvelteComponent(tag(), FakeSvelteComponent, { attrs: ATTRS });
    const el = makeHost(`sv-test-${n}`, { label: "A" });
    el.setAttribute("label", "B");
    expect(el.shadowRoot.innerHTML).toContain("Svelte:B:");
  });

  it("destroys cleanly on disconnect", () => {
    defineSvelteComponent(tag(), FakeSvelteComponent, { attrs: ATTRS });
    const el = makeHost(`sv-test-${n}`, { label: "x" });
    const comp = el._component;
    const spy = vi.spyOn(comp, "$destroy");
    el.remove();
    expect(spy).toHaveBeenCalled();
  });

  it("renders into light DOM when useShadow=false", () => {
    defineSvelteComponent(tag(), FakeSvelteComponent, {
      attrs: ATTRS,
      useShadow: false,
    });
    const el = makeHost(`sv-test-${n}`, { label: "L" });
    expect(el.shadowRoot).toBeNull();
    expect(el.innerHTML).toContain("Svelte:L:");
  });
});
