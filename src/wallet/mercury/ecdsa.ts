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
  shared_key_id: string,
  secret_key: string,
  protocol: string
) => {
  // Import Rust functions
  let wasm = await import('client-wasm');

  let keygen_msg1 = {
      shared_key_id: shared_key_id,
      protocol: protocol,
  };
  // server first
  let server_resp_key_gen_first = await http_client.post(POST_ROUTE.KEYGEN_FIRST, keygen_msg1);
  let id = server_resp_key_gen_first[0];
  let kg_party_one_first_message = server_resp_key_gen_first[1];
  typeforce(types.String, id);
  typeforce(types.KeyGenFirstMsgParty1, kg_party_one_first_message);

  // client first
  let client_resp_key_gen_first: ClientKeyGenFirstMsg =
    JSON.parse(
      wasm.KeyGen.first_message(secret_key)
    );
  typeforce(types.ClientKeyGenFirstMsg, client_resp_key_gen_first);

  // server second
  let key_gen_msg2 = {
    shared_key_id: shared_key_id,
    dlog_proof:client_resp_key_gen_first.kg_party_two_first_message.d_log_proof,
  }
  let kg_party_one_second_message = await http_client.post(POST_ROUTE.KEYGEN_SECOND, key_gen_msg2);
  typeforce(types.KeyGenParty1Message2, kg_party_one_second_message);

  // client second
  let client_resp_key_gen_second: ClientKeyGenSecondMsg =
    JSON.parse(
      wasm.KeyGen.second_message(
        JSON.stringify(kg_party_one_first_message),
        JSON.stringify(kg_party_one_second_message)
      )
    );
  typeforce(types.ClientKeyGenSecondMsg, client_resp_key_gen_second);


  // Construct Rust MasterKey struct
  let master_key: MasterKey2 =
    JSON.parse(
      wasm.KeyGen.set_master_key(
        JSON.stringify(client_resp_key_gen_first.kg_ec_key_pair_party2),
        JSON.stringify(kg_party_one_second_message
                .ecdh_second_message
                .comm_witness
                .public_share),
        JSON.stringify(client_resp_key_gen_second.party_two_paillier)
    ));
  typeforce(types.MasterKey2, master_key);

  return new StateCoin(id, master_key)
}

// 2P-ECDSA Sign.
// message should be hex string
export const sign = async (
  http_client: HttpClient | MockHttpClient,
  shared_key_id: string,
  master_key: any,
  message: string,
  protocol: string
) => {
  // Import Rust functions
  let wasm = await import('client-wasm');

  //client first
  let client_sign_first: ClientSignFirstMsg =
    JSON.parse(
      wasm.Sign.first_message()
    );
  typeforce(types.ClientSignFirstMsg, client_sign_first);

  // server first
  let sign_msg1 = {
      shared_key_id: shared_key_id,
      eph_key_gen_first_message_party_two: client_sign_first.eph_key_gen_first_message_party_two,
  };
  let server_sign_first = await http_client.post(POST_ROUTE.SIGN_FIRST, sign_msg1);
  typeforce(types.ServerSignfirstMsg, server_sign_first);

  //client second
  let client_sign_second =
    JSON.parse(
      wasm.Sign.second_message(
        JSON.stringify(master_key),
        JSON.stringify(client_sign_first.eph_ec_key_pair_party2),
        JSON.stringify(client_sign_first.eph_comm_witness),
        JSON.stringify(server_sign_first),
        message
      )
    );
  typeforce(types.ClientSignSecondMsg, client_sign_second);

  let sign_msg2 = {
      shared_key_id: shared_key_id,
      sign_second_msg_request: {
          protocol,
          message,
          client_sign_second,
      },
  };

  let signature = await http_client.post(POST_ROUTE.SIGN_SECOND, sign_msg2);

  return signature
}



// Types involved in 2P-ECDSA and Mercury protocols.

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
