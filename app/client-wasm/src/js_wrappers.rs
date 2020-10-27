//! Js Wrappers
//!
//! List of functions which are exposed to JavaScript via Neon-bindings: https://github.com/neon-bindings/neon
//! Return values and errors are serialized to String for pasing back to JavaScript.

// use crate::wallet;
// use crate::{state_entity::api::get_statechain_fee_info, ClientShim, daemon::{DaemonRequest, make_server, make_unix_conn_call}};
//
// use tokio::prelude::*;
// use tokio::{spawn, run};
// use serde::{Serialize, Deserialize};
// use daemon_engine::{DaemonError, UnixServer, UnixConnection, JsonCodec};
// use std::thread;
// use std::str::FromStr;

use wasm_bindgen::prelude::*;
// use web_sys::console;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
// #[cfg(feature = "wee_alloc")]
// #[global_allocator]
// static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// #[wasm_bindgen]
// pub fn log_to_js_console() {
//
//     console::log_1(&"Hello using web-sys".into());
//     let js: JsValue = 4.into();
//     console::log_2(&"Logging arbitrary values looks like".into(), &js);
// }

#[wasm_bindgen]
extern {
    pub fn alert(s: &str);
}

// Can be called by JS
#[wasm_bindgen]
pub fn greet(name: &str) {
    alert(&format!("Hello, {}!", name));
}


// #[wasm_bindgen]
// // Start Wallets UnixServer process
// pub fn js_wrap_make_server() {
//     console::log_1(&"starting server".into());
//     make_server().unwrap(); // panic to push error back to Electron
// }
//
// #[wasm_bindgen]
// pub fn js_wrap_api_gen_btc_addr() {
//     match make_unix_conn_call(DaemonRequest::GenAddressBTC) {
//         Ok(val) => console::log_1(&val.to_string().into()),
//         Err(e) => console::log_1(&e.to_string().into())
//     }
// }
//
// pub fn js_wrap_api_gen_se_addr(mut cx: FunctionContext) -> JsResult<JsValue> {
//     let txid = cx.argument::<JsString>(0)?.value();
//     match make_unix_conn_call(DaemonRequest::GenAddressSE(txid)) {
//         Ok(val) => return Ok(cx.string(val.to_string()).upcast::<JsValue>()),
//         Err(e) => return cx.throw_error(e.to_string())
//     }
// }
//
// pub fn js_wrap_api_get_se_fees(mut cx: FunctionContext) -> JsResult<JsValue> {
//     match make_unix_conn_call(DaemonRequest::GetFeeInfo) {
//         Ok(val) => return Ok(cx.string(val.to_string()).upcast::<JsValue>()),
//         Err(e) => return cx.throw_error(e.to_string())
//     }
// }
//
// pub fn js_wrap_api_deposit(mut cx: FunctionContext) -> JsResult<JsValue> {
//     let amount = cx.argument::<JsNumber>(0)?.value() as u64;
//     match make_unix_conn_call(DaemonRequest::Deposit(amount)) {
//         Ok(val) => return Ok(cx.string(val.to_string()).upcast::<JsValue>()),
//         Err(e) => return cx.throw_error(e.to_string())
//     }
// }
//
// /// Generic neon::Task implementation allows any Rust function to be called as from JS as async.
// /// Values and Errors serialized to string for passing to JS. This is because of restrictions on
// /// Errors in neon::Task Trait.
// struct JsAsyncTask;
// impl Task for JsAsyncTask {
//     type Output = ();
//     type Error = ();
//     type JsEvent = JsString;
//
//     fn perform(&self) -> Result<(), ()> {
//         Ok(())
//     }
//     fn complete(self, mut cx: TaskContext, _result: Result<(), ()>) -> JsResult<Self::JsEvent> {
//         Ok(cx.string("".to_string()))
//     }
// }
// /// Fn used to wrap Rust fns as async in JavaScript
// pub fn call_rust_as_async(mut cx: FunctionContext) -> JsResult<JsUndefined> {
//     let callback = cx.argument::<JsFunction>(0)?;
//     JsAsyncTask.schedule(callback);
//     Ok(cx.undefined())
// }
//
//
// register_module!(mut m, {
//         m.export_function("makeServer", js_wrap_make_server)?;
//         m.export_function("callRustAsAsync", call_rust_as_async)?;
//         m.export_function("apiGenBTCAddr", js_wrap_api_gen_btc_addr)?;
//         m.export_function("apiGenSEAddr", js_wrap_api_gen_se_addr)?;
//         m.export_function("apiGetSEfees", js_wrap_api_get_se_fees)?;
//         m.export_function("apiDeposit", js_wrap_api_deposit)?;
//         Ok(())
//     }
// );
