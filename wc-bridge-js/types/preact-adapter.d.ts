export function definePreactComponent(tag: any, PreactComponent: any, { attrs, useShadow, runtime }?: {
    attrs?: {} | undefined;
    useShadow?: boolean | undefined;
}): void;
/**
 * Call once at app startup so the adapter can find your app's Preact
 * instance instead of bundling its own (avoids "two copies" issues).
 */
export function registerPreactRuntime(preactModule: any, renderFunction: any): void;
