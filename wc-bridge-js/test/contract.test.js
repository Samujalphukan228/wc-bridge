// test/contract.test.js
// Verifies the SHARED web-component contract (see ../CONTRACT.md) holds
// across every framework adapter, using the real adapter code with fake
// framework runtimes.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  setupDom,
  cleanupDom,
  makeHost,
  fakeReact,
  fakeSolid,
  fakeVue,
  fakeSvelte,
  fakePreact,
  fakeAngularCreateCustomElement,
} from "./helpers/dom.js";
import { defineReactComponent, registerReactRuntime } from "../src/react-adapter.js";
import { defineSolidComponent, registerSolidRuntime } from "../src/solid-adapter.js";
import { registerVueRuntime } from "../src/vue-adapter.js";
import { defineSvelteComponent } from "../src/svelte-adapter.js";
import { definePreactComponent, registerPreactRuntime } from "../src/preact-adapter.js";
import { defineAngularComponent } from "../src/angular-adapter.js";

// ---- fixtures --------------------------------------------------------------

const ReactC = ({ label = "", initialCount = 0, __emit }) => ({
  type: "span",
  props: null,
  children: [`${label}:${initialCount}`],
});

const SolidC = (props) => {
  const { label = "", initialCount = 0, __emit } = props;
  return `${label}:${initialCount}`;
};

const SvelteC = fakeSvelte;

const PreactC = (props) => {
  const { label = "", initialCount = 0, __emit } = props;
  return `${label}:${initialCount}`;
};

const ATTRS = { label: "string", initialCount: "number" };

// Each adapter gets registered once per environment; jsdom's registry is
// per-test so we re-register with a unique tag each time.
let n = 0;
function tag(prefix) {
  return `${prefix}-contract-${++n}`;
}

beforeEach(() => {
  setupDom();
  const react = fakeReact();
  registerReactRuntime(react, react.createRoot);
  registerSolidRuntime(fakeSolid());
  registerVueRuntime(fakeVue());
  registerPreactRuntime(fakePreact(), fakePreact().render);
});

afterEach(() => {
  cleanupDom();
});

// ---- shared expectations ---------------------------------------------------

function content(el) {
  // React/Vue/Solid/Preact mount into a div inside the shadow root;
  // Svelte mounts directly into the shadow root. Return whatever text
  // was rendered (host itself when useShadow=false).
  const root = el.shadowRoot;
  if (!root) return el.innerHTML;
  const div = root.querySelector("div");
  return div ? div.innerHTML : root.innerHTML;
}

describe("contract: kebab-case attribute mapping", () => {
  it("React reads initialCount via initial-count and coerces to number", () => {
    defineReactComponent(tag("rx"), ReactC, { attrs: ATTRS });
    const el = makeHost(`rx-contract-${n}`, { "initial-count": "4", label: "Hi" });
    expect(content(el)).toContain("Hi:4");
  });

  it("Solid reads initialCount via initial-count and coerces to number", () => {
    defineSolidComponent(tag("sd"), SolidC, { attrs: ATTRS });
    const el = makeHost(`sd-contract-${n}`, { "initial-count": "4", label: "Hi" });
    expect(content(el)).toContain("Hi:4");
  });

  it("Svelte reads initialCount via initial-count and coerces to number", () => {
    defineSvelteComponent(tag("sv"), SvelteC, { attrs: ATTRS });
    const el = makeHost(`sv-contract-${n}`, { "initial-count": "4", label: "Hi" });
    expect(content(el)).toContain("Hi:4");
  });

  it("Preact reads initialCount via initial-count and coerces to number", () => {
    definePreactComponent(tag("pc"), PreactC, { attrs: ATTRS });
    const el = makeHost(`pc-contract-${n}`, { "initial-count": "4", label: "Hi" });
    expect(content(el)).toContain("Hi:4");
  });
});

describe("contract: attribute updates re-render", () => {
  it("React re-renders when an observed attribute changes", () => {
    defineReactComponent(tag("rx"), ReactC, { attrs: ATTRS });
    const el = makeHost(`rx-contract-${n}`, { "initial-count": "1", label: "A" });
    expect(content(el)).toContain("A:1");
    el.setAttribute("initial-count", "9");
    expect(content(el)).toContain("A:9");
  });

  it("Svelte re-renders via $set when an observed attribute changes", () => {
    defineSvelteComponent(tag("sv"), SvelteC, { attrs: ATTRS });
    const el = makeHost(`sv-contract-${n}`, { "initial-count": "1", label: "A" });
    expect(content(el)).toContain("A:1");
    el.setAttribute("initial-count", "9");
    expect(content(el)).toContain("A:9");
  });
});

describe("contract: useShadow option", () => {
  it("uses the host element itself (light DOM) when useShadow=false", () => {
    defineReactComponent(tag("rx"), ReactC, { attrs: ATTRS, useShadow: false });
    const el = makeHost(`rx-contract-${n}`, { "initial-count": "2", label: "L" });
    expect(el.shadowRoot).toBeNull();
    expect(content(el)).toContain("L:2");
  });
});

describe("contract: CSS variable forwarding", () => {
  it("forwards the shared CSS var set into the shadow root", () => {
    defineReactComponent(tag("rx"), ReactC, { attrs: ATTRS });
    const el = makeHost(`rx-contract-${n}`, { "initial-count": "2", label: "L" });
    const style = el.shadowRoot.querySelector("style");
    expect(style.textContent).toContain("--wc-color-primary");
    expect(style.textContent).toContain("--wc-color-text");
    expect(style.textContent).toContain("--wc-radius");
    expect(style.textContent).toContain("--wc-font");
  });
});

describe("contract: CustomEvents out on the host", () => {
  it("fires an event on the host element, detail is a plain object", () => {
    defineReactComponent(tag("rx"), ReactC, { attrs: ATTRS });
    const el = makeHost(`rx-contract-${n}`, { "initial-count": "2", label: "L" });
    const received = [];
    el.addEventListener("count-changed", (e) => received.push(e.detail));

    // The adapter passes __emit into component props. Pull it from the
    // last rendered vnode (stored by our fake React runtime) and call it
    // the way a component would.
    const mountDiv = el.shadowRoot.querySelector("div");
    const vnode = mountDiv.__vnode;
    const emit = vnode?.props?.__emit;
    expect(typeof emit).toBe("function");
    emit("count-changed", { count: 42 });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ count: 42 });
  });
});

describe("contract: lifecycle teardown", () => {
  it("unmounts and clears content on disconnectedCallback (React)", () => {
    defineReactComponent(tag("rx"), ReactC, { attrs: ATTRS });
    const el = makeHost(`rx-contract-${n}`, { "initial-count": "2", label: "L" });
    expect(content(el).length).toBeGreaterThan(0);
    el.remove();
    expect(content(el)).toBe("");
  });

  it("Svelte destroys its instance on removal", () => {
    defineSvelteComponent(tag("sv"), SvelteC, { attrs: ATTRS });
    const el = makeHost(`sv-contract-${n}`, { "initial-count": "2", label: "L" });
    el.remove();
    expect(el._component).toBeNull();
  });
});

describe("contract: Angular adapter", () => {
  it("requires createCustomElement to be passed in", () => {
    expect(() => defineAngularComponent(tag("ng"), {}, {}, {})).toThrow(/createCustomElement/);
  });

  it("registers a contract-compliant element when given createCustomElement", () => {
    const C = class {};
    C._attrs = ["label"];
    defineAngularComponent(tag("ng"), C, { get: () => "injector" }, {
      attrs: ["label"],
      createCustomElement: fakeAngularCreateCustomElement,
    });
    const el = makeHost(`ng-contract-${n}`, { label: "x" });
    expect(el.shadowRoot.innerHTML).toContain("angular");
  });
});

describe("contract: coercion edge cases", () => {
  const NumC = ({ n = "missing", __emit }) => `n=${n}`;
  const BoolC = ({ on = false, __emit }) => `on=${on}`;

  it("treats an empty number attribute as missing (undefined, not NaN)", () => {
    defineReactComponent(tag("rx"), NumC, { attrs: { n: "number" } });
    const el = makeHost(`rx-contract-${n}`, { n: "" });
    expect(content(el)).toContain("n=missing");
  });

  it("treats an invalid number attribute as missing", () => {
    defineReactComponent(tag("rx"), NumC, { attrs: { n: "number" } });
    const el = makeHost(`rx-contract-${n}`, { n: "abc" });
    expect(content(el)).toContain("n=missing");
  });

  it("parses numeric strings and negative numbers", () => {
    defineReactComponent(tag("rx"), NumC, { attrs: { n: "number" } });
    const el = makeHost(`rx-contract-${n}`, { n: "-12.5" });
    expect(content(el)).toContain("n=-12.5");
  });

  it("boolean attribute presence (no value) means true", () => {
    defineReactComponent(tag("rx"), BoolC, { attrs: { on: "boolean" } });
    const el = makeHost(`rx-contract-${n}`, { on: "" });
    expect(content(el)).toContain("on=true");
  });

  it("boolean attribute 'false' means false", () => {
    defineReactComponent(tag("rx"), BoolC, { attrs: { on: "boolean" } });
    const el = makeHost(`rx-contract-${n}`, { on: "false" });
    expect(content(el)).toContain("on=false");
  });

  it("missing boolean attribute means false", () => {
    defineReactComponent(tag("rx"), BoolC, { attrs: { on: "boolean" } });
    const el = makeHost(`rx-contract-${n}`, {});
    expect(content(el)).toContain("on=false");
  });
});

describe("contract: resilient error handling", () => {
  it("does not throw when a component throws during render (React)", () => {
    defineReactComponent(tag("rx"), () => {
      throw new Error("boom");
    }, { attrs: {} });
    const el = makeHost(`rx-contract-${n}`, {});
    // connectedCallback caught the render error; host remains usable.
    expect(el.shadowRoot.querySelector("div")).not.toBeNull();
  });
});