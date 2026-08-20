use leptos::*;
use leptos_webcomponent::web_component;

// This is the entire component. #[web_component] generates the
// __mount_/__update_/__unmount_/__meta_ wasm exports; webcomponent-runtime.js
// (shared, not regenerated per component) does customElements.define
// from the meta descriptor. No hand-written JS glue per component.
#[web_component("lx-card")]
#[component]
fn Card(#[attr] label: String, #[attr] description: String) -> impl IntoView {
    view! {
        <article
            style="background: var(--wc-color-primary, #000);
                   color: var(--wc-color-text, #fff);
                   border: 1px solid var(--wc-color-text, #fff);
                   padding: 1.5rem; min-height: 200px; display: flex;
                   flex-direction: column; font-family: var(--wc-font, system-ui, sans-serif);"
        >
            <h3 style="margin: 0 0 0.6rem; text-transform: uppercase;">{label}</h3>
            <p style="flex: 1; margin: 0; font-size: 0.95rem;">{description}</p>
            <span
                style="align-self: flex-start; margin-top: 1rem; font-size: 0.7rem;
                       text-transform: uppercase; letter-spacing: 0.12em;
                       border: 1px solid var(--wc-color-text, #fff);
                       padding: 0.25rem 0.6rem;"
            >Leptos</span>
        </article>
    }
}

#[wasm_bindgen::prelude::wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}
