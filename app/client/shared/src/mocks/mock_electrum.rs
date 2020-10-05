// Electrum server http RESTful API interface

use bitcoin::consensus;
use bitcoin::Transaction;
use electrumx_client::interface::Electrumx;
use electrumx_client::response::{
    GetBalanceResponse, GetBlockHeadersResponse, GetHistoryResponse, GetListUnspentResponse,
    GetTransactionConfStatus, GetTipResponse,
};

pub struct MockElectrum {}

impl MockElectrum {
    pub fn new() -> MockElectrum {
        MockElectrum {}
    }
}

impl Electrumx for MockElectrum {
    fn get_tip_header(&mut self) -> std::result::Result<GetTipResponse, Box<dyn std::error::Error>> {
        todo!()
     }
    fn get_block_header(&mut self, _height: usize) -> Result<String, Box<dyn std::error::Error>> {
        todo!()
    }
    fn get_block_headers(
        &mut self,
        _start_height: usize,
        _count: usize,
    ) -> Result<GetBlockHeadersResponse, Box<dyn std::error::Error>> {
        todo!()
    }
    fn estimate_fee(&mut self, _number: usize) -> Result<f64, Box<dyn std::error::Error>> {
        todo!()
    }
    fn relay_fee(&mut self) -> Result<f64, Box<dyn std::error::Error>> {
        todo!()
    }
    fn get_history(
        &mut self,
        _addr: &str,
    ) -> Result<Vec<GetHistoryResponse>, Box<dyn std::error::Error>> {
        todo!()
    }
    fn get_mempool(&mut self, _addr: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        todo!()
    }
    fn history(&mut self, _addr: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        todo!()
    }
    fn get_utxos(&mut self, _addr: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        todo!()
    }
    fn broadcast_transaction(
        &mut self,
        raw_tx: String,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let tx: Transaction = consensus::deserialize(&hex::decode(&raw_tx).unwrap()).unwrap();
        Ok(tx.txid().to_string())
    }
    fn get_transaction(
        &mut self,
        _tx_hash: String,
        _merkle: bool,
    ) -> Result<String, Box<dyn std::error::Error>> {
        todo!()
    }
    fn get_transaction_conf_status(
        &mut self,
        _tx_hash: String,
        _merkle: bool,
    ) -> Result<GetTransactionConfStatus, Box<dyn std::error::Error>> {
        Ok(GetTransactionConfStatus {
            in_active_chain: Some(true),
            confirmations: Some(2),
            blocktime: Some(123456789),
        })
    }
    fn get_merkle_transaction(
        &mut self,
        _tx_hash: String,
        _height: usize,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        todo!()
    }
    fn transaction_id_from_pos(
        &mut self,
        _height: usize,
        _tx_pos: usize,
        _merkle: bool,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        todo!()
    }
    fn get_fee_histogram_mempool(&mut self) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        todo!()
    }
    fn get_balance(
        &mut self,
        addr: &str,
    ) -> Result<GetBalanceResponse, Box<dyn std::error::Error>> {
        if addr == "bcrt1qghtup486tj8vgz2l5pkh8hqw8wzdudraa6hnzs" {
            return Ok(GetBalanceResponse {
                unconfirmed: 0,
                confirmed: 100,
            });
        }
        if addr == "tb1qghtup486tj8vgz2l5pkh8hqw8wzdudralnw74e" {
            return Ok(GetBalanceResponse {
                unconfirmed: 0,
                confirmed: 100,
            });
        }
        if addr == "bcrt1qsuqsurhgfduhqw6ejquw54482sqpkfc22gytyh" {
            return Ok(GetBalanceResponse {
                unconfirmed: 0,
                confirmed: 10000000,
            });
        }
        if addr == "tb1qsuqsurhgfduhqw6ejquw54482sqpkfc2gpaxn7" {
            return Ok(GetBalanceResponse {
                unconfirmed: 0,
                confirmed: 10000000,
            });
        }
        Ok(GetBalanceResponse {
            unconfirmed: 0,
            confirmed: 0,
        })
    }
    fn get_list_unspent(
        &mut self,
        addr: &str,
    ) -> Result<Vec<GetListUnspentResponse>, Box<dyn std::error::Error>> {
        if addr == "bcrt1qghtup486tj8vgz2l5pkh8hqw8wzdudraa6hnzs" {
            return Ok(vec![GetListUnspentResponse {
                height: 123,
                tx_hash: "e0a97cb38e7e73617ef75a57eaf2841eb06833407c0eae08029bd04ea7e6115a"
                    .to_string(),
                tx_pos: 0,
                value: 100,
            }]);
        }
        if addr == "tb1qghtup486tj8vgz2l5pkh8hqw8wzdudralnw74e" {
            return Ok(vec![GetListUnspentResponse {
                height: 123,
                tx_hash: "e0a97cb38e7e73617ef75a57eaf2841eb06833407c0eae08029bd04ea7e6115a"
                    .to_string(),
                tx_pos: 0,
                value: 100,
            }]);
        }
        if addr == "bcrt1qsuqsurhgfduhqw6ejquw54482sqpkfc22gytyh" {
            return Ok(vec![GetListUnspentResponse {
                height: 1234,
                tx_hash: "40bf39ffdf4322e4d30ed783feec5bd9eb2804b81f23ebd5e24ea2aa2365a326"
                    .to_string(),
                tx_pos: 1,
                value: 10000000,
            }]);
        }
        if addr == "tb1qsuqsurhgfduhqw6ejquw54482sqpkfc2gpaxn7" {
            return Ok(vec![GetListUnspentResponse {
                height: 1234,
                tx_hash: "40bf39ffdf4322e4d30ed783feec5bd9eb2804b81f23ebd5e24ea2aa2365a326"
                    .to_string(),
                tx_pos: 1,
                value: 10000000,
            }]);
        }
        Ok(vec![])
    }
}
