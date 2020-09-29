
use bitcoin::secp256k1::Error as SecpError;
use bitcoin::util::address::Error as AddressError;
use monotree::Errors as MonotreeErrors;
use reqwest::Error as ReqwestError;
use reqwest::UrlError;
use serde_json::Error as SerdeJSONError;
use std::error;

use rocket::http::{ContentType, Status};
use rocket::response::Responder;
use rocket::Request;
use rocket::Response;

use std::fmt;
use std::io::Cursor;



/// Shared library specific errors
#[derive(Debug, Deserialize)]
pub enum SharedLibError {
    /// Generic error from string error message
    Generic(String),
    /// Invalid argument error
    FormatError(String),
}

impl From<AddressError> for SharedLibError {
    fn from(e: AddressError) -> SharedLibError {
        SharedLibError::Generic(e.to_string())
    }
}

impl From<String> for SharedLibError {
    fn from(e: String) -> SharedLibError {
        SharedLibError::Generic(e)
    }
}

impl From<SecpError> for SharedLibError {
    fn from(e: SecpError) -> SharedLibError {
        SharedLibError::Generic(e.to_string())
    }
}

impl From<MonotreeErrors> for SharedLibError {
    fn from(e: MonotreeErrors) -> SharedLibError {
        SharedLibError::Generic(e.to_string())
    }
}

impl From<UrlError> for SharedLibError {
    fn from(e: UrlError) -> SharedLibError {
        SharedLibError::Generic(e.to_string())
    }
}

impl From<SerdeJSONError> for SharedLibError {
    fn from(e: SerdeJSONError) -> SharedLibError {
        SharedLibError::Generic(e.to_string())
    }
}

impl From<ReqwestError> for SharedLibError {
    fn from(e: ReqwestError) -> SharedLibError {
        SharedLibError::Generic(e.to_string())
    }
}

impl fmt::Display for SharedLibError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match *self {
            SharedLibError::Generic(ref e) => write!(f, "Error: {}", e),
            SharedLibError::FormatError(ref e) => write!(f, "Format Error: {}", e),
        }
    }
}

impl error::Error for SharedLibError {
    fn source(&self) -> Option<&(dyn error::Error + 'static)> {
        match *self {
            _ => None,
        }
    }
}

impl Responder<'static> for SharedLibError {
    fn respond_to(self, _: &Request) -> ::std::result::Result<Response<'static>, Status> {
        Response::build()
            .header(ContentType::JSON)
            .sized_body(Cursor::new(format!("{}", self)))
            .ok()
    }
}
