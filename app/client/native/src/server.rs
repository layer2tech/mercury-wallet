/**
 * rust-daemon
 * Server example
 *
 * https://github.com/ryankurte/rust-daemon
 * Copyright 2018 Ryan Kurte
 */
use std::collections::HashMap;
use std::sync::Mutex;

use neon::prelude::*;
use neon::register_module;

#[macro_use]
extern crate clap;
use clap::{App, Arg};

extern crate tokio;
use tokio::prelude::*;
use tokio::{spawn, run};

extern crate serde;
use serde::{Serialize, Deserialize};

extern crate daemon_engine;
use daemon_engine::{UnixServer, JsonCodec};

use std::thread;


/// Example request object
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Request {
    Get(String),
    Set(String, String),
}

/// Example response object
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Response {
    None,
    Value(String),
}

fn main() {}

/// Start Client UnixServer process
pub fn make_server(mut cx: FunctionContext) -> JsResult<JsString> {
    let addr = "/tmp/rustd.sock";

    let server = future::lazy(move || {
        let mut s = UnixServer::<JsonCodec<Response, Request>>::new(&addr, JsonCodec::new()).unwrap();
        let m = Mutex::new(HashMap::<String, String>::new());

        let server_handle = s
            .incoming()
            .unwrap()
            .for_each(move |r| {
                println!("UnixServer: Request received: {:?}", r.data());
                let data = r.data();
                match data {
                    Request::Get(k) => match m.lock().unwrap().get(&k) {
                        Some(v) => {
                            println!("Requested key: '{}' value: '{}", k, v);
                            r.send(Response::Value(v.to_string()))
                        },
                        None => {
                            println!("Requested key: '{}' no value found", k);
                            r.send(Response::None)
                        },
                    },
                    Request::Set(k, v) => {
                        println!("Set key: '{}' value: '{}'", k, v);
                        m.lock().unwrap().insert(k, v.clone());
                        r.send(Response::Value(v.to_string()))
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

use daemon_engine::{UnixConnection,DaemonError};

/// Create UnixConnection and make request to UnixServer
pub fn make_server_request(mut cx: FunctionContext) -> JsResult<JsString> {
    let addr = "/tmp/rustd.sock";

    // Create client connector
    let client = UnixConnection::<JsonCodec<Request, Response>>::new(&addr, JsonCodec::new()).wait().unwrap();
    let (tx, rx) = client.split();

    tx.send(Request::Set("key".to_string(), "value".to_string())).wait().unwrap();

    rx.map(|resp| -> Result<(), DaemonError> {
        println!("UnixConection: Response: {:?}", resp);
        Ok(())
    }).wait()
    .next();
    Ok(cx.string("Client setup!"))
}

register_module!(mut m, {
        m.export_function("makeServer", make_server)?;
        m.export_function("makeServerRequest", make_server_request)?;
        Ok(())
    }
);
