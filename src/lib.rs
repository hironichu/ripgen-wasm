use ripgen_lib::{RipGenIterator, RipGenManager};
use wasm_bindgen::prelude::*;
use js_sys::Array;

#[wasm_bindgen]
pub fn ripgen(subdomain: &str, worldlist: Array) -> JsValue {
	let parsed_array = worldlist.join("\n").as_string().unwrap();
    let manager = RipGenManager::new(
        subdomain.lines(),
        parsed_array.lines(),
        &|word| word.len() >= 5
    ).expect("Failed to create Ripgen iterator");

    let rip_iter = manager
        .transform(ripgen_lib::dnsgen::swap_word_transform)
        .chain_transform(ripgen_lib::dnsgen::permute_words_transform)
        .chain_transform(ripgen_lib::dnsgen::numbers_transform)
        .chain_transform(ripgen_lib::dnsgen::dash_transform);

		return JsValue::from(rip_iter
        .map(|x| JsValue::from_str(&x))
        .collect::<Array>());
}
