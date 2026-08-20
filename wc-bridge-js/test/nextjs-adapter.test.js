import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  defineReactComponentSafe,
  initWebComponents,
  _pendingDefinitions,
} from "../src/nextjs-adapter.js";

// Simulate Next.js SSR: globalThis.customElements does NOT exist,
// and window is undefined (Node.js-like environment).
const originalCustomElements = globalThis.customElements;
const originalWindow = globalThis.window;
const originalHTMLElement = globalThis.HTMLElement;

// Mock HTMLElement for class declaration in react-adapter.js
const mockHTMLElement = class {
  attachShadow() {
    return { appendChild: () => {} };
  }
  getAttribute() {
    return null;
  }
  dispatchEvent() {}
};

describe("Next.js SSR safety", () => {
  beforeEach(() => {
    // Clear pending queue from previous tests
    _pendingDefinitions.length = 0;

    // Simulate Node.js environment: no `window` global
    globalThis.window = undefined;
    globalThis.customElements = undefined;
    globalThis.HTMLElement = mockHTMLElement;
  });

  afterEach(() => {
    globalThis.customElements = originalCustomElements;
    globalThis.window = originalWindow;
    globalThis.HTMLElement = originalHTMLElement;
  });

  it("does not call customElements.define when window is undefined", () => {
    expect(globalThis.customElements).toBeUndefined();

    expect(() =>
      defineReactComponentSafe("test-element", () => null, { attrs: {} })
    ).not.toThrow();
  });

  it("queues registration until initWebComponents runs in browser", async () => {
    defineReactComponentSafe("queued-element", () => null, { attrs: {} });
    // Should not have registered yet (no window)
    expect(globalThis.customElements).toBeUndefined();

    // Restore a mock browser environment
    const mockDefine = vi.fn();
    globalThis.window = { onload: null };
    globalThis.customElements = {
      define: mockDefine,
      get: () => undefined,
    };

    await initWebComponents();

    expect(mockDefine).toHaveBeenCalledTimes(1);
    expect(mockDefine).toHaveBeenCalledWith(
      "queued-element",
      expect.any(Function)
    );
  });

  it("registers immediately when window is available", () => {
    const mockDefine = vi.fn();
    globalThis.window = {};
    globalThis.customElements = {
      define: mockDefine,
      get: () => undefined,
    };

    defineReactComponentSafe("immediate-element", () => null, { attrs: {} });

    expect(mockDefine).toHaveBeenCalledTimes(1);
    expect(mockDefine).toHaveBeenCalledWith(
      "immediate-element",
      expect.any(Function)
    );
  });
});
