pub extern crate ecies;
pub use bitcoin::util::key::PrivateKey;
pub use bitcoin::util::key::PublicKey;
use serde::{de::DeserializeOwned, Deserialize, Serialize};

use rocket::http::{ContentType, Status};
//use rocket::{Request, Response, Responder};
use rocket::response::Responder;
use std::io::Cursor;
use std::{error, fmt};

pub type Result<T> = std::result::Result<T, Box<dyn error::Error>>;

#[derive(Debug, Deserialize)]
pub enum ECIESError {
    /// Generic error from string error message
    Generic(String),
    /// Invalid argument error
    FormatError(String),
    /// Invalid argument error
    EncryptError(String),
    /// Invalid argument error
    DecryptError(String),
}

impl PartialEq for ECIESError {
    fn eq(&self, other: &Self) -> bool {
        use ECIESError::*;
        match (self, other) {
            (Generic(ref a), Generic(ref b)) => a == b,
            (FormatError(ref a), FormatError(ref b)) => a == b,
            (EncryptError(ref a), EncryptError(ref b)) => a == b,
            (DecryptError(ref a), DecryptError(ref b)) => a == b,
            _ => false,
        }
    }
}

impl From<String> for ECIESError {
    fn from(e: String) -> Self {
        Self::Generic(e)
    }
}

impl From<&str> for ECIESError {
    fn from(e: &str) -> Self {
        Self::Generic(String::from(e))
    }
}

impl fmt::Display for ECIESError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match *self {
            ECIESError::Generic(ref e) => write!(f, "ECIESError: {}", e),
            ECIESError::FormatError(ref e) => write!(f, "ECIESError::FormatError: {}", e),
            ECIESError::EncryptError(ref e) => write!(f, "ECIESError::EncryptError: {}", e),
            ECIESError::DecryptError(ref e) => write!(f, "ECIESError::DecryptError: {}", e),
        }
    }
}

impl error::Error for ECIESError {
    fn source(&self) -> Option<&(dyn error::Error + 'static)> {
        match *self {
            _ => None,
        }
    }
}

impl Responder<'static> for ECIESError {
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

use ECIESError::DecryptError;
use ECIESError::EncryptError;

impl Encryptable for String {}

impl SelfEncryptable for String {
    fn decrypt(&mut self, privkey: &PrivateKey) -> Result<()> {
        let sb = hex::decode(self.clone())?;
        *self = Self::from_encrypted_bytes(privkey, &sb)?;
        Ok(())
    }
    fn encrypt_with_pubkey(&mut self, pubkey: &PublicKey) -> Result<()> {
        let eb = self.to_encrypted_bytes(pubkey)?;
        *self = hex::encode(eb);
        Ok(())
    }
}

//WalletDecryptable things are able to supply a public key
//and are SelfEncryptable
pub trait WalletDecryptable: SelfEncryptable {
    fn get_public_key(&self) -> Result<Option<PublicKey>> {
        Ok(None)
    }
    fn encrypt(&mut self) -> Result<()> {
        match self.get_public_key()? {
            Some(k) => self.encrypt_with_pubkey(&k),
            None => Err(EncryptError(
                "struct does not have a public key for encryption".to_string(),
            )
            .into()),
        }
    }
}

//Encrypted serialization/deserialization
pub trait Encryptable: Serialize + Sized + DeserializeOwned {
    fn to_encrypted_bytes(&self, pubkey: &PublicKey) -> Result<Vec<u8>> {
        let str_self = serde_json::to_string(self)?;
        let serialized = str_self.as_bytes();
        Self::encrypt_with_pubkey(pubkey, serialized)
    }

    fn encrypt_with_pubkey(key: &PublicKey, msg: &[u8]) -> Result<Vec<u8>> {
        let key_bytes = &key.to_bytes();
        match ecies::encrypt(key_bytes, msg) {
            Ok(v) => Ok(v),
            Err(e) => Err(EncryptError(e.to_string()).into()),
        }
    }

    fn decrypt_with_privkey(key: &PrivateKey, msg: &[u8]) -> Result<Vec<u8>> {
        let key_bytes = &key.to_bytes();
        match ecies::decrypt(key_bytes, msg) {
            Ok(v) => Ok(v),
            Err(e) => Err(DecryptError(e.to_string()).into()),
        }
    }

    fn from_encrypted_bytes(privkey: &PrivateKey, ec: &[u8]) -> Result<Self> {
        let db = Self::decrypt_with_privkey(privkey, ec)?;
        let serialized = std::str::from_utf8(&db)?;
        let deser: Self = serde_json::from_str(&serialized)?;
        Ok(deser)
    }
}

pub trait SelfEncryptable {
    fn decrypt(&mut self, privkey: &PrivateKey) -> Result<()>;
    fn encrypt_with_pubkey(&mut self, pubkey: &PublicKey) -> Result<()>;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::util::keygen::generate_keypair;

    #[derive(Deserialize, Serialize, Debug, PartialEq, Clone)]
    struct TestStruct {
        first_item: String,
        second_item: u32,
    }

    impl Encryptable for TestStruct {}

    //Encryptable modified to only encrypt selected members of a struct
    //In this example first_item is encrypted
    impl SelfEncryptable for TestStruct {
        fn decrypt(&mut self, privkey: &PrivateKey) -> Result<()> {
            self.first_item.decrypt(privkey)?;
            Ok(())
        }

        fn encrypt_with_pubkey(&mut self, pubkey: &PublicKey) -> Result<()> {
            self.first_item.encrypt_with_pubkey(pubkey)?;
            Ok(())
        }
    }

    #[test]
    fn test_encrypt_decrypt_struct() {
        let ts = TestStruct {
            first_item: "test message".to_string(),
            second_item: 42,
        };
        let (sk, pk) = generate_keypair();
        let tse = ts.to_encrypted_bytes(&pk).unwrap();
        let tsu = TestStruct::from_encrypted_bytes(&sk, &tse).unwrap();

        assert_eq!(ts, tsu, "unencrypted != plain");

        let (sk2, _) = generate_keypair();
        let tse = ts.to_encrypted_bytes(&pk).unwrap();

        match TestStruct::from_encrypted_bytes(&sk2, &tse) {
            Ok(_) => assert!(false, "decryption should have failed"),
            Err(e) => match e.downcast_ref::<ECIESError>() {
                Some(_) => assert!(true),
                None => assert!(false, format!("wrong error: {}", e)),
            },
        }
    }

    #[test]
    fn test_encrypt_decrypt_string() {
        let mut str1 = String::from("str1");
        let str1_clone = str1.clone();
        let (sk, pk) = generate_keypair();
        str1.encrypt_with_pubkey(&pk).unwrap();
        assert_ne!(str1, str1_clone);
        str1.decrypt(&sk).unwrap();
        assert_eq!(str1, str1_clone);
    }

    #[test]
    fn test_self_encrypt_decrypt_struct() {
        let mut ts = TestStruct {
            first_item: "test message".to_string(),
            second_item: 42,
        };
        let ts_clone = ts.clone();
        let (sk, pk) = generate_keypair();
        ts.encrypt_with_pubkey(&pk).unwrap();
        assert_ne!(
            ts.first_item, ts_clone.first_item,
            "first item should have changed"
        );
        assert_eq!(
            ts.second_item, ts_clone.second_item,
            "second item should not have changed"
        );
        ts.decrypt(&sk).unwrap();
        assert_eq!(
            ts, ts_clone,
            "decrypted struct should equal original struct"
        );
    }
}
