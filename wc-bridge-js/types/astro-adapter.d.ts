/**
 * Generates kebab-case HTML attributes from a prop definition map,
 * returning an object suitable for spreading onto a server-rendered tag.
 *
 * @param {Record<string, string|number|boolean>} values - Current prop values
 * @param {Object} options - { attrs: { propName: type }, ... }
 * @returns {Object} Kebab-case attribute map for SSR
 */
export function astroComponentProps(values: Record<string, string | number | boolean>, options?: Object): Object;
export { astroComponentProps as default };
