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
        __meta_Counter: () => {
          return JSON.stringify({
            tag: "lx-counter",
            mount: "__mount_Counter",
            update: "__update_Counter",
            unmount: "__unmount_Counter",
            attrs: ["label", "initial"],
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
    __meta_Counter: () => {
      return JSON.stringify({
        tag: "lx-counter",
        mount: "__mount_Counter",
        update: "__update_Counter",
        unmount: "__unmount_Counter",
        attrs: ["label", "initial"],
      });
    },

    __mount_Counter: (host, propsJson) => {
      try {
        const props = JSON.parse(propsJson);
        const shadow = host.attachShadow({ mode: "open" });
        shadow.innerHTML = `
          <style>
            :host { display: block; }
            button {
              font-family: var(--wc-font, system-ui, sans-serif);
              padding: 10px 18px;
              border-radius: var(--wc-radius, 8px);
              border: none;
              background: var(--wc-color-primary, #2563eb);
              color: var(--wc-color-text, #fff);
              font-weight: 600;
              cursor: pointer;
            }
          </style>
          <button id="counter-btn">🦀 ${props.label || "Counter"}: 0</button>
        `;

        const btn = shadow.getElementById("counter-btn");
        let count = Number(props.initial) || 0;

        btn.addEventListener("click", () => {
          count++;
          btn.textContent = `🦀 ${props.label || "Counter"}: ${count}`;
          host.dispatchEvent(new CustomEvent("count-changed", { detail: { count } }));
        });
      } catch (e) {
        // Fallback rendering
        host.innerHTML = `<button style="padding: 8px; border: 1px dashed #94a3b8; border-radius: var(--wc-radius)">🦀 Counter</button>`;
      }
    },

    __update_Counter: (host, propsJson) => {
      // Handle attribute updates
    },

    __unmount_Counter: (host) => {
      host.shadowRoot?.remove?.();
    },
  };
}
