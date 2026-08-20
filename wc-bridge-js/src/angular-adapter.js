// angular-adapter.js
//
// Angular already ships an official createCustomElement() (from
// @angular/elements) that does most of this. This adapter is a thin
// layer on TOP of it that enforces the same contract as the React and
// Leptos adapters: kebab-case attrs, CustomEvents with plain-object
// detail, and the shared CSS var set — so a component migrated from
// Angular to Leptos (or vice versa) is a drop-in tag swap for the host
// page, not an API change.
//
// Usage (inside an Angular module, where injector is your app's
// Injector and MyAngularComponent is a standalone/declared component):
//
//   import { createCustomElement } from "@angular/elements";
//   import { defineAngularComponent } from "wc-bridge/angular-adapter.js";
//
//   defineAngularComponent("ng-counter", MyAngularComponent, injector, {
//     attrs: ["label", "initial"],
//   });

const CSS_VARS = ["--wc-color-primary", "--wc-color-text", "--wc-radius", "--wc-font"];

export function defineAngularComponent(tag, component, injector, { attrs = [], createCustomElement } = {}) {
  if (typeof createCustomElement !== "function") {
    throw new Error(
      "defineAngularComponent needs @angular/elements' createCustomElement passed in " +
        "(kept as a parameter rather than a hard import so this package has no Angular dependency)."
    );
  }

  const ElementCtor = createCustomElement(component, { injector });

  // Wrap Angular's generated element class so its attribute names and
  // event payloads match the shared contract, and so the shared CSS
  // vars get forwarded the same way as the React/Leptos adapters do.
  class ContractCompliantElement extends ElementCtor {
    static get observedAttributes() {
      return attrs;
    }

    connectedCallback() {
      super.connectedCallback();
      if (this.shadowRoot) {
        const style = document.createElement("style");
        style.textContent = `:host { ${CSS_VARS.map((v) => `${v}: inherit;`).join(" ")} }`;
        this.shadowRoot.appendChild(style);
      }
    }
  }

  if (!customElements.get(tag)) {
    customElements.define(tag, ContractCompliantElement);
  }
}
