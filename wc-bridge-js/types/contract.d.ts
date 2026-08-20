/**
 * Shared types for wc-bridge adapters.
 */

export type AttrType = "string" | "number" | "boolean";

export interface AttrMap {
  [propName: string]: AttrType;
}

export interface ComponentOptions {
  /** propName -> kebab-case attribute mapping contract (camelCase props) */
  attrs?: AttrMap;
  /** Use a shadow root (default true). Set false to render in light DOM. */
  useShadow?: boolean;
}

export interface WcProps {
  /** Fires a CustomEvent on the host element with a plain-object detail. */
  __emit: (name: string, detail?: unknown) => void;
}

/** A host custom element created by any adapter. */
export interface WcHostElement extends HTMLElement {
  _readProps?: () => Record<string, unknown>;
}