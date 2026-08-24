export function defineReactComponent(tag: any, ReactComponent: any, { attrs, useShadow, runtime }?: {
    attrs?: {} | undefined;
    useShadow?: boolean | undefined;
}): void;
/**
 * Call once at app startup so the adapter can find your app's React
 * instance instead of bundling its own (avoids "two React copies").
 * Alternatively pass `{ runtime: { React, createRoot } }` to a single
 * defineReactComponent call — that takes precedence and touches no
 * global state.
 */
export function registerReactRuntime(React: any, createRoot: any): void;
