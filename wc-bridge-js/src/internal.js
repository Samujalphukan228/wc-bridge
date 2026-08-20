// src/internal.js
// Shared internals for the framework adapters. Kept in one place so the
// coercion rules and CSS-var contract can't drift between adapters.

export const CSS_VARS = [
  "--wc-color-primary",
  "--wc-color-text",
  "--wc-radius",
  "--wc-font",
];

// CONTRACT.md: camelCase prop -> kebab-case attribute ("initialCount" -> "initial-count")
export function kebab(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

// Parse an attribute string into the declared prop type.
// - "": empty string -> undefined for numbers, true for booleans (presence)
// - numbers: Number(raw); NaN stays NaN (caller decides)
// - booleans: presence or "true"/"false"; missing -> false
// - strings: passed through (including "")
export function coerce(raw, kind) {
  if (raw === null) return kind === "boolean" ? false : undefined;
  switch (kind) {
    case "number": {
      if (raw === "") return undefined;
      const n = Number(raw);
      return Number.isNaN(n) ? undefined : n;
    }
    case "boolean":
      return raw === "" || raw === "true" || raw === "1";
    case "json": {
      if (raw === "") return undefined;
      try {
        return JSON.parse(raw);
      } catch {
        return undefined;
      }
    }
    default:
      return raw;
  }
}

// Build propName -> attributeName map from an attrs declaration.
export function attrFor(attrs) {
  return Object.fromEntries(Object.keys(attrs).map((p) => [p, kebab(p)]));
}

// Style element that forwards the shared CSS vars into a shadow root.
export function cssVarStyle(doc) {
  const style = doc.createElement("style");
  style.textContent = `:host { ${CSS_VARS.map((v) => `${v}: inherit;`).join(" ")} }`;
  return style;
}