// nextjs-adapter.js
//
// Next.js-friendly wrapper around react-adapter.js.
//
// Problem solved: defineReactComponent() calls customElements.define()
// at import time, which throws when bundled for the server (Node.js
// doesn't expose globalThis.customElements). Next.js apps import
// components during SSR render, so we must defer registration.
//
// Strategy:
// 1. registerReactRuntime() is called from a client-only entry point;
// 2. defineReactComponentSafe() queues registration until window.onload
//    if running server-side, or immediately if window exists.
//
// Usage in a Next.js component:
//
//   // app/providers/WcRegistry.tsx (client component)
//   "use client"
//   import { registerReactRuntime } from "wc-bridge/nextjs-adapter.js";
//   import { createRoot } from "react-dom/client";
//   import React from "react";
//   import { defineCounter } from "@/components/counter"; // example
//
//   registerReactRuntime(React, createRoot);
//   defineReactComponentSafe("rx-counter", Counter, { attrs: { count: "number" } });
//

import { defineReactComponent } from "./react-adapter.js";

let _pendingDefinitions = [];

/**
 * Returns true if running in a browser-like environment.
 * Checked dynamically so tests can toggle window presence.
 */
function isBrowser() {
  return typeof window !== "undefined";
}

/**
 * Safe wrapper that works in SSR contexts.
 * Registers the element immediately in the browser,
 * defers registration until DOMContentLoaded otherwise.
 */
export function defineReactComponentSafe(tag, ReactComponent, options) {
  const definition = { tag, ReactComponent, options };

  if (isBrowser()) {
    defineReactComponent(tag, ReactComponent, options);
  } else {
    _pendingDefinitions.push(definition);
  }
}

/**
 * Call this in a "use client" entry point to flush any deferred
 * definitions from server imports that were queued.
 */
export async function initWebComponents() {
  if (!isBrowser()) return;
  while (_pendingDefinitions.length > 0) {
    const { tag, ReactComponent, options } = _pendingDefinitions.shift();
    defineReactComponent(tag, ReactComponent, options);
  }
}

/**
 * Re-export the direct React runtime registrar so Next.js users have
 * a single import for SSR-safe React + WC setup.
 */
export { registerReactRuntime, defineReactComponent } from "./react-adapter.js";
export { _pendingDefinitions };
