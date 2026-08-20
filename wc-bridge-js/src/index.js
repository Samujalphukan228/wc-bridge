// wc-bridge/index.js
// Public surface for the wc-bridge package.
// All adapters follow the same contract (see ../CONTRACT.md).

export { defineReactComponent, registerReactRuntime } from "./react-adapter.js";
export { defineSvelteComponent } from "./svelte-adapter.js";
export { defineVueComponent, registerVueRuntime } from "./vue-adapter.js";
export { defineAngularComponent } from "./angular-adapter.js";
export { definePreactComponent, registerPreactRuntime } from "./preact-adapter.js";
export { defineSolidComponent, registerSolidRuntime } from "./solid-adapter.js";
export { astroComponentProps } from "./astro-adapter.js";
export {
  defineReactComponentSafe,
  initWebComponents,
} from "./nextjs-adapter.js";
