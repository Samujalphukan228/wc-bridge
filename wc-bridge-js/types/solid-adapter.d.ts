export function defineSolidComponent(tag: any, Component: any, { attrs, useShadow, runtime }?: {
    attrs?: {} | undefined;
    useShadow?: boolean | undefined;
}): void;
/**
 * Call once at app startup so the adapter can find your app's Solid
 * instance instead of bundling its own.
 */
export function registerSolidRuntime(solidModule: any): void;
