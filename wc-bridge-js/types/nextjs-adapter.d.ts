/**
 * Safe wrapper that works in SSR contexts.
 * Registers the element immediately in the browser,
 * defers registration until DOMContentLoaded otherwise.
 */
export function defineReactComponentSafe(tag: any, ReactComponent: any, options: any): void;
/**
 * Call this in a "use client" entry point to flush any deferred
 * definitions from server imports that were queued.
 */
export function initWebComponents(): Promise<void>;
export let _pendingDefinitions: any[];
export { registerReactRuntime, defineReactComponent } from "./react-adapter.js";
