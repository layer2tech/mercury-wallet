mod utils;

use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;


#[wasm_bindgen]
extern {
    fn alert(s: &str);
}


#[wasm_bindgen]
pub fn greet() {
    alert("Hello, {{project-name}}!");
    println!("console log");
}

#[wasm_bindgen]
pub fn log_to_js_console() {
    use web_sys::console;

    console::log_1(&"Hello using web-sys".into());
    let js: JsValue = 4.into();
    console::log_2(&"Logging arbitrary values looks like".into(), &js);
}

#[wasm_bindgen]
pub fn greet_wo_alert() -> String {
    // println!("pritnl1n");
    "Rust str".into()
}
