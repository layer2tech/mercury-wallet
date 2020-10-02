//! # Error
//!
//! Custom Error types for client

use shared_lib::error::SharedLibError;

use bitcoin::util::{address::Error as AddressError, bip32::Error as Bip32Error};
use reqwest::Error as ReqwestError;
use daemon_engine::DaemonError;
use std::error;
use std::fmt;
use std::num::ParseIntError;

/// Client specific errors
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum CError {
    /// Generic error from string error message
    Generic(String),
    /// Wallet
    WalletError(WalletErrorType),
    /// State entity errors
    StateEntityError(String),
    /// Schnorr error
    SchnorrError(String),
    /// Inherit errors from SharedLibError
    SharedLibError(String),
    /// Tor error
    TorError(String)
}

impl From<String> for CError {
    fn from(e: String) -> CError {
        CError::Generic(e)
    }
}
impl From<&str> for CError {
    fn from(e: &str) -> CError {
        CError::Generic(e.to_string())
    }
}
impl From<SharedLibError> for CError {
    fn from(e: SharedLibError) -> CError {
        CError::SharedLibError(e.to_string())
    }
}
impl From<Box<dyn error::Error>> for CError {
    fn from(e: Box<dyn error::Error>) -> CError {
        CError::Generic(e.to_string())
    }
}

impl From<Bip32Error> for CError {
    fn from(e: Bip32Error) -> CError {
        CError::Generic(e.to_string())
    }
}
impl From<AddressError> for CError {
    fn from(e: AddressError) -> CError {
        CError::Generic(e.to_string())
    }
}
impl From<ReqwestError> for CError {
    fn from(e: ReqwestError) -> CError {
        CError::Generic(e.to_string())
    }
}
impl From<ParseIntError> for CError {
    fn from(e: ParseIntError) -> CError {
        CError::Generic(e.to_string())
    }
}
impl From<std::io::Error> for CError {
    fn from(e: std::io::Error) -> CError {
        CError::Generic(e.to_string())
    }
}

impl From<serde_json::Error> for CError {
    fn from(e: serde_json::Error) -> CError {
        CError::Generic(e.to_string())
    }
}

impl From<bitcoin::secp256k1::Error> for CError {
    fn from(e: bitcoin::secp256k1::Error) -> CError {
        CError::Generic(e.to_string())
    }
}

impl From<DaemonError> for CError {
    fn from(e: DaemonError) -> CError {
        CError::Generic(format!("{:?}",e))
    }
}


impl From<()> for CError {
    fn from(_e: ()) -> CError {
        CError::Generic(String::default())
    }
}

// impl From<pyo3::PyErr> for CError {
//     fn from(e: pyo3::PyErr) -> CError {
//         CError::Generic(format!("a python error occured: {:?}",e))
//     }
// }

impl std::convert::From<config::ConfigError> for CError {
    fn from(e: config::ConfigError) -> CError {
        CError::Generic(e.to_string())
    }
}

/// Wallet error types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum WalletErrorType {
    NotEnoughFunds,
    KeyNotFound,
    SharedKeyNotFound,
    KeyMissingData,
    StateChainNotFound,
}

impl WalletErrorType {
    fn as_str(&self) -> &'static str {
        match *self {
            WalletErrorType::NotEnoughFunds => "Not enough funds",
            WalletErrorType::KeyNotFound => "Key not found in wallet derivation path",
            WalletErrorType::SharedKeyNotFound => "Shared key not found in wallet derivation path",
            WalletErrorType::KeyMissingData => "Key is missing data",
            WalletErrorType::StateChainNotFound => "StateChain not found in wallet derivation path",
        }
    }
}

impl fmt::Display for CError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match *self {
            CError::Generic(ref e) => write!(f, "Error: {}", e),
            CError::WalletError(ref e) => write!(f, "Wallet Error: {} ", e.as_str()),
            CError::StateEntityError(ref e) => write!(f, "State Entity Error: {}", e),
            CError::SchnorrError(ref e) => write!(f, "Schnorr Error: {}", e),
            CError::SharedLibError(ref e) => write!(f, "SharedLib Error: {}", e),
            CError::TorError(ref e) => write!(f, "Tor Error: {}", e),
        }
    }
}

impl error::Error for CError {
    fn source(&self) -> Option<&(dyn error::Error + 'static)> {
        match *self {
            _ => None,
        }
    }
}
