//! Daemon
//!
//! Daemon is a UnixServer with loaded Wallet struct. It is accessed via server_request method
//! which is itself exposed to JavaScript via Neon-binding.

use super::Result;
use crate::wallet;
use crate::state_entity::deposit;
use crate::{state_entity::api::get_statechain_fee_info, ClientShim, error::CError};

use tokio::prelude::*;
use tokio::{spawn, run};
use serde::{Serialize, Deserialize};
use daemon_engine::{DaemonError, UnixServer, UnixConnection, JsonCodec};
use neon::prelude::*;
use neon::object::Class;
use neon::{result::Throw, register_module};
use std::{thread, time::Duration};

use std::str::FromStr;
use std::convert::From;

const UNIX_SERVER_ADDR: &str = "/tmp/rustd.sock";


/// Example request object
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DaemonRequest {
    GenAddressBTC,
    GenAddressSE(String),
    GetFeeInfo,
    Deposit(u64)
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
pub fn make_server() -> Result<()> {
    let server = future::lazy(move || {
        let mut s = UnixServer::<JsonCodec<DaemonResponse, DaemonRequest>>::new(UNIX_SERVER_ADDR, JsonCodec::new()).unwrap();

        // Should be passed in from Electron
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
                        let address = wallet.keys.get_new_address();
                        // Values and Errors serialized to string for pasing to JS
                        match address { // Values and Errors serialized to string for pasing to JS
                            Ok(val) => r.send(DaemonResponse::Value(serde_json::to_string(&val).unwrap())),
                            Err(e) => r.send(DaemonResponse::Error(serde_json::to_string(&e).unwrap()))
                        }
                    },
                    DaemonRequest::GenAddressSE(txid) => {
                        let address = wallet.get_new_state_entity_address(&txid);
                        match address { // Values and Errors serialized to string for pasing to JS
                            Ok(val) => r.send(DaemonResponse::Value(serde_json::to_string(&val).unwrap())),
                            Err(e) => r.send(DaemonResponse::Error(serde_json::to_string(&e).unwrap()))
                        }
                    },
                    DaemonRequest::GetFeeInfo => {
                        let fee_info_res = get_statechain_fee_info(&wallet.client_shim);
                        match fee_info_res {    // Values and Errors serialized to string for pasing to JS
                            Ok(val) => r.send(DaemonResponse::Value(serde_json::to_string(&val).unwrap())),
                            Err(e) => r.send(DaemonResponse::Error(serde_json::to_string(&e).unwrap()))
                        }
                    }
                    DaemonRequest::Deposit(amount) => {
                        let deposit_res = deposit::deposit(&mut wallet, &amount);
                        match deposit_res { // Values and Errors serialized to string for pasing to JS
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

    // Allow server to boot
    thread::sleep(Duration::from_millis(200));

    Ok(())
}


/// Create UnixConnection and make example request to UnixServer
pub fn make_unix_conn_call(cmd: DaemonRequest) -> Result<DaemonResponse> {
    let client = UnixConnection::<JsonCodec<DaemonRequest, DaemonResponse>>::new(UNIX_SERVER_ADDR, JsonCodec::new()).wait()?;
    let (tx, rx) = client.split();

    if let Err(_) = tx.send(cmd).wait() {
        return Err(CError::Generic("Failed to send request to UnixServer.".to_string()));
    }

    let resp = rx.map(|resp| -> DaemonResponse {
       resp
    }).wait().next();
    Ok(resp.unwrap().unwrap())
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_make_server() {
        let request = make_unix_conn_call(DaemonRequest::GenAddressBTC);
        assert!(request.is_err());
        assert!(format!("{}",serde_json::to_string(&request).unwrap()).contains("Connection refused"));

        let _ = make_server();
        let request = make_unix_conn_call(DaemonRequest::GenAddressBTC);
        assert!(request.is_ok());
    }
}
