//! Daemon
//!
//! Daemon is a UnixServer with loaded Wallet struct. It is accessed via server_request method
//! which is itself exposed to JavaScript via Neon-binding.

// use super::Result;
use crate::wallet;
use crate::{state_entity::api::get_statechain_fee_info, ClientShim};

use tokio::prelude::*;
use tokio::{spawn, run};
use serde::{Serialize, Deserialize};
use daemon_engine::{DaemonError, UnixServer, UnixConnection, JsonCodec};
use neon::prelude::*;
use neon::{result::Throw, register_module};
use std::thread;

const UNIX_SERVER_ADDR: &str = "/tmp/rustd.sock";


/// Example request object
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DaemonRequest {
    GenAddressBTC,
    GenAddressSE(String),
    GetFeeInfo
}

/// Example response object
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DaemonResponse {
    None,
    Value(String),
    Error(String)
}

impl DaemonResponse {
    pub fn to_string(&self) -> String {
        format!("{:?}",self)
    }
}

/// Start Wallets UnixServer process
pub fn make_server(mut cx: FunctionContext) -> JsResult<JsString> {
    let server = future::lazy(move || {
        let mut s = UnixServer::<JsonCodec<DaemonResponse, DaemonRequest>>::new(UNIX_SERVER_ADDR, JsonCodec::new()).unwrap();

        // Pass these in from Electron
        let seed = [0xcd; 32];
        let client_shim = ClientShim::new("http://localhost:8000".to_string(), None);
        let network = "testnet".to_string();

        let mut wallet = wallet::wallet::Wallet::new(&seed, &network, client_shim);

        let server_handle = s
            .incoming()
            .unwrap()
            .for_each(move |r| {
                let data = r.data();
                match data {
                    DaemonRequest::GenAddressBTC => {
                        let address = wallet.keys.get_new_address().unwrap();
                        r.send(DaemonResponse::Value(address.to_string()))
                    },
                    DaemonRequest::GenAddressSE(txid) => {
                        let address = wallet.get_new_state_entity_address(&txid).unwrap();
                        r.send(DaemonResponse::Value(serde_json::to_string(&address).unwrap()))
                    },
                    DaemonRequest::GetFeeInfo => {
                        let fee_info_res = get_statechain_fee_info(&wallet.client_shim);
                        // Values and Errors serialized to string for pasing to JS
                        match fee_info_res {
                            Ok(val) => r.send(DaemonResponse::Value(serde_json::to_string(&val).unwrap())),
                            Err(e) => r.send(DaemonResponse::Error(serde_json::to_string(&e).unwrap()))
                        }

                    }
                }.wait()
                .unwrap();

                Ok(())
            }).map_err(|_e| ());
        spawn(server_handle);
        Ok(())
    });

    let _ = thread::spawn(||{
        run(server);
    });

    Ok(cx.string("Server started!"))
}


/// Create UnixConnection and make example request to UnixServer
fn make_unix_conn_call(cmd: DaemonRequest) -> Result<DaemonResponse, DaemonError> {
    let client = UnixConnection::<JsonCodec<DaemonRequest, DaemonResponse>>::new(UNIX_SERVER_ADDR, JsonCodec::new()).wait().unwrap();
    let (tx, rx) = client.split();

    tx.send(cmd).wait().unwrap();

    let resp = rx.map(|resp| -> Result<DaemonResponse, DaemonError> {
       Ok(resp)
    }).wait().next();

    resp.unwrap().unwrap()
}

pub fn api_gen_btc_addr(mut cx: FunctionContext) -> JsResult<JsString> {
    let addr = make_unix_conn_call(DaemonRequest::GenAddressBTC).unwrap();
    Ok(cx.string(addr.to_string()))
}

pub fn api_gen_se_addr(mut cx: FunctionContext) -> JsResult<JsString> {
    let txid = cx.argument::<JsString>(0)?.value();
    let addr = make_unix_conn_call(DaemonRequest::GenAddressSE(txid)).unwrap();
    Ok(cx.string(addr.to_string()))
}

pub fn api_get_se_fees(mut cx: FunctionContext) -> JsResult<JsString> {
    let fee_info = make_unix_conn_call(DaemonRequest::GetFeeInfo).unwrap();
    Ok(cx.string(fee_info.to_string()))
}

// Generic neon::Task implementation allows any Rust function to be called as from JS as async.
struct  JsAsyncTask;
impl Task for JsAsyncTask {
    type Output = ();
    type Error = ();
    type JsEvent = JsString;

    fn perform(&self) -> Result<(), ()> {
        Ok(())
    }
    fn complete(self, mut cx: TaskContext, _result: Result<(), ()>) -> JsResult<Self::JsEvent> {
        Ok(cx.string("".to_string()))
    }
}

pub fn call_rust_as_async(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let callback = cx.argument::<JsFunction>(0)?;
    JsAsyncTask.schedule(callback);
    Ok(cx.undefined())
}


register_module!(mut m, {
        m.export_function("makeServer", make_server)?;
        m.export_function("apiGenBTCAddr", api_gen_btc_addr)?;
        m.export_function("apiGenSEAddr", api_gen_se_addr)?;
        m.export_function("apiGetSEfees", api_get_se_fees)?;
        m.export_function("callRustAsAsync", call_rust_as_async)?;
        Ok(())
    }
);
