#[cfg(test)]
use crate::Root;
use base64::encode;
use bitcoin::secp256k1::Secp256k1;
use bitcoin::util::key::PrivateKey;
use chrono::{offset::Utc, DateTime, NaiveDateTime};
use merkletree::hash::Algorithm;
#[cfg(test)]
use mockito::{mock, Matcher, Mock};
use reqwest;
use rocket::http::{ContentType, Status};
use rocket::response::Responder;
#[cfg(test)]
use serde_json::json;
use std::collections::HashMap;
use std::convert::TryInto;
use std::error;
use std::fmt;
use std::fmt::Display;
use std::hash::Hasher;
use std::io::Cursor;
use std::str::FromStr;
use std::string::ToString;

pub type Result<T> = std::result::Result<T, Box<dyn error::Error>>;

pub type Hash = monotree::Hash;

type Payload<'a> = HashMap<&'a str, &'a str>;

#[derive(Serialize, Deserialize, PartialEq, Copy, Default, Debug)]
pub struct Commitment(Hash);

impl APIObject for Commitment {
    fn from_json(json_data: &serde_json::Value) -> Result<Self> {
        Self::check_for_error(json_data)?;
        let resp = Response::from_json(json_data);
        if resp.is_ok() {
            let resp = resp?;
            return Ok(Self::from_response(&resp)?);
        }
        Ok(Self::from_str(get_str(json_data, "commitment")?)?)
    }
}

impl Commitment {
    pub fn from_latest(conf: &MainstayConfig) -> Result<Self> {
        let command = &format!("latestcommitment?position={}", conf.position);

        Self::from_command(command, conf)
    }

    fn from_response(response: &Response) -> Result<Self> {
        Ok(Self::from_str(get_str(&response.response, "commitment")?)?)
    }
}

#[derive(Debug, Deserialize)]
pub enum MainstayError {
    /// Generic error from string error message
    Generic(String),
    /// Invalid argument error
    FormatError(String),
    /// Item not found error
    NotFoundError(String),
    ConfigurationError(String),
}

impl PartialEq for MainstayError {
    fn eq(&self, other: &Self) -> bool {
        use MainstayError::*;
        match (self, other) {
            (Generic(ref a), Generic(ref b)) => a == b,
            (FormatError(ref a), FormatError(ref b)) => a == b,
            (NotFoundError(ref a), NotFoundError(ref b)) => a == b,
            (ConfigurationError(ref a), ConfigurationError(ref b)) => a == b,
            _ => false,
        }
    }
}

impl From<String> for MainstayError {
    fn from(e: String) -> Self {
        Self::Generic(e)
    }
}

impl From<&str> for MainstayError {
    fn from(e: &str) -> Self {
        Self::Generic(String::from(e))
    }
}

impl fmt::Display for MainstayError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match *self {
            MainstayError::Generic(ref e) => write!(f, "MainstayError: {}", e),
            MainstayError::FormatError(ref e) => write!(f, "MainstayError::FormatError: {}", e),
            MainstayError::NotFoundError(ref e) => write!(f, "MainstayError::NotFoundError: {}", e),
            MainstayError::ConfigurationError(ref e) => {
                write!(f, "MainstayError::ConfigurationError: {}", e)
            }
        }
    }
}

impl error::Error for MainstayError {
    fn source(&self) -> Option<&(dyn error::Error + 'static)> {
        match *self {
            _ => None,
        }
    }
}

impl Responder<'static> for MainstayError {
    fn respond_to(
        self,
        _: &rocket::Request,
    ) -> ::std::result::Result<rocket::Response<'static>, Status> {
        rocket::Response::build()
            .header(ContentType::JSON)
            .sized_body(Cursor::new(format!("{}", self)))
            .ok()
    }
}

#[derive(Debug, Deserialize)]
// Type wrappers for the error strings returned by the mainstay API
pub enum MainstayAPIError {
    /// Generic error from string error message
    Generic(String),
    /// Item not found error
    NotFoundError(String),
}

impl PartialEq for MainstayAPIError {
    fn eq(&self, other: &Self) -> bool {
        use MainstayAPIError::*;
        match (self, other) {
            (Generic(ref a), Generic(ref b)) => a == b,
            (NotFoundError(ref a), NotFoundError(ref b)) => a == b,
            _ => false,
        }
    }
}

impl From<String> for MainstayAPIError {
    fn from(e: String) -> Self {
        Self::Generic(e)
    }
}

impl From<&str> for MainstayAPIError {
    fn from(e: &str) -> Self {
        Self::Generic(String::from(e))
    }
}

impl fmt::Display for MainstayAPIError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match *self {
            MainstayAPIError::Generic(ref e) => write!(f, "MainstayAPIError: {}", e),
            MainstayAPIError::NotFoundError(ref e) => {
                write!(f, "MainstayAPIError::NotFoundError: {}", e)
            }
        }
    }
}

impl error::Error for MainstayAPIError {
    fn source(&self) -> Option<&(dyn error::Error + 'static)> {
        match *self {
            _ => None,
        }
    }
}

impl Responder<'static> for MainstayAPIError {
    fn respond_to(
        self,
        _: &rocket::Request,
    ) -> ::std::result::Result<rocket::Response<'static>, Status> {
        rocket::Response::build()
            .header(ContentType::JSON)
            .sized_body(Cursor::new(format!("{}", self)))
            .ok()
    }
}

use MainstayError::FormatError;
use MainstayError::NotFoundError;

impl Commitment {
    pub fn to_hash(&self) -> Hash {
        self.0
    }
}

impl std::clone::Clone for Commitment {
    fn clone(&self) -> Self {
        *self
    }
}

impl Display for Commitment {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", hex::encode(self.0))
    }
}

impl FromStr for Commitment {
    type Err = Box<dyn error::Error>;
    fn from_str(s: &str) -> Result<Self> {
        let hs: Hash = match hex::decode(s)?[..].try_into() {
            Ok(h) => h,
            Err(e) => return Err(MainstayError::Generic(e.to_string()).into()),
        };
        Ok(Self(hs))
    }
}

pub struct Request(reqwest::blocking::RequestBuilder);

impl Request {
    //Construct a request from the give payload and config
    pub fn from(
        payload: Option<&Payload>,
        command: &String,
        config: &MainstayConfig,
        signature: Option<String>,
    ) -> Result<Self> {
        //Build request
        let client = reqwest::blocking::Client::new();
        let url = reqwest::Url::parse(&format!("{}/{}", config.url(), command))?;

        //If there is a payload this is a 'POST' request, otherwise a 'GET' request
        let req = match payload {
            Some(p) => {
                let payload_str = String::from(serde_json::to_string(&p)?);
                let payload_enc = encode(payload_str);
                let mut data = HashMap::new();
                data.insert("X-MAINSTAY-PAYLOAD", &payload_enc);
                let sig_str = match signature {
                    Some(s) => s,
                    None => String::from(""),
                };
                data.insert("X-MAINSTAY-SIGNATURE", &sig_str);
                client
                    .post(url)
                    .header(reqwest::header::CONTENT_TYPE, "application/json")
                    .json(&data)
            }
            None => client
                .get(url)
                .header(reqwest::header::CONTENT_TYPE, "application/json"),
        };

        Ok(Self(req))
    }

    pub fn send(self) -> std::result::Result<reqwest::blocking::Response, reqwest::Error> {
        self.0.send()
    }
}

fn get(command: &str, config: &MainstayConfig) -> Result<serde_json::Value> {
    let url = reqwest::Url::parse(&format!("{}/{}", config.url(), command))?;
    let resp = reqwest::blocking::get(url)?;
    let resp_json = resp.json()?;
    Ok(resp_json)
}

pub trait Attestable {
    //Attest to the mainstay slot using the specified config
    fn attest(&self, config: &MainstayConfig) -> Result<()> {
        let commitment: &Commitment = &self.commitment()?;
        let signature = match config.key {
            Some(k) => Some(self.sign(&k)?.to_string()),
            None => None,
        };

        let mut payload = Payload::new();
        let com = &commitment.to_string();
        let pos = &config.position.to_string();
        let tok = &config.token.to_string();
        payload.insert("commitment", &com);
        payload.insert("position", &pos);
        payload.insert("token", &tok);

        let req = Request::from(
            Some(&payload),
            &String::from("commitment/send"),
            config,
            signature,
        )?
        .0;
        let res = req.send()?;
        let err_base = "commitment failed";

        if res.status().is_success() {
            match res.json::<serde_json::Value>() {
                Ok(j) => {
                    let response = Response::from_json(&j)?;
                    match response.response.as_str() {
                        Some(r) => match r == "Commitment added" {
                            true => return Ok(()),
                            false => {
                                return Err(MainstayError::Generic(format!(
                                    "{} - expected \"Commitment added\" in response",
                                    err_base
                                ))
                                .into())
                            }
                        },
                        None => {
                            return Err(MainstayError::Generic(format!(
                                "{} - response",
                                err_base
                            ))
                            .into())
                        }
                    }
                }
                Err(e) => Err(e.into()),
            }
        } else {
            return Err(MainstayError::Generic(format!("{}", err_base)).into());
        }
    }

    //The data to be commited
    fn commitment(&self) -> Result<Commitment>;

    fn sign(&self, priv_key: &PrivateKey) -> Result<Commitment> {
        let commitment = &self.commitment()?;
        let hash = &commitment.0;
        let secp = Secp256k1::new();
        let message = &bitcoin::secp256k1::Message::from_slice(hash)?;
        let signature = secp.sign(message, &priv_key.key).serialize_der().to_vec();
        let mut sig: Hash = Default::default();
        sig.copy_from_slice(&signature);
        Ok(Commitment(sig))
    }
}

impl Attestable for Hash {
    fn commitment(&self) -> Result<Commitment> {
        let commitment = Commitment::from_hash(&self);
        Ok(commitment)
    }
}

//The commitment of a Hash type is just the Hash itelf
impl Attestable for Commitment {
    fn commitment(&self) -> Result<Commitment> {
        Ok(*self)
    }
}

impl Commitment {
    pub fn from_hash(hash: &Hash) -> Self {
        Commitment(*hash)
    }
}

//Mainstay configuration
#[derive(Debug, Serialize, Deserialize)]
pub struct MainstayConfig {
    url: String,
    position: u64,
    token: String,
    key: Option<PrivateKey>,
}

#[cfg(test)]
fn test_url() -> String {
    String::from(&mockito::server_url())
}

impl MainstayConfig {
    pub fn url(&self) -> String {
        self.url.clone()
    }

    pub fn mock_from_url(url: &String) -> Self {
        Self {
            url: url.to_string(),
            key: None,
            position: 1,
            token: String::from("f0000000-0000-0000-0000-00000000000d"),
        }
    }

    #[cfg(test)]
    fn mock() -> Self {
        Self::mock_from_url(&test_url())
    }
}

impl FromStr for MainstayConfig {
    type Err = Box<dyn error::Error>;
    fn from_str(s: &str) -> Result<Self> {
        match serde_json::from_str(s) {
            Ok(p) => Ok(p),
            Err(e) => Err(MainstayError::Generic(e.to_string()).into()),
        }
    }
}

impl Default for MainstayConfig {
    #[cfg(not(test))]
    fn default() -> Self {
        Self {
            url: String::from("https://mainstay.xyz/api/v1"),
            key: None,
            position: u64::default(),
            token: String::default(),
        }
    }

    #[cfg(test)]
    fn default() -> Self {
        MainstayConfig::mock()
    }
}

#[derive(Serialize, Deserialize)]
struct MSJSON {
    response: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, PartialEq)]
pub struct Response {
    response: serde_json::Value,
}

//An object that can be retreived from the API that is indexed with a commitment
//E.g. CommitmentInfo, merkle::Proof
pub trait CommitmentIndexed: APIObject {
    fn from_commitment(config: &MainstayConfig, commitment: &Commitment) -> Result<Self> {
        let command = &format!("commitment/commitment?commitment={}", commitment);
        Self::from_command(command, config)
    }

    fn from_attestable<T: Attestable>(config: &MainstayConfig, attestable: &T) -> Result<Self> {
        let commitment = &attestable.commitment()?;
        Self::from_commitment(config, commitment)
    }
}

pub trait APIObject: Sized {
    fn from_json(json_data: &serde_json::Value) -> Result<Self>;

    fn from_command(command: &str, config: &MainstayConfig) -> Result<Self> {
        let response = get(command, config);
        match response {
            Ok(r) => Self::from_json(&r),
            Err(e) => Err(MainstayError::Generic(format!(
                "Error getting API object from command: {}",
                e.to_string()
            ))
            .into()),
        }
    }

    fn check_for_error(json_data: &serde_json::Value) -> Result<()> {
        match get_str(json_data, "error") {
            Ok(e) => {
                if e == "Not found" {
                    return Err(MainstayAPIError::NotFoundError(e.to_string()).into());
                }
                Err(MainstayAPIError::Generic(e.to_string()).into())
            }
            Err(e) => match e.downcast_ref::<MainstayError>() {
                Some(e_ms) => match e_ms {
                    MainstayError::NotFoundError(_) => Ok(()),
                    _ => Err(e.into()),
                },
                None => Err(e.into()),
            },
        }
    }
}

impl APIObject for Response {
    fn from_json(json_data: &serde_json::Value) -> Result<Self> {
        Self::check_for_error(json_data)?;
        match json_data.get("response") {
            Some(r) => Ok(Self {
                response: r.clone(),
            }),
            None => match json_data.get("error") {
                Some(e) => Err(NotFoundError(format!("{}", e)).into()),
                None => Ok(Self {
                    response: json_data.clone(),
                }),
            },
        }
    }
}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
//Information about a commitment: it's attestation, if any, and its proof
pub struct CommitmentInfo {
    attestation: Option<Attestation>,
    merkleproof: merkle::Proof,
}

impl Display for CommitmentInfo {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let att_str = match &self.attestation {
            Some(a) => a.to_string(),
            None => "None".to_string(),
        };
        write!(
            f,
            "attestation: {}, merkleproof: {}",
            att_str, self.merkleproof
        )
    }
}

/*
impl fmt::Debug for CommitmentInfo {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Point")
         .field("x", &self.x)
         .field("y", &self.y)
         .finish()
    }
}
*/

impl CommitmentInfo {
    pub fn merkle_root(&self) -> Commitment {
        self.merkleproof.merkle_root()
    }

    pub fn commitment(&self) -> Commitment {
        self.merkleproof.commitment()
    }

    //Is the commitment attested or not?
    pub fn is_confirmed(&self) -> bool {
        match &self.attestation {
            Some(a) => return a.confirmed,
            None => false,
        }
    }

    pub fn verify(&self) -> bool {
        self.merkleproof.verify()
    }

    pub fn from_latest(conf: &MainstayConfig) -> Result<Self> {
        Self::from_commitment(conf, &Commitment::from_latest(conf)?)
    }
}

impl APIObject for CommitmentInfo {
    fn from_json(json_data: &serde_json::Value) -> Result<Self> {
        Self::check_for_error(json_data)?;
        let resp = &Response::from_json(json_data)?;
        let mp = merkle::Proof::from_response(resp)?;
        match Attestation::from_response(resp) {
            Ok(a) => Ok(Self {
                attestation: Some(a),
                merkleproof: mp,
            }),
            Err(e) => Err(e),
        }
    }
}

impl CommitmentIndexed for CommitmentInfo {}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
pub struct Attestation {
    merkle_root: Commitment,
    txid: Commitment,
    confirmed: bool,
    inserted_at: DateTime<Utc>,
}

impl Display for Attestation {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(
            f,
            "merkle_root: {}, txid: {}, confirmed: {}, inserted_at: {}",
            self.merkle_root, self.txid, self.confirmed, self.inserted_at
        )
    }
}

impl APIObject for Attestation {
    fn from_json(json_data: &serde_json::Value) -> Result<Self> {
        Self::check_for_error(json_data)?;
        let resp = Response::from_json(json_data);
        if resp.is_ok() {
            let resp = resp?;
            return Ok(Self::from_response(&resp)?);
        }
        Ok(Self::from_json_attestation(
            json_data
                .get("attestation")
                .ok_or(NotFoundError("attestation".to_string()))?,
        )?)
    }
}

fn get_val<'a>(val: &'a serde_json::Value, key: &str) -> Result<&'a serde_json::Value> {
    Ok(val.get(key).ok_or(NotFoundError(key.to_string()))?)
}

fn get_str<'a>(val: &'a serde_json::Value, key: &str) -> Result<&'a str> {
    get_val(val, key)?
        .as_str()
        .ok_or(FormatError(key.to_string()).into())
}

fn get_bool(val: &serde_json::Value, key: &str) -> Result<bool> {
    get_val(val, key)?
        .as_bool()
        .ok_or(FormatError(key.to_string()).into())
}

fn get_u64(val: &serde_json::Value, key: &str) -> Result<u64> {
    get_val(val, key)?
        .as_u64()
        .ok_or(FormatError(key.to_string()).into())
}

fn get_array<'a>(
    val: &'a serde_json::Value,
    key: &str,
) -> Result<&'a std::vec::Vec<serde_json::Value>> {
    get_val(val, key)?
        .as_array()
        .ok_or(FormatError(key.to_string()).into())
}

fn get_commitment(val: &serde_json::Value, key: &str) -> Result<Commitment> {
    Commitment::from_str(get_str(val, key)?)
}

impl Attestation {
    pub fn from(
        merkle_root: Commitment,
        txid: Commitment,
        confirmed: bool,
        inserted_at: DateTime<Utc>,
    ) -> Self {
        Self {
            merkle_root,
            txid,
            confirmed,
            inserted_at,
        }
    }

    pub fn merkle_root(&self) -> &Commitment {
        &self.merkle_root
    }

    fn from_response(response: &Response) -> Result<Self> {
        let val = response.response.get("attestation").ok_or(NotFoundError(
            "attestation object not found in Mainstay::Response".to_string(),
        ))?;
        Ok(Self::from_json_attestation(&val)?)
    }

    fn from_json_attestation(val: &serde_json::Value) -> Result<Self> {
        Self::check_for_error(val)?;

        let merkle_root = get_commitment(val, "merkle_root")?;

        let txid = get_commitment(val, "txid")?;

        let confirmed = get_bool(val, "confirmed")?;

        let inserted_at = String::from(get_str(val, "inserted_at")?);

        match inserted_at.contains(" UTC") {
            true => {
                let inserted_at = inserted_at.replace(" UTC", "");
                let inserted_at = DateTime::<Utc>::from_utc(
                    NaiveDateTime::parse_from_str(&inserted_at, "%H:%M:%S %m/%d/%Y")?,
                    Utc,
                );
                Ok(Self::from(merkle_root, txid, confirmed, inserted_at))
            }
            false => {
                Err(MainstayError::Generic(String::from("expected UTC in DateTime string")).into())
            }
        }
    }
}

pub mod merkle {
    use super::*;
    //Double sha256
    #[allow(unused_imports)]
    use bitcoin::hashes::sha256::HashEngine as SHAHashEngine;
    use bitcoin::hashes::sha256d::Hash as SHAHash;
    use bitcoin_hashes::Hash as HashesHash;
    use bitcoin_hashes::HashEngine as HashesHashEngine;

    pub struct HashAlgo(SHAHashEngine);

    impl HashAlgo {
        pub fn new() -> HashAlgo {
            //HashAlgo(Sha3::new(Sha3Mode::Sha3_256))
            let engine = SHAHash::engine();
            HashAlgo(engine)
        }
    }

    impl Default for HashAlgo {
        fn default() -> HashAlgo {
            HashAlgo::new()
        }
    }

    impl Hasher for HashAlgo {
        #[inline]
        fn write(&mut self, msg: &[u8]) {
            self.0.input(msg);
        }

        #[inline]
        fn finish(&self) -> u64 {
            unimplemented!()
        }
    }

    impl Algorithm<[u8; 32]> for HashAlgo {
        #[inline]
        fn hash(&mut self) -> [u8; 32] {
            SHAHash::from_engine(self.0.clone()).into_inner()
        }

        #[inline]
        fn reset(&mut self) {
            self.0 = SHAHash::engine();
        }
    }

    #[derive(Serialize, Deserialize, PartialEq, Clone, Debug)]
    pub struct Proof {
        merkle_root: Commitment,
        commitment: Commitment,
        ops: Vec<Commitment>,
        append: Vec<bool>,
        position: u64,
    }

    impl Display for Proof {
        fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
            write!(
                f,
                "merkle_root: {}, commitment: {}, ops: {:?}, append: {:?}, position: {}",
                self.merkle_root, self.commitment, self.ops, self.append, self.position
            )
        }
    }

    impl CommitmentIndexed for Proof {}

    impl APIObject for Proof {
        fn from_json(json_data: &serde_json::Value) -> Result<Self> {
            Self::check_for_error(json_data)?;

            let resp = Response::from_json(json_data);
            if resp.is_ok() {
                return Ok(Self::from_response(&resp?)?);
            }

            let json_data = match json_data.get("merkleproof") {
                Some(val) => val,
                None => json_data,
            };

            Ok(Self::from_merkleproof_json(json_data)?)
        }
    }

    impl Proof {
        pub fn from(
            merkle_root: Commitment,
            commitment: Commitment,
            ops: Vec<Commitment>,
            app: Vec<bool>,
            pos: u64,
        ) -> Result<Self> {
            match ops.len() == app.len() {
                true => Ok(Self {
                    merkle_root,
                    commitment,
                    ops,
                    append: app,
                    position: pos,
                }),
                false => {
                    Err(FormatError("ops and append must be of the same length".to_string()).into())
                }
            }
        }

        pub fn commitment(&self) -> Commitment {
            self.commitment
        }

        pub fn merkle_root(&self) -> Commitment {
            self.merkle_root
        }

        pub fn append(&self) -> Vec<bool> {
            self.append.clone()
        }

        pub fn ops(&self) -> Vec<Commitment> {
            self.ops.clone()
        }

        pub fn position(&self) -> u64 {
            self.position
        }

        pub fn from_response(response: &Response) -> Result<Self> {
            match response.response.get("merkleproof") {
                Some(val) => Self::from_merkleproof_json(val),
                None => Self::from_merkleproof_json(&response.response),
            }
        }

        fn from_merkleproof_json(val: &serde_json::Value) -> Result<Self> {
            let merkle_root = get_commitment(val, "merkle_root")?;

            let commitment = get_commitment(val, "commitment")?;

            let mut ops = Vec::<Commitment>::new();
            let mut append = Vec::<bool>::new();
            let ops_arr = get_array(val, "ops")?;
            for op in ops_arr {
                ops.push(get_commitment(op, "commitment")?);
                append.push(get_bool(op, "append")?);
            }

            let position = get_u64(val, "position")?;

            Ok(Proof::from(merkle_root, commitment, ops, append, position)?)
        }

        fn hash_merkle_root(&self) -> Hash {
            let mut h = self.commitment.to_hash();
            //Reverse byte order for the MT hash
            h.reverse();
            let mut hasher = merkle::HashAlgo::new();
            let mut i = 0;
            for mut leaf in self.ops.iter().map(|l| l.to_hash()) {
                //Reverse byte order for the MT hash
                leaf.reverse();
                if (self.position >> i) & 1 != 0 {
                    hasher.write(&leaf);
                    hasher.write(&h);
                } else {
                    hasher.write(&h);
                    hasher.write(&leaf);
                }
                h = hasher.hash();
                i = i + 1;
                hasher.reset();
            }
            //Revert to the original byte order
            h.reverse();
            h
        }

        pub fn verify(&self) -> bool {
            self.hash_merkle_root() == self.merkle_root.to_hash()
        }
    }

    impl FromStr for Proof {
        type Err = Box<dyn error::Error>;
        fn from_str(s: &str) -> Result<Self> {
            let json_data: serde_json::Value = serde_json::from_str(s)?;

            Self::from_json(&json_data)
        }
    }
}

#[cfg(test)]
mod mocks {
    use super::{json, mock, Matcher, Mock};

    pub fn post_commitment() -> Mock {
        mock("POST", "/commitment/send")
        .match_header("content-type", "application/json")
        .with_body(json!({"response":"Commitment added","timestamp":1541761540,"allowance":{"cost":4832691}}).to_string())
        .with_header("content-type", "application/json")
    }

    //Create a mock
    //pub fn post_commitment_and_wait() -> (Mock, Mock) {
    //mock1 = mock("POST", "/commitment/send")
    //.match_header("content-type", "application/json")
    //.with_body(json!({"response":"Commitment added","timestamp":1541761540,"allowance":{"cost":4832691}}).to_string())
    //.with_header("content-type", "application/json")

    //}

    pub fn commitment_proof_not_found() -> Mock {
        mock(
            "GET",
            Matcher::Regex(r"^/commitment/commitment\?commitment=[abcdef\d]{64}".to_string()),
        )
        .with_header("Content-Type", "application/json")
        .with_body(
            "{\"error\":\"Not found\",\"timestamp\":1596123963077,
                        \"allowance\":{\"cost\":3796208}}",
        )
    }

    pub fn commitment() -> Mock {
        mock("GET", "/latestcommitment?position=1")

               .with_header("Content-Type", "application/json")

               .with_body("{

                   \"response\":
                    {
                        \"commitment\": \"71c7f2f246caf3e4f0b94ea4ad54b6c506687069bf1e17024cd5961b0df78d6d\",
                        \"merkle_root\": \"47fc767ebc5095133d6de9a060c248c115b3fdf5f30921de2ee111225690de01\",
                        \"txid\": \"4be7f5fbd3272cec65e520f5b04c79c2059548c4576558aac3f4f6655138d5d4\"
                    },
                    \"timestamp\": 1548329166363,
                    \"allowance\":
                    {
                        \"cost\": 3119659
               }
            }")
    }

    pub fn commitment_proof() -> Mock {
        mock("GET",
                        "/commitment/commitment?commitment=71c7f2f246caf3e4f0b94ea4ad54b6c506687069bf1e17024cd5961b0df78d6d")
                        .with_header("Content-Type", "application/json")
                        .with_body("{\"response\":{
                            \"attestation\":{\"merkle_root\":\"47fc767ebc5095133d6de9a060c248c115b3fdf5f30921de2ee111225690de01\",
                    \"txid\":\"4be7f5fbd3272cec65e520f5b04c79c2059548c4576558aac3f4f6655138d5d4\",\"confirmed\":true,
                    \"inserted_at\":\"12:07:54 05/02/2020 UTC\"},
                    \"merkleproof\":{\"position\":1,
                    \"merkle_root\":\"47fc767ebc5095133d6de9a060c248c115b3fdf5f30921de2ee111225690de01\",
                    \"commitment\":\"71c7f2f246caf3e4f0b94ea4ad54b6c506687069bf1e17024cd5961b0df78d6d\",
                    \"ops\":[{\"append\":false,\"commitment\":\"31e66288b9074bcfeb3bc5734f2d0b189ad601b61f86b8241ee427648b59fdbc\"},
                    {\"append\":true,\"commitment\":\"60da74551926c4283dd4b4e295d2a1eb5147b5cf6c7c2019e8b64c22a1ba5bab\"},{\"append\":true,
                    \"commitment\":\"94adb04ab09036fbc6cc164ec6df4d9d8fba45bcd7901a03d2e91b123071a5ec\"}]}}
                    ,\"timestamp\":1593160486862,
                    \"allowance\":{\"cost\":17954530}
                    }")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::util::keygen::generate_keypair;

    #[test]
    fn test_hash() {
        let commitment: Hash = Commitment::from_str(
            "31e66288b9074bcfeb3bc5734f2d0b189ad601b61f86b8241ee427648b59fdbc",
        )
        .unwrap()
        .to_hash();
        let mut hasher = merkle::HashAlgo::new();
        hasher.write(&commitment);
        let hash: Hash = hasher.hash();
        let expected_hash: Hash = Commitment::from_str(
            "bd23c4720e83435818a1074b33891a05e2112c5e510bdffdc3e276ad3b7f378b",
        )
        .unwrap()
        .to_hash();
        assert_eq!(hash, expected_hash);
    }

    #[test]
    fn test_commitment() {
        let random_hash = &monotree::utils::random_hash();
        let commitment = Commitment::from_hash(random_hash);
        let random_hash_string = hex::encode(random_hash);

        let commitment_from_str = Commitment::from_str(&random_hash_string).unwrap();

        assert_eq!(
            commitment_from_str.to_hash(),
            commitment.to_hash(),
            "expected hashes to be equal"
        );

        assert_eq!(
            &commitment.to_hash(),
            random_hash,
            "expected hashes to be equal"
        );
    }

    #[test]
    fn test_root() {
        let random_hash = &monotree::utils::random_hash();
        let root = Root::from_hash(random_hash);

        assert_eq!(&root.hash(), random_hash, "expected equal hashes");
    }

    #[test]
    fn test_commit() {
        let random_hash = Commitment::from_hash(&monotree::utils::random_hash());

        let mut config = MainstayConfig::mock();
        config.position = 1;

        let _m = mocks::post_commitment().create();

        match random_hash.attest(&config) {
            Ok(()) => assert!(true),
            Err(e) => assert!(false, format!("error: {}", e)),
        }
    }

    #[test]
    fn test_config() {
        let (priv_key, _pub_key) = generate_keypair();
        let privkey_str = priv_key.to_wif().to_string();

        let (priv_key_2, _pub_key_2) = generate_keypair();

        let str_1 =
            "{\"url\":\"https://mainstay.xyz/api/v1\", \"position\":234, \"token\":\"mytoken\"}";
        let str_2=format!("{{\"url\":\"https://mainstay.xyz/api/v1\", \"position\":234, \"token\":\"mytoken\", \"key\":\"{}\"}}", privkey_str);
        let config_1 = MainstayConfig::from_str(str_1).unwrap();
        //This is a tessts so we always get the test url
        assert!(
            config_1.url() == "https://mainstay.xyz/api/v1",
            "url parse fail"
        );
        assert!(config_1.position == 234, "position parse fail");
        assert!(config_1.token == "mytoken", "token parse fail");
        assert!(config_1.key == None, "key parse fail");
        let config_2 = MainstayConfig::from_str(&str_2).unwrap();
        assert!(
            config_2.key.unwrap().key == priv_key.key,
            "str_2 key parse fail"
        );
        assert!(
            config_2.key.unwrap().key != priv_key_2.key,
            "str_2 key parse check fail"
        );
    }

    #[test]
    fn test_proof() {
        let data_str = "{\"response\":{
                \"attestation\":{\"merkle_root\":\"47fc767ebc5095133d6de9a060c248c115b3fdf5f30921de2ee111225690de01\",
        \"txid\":\"4be7f5fbd3272cec65e520f5b04c79c2059548c4576558aac3f4f6655138d5d4\",\"confirmed\":true,
        \"inserted_at\":\"12:07:54 05/02/2020 UTC\"},
        \"merkleproof\":{\"position\":1,
        \"merkle_root\":\"47fc767ebc5095133d6de9a060c248c115b3fdf5f30921de2ee111225690de01\",
        \"commitment\":\"71c7f2f246caf3e4f0b94ea4ad54b6c506687069bf1e17024cd5961b0df78d6d\",
        \"ops\":[{\"append\":false,\"commitment\":\"31e66288b9074bcfeb3bc5734f2d0b189ad601b61f86b8241ee427648b59fdbc\"},
        {\"append\":true,\"commitment\":\"60da74551926c4283dd4b4e295d2a1eb5147b5cf6c7c2019e8b64c22a1ba5bab\"},{\"append\":true,
        \"commitment\":\"94adb04ab09036fbc6cc164ec6df4d9d8fba45bcd7901a03d2e91b123071a5ec\"}]}}
        ,\"timestamp\":1593160486862,
        \"allowance\":{\"cost\":17954530}
        }";

        let response_str = "{\"attestation\":{\"merkle_root\":\"47fc767ebc5095133d6de9a060c248c115b3fdf5f30921de2ee111225690de01\",
        \"txid\":\"4be7f5fbd3272cec65e520f5b04c79c2059548c4576558aac3f4f6655138d5d4\",\"confirmed\":true,
        \"inserted_at\":\"12:07:54 05/02/2020 UTC\"},\"merkleproof\":{\"position\":1,
        \"merkle_root\":\"47fc767ebc5095133d6de9a060c248c115b3fdf5f30921de2ee111225690de01\",
        \"commitment\":\"71c7f2f246caf3e4f0b94ea4ad54b6c506687069bf1e17024cd5961b0df78d6d\",
        \"ops\":[{\"append\":false,\"commitment\":\"31e66288b9074bcfeb3bc5734f2d0b189ad601b61f86b8241ee427648b59fdbc\"},
        {\"append\":true,\"commitment\":\"60da74551926c4283dd4b4e295d2a1eb5147b5cf6c7c2019e8b64c22a1ba5bab\"},{\"append\":true,
        \"commitment\":\"94adb04ab09036fbc6cc164ec6df4d9d8fba45bcd7901a03d2e91b123071a5ec\"}]}}";

        let merkleproof_str =
                "{\"position\":1,
                \"merkle_root\":\"47fc767ebc5095133d6de9a060c248c115b3fdf5f30921de2ee111225690de01\",
                \"commitment\":\"71c7f2f246caf3e4f0b94ea4ad54b6c506687069bf1e17024cd5961b0df78d6d\",
                \"ops\":[{\"append\":false,\"commitment\":\"31e66288b9074bcfeb3bc5734f2d0b189ad601b61f86b8241ee427648b59fdbc\"},
                {\"append\":true,\"commitment\":\"60da74551926c4283dd4b4e295d2a1eb5147b5cf6c7c2019e8b64c22a1ba5bab\"},{\"append\":true,
                \"commitment\":\"94adb04ab09036fbc6cc164ec6df4d9d8fba45bcd7901a03d2e91b123071a5ec\"}]}";

        let mp_1 = merkle::Proof::from_str(data_str).unwrap();
        let merkleproof_2 = merkle::Proof::from_str(response_str).unwrap();
        let merkleproof_3 = merkle::Proof::from_str(merkleproof_str).unwrap();

        let merkle_root = Commitment::from_str(
            "47fc767ebc5095133d6de9a060c248c115b3fdf5f30921de2ee111225690de01",
        )
        .unwrap();
        let commitment = Commitment::from_str(
            "71c7f2f246caf3e4f0b94ea4ad54b6c506687069bf1e17024cd5961b0df78d6d",
        )
        .unwrap();

        let mut ops = Vec::<Commitment>::new();
        ops.push(
            Commitment::from_str(
                "31e66288b9074bcfeb3bc5734f2d0b189ad601b61f86b8241ee427648b59fdbc",
            )
            .unwrap(),
        );
        ops.push(
            Commitment::from_str(
                "60da74551926c4283dd4b4e295d2a1eb5147b5cf6c7c2019e8b64c22a1ba5bab",
            )
            .unwrap(),
        );
        ops.push(
            Commitment::from_str(
                "94adb04ab09036fbc6cc164ec6df4d9d8fba45bcd7901a03d2e91b123071a5ec",
            )
            .unwrap(),
        );

        let mut append = Vec::<bool>::new();

        let position = 1;

        //Expect format error
        let fe_str = &format!(
            "expected {}, got ",
            &FormatError(String::default()).to_string()
        );
        match merkle::Proof::from(
            merkle_root.clone(),
            commitment.clone(),
            ops.clone(),
            append.clone(),
            position,
        ) {
            Err(e) => match e.downcast_ref::<MainstayError>() {
                Some(e) => {
                    //Find the specific type of mainstay error and act accordingly
                    match e {
                        MainstayError::FormatError(_) => assert!(true),
                        _ => assert!(false, "{} {}", fe_str, e),
                    }
                }
                None => assert!(false, "{} {}", fe_str, "None"),
            },
            Ok(_) => assert!(false, "{} {}", fe_str, "Ok"),
        };

        //Now format correctly
        append.push(false);
        append.push(true);
        append.push(true);

        let merkleproof_compare =
            merkle::Proof::from(merkle_root, commitment, ops, append, position).unwrap();

        assert!(mp_1 == merkleproof_2);
        assert!(mp_1 == merkleproof_3);
        assert!(mp_1 == merkleproof_compare);

        assert!(mp_1.verify(), "verify proof returned false");
        //Verify again
        assert!(mp_1.verify(), "verify proof returned false");
        //Ensure incorrect proof fails
        let mut wrong_commit = mp_1.commitment().to_hash();
        wrong_commit.reverse();
        let wrong_commit = Commitment::from_hash(&wrong_commit);
        let invalid_proof = merkle::Proof::from(
            mp_1.merkle_root(),
            wrong_commit,
            mp_1.ops(),
            mp_1.append(),
            mp_1.position(),
        )
        .unwrap();
        assert!(
            invalid_proof.verify() == false,
            "verification of invalid merkle proof should return false"
        );
    }

    #[test]
    fn test_get_proof_from_confirmed() {
        let _m1 = mocks::commitment_proof().create();
        let result = test_get_proof_from_commitment(
            &Commitment::from_str(
                "71c7f2f246caf3e4f0b94ea4ad54b6c506687069bf1e17024cd5961b0df78d6d",
            )
            .unwrap(),
        );
        assert!(result.is_ok());
    }

    #[test]
    fn test_get_proof_from_unconfirmed() {
        let exp_err_string = "Not found".to_string();
        let exp_err_type = MainstayAPIError::NotFoundError;
        let exp_err = &exp_err_type(exp_err_string);

        let _m1 = mocks::commitment_proof_not_found().create();

        match test_get_proof_from_commitment(
            &Commitment::from_hash(&monotree::utils::random_hash()),
        ) {
            Ok(_) => assert!(false, format!("expected {}", exp_err)),
            Err(e) => match e.downcast_ref::<MainstayAPIError>() {
                Some(e_ms) => assert!(e_ms == exp_err, format!("expected {}", exp_err)),
                None => assert!(false, format!("expected {}", exp_err)),
            },
        };
    }

    fn test_get_proof_from_commitment(commitment: &Commitment) -> Result<()> {
        let mut config = MainstayConfig::mock();
        config.position = 1;
        let _m = mocks::commitment_proof().create();

        let proof1 = merkle::Proof::from_commitment(&config, commitment)?;

        let proof2 = merkle::Proof::from_attestable::<Commitment>(&config, commitment)?;

        assert!(proof1 == proof2);

        //Don't retreive the proof for a non-existent commitment
        let commitment = &Commitment::from_hash(&monotree::utils::random_hash());

        assert!(
            merkle::Proof::from_commitment(&config, commitment).is_err(),
            "should not be able to retrieve proof for random commitment"
        );
        assert!(
            merkle::Proof::from_attestable::<Commitment>(&config, commitment).is_err(),
            "should not be able to retrieve proof for random commitment"
        );
        Ok(())
    }

    #[test]
    fn test_get_commitment_info() {
        let mut config = MainstayConfig::mock();
        config.position = 1;
        let _m = mocks::commitment_proof().create();

        //Retrieve the proof for a commitment
        let commitment = &Commitment::from_str(
            "71c7f2f246caf3e4f0b94ea4ad54b6c506687069bf1e17024cd5961b0df78d6d",
        )
        .unwrap();

        let proof1 = CommitmentInfo::from_commitment(&config, commitment).unwrap();

        let proof2 = merkle::Proof::from_attestable::<Commitment>(&config, commitment).unwrap();

        assert!(proof1.merkleproof == proof2);

        //Don't retreive the proof for a non-existent commitment
        let commitment = &Commitment::from_hash(&monotree::utils::random_hash());

        assert!(
            CommitmentInfo::from_commitment(&config, commitment).is_err(),
            "should not be able to retrieve random commitment"
        );
        assert!(
            merkle::Proof::from_attestable::<Commitment>(&config, commitment).is_err(),
            "should not be able to retrieve random commitment"
        );
    }

    #[test]
    fn test_commitment_to_from_str() {
        let com1 = Commitment::from_hash(&monotree::utils::random_hash());
        let com2 = Commitment::from_str(&com1.to_string()).unwrap();
        assert!(com1 == com2, format!("{} does not equal {}", com1, com2));
    }

    #[test]
    fn test_commitment_from_latest() {
        let config = MainstayConfig::default();
        let _m1 = mocks::commitment().create();

        let commitment = Commitment::from_latest(&config).unwrap();
        let commitment_exp = Commitment::from_str(
            "71c7f2f246caf3e4f0b94ea4ad54b6c506687069bf1e17024cd5961b0df78d6d",
        )
        .unwrap();
        assert_eq!(
            commitment.to_hash(),
            commitment_exp.to_hash(),
            "wrong commitment hash"
        );
    }

    #[test]
    fn test_ci_from_latest() {
        let config = &MainstayConfig::default();
        let _m1 = mocks::commitment().create();
        let _m2 = mocks::commitment_proof().create();

        match CommitmentInfo::from_latest(config) {
            Ok(ci) => assert!(ci.verify(), "invalid commitment info"),
            Err(e) => assert!(false, e.to_string()),
        };
    }
}
