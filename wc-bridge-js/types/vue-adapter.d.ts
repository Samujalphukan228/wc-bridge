export function defineVueComponent(tag: any, VueComponent: any, { attrs, useShadow }?: {
    attrs?: {} | undefined;
    useShadow?: boolean | undefined;
}): void;
/**
 * Call once at app startup so the adapter can find your app's Vue
 * instance instead of bundling its own.
 */
export function registerVueRuntime(vueModule: any): void;
