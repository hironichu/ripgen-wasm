use ripgen_lib::{RipGenIterator, RipGenManager};
use wasm_bindgen::prelude::*;
use std::io::{BufWriter, Write};

#[wasm_bindgen]
pub fn ripgen(subdomain: &str, worldlist: &str) -> JsValue {
    let manager = RipGenManager::new(
        subdomain.lines(),
        worldlist.lines(),
        &|word| word.len() >= 5
    ).expect("Failed to create Ripgen iterator");

    let rip_iter = manager
        .transform(ripgen_lib::dnsgen::swap_word_transform)
        .chain_transform(ripgen_lib::dnsgen::permute_words_transform)
        .chain_transform(ripgen_lib::dnsgen::numbers_transform)
        .chain_transform(ripgen_lib::dnsgen::dash_transform);
		//transform the rip_iter into a JsValue
		let mut buf = BufWriter::new(Vec::new());
		for line in rip_iter {
			writeln!(buf, "{}", line).expect("Failed to write to stdout buffer.");
		};
		buf.flush().expect("Failed to perform final flush to stdout buffer.");
		let buf = buf.into_inner().expect("Failed to convert stdout buffer to Vec<u8>.");
		let buf = String::from_utf8(buf).expect("Failed to convert Vec<u8> to String.");
		JsValue::from_str(&buf)
}
