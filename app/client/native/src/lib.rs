
#[macro_use]
extern crate serde_derive;
extern crate serde;
extern crate serde_json;

#[macro_use]
extern crate clap;
extern crate tokio;
extern crate daemon_engine;

#[macro_use]
extern crate log;

extern crate shared_lib;

pub mod error;
pub mod wallet;

use config::Config as ConfigRs;
use error::CError;

use neon::prelude::*;
use neon::register_module;

type Result<T> = std::result::Result<T, CError>;

pub mod tor {
    pub static SOCKS5URL : &str = "socks5h://127.0.0.1:9050";
    pub static IPIFYURL: &str = "https://api6.ipify.org?format=json";
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    pub endpoint: String,
    pub electrum_server: String,
    pub testing_mode: bool,
    // pub tor: Tor,
}

impl Config {
    pub fn get() -> Result<Config> {
        let cfg = get_config()?;
        // let tor = Tor::from_config(&cfg);
        Ok(Config {
            endpoint: cfg.get("endpoint")?,
            electrum_server: cfg.get("electrum_server")?,
            testing_mode: cfg.get("testing_mode")?,
            // tor,
        })
    }
}

impl Default for Config {
    fn default() -> Config {
        Config {
            endpoint: "http://localhost:8000".to_string(),
            electrum_server: "127.0.0.1:60401".to_string(),
            testing_mode: true,
            // tor: Tor::default(),
        }
    }
}

pub fn default_config() -> Result<ConfigRs> {
    let mut conf_rs = ConfigRs::new();
    let _ = conf_rs
        // First merge struct default config
        .merge(ConfigRs::try_from(&Config::default())?)?;
    Ok(conf_rs)
}

pub fn get_config() -> Result<ConfigRs> {
    let mut conf_rs = default_config()?;
    // Add in `./Settings.toml`
    conf_rs.merge(config::File::with_name("Settings").required(false))?
    // Add in settings from the environment (with prefix "APP")
    // Eg.. `APP_DEBUG=1 ./target/app` would set the `debug` key
    .merge(config::Environment::with_prefix("MERC"))?;
    Ok(conf_rs)
}

#[derive(Debug, Clone)]
pub struct ClientShim {
    pub client: reqwest::Client,
    // pub tor: Option<Tor>,
    pub auth_token: Option<String>,
    pub endpoint: String,
}

impl ClientShim {

    pub fn from_config(config: &Config) -> ClientShim {
        // match config.tor.enable {
        //     true => Self::new(config.endpoint.to_owned(), None, Some(config.tor.clone())),
        //     false => Self::new(config.endpoint.to_owned(), None, None),
        // }
        Self::new(config.endpoint.to_owned(), None)
    }

    pub fn new(endpoint: String, auth_token: Option<String>) -> ClientShim {
    // pub fn new(endpoint: String, auth_token: Option<String>, tor: Option<Tor>) -> ClientShim {
        let client = Self::new_client();
        // let client = Self::new_client(tor.as_ref());
        let cs = ClientShim {
            client,
            // tor,
            auth_token,
            endpoint,
        };
        cs
    }

    pub fn new_client() -> reqwest::Client {
    // pub fn new_client(tor: Option<&Tor>) -> reqwest::Client {
        // match tor {
        //     None => reqwest::Client::new(),
        //     Some(t) => match t.enable {
        //         true => reqwest::Client::builder()
        //                 .proxy(reqwest::Proxy::all(&t.proxy).unwrap())
        //                 .build().unwrap(),
        //         false => reqwest::Client::new(),
        //     }
        // }
        reqwest::Client::new()
    }

    // pub fn new_tor_id(&mut self) -> Result<()> {
    //     match &self.tor {
    //         Some(t) => {
    //             t.newnym()?;
    //             self.client = Self::new_client(self.tor.as_ref());
    //             Ok(())
    //         },
    //         None => Err(CError::TorError("no Tor in ClientShim".to_string()))
    //     }
    // }
    //
    // pub fn get_public_ip_address(&self) -> Result<String> {
    //     let b = self.client.get(tor::IPIFYURL);
    //     let value = b.send()?.text()?;
    //     Ok(value)
    // }
}


// Server

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

/// Start Client UnixServer process
pub fn make_server(mut cx: FunctionContext) -> JsResult<JsString> {
    let server = future::lazy(move || {
        let mut s = UnixServer::<JsonCodec<Response, Request>>::new(unix_server_addr, JsonCodec::new()).unwrap();
        let m = Mutex::new(HashMap::<String, String>::new());

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
                        println!("also operate on wallet..");
                        let address = wallet.keys.get_new_address().unwrap();
                        println!("address: {:?}", address);
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



/// Create UnixConnection and make request to UnixServer
pub fn make_server_request(mut cx: FunctionContext) -> JsResult<JsString> {
    // Create client connector
    let client = UnixConnection::<JsonCodec<Request, Response>>::new(unix_server_addr, JsonCodec::new()).wait().unwrap();
    let (tx, rx) = client.split();

    tx.send(Request::Set("key".to_string(), "value".to_string())).wait().unwrap();

    rx.map(|resp| -> Result<()> {
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
