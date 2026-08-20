use leptos::*;
use leptos_webcomponent::web_component;

// This is the entire component. #[web_component] generates the
// __mount_/__update_/__unmount_/__meta_ wasm exports; webcomponent-runtime.js
// (shared, not regenerated per component) does customElements.define
// from the meta descriptor. No hand-written JS glue per component.
#[web_component("lx-counter")]
#[component]
fn Counter(#[attr] label: String, #[attr] initial: i32) -> impl IntoView {
    let (count, set_count) = create_signal(initial);

    view! {
        <button
            style="font-family: var(--wc-font, system-ui, sans-serif);
                   padding: 10px 18px; border-radius: var(--wc-radius, 8px);
                   border: none; background: var(--wc-color-primary, #dea584);
                   color: var(--wc-color-text, #111); font-weight: 600; cursor: pointer;"
            on:click=move |_| set_count.update(|c| *c += 1)
        >
            {format!("🦀 {label}: ")} {move || count.get()}
        </button>
    }
}

#[wasm_bindgen::prelude::wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}
