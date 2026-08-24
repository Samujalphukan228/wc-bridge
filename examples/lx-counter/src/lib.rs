use leptos::prelude::*;
use leptos_webcomponent::web_component;

// This is the entire component. #[web_component] generates the
// __mount_/__update_/__unmount_/__meta_ wasm exports; webcomponent-runtime.js
// (shared, not regenerated per component) does customElements.define
// from the meta descriptor. No hand-written JS glue per component.

/// Demonstrates every param kind:
/// - `label`: plain attr — parsed at mount; changes remount the card
/// - `count`: reactive attr — RwSignal<i32>; attribute changes push into
///   it live without remounting, so the click history below survives
/// - `tags`: JSON attr — parsed via Deserialize
/// - `count_changed`: emits CustomEvent `count-changed`
#[web_component("lx-counter")]
#[component]
fn Counter(
    #[attr(reactive)] count: i32,
    #[attr] label: String,
    #[attr(json)] tags: Vec<String>,
    #[event] count_changed: leptos_webcomponent::EventEmitter,
) -> impl IntoView {
    let clicks = RwSignal::new(0i32);

    let on_click = move |_| {
        count.set(count.get_untracked() + 1);
        clicks.update(|c| *c += 1);
        count_changed.emit(&serde_json::json!({ "count": count.get_untracked() }));
    };

    let tags_text = if tags.is_empty() {
        String::new()
    } else {
        format!(" · {}", tags.join(", "))
    };

    view! {
        <article
            style="background: var(--wc-color-primary, #000);
                   color: var(--wc-color-text, #fff);
                   border: 1px solid var(--wc-color-text, #fff);
                   padding: 1.5rem; min-height: 200px; display: flex;
                   flex-direction: column; font-family: var(--wc-font, system-ui, sans-serif);
                   border-radius: var(--wc-radius, 0);"
        >
            <h3 style="margin: 0 0 0.6rem; text-transform: uppercase;">{label}</h3>
            <p style="flex: 1; margin: 0; font-size: 1.4rem;">
                {move || count.get()}
                <span style="font-size: 0.8rem; opacity: 0.7;">{tags_text}</span>
            </p>
            <button
                on:click=on_click
                style="all: unset; cursor: pointer; align-self: flex-start;
                       border: 1px solid currentColor; padding: 0.3rem 0.8rem;
                       font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;"
            >
                +1
            </button>
            <p style="margin: 0.6rem 0 0; font-size: 0.65rem; opacity: 0.6;">
                "clicks since mount: " {move || clicks.get()}
            </p>
            <div data-wc-slot="body" style="margin: 0.5rem 0;"></div>
            <span style="align-self: flex-start; margin-top: 1rem; font-size: 0.7rem;
                   text-transform: uppercase; letter-spacing: 0.12em;
                   border: 1px solid var(--wc-color-text, #fff);
                   padding: 0.25rem 0.6rem;">
                Leptos
            </span>
        </article>
    }
}

#[wasm_bindgen::prelude::wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}
