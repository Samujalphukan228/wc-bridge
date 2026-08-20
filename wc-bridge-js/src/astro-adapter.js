// astro-adapter.js
//
// Astro-compatible wrapper for the web component contract.
// Astro components compile to static HTML by default, so we provide
// a helper that generates the correct HTML attributes and event wiring
// for server-rendered output, plus client hydration hooks.
//
// Usage in an .astro file:
//   ---
//   import { astroComponentProps } from "wc-bridge/astro-adapter.js";
//   import Counter from "../components/Counter.svelte";
//   ---
//   <sv-counter ...{astroComponentProps(Counter, {
//     attrs: { label: "string", initial: "number" },
//     values: { label: "Hello", initial: 5 },
//   })} />

/**
 * Generates kebab-case HTML attributes from a prop definition map,
 * returning an object suitable for spreading onto a server-rendered tag.
 *
 * @param {Record<string, string|number|boolean>} values - Current prop values
 * @param {Object} options - { attrs: { propName: type }, ... }
 * @returns {Object} Kebab-case attribute map for SSR
 */
export function astroComponentProps(values, options = {}) {
  const attrMap = {};

  for (const [propName, type] of Object.entries(options.attrs || {})) {
    // Convert camelCase prop name to kebab-case attribute name
    const attrName = propName.replace(/([A-Z])/g, "-$1").toLowerCase();

    // Serialize value appropriately for attribute
    const value = values[propName];
    if (value !== undefined && value !== null) {
      // For complex types, serialize as JSON
      if (typeof value === "object") {
        attrMap[attrName] = JSON.stringify(value);
      } else {
        attrMap[attrName] = String(value);
      }
    }
  }

  return attrMap;
}

/**
 * Wraps an existing adapter's define function for use in Astro's
 * client:load / client:idle directives.
 *
 * Usage:
 *   import { astroComponentProps } from "wc-bridge/astro-adapter.js";
 *   import { defineReactComponent } from "wc-bridge/react-adapter.js";
 *
 *   // During SSR, just use astroComponentProps
 *   // During hydration, register the component normally
 *   if (typeof window !== "undefined") {
 *     defineReactComponent("rx-dashboard", Dashboard, { attrs: {...} });
 *   }
 */
export { astroComponentProps as default };
