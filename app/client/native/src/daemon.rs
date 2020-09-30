//! Daemon
//!
//! Daemon is a UnixServer with loaded Wallet struct. It is accessed via server_request method
//! which is itself exposed to JavaScript via Neon-binding.

use super::Result;
use crate::wallet;
use crate::ClientShim;

use tokio::prelude::*;
use tokio::{spawn, run};
use serde::{Serialize, Deserialize};
use daemon_engine::{UnixServer, UnixConnection, JsonCodec};

use std::thread;
use std::collections::HashMap;
use std::sync::Mutex;

const unix_server_addr: &str = "/tmp/rustd.sock";

use shared_lib::mocks::mock_electrum::MockElectrum;
use electrumx_client::interface::Electrumx;

use neon::prelude::*;
use neon::register_module;

/// Example request object
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DaemonRequest {
    Get(String),
    Set(String, String),
    GenAddress
}

/// Example response object
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DaemonResponse {
    None,
    Value(String),
}

impl DaemonResponse {
    pub fn to_string(&self) -> String {
        format!("{:?}",self)
    }
}

/// Start Client UnixServer process
pub fn make_server(mut cx: FunctionContext) -> JsResult<JsString> {
    let server = future::lazy(move || {
        let mut s = UnixServer::<JsonCodec<DaemonResponse, DaemonRequest>>::new(unix_server_addr, JsonCodec::new()).unwrap();
        let m = Mutex::new(HashMap::<String, String>::new());

        // Pass these in from Electron
        let seed = [0xcd; 32];
        let client_shim = ClientShim::new("localhost".to_string(), None);
        let network = "testnet".to_string();

        let mut wallet = wallet::wallet::Wallet::new(&seed, &network, client_shim);

        let server_handle = s
            .incoming()
            .unwrap()
            .for_each(move |r| {
                println!("UnixServer: Request received: {:?}", r.data());
                let data = r.data();
                match data {
                    DaemonRequest::Get(k) => match m.lock().unwrap().get(&k) {
                        Some(v) => {
                            println!("Requested key: '{}' value: '{}", k, v);
                            r.send(DaemonResponse::Value(v.to_string()))
                        },
                        None => {
                            println!("Requested key: '{}' no value found", k);
                            r.send(DaemonResponse::None)
                        },
                    },
                    DaemonRequest::Set(k, v) => {
                        println!("Set key: '{}' value: '{}'", k, v);
                        m.lock().unwrap().insert(k, v.clone());
                        r.send(DaemonResponse::Value(v.to_string()))
                    },
                    DaemonRequest::GenAddress => {
                        let address = wallet.keys.get_new_address().unwrap();
                        println!("GenAddress: {:?}", address);
                        r.send(DaemonResponse::Value(address.to_string()))
                    }
                }.wait()
                .unwrap();

                Ok(())
            }).map_err(|_e| ());
        spawn(server_handle);
        Ok(())
    });

    let handle = thread::spawn(||{
        run(server);
    });

    Ok(cx.string("Server started!"))
}


/// Create UnixConnection and make example request to UnixServer
pub fn make_server_request_example(mut cx: FunctionContext) -> JsResult<JsString> {
    // Create client connector
    let client = UnixConnection::<JsonCodec<DaemonRequest, DaemonResponse>>::new(unix_server_addr, JsonCodec::new()).wait().unwrap();
    let (tx, rx) = client.split();

    tx.send(DaemonRequest::Set("key".to_string(), "value".to_string())).wait().unwrap();

    rx.map(|resp| -> Result<()> {
        println!("UnixConection: Response: {:?}", resp);
        Ok(())
    }).wait()
    .next();
    Ok(cx.string("Client setup!"))
}

fn make_unix_conn_call(cmd: DaemonRequest) -> Result<DaemonResponse> {
    let client = UnixConnection::<JsonCodec<DaemonRequest, DaemonResponse>>::new(unix_server_addr, JsonCodec::new()).wait().unwrap();
    let (tx, rx) = client.split();

    tx.send(cmd).wait().unwrap();

    let resp = rx.map(|resp| -> Result<DaemonResponse> {
       Ok(resp)
    }).wait().next();

    resp.unwrap().unwrap()
}

/// Create UnixConnection and make example request to UnixServer
pub fn api_gen_addr(mut cx: FunctionContext) -> JsResult<JsString> {
    let addr = make_unix_conn_call(DaemonRequest::GenAddress).unwrap();
    Ok(cx.string(addr.to_string()))
}


register_module!(mut m, {
        m.export_function("makeServer", make_server)?;
        m.export_function("makeServerRequestExample", make_server_request_example)?;
        m.export_function("apiGenAddr", api_gen_addr)?;
        Ok(())
    }
);
