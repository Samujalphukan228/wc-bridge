// test/angular-adapter.test.js
// Angular adapter: wraps a fake @angular/elements createCustomElement,
// verifies contract enforcement (observed attrs, CSS var forwarding).

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupDom, cleanupDom, makeHost } from "./helpers/dom.js";
import { defineAngularComponent } from "../src/angular-adapter.js";

let n = 0;
function tag() {
  return `ng-test-${++n}`;
}

function fakeCreateCustomElement(component, _opts) {
  return class FakeAngularElement extends HTMLElement {
    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      const div = document.createElement("div");
      div.innerHTML = `Angular:${component}`;
      this.shadowRoot.appendChild(div);
    }
  };
}

beforeEach(() => {
  setupDom();
});

afterEach(() => {
  cleanupDom();
});

describe("angular-adapter", () => {
  it("throws without createCustomElement", () => {
    expect(() => defineAngularComponent(tag(), {}, {}, { attrs: [] })).toThrow(
      /createCustomElement/
    );
  });

  it("defines an element with contract-observed attributes", () => {
    const attrs = ["label", "initial-count"];
    defineAngularComponent(tag(), "Counter", {}, {
      attrs,
      createCustomElement: fakeCreateCustomElement,
    });
    const el = makeHost(`ng-test-${n}`, { label: "Hi" });
    expect(el.constructor.observedAttributes).toEqual(attrs);
    expect(el.shadowRoot.textContent).toContain("Angular:Counter");
  });

  it("forwards the shared CSS vars into the shadow root", () => {
    defineAngularComponent(tag(), "Counter", {}, {
      attrs: [],
      createCustomElement: fakeCreateCustomElement,
    });
    const el = makeHost(`ng-test-${n}`);
    const style = el.shadowRoot.querySelector("style");
    expect(style.textContent).toContain("--wc-color-primary: inherit");
  });
});
