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
/// attributes and emitted events, so the generic JS runtime
/// (webcomponent-runtime.js, shipped once in the `leptos-webcomponent`
/// crate, not per component) can register the custom element without
/// any per-component JS.
///
/// Param markers:
///   - `#[attr] label: String` — observed attribute `label`, parsed once
///     at mount (updates remount the component)
///   - `#[attr(reactive)] count: i32` — becomes `RwSignal<i32>`;
///     attribute changes push into it live, no remount, state preserved
///   - `#[attr(json)] events: Vec<Event>` — attribute holds a JSON
///     document, parsed via `Deserialize` (`T: Default` required for a
///     missing-attr fallback)
///   - `#[event] count_changed: EventEmitter` — emits `CustomEvent`
///     `count-changed` on the host (contract §2). The param type must
///     be `leptos_webcomponent::EventEmitter`.
#[proc_macro_attribute]
pub fn web_component(attr: TokenStream, item: TokenStream) -> TokenStream {
    let tag_name = parse_macro_input!(attr as LitStr).value();
    let input_fn = parse_macro_input!(item as ItemFn);
    let fn_name = &input_fn.sig.ident;

    // Collect #[attr] marked params: (ident, attribute-name, rust type,
    // reactive?, json?) and #[event] marked params.
    //   #[attr]              plain attr, parsed once at mount
    //   #[attr(reactive)]    RwSignal<T>, live-updated on attribute change
    //   #[attr(json)]        parsed as JSON document via Deserialize
    let mut props: Vec<(syn::Ident, String, syn::Type, bool, bool)> = Vec::new();
    let mut events = Vec::new();
    for arg in &input_fn.sig.inputs {
        if let FnArg::Typed(PatType { pat, ty, attrs, .. }) = arg {
            let is_attr = attrs.iter().any(|a| a.path().is_ident("attr"));
            let is_event = attrs.iter().any(|a| a.path().is_ident("event"));
            if !is_attr && !is_event {
                continue;
            }
            if let Pat::Ident(pat_ident) = &**pat {
                let ident = pat_ident.ident.clone();
                let name = ident.to_string().to_case(Case::Kebab);
                if is_event {
                    events.push((ident, name.clone(), (**ty).clone()));
                } else {
                    let (reactive, json) = attrs
                        .iter()
                        .find(|a| a.path().is_ident("attr"))
                        .map(flag_opts)
                        .unwrap_or((false, false));
                    props.push((ident, name, (**ty).clone(), reactive, json));
                }
            }
        }
    }

    let mount_fn = format_ident!("__mount_{}", fn_name);
    let update_fn = format_ident!("__update_{}", fn_name);
    let unmount_fn = format_ident!("__unmount_{}", fn_name);
    let meta_fn = format_ident!("__meta_{}", fn_name);

    let attr_names: Vec<&str> = props.iter().map(|(_, n, ..)| n.as_str()).collect();
    let event_names: Vec<&str> = events.iter().map(|(_, n, _)| n.as_str()).collect();
    let attr_names_json = serde_json_array(&attr_names);
    let events_json = serde_json_array(&event_names);

    // Reactive attrs: create the RwSignal from the initial attribute
    // value and register a setter so updates push into it live. These
    // live OUTSIDE the builder closure (signals must survive updates).
    let reactive_setup: Vec<_> = props
        .iter()
        .filter(|(_, _, _, reactive, _)| *reactive)
        .map(|(ident, attr_name, ty, _, json)| {
            let parse_expr = if *json {
                quote! {
                    ::leptos_webcomponent::parse_json_prop::<#ty>(&__props, #attr_name)
                        .unwrap_or_default()
                }
            } else {
                quote! { ::leptos_webcomponent::parse_prop(&__props, #attr_name) }
            };
            quote! {
                let #ident: ::leptos::prelude::RwSignal<#ty> =
                    ::leptos::prelude::RwSignal::new(#parse_expr);
                __wc_setters.insert(
                    ::std::string::String::from(#attr_name),
                    ::std::boxed::Box::new({
                        let __sig = #ident;
                        move |__raw: &str| {
                            __sig.set(<#ty as ::leptos_webcomponent::PropParse>::parse(__raw));
                        }
                    }),
                );
            }
        })
        .collect();

    // Inside the builder closure: plain + json attrs are parsed fresh on
    // every build; reactive attrs were already bound outside.
    let prop_reads: Vec<_> = props
        .iter()
        .filter(|(_, _, _, reactive, _)| !*reactive)
        .map(|(ident, attr_name, ty, _, json)| {
            if *json {
                quote! {
                    let #ident: #ty = ::leptos_webcomponent::parse_json_prop(props_json, #attr_name)
                        .unwrap_or_default();
                }
            } else {
                quote! {
                    let #ident: #ty = ::leptos_webcomponent::parse_prop(props_json, #attr_name);
                }
            }
        })
        .collect();
    // Event params become EventEmitters bound to the host element —
    // they don't come from attributes, so they're constructed once per
    // build, outside prop parsing.
    let event_binds: Vec<_> = events
        .iter()
        .map(|(ident, event_name, ty)| {
            quote! {
                let #ident: #ty = ::leptos_webcomponent::EventEmitter::new(
                    __host_for_builder.clone(),
                    #event_name,
                );
            }
        })
        .collect();
    // After `#[component]` expands, the function no longer takes
    // positional args — it takes one `<Name>Props` struct (that's how
    // Leptos's own macro rewrites it). So the generated call must
    // build that struct, not call the fn positionally.
    let props_struct_ident = format_ident!("{}Props", fn_name);
    let mut struct_fields: Vec<_> = props.iter().map(|(ident, ..)| quote! { #ident }).collect();
    struct_fields.extend(events.iter().map(|(ident, _, _)| quote! { #ident }));

    // Strip #[attr]/#[event] markers from the original fn so `#[component]`
    // below it sees plain params (the macro is meant to sit ABOVE #[component]).
    // Reactive params additionally get their declared type rewritten from
    // `T` to `RwSignal<T>` so the component body reads/writes the signal.
    let mut clean_fn = input_fn.clone();
    for arg in &mut clean_fn.sig.inputs {
        if let FnArg::Typed(PatType { pat, ty, attrs, .. }) = arg {
            if let Pat::Ident(pat_ident) = &**pat {
                let ident = &pat_ident.ident;
                if let Some((_, _, base_ty, reactive, json)) =
                    props.iter().find(|(id, ..)| id == ident)
                {
                    if *reactive && !*json {
                        let sig_ty = quote! { ::leptos::prelude::RwSignal<#base_ty> };
                        *ty = syn::parse2(sig_ty).expect("rewriting reactive param type");
                    }
                }
            }
            attrs.retain(|a| !a.path().is_ident("attr") && !a.path().is_ident("event"));
        }
    }

    let expanded = quote! {
        #[allow(non_snake_case)]
        #clean_fn

        // Mount registers a generic builder closure with the runtime so
        // attribute changes can remount with freshly parsed props (see
        // `update_instance`). The closure parses props from the raw JSON
        // string and mounts the view via `mount_view` (which returns the
        // type-erased disposer the runtime stores).
        #[wasm_bindgen::prelude::wasm_bindgen]
        #[allow(non_snake_case)]
        pub fn #mount_fn(host: web_sys::HtmlElement, props_json: wasm_bindgen::JsValue) {
            let __props = props_json.as_string().unwrap_or_default();
            let __host_for_builder = host.clone();
            let mut __wc_setters: ::std::collections::HashMap<
                ::std::string::String,
                ::leptos_webcomponent::PropSetter,
            > = ::std::collections::HashMap::new();
            #(#reactive_setup)*
            ::leptos_webcomponent::mount_instance(&host, &__props, __wc_setters, move |props_json: &str| {
                #(#prop_reads)*
                #(#event_binds)*
                ::leptos_webcomponent::mount_view(__host_for_builder.clone(), move || {
                    #fn_name(#props_struct_ident { #(#struct_fields),* })
                })
            });
        }

        #[wasm_bindgen::prelude::wasm_bindgen]
        #[allow(non_snake_case)]
        pub fn #update_fn(host: web_sys::HtmlElement, props_json: wasm_bindgen::JsValue) {
            let __props = props_json.as_string().unwrap_or_default();
            ::leptos_webcomponent::update_instance(&host, &__props);
        }

        #[wasm_bindgen::prelude::wasm_bindgen]
        #[allow(non_snake_case)]
        pub fn #unmount_fn(host: web_sys::HtmlElement) {
            ::leptos_webcomponent::unmount_instance(&host);
        }

        /// Descriptor consumed by webcomponent-runtime.js to call
        /// `customElements.define(tag, ...)` with the right observed
        /// attributes, without any hand-written per-component JS.
        #[wasm_bindgen::prelude::wasm_bindgen]
        #[allow(non_snake_case)]
        pub fn #meta_fn() -> wasm_bindgen::JsValue {
            let json = format!(
                r#"{{"tag":"{}","mount":"{}","update":"{}","unmount":"{}","attrs":{},"events":{}}}"#,
                #tag_name,
                stringify!(#mount_fn),
                stringify!(#update_fn),
                stringify!(#unmount_fn),
                #attr_names_json,
                #events_json,
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

/// Extracts `(reactive, json)` flags from `#[attr(...)]` option tokens.
fn flag_opts(a: &syn::Attribute) -> (bool, bool) {
    let mut reactive = false;
    let mut json = false;
    if let syn::Meta::List(list) = &a.meta {
        list.clone().tokens.into_iter().for_each(|tt| {
            if let proc_macro2::TokenTree::Ident(ident) = tt {
                match ident.to_string().as_str() {
                    "reactive" => reactive = true,
                    "json" => json = true,
                    _ => {}
                }
            }
        });
    }
    (reactive, json)
}
