// test/astro-adapter.test.js
// Astro SSR helper: produces kebab-case attributes and correct value
// serialization for server-rendered output.

import { describe, it, expect } from "vitest";
import astroComponentProps, { astroComponentProps as named } from "../src/astro-adapter.js";

describe("astro-adapter", () => {
  it("exports the same function as default and named", () => {
    expect(astroComponentProps).toBe(named);
  });

  it("maps camelCase prop names to kebab-case attributes", () => {
    const out = astroComponentProps({ initialCount: 4, label: "Hi" }, {
      attrs: { initialCount: "number", label: "string" },
    });
    expect(out).toEqual({ "initial-count": "4", label: "Hi" });
  });

  it("serializes booleans and numbers as strings", () => {
    const out = astroComponentProps({ active: true, n: 0 }, {
      attrs: { active: "boolean", n: "number" },
    });
    expect(out).toEqual({ active: "true", n: "0" });
  });

  it("skips undefined and null values", () => {
    const out = astroComponentProps({ a: undefined, b: null, c: "x" }, {
      attrs: { a: "string", b: "string", c: "string" },
    });
    expect(out).toEqual({ c: "x" });
  });

  it("JSON-serializes object values", () => {
    const out = astroComponentProps({ data: { x: 1 } }, {
      attrs: { data: "json" },
    });
    expect(out).toEqual({ data: '{"x":1}' });
  });

  it("returns an empty object with no attrs defined", () => {
    expect(astroComponentProps({ anything: "x" }, {})).toEqual({});
  });
});