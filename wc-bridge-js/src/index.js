// wc-bridge/index.js
// Public surface for the wc-bridge package.
// Provides SSR-safe variants for Next.js alongside raw adapters.

export { defineReactComponent, registerReactRuntime } from "./react-adapter.js";
export { defineReactComponentSafe, initWebComponents } from "./nextjs-adapter.js";
