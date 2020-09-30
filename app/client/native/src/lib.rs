
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
pub mod daemon;
pub mod wallet;
pub mod state_entity;
pub mod ecdsa;
pub mod utilities;

use config::Config as ConfigRs;
use error::CError;


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
    pub client: reqwest::blocking::Client,
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

    pub fn new_client() -> reqwest::blocking::Client {
    // pub fn new_client(tor: Option<&Tor>) -> reqwest::blocking::Client {
        // match tor {
        //     None => reqwest::blocking::Client::new(),
        //     Some(t) => match t.enable {
        //         true => reqwest::blocking::Client::builder()
        //                 .proxy(reqwest::Proxy::all(&t.proxy).unwrap())
        //                 .build().unwrap(),
        //         false => reqwest::blocking::Client::new(),
        //     }
        // }
        reqwest::blocking::Client::new()
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
