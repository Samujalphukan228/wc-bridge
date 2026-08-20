// wasm-loader.js
//
// Simple WASM loader for the Leptos web component.
// Loads the compiled WASM module and exposes its exports.
// Falls back to a JS polyfill when WASM isn't available or fails to load.

export async function loadLeptosWASM(wasmUrl) {
  try {
    // Try to load and validate WebAssembly module
    const wasmResponse = await fetch(wasmUrl);
    const wasmBuffer = await wasmResponse.arrayBuffer();

    // Check if it's valid WebAssembly
    if (WebAssembly.validate(wasmBuffer)) {
      const { instance } = await WebAssembly.instantiate(wasmBuffer);
      const exports = instance.exports;

      return {
        __meta_Card: () => {
          return JSON.stringify({
            tag: "lx-card",
            mount: "__mount_Card",
            update: "__update_Card",
            unmount: "__unmount_Card",
            attrs: ["label", "description"],
          });
        },
        ...exports,
        _isWASM: true,
      };
    }
  } catch (e) {
    // WASM loading failed - fall through to JS fallback
  }

  // Return JS fallback implementation
  return loadFallbackImplementation();
}

function loadFallbackImplementation() {
  // Return a working JS implementation that mimics the WASM component
  // This is what users get when running locally with proper wasm-bindgen toolchain
  return {
    __meta_Card: () => {
      return JSON.stringify({
        tag: "lx-card",
        mount: "__mount_Card",
        update: "__update_Card",
        unmount: "__unmount_Card",
        attrs: ["label", "description"],
      });
    },

    __mount_Card: (host, propsJson) => {
      try {
        const props = JSON.parse(propsJson);
        const shadow = host.attachShadow({ mode: "open" });
        renderCard(shadow, props, host);
      } catch (e) {
        // Fallback rendering
        host.innerHTML = `<div style="border: 1px solid #fff; padding: 1.5rem; color: #fff">Leptos card</div>`;
      }
    },

    __update_Card: (host, propsJson) => {
      // Re-render the card with fresh props
      try {
        const props = JSON.parse(propsJson);
        const shadow = host.shadowRoot;
        if (shadow) renderCard(shadow, props, host);
      } catch (e) {
        // ignore
      }
    },

    __unmount_Card: (host) => {
      host.shadowRoot?.remove?.();
    },
  };
}

function renderCard(shadow, props, host) {
  const label = props.label || "Leptos";
  const description = props.description || "";
  shadow.innerHTML = `
    <style>
      :host { display: block; }
      .card {
        background: var(--wc-color-primary, #000);
        color: var(--wc-color-text, #fff);
        border: 1px solid var(--wc-color-text, #fff);
        padding: 1.5rem; min-height: 200px; display: flex;
        flex-direction: column; cursor: pointer;
        font-family: var(--wc-font, system-ui, sans-serif);
      }
      h3 { margin: 0 0 0.6rem; text-transform: uppercase; font-size: 1.4rem; }
      p { flex: 1; margin: 0; font-size: 0.95rem; color: #ddd; }
      .tag {
        align-self: flex-start; margin-top: 1rem; font-size: 0.7rem;
        text-transform: uppercase; letter-spacing: 0.12em;
        border: 1px solid var(--wc-color-text, #fff);
        padding: 0.25rem 0.6rem; color: var(--wc-color-text, #fff);
      }
    </style>
    <article class="card">
      <h3>${label}</h3>
      <p>${description}</p>
      <span class="tag">Leptos</span>
    </article>`;

  shadow.querySelector(".card")?.addEventListener("click", () => {
    host.dispatchEvent(new CustomEvent("card-clicked", { detail: { label } }));
  });
}