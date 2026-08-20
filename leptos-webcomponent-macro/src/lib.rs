use convert_case::{Case, Casing};
use proc_macro::TokenStream;
use quote::{format_ident, quote};
use syn::{parse_macro_input, FnArg, ItemFn, LitStr, Pat, PatType};

/// `#[web_component("lx-counter")]` goes ABOVE `#[component]` on a normal
/// Leptos component function. It does not change the function itself —
/// it adds three `wasm_bindgen`-exported functions next to it:
///
///   __mount_<Name>(host, props_json)   - called on connectedCallback
///   __update_<Name>(host, props_json)  - called on attributeChangedCallback
///   __unmount_<Name>(host)             - called on disconnectedCallback
///
/// plus a JSON descriptor (`__meta_<Name>`) listing the observed
/// attributes, so the generic JS runtime (webcomponent-runtime.js,
/// shipped once in the `leptos-webcomponent` crate, not per component)
/// can register the custom element without any per-component JS.
#[proc_macro_attribute]
pub fn web_component(attr: TokenStream, item: TokenStream) -> TokenStream {
    let tag_name = parse_macro_input!(attr as LitStr).value();
    let input_fn = parse_macro_input!(item as ItemFn);
    let fn_name = &input_fn.sig.ident;

    // Collect #[attr] marked params: (ident, attribute-name, rust type)
    let mut props = Vec::new();
    for arg in &input_fn.sig.inputs {
        if let FnArg::Typed(PatType { pat, ty, attrs, .. }) = arg {
            let is_attr = attrs.iter().any(|a| a.path().is_ident("attr"));
            if !is_attr {
                continue;
            }
            if let Pat::Ident(pat_ident) = &**pat {
                let ident = pat_ident.ident.clone();
                let attr_name = ident.to_string().to_case(Case::Kebab);
                props.push((ident, attr_name, (**ty).clone()));
            }
        }
    }

    let mount_fn = format_ident!("__mount_{}", fn_name);
    let update_fn = format_ident!("__update_{}", fn_name);
    let unmount_fn = format_ident!("__unmount_{}", fn_name);
    let meta_fn = format_ident!("__meta_{}", fn_name);

    let attr_names: Vec<&str> = props.iter().map(|(_, n, _)| n.as_str()).collect();
    let attr_names_json = serde_json_array(&attr_names);

    // Build: let field = parse_prop::<Type>(&props_obj, "attr-name");
    let prop_reads: Vec<_> = props
        .iter()
        .map(|(ident, attr_name, ty)| {
            quote! {
                let #ident: #ty = ::leptos_webcomponent::parse_prop(&props_json, #attr_name);
            }
        })
        .collect();
    // After `#[component]` expands, the function no longer takes
    // positional args — it takes one `<Name>Props` struct (that's how
    // Leptos's own macro rewrites it). So the generated call must
    // build that struct, not call the fn positionally.
    let props_struct_ident = format_ident!("{}Props", fn_name);
    let struct_fields: Vec<_> = props.iter().map(|(ident, _, _)| quote! { #ident }).collect();

    // Strip #[attr] markers from the original fn so `#[component]` below
    // it sees plain params (the macro is meant to sit ABOVE #[component]).
    let mut clean_fn = input_fn.clone();
    for arg in &mut clean_fn.sig.inputs {
        if let FnArg::Typed(PatType { attrs, .. }) = arg {
            attrs.retain(|a| !a.path().is_ident("attr"));
        }
    }

    let expanded = quote! {
        #[allow(non_snake_case)]
        #clean_fn

        #[wasm_bindgen::prelude::wasm_bindgen]
        #[allow(non_snake_case)]
        pub fn #mount_fn(host: web_sys::HtmlElement, props_json: wasm_bindgen::JsValue) {
            #(#prop_reads)*
            ::leptos_webcomponent::mount(host, move || {
                #fn_name(#props_struct_ident { #(#struct_fields),* })
            });
        }

        #[wasm_bindgen::prelude::wasm_bindgen]
        #[allow(non_snake_case)]
        pub fn #update_fn(host: web_sys::HtmlElement, props_json: wasm_bindgen::JsValue) {
            ::leptos_webcomponent::update(host, props_json);
        }

        #[wasm_bindgen::prelude::wasm_bindgen]
        #[allow(non_snake_case)]
        pub fn #unmount_fn(host: web_sys::HtmlElement) {
            ::leptos_webcomponent::unmount(host);
        }

        /// Descriptor consumed by webcomponent-runtime.js to call
        /// `customElements.define(tag, ...)` with the right observed
        /// attributes, without any hand-written per-component JS.
        #[wasm_bindgen::prelude::wasm_bindgen]
        #[allow(non_snake_case)]
        pub fn #meta_fn() -> wasm_bindgen::JsValue {
            let json = format!(
                r#"{{"tag":"{}","mount":"{}","update":"{}","unmount":"{}","attrs":{}}}"#,
                #tag_name,
                stringify!(#mount_fn),
                stringify!(#update_fn),
                stringify!(#unmount_fn),
                #attr_names_json,
            );
            wasm_bindgen::JsValue::from_str(&json)
        }
    };

    expanded.into()
}

fn serde_json_array(items: &[&str]) -> String {
    let inner = items
        .iter()
        .map(|s| format!("\"{}\"", s))
        .collect::<Vec<_>>()
        .join(",");
    format!("[{}]", inner)
}
