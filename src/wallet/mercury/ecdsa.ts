// Mercury 2P-ECDSA KeyGen and Sign protocols

import { HttpClient, MockHttpClient, StateCoin, POST_ROUTE } from '../';

let types = require("../types")
let typeforce = require('typeforce');

export const PROTOCOL = {
   DEPOSIT: "Deposit",
   TRANSFER: "Transfer",
   WITHDRAW: "Withdraw"
};
Object.freeze(PROTOCOL);


// 2P-ECDSA Key generation. Output SharedKey struct.
export const keyGen = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  shared_key_id: string,
  secret_key: string,
  protocol: string
) => {

  let keygen_msg1 = {
      shared_key_id: shared_key_id,
      protocol: protocol,
  };
  // server first
  let server_resp_key_gen_first = await http_client.post(POST_ROUTE.KEYGEN_FIRST, keygen_msg1);
  let kg_party_one_first_message = server_resp_key_gen_first.msg;
  typeforce(types.KeyGenFirstMsgParty1, kg_party_one_first_message);

  // client first
  let client_resp_key_gen_first: ClientKeyGenFirstMsg =
    JSON.parse(
      wasm_client.KeyGen.first_message(secret_key)
    );
  typeforce(types.ClientKeyGenFirstMsg, client_resp_key_gen_first);

  // server second
  let key_gen_msg2 = {
    shared_key_id: shared_key_id,
    dlog_proof:client_resp_key_gen_first.kg_party_two_first_message.d_log_proof,
  }
  let kg_party_one_second_message = await http_client.post(POST_ROUTE.KEYGEN_SECOND, key_gen_msg2);
  typeforce(types.KeyGenParty1Message2, kg_party_one_second_message.msg);

  // client second
  let key_gen_second_message =
    JSON.parse(
      wasm_client.KeyGen.second_message(
        JSON.stringify(kg_party_one_first_message),
        JSON.stringify(kg_party_one_second_message.msg)
      )
    );
  typeforce(types.ClientKeyGenSecondMsg, key_gen_second_message);

  // Construct Rust MasterKey struct
  let master_key: MasterKey2 =
    JSON.parse(
      wasm_client.KeyGen.set_master_key(
        JSON.stringify(client_resp_key_gen_first.kg_ec_key_pair_party2),
        JSON.stringify(kg_party_one_second_message.msg
                .ecdh_second_message
                .comm_witness
                .public_share),
        JSON.stringify(key_gen_second_message.party_two_paillier)
    ));
  typeforce(types.MasterKey2, master_key);

  return new StateCoin(shared_key_id, master_key)
}

// 2P-ECDSA Sign.
// message should be hex string
export const sign = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  shared_key_id: string,
  master_key: MasterKey2,
  prepare_sign_msg: PrepareSignTxMsg,
  message: string,
  protocol: string
) => {
  // prepare-sign step. Allow server to check backup_tx.
  await http_client.post(POST_ROUTE.PREPARE_SIGN, prepare_sign_msg);
  
    //client first
    let client_sign_first: ClientSignFirstMsg =
      JSON.parse(
        wasm_client.Sign.first_message()
      );
    typeforce(types.ClientSignFirstMsg, client_sign_first);

    // server first
    let sign_msg1 = {
      shared_key_id: shared_key_id,
      eph_key_gen_first_message_party_two: client_sign_first.eph_key_gen_first_message_party_two,
    };
    
    let server_sign_first = await http_client.post(POST_ROUTE.SIGN_FIRST, sign_msg1);
    typeforce(types.ServerSignfirstMsg, server_sign_first.msg);


    
    let mks = JSON.stringify(master_key);
    let csfs = JSON.stringify(client_sign_first.eph_ec_key_pair_party2);
    let ecw = JSON.stringify(client_sign_first.eph_comm_witness);
    let ssf = JSON.stringify(server_sign_first.msg);
    
    let party_two_sign_message =
    JSON.parse(
        wasm_client.Sign.second_message(
          mks,
          csfs,
          ecw,
          ssf,
          message
        )
      );

    typeforce(types.ClientSignSecondMsg, party_two_sign_message);

    let sign_msg2 = {
        shared_key_id: shared_key_id,
        sign_second_msg_request: {
            protocol,
            message,
            party_two_sign_message,
        },
    };

    let resp: string[] = await http_client.post(POST_ROUTE.SIGN_SECOND, sign_msg2);
     
  return resp;
}

// 2P-ECDSA Sign.
// message should be hex string
export const sign_batch = async (
  http_client: HttpClient | MockHttpClient,
  wasm_client: any,
  shared_key_ids: string[],
  master_keys: any[],
  prepare_sign_msg: PrepareSignTxMsg,
  messages: string[],
  protocol: string
) => {
  // prepare-sign step. Allow server to check backup_tx.
  await http_client.post(POST_ROUTE.PREPARE_SIGN, prepare_sign_msg);

  let resps: any = [];

  let index = 0;

  //[...shared_key_ids].forEach(async (shared_key_id, index) => {
  for (let shared_key_id of shared_key_ids){
    //client first
    let client_sign_first: ClientSignFirstMsg =
      JSON.parse(
        wasm_client.Sign.first_message()
      );
    typeforce(types.ClientSignFirstMsg, client_sign_first);

    // server first
    let sign_msg1 = {
      shared_key_id: shared_key_id,
      eph_key_gen_first_message_party_two: client_sign_first.eph_key_gen_first_message_party_two,
    };
    
    let server_sign_first = await http_client.post(POST_ROUTE.SIGN_FIRST, sign_msg1);
    typeforce(types.ServerSignfirstMsg, server_sign_first.msg);

    //client second
    let party_two_sign_message =


    JSON.parse(
        wasm_client.Sign.second_message(
          JSON.stringify(master_keys[index]),
          JSON.stringify(client_sign_first.eph_ec_key_pair_party2),
          JSON.stringify(client_sign_first.eph_comm_witness),
          JSON.stringify(server_sign_first.msg),
          messages[index]
        )
      );
    typeforce(types.ClientSignSecondMsg, party_two_sign_message);

    let message = messages[index];

    let sign_msg2 = {
        shared_key_id: shared_key_id,
        sign_second_msg_request: {
            protocol,
            message,
            party_two_sign_message,
        },
    };

    let resp: string[] = await http_client.post(POST_ROUTE.SIGN_SECOND, sign_msg2);
    resps.push(resp);
    index = index + 1;
  }

  return resps;
}




// Types involved in 2P-ECDSA and Mercury protocols.
export interface PrepareSignTxMsg {
    shared_key_ids: string[],
    protocol: string,
    tx_hex: string,
    input_addrs: string[], // keys being spent from
    input_amounts: number[],
    proof_key: string | null,
}

// kms::ecdsa:two_party::MasterKey2
export interface MasterKey2 {
  public: Party2Public,
  private: any, // Leave as Object since we dont need these items in Wallet.
  chain_code: string,
}

// kms::ecdsa:two_party::Party2Public
export interface Party2Public {
  q: {
    x: string,
    y: string
  },
  p2: {
    x: string,
    y: string
  },
  p1: {
    x: string,
    y: string
  },
  paillier_pub: any,
  c_key: string,
}




export interface ClientKeyGenFirstMsg {
  kg_party_two_first_message: KeyGenFirstMsg,
  kg_ec_key_pair_party2: EcKeyPair
}

// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::KeyGenFirstMsg
export interface KeyGenFirstMsg {
  d_log_proof: string,
  public_share: string
}
// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::EcKeyPair
export interface EcKeyPair {
  public_share: string,
  secret_share: string,
}



export interface ClientKeyGenSecondMsg {
  party_two_second_message: Party2SecondMessage,
  party_two_paillier: PaillierPublic
}

export interface Party2SecondMessage {
  key_gen_second_message: KeyGenSecondMsg,
  pdl_first_message: PDLFirstMessage,
}
// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::KeyGenSecondMsg
export interface KeyGenSecondMsg {
  comm_witness: string,
}

// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::PDLFirstMessage
export interface PDLFirstMessage {
  c_tag: string,
  c_tag_tag: string,
}
// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::PaillierPublic
export interface PaillierPublic {
    ek: string,
    encrypted_secret_share: string,
}



export interface ClientSignFirstMsg {
  eph_key_gen_first_message_party_two: any,
  eph_comm_witness: any,
  eph_ec_key_pair_party2: any
}
