//! Requests
//!
//! Send requests and decode responses

use serde;
use std::time::Instant;
use floating_duration::TimeFormat;

use super::Result;
use web_sys::console;

use super::error::CError;

#[derive(Debug, Clone)]
pub struct ClientShim {
    pub client: reqwest::Client,
    pub endpoint: String,
}

impl ClientShim {
    pub fn new(endpoint: String) -> ClientShim {
        ClientShim {
            client: reqwest::Client::new(),
            endpoint,
        }
    }
}


// pub async fn postb<T, V>(client_shim: &ClientShim, path: &str, body: T) -> Result<V>
// where
//     T: serde::ser::Serialize,
//     V: serde::de::DeserializeOwned,
// {
//     std::thread::sleep(std::time::Duration::from_millis(100));
//     let start = Instant::now();
//
//     let b = client_shim
//         .client
//         .post(&format!("{}/{}", client_shim.endpoint, path));
//
//     // catch reqwest errors
//     let value = match b.json(&body).send().await {
//         Ok(v) => {
//             //Reject responses that are too long
//             match v.content_length() {
//                 Some(l) => {
//                     if l > 1000000 {
//                         console::log_1(&format!("POST value ignored because of size: {}", l).into());
//                         return Err(CError::Generic(format!(
//                             "POST value ignored because of size: {}",
//                             l
//                         )));
//                     }
//                 }
//                 None => (),
//             };
//
//             let text = v.text().await?;
//
//             if text.contains(&String::from("Error: ")) {
//                 return Err(CError::StateEntityError(text));
//             }
//
//             text
//         }
//
//         Err(e) => return Err(CError::from(e)),
//     };
//     console::log_1(&format!("(req {}, took: {})", path, TimeFormat(start.elapsed())).into());
//
//     Ok(serde_json::from_str(value.as_str()).unwrap())
// }

// pub fn get<V>(client_shim: &ClientShim, path: &str) -> Result<V>
pub fn get<V>(path: &str) -> Result<V>
where
    V: serde::de::DeserializeOwned,
{
    std::thread::sleep(std::time::Duration::from_millis(1000));
    // let start = Instant::now();
    //
    // let mut b = client_shim
    //     .client
    //     .get(&format!("{}/{}", client_shim.endpoint, path));
    //
    // // if client_shim.auth_token.is_some() {
    // //     b = b.bearer_auth(client_shim.auth_token.clone().unwrap());
    // // }
    //
    // // catch reqwest errors
    // let value = match b.send() {
    //     Ok(v) => v.text().unwrap(),
    //     Err(e) => return Err(CError::from(e)),
    // };

    // info!("GET return value: {:?}", value);
    //
    // info!("(req {}, took: {})", path, TimeFormat(start.elapsed()));

    // catch State entity errors
    // if value.contains(&String::from("Error: ")) {
    //     return Err(CError::StateEntityError(value));
    // }

    Ok(serde_json::from_str("tomos").unwrap())
    // Ok(serde_json::from_str(value.as_str()).unwrap())
}
