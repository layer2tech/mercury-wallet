import { POST_ROUTE, post } from "./request";

export const deposit = async () => {
  let secret_key = "12345";
  let proof_key = "02851ad2219901fc72ea97b4d21e803c625a339f07da8c7069ea33ddd0125da84f";
  let value = 10;
  let protocol = "Deposit";

  let shared_key_id = await despoitInit(proof_key);

  let master_key = await keyGen(shared_key_id, secret_key, proof_key, value, protocol);

  let message = "1111";
  let sign_msg = await sign(shared_key_id, master_key, message, protocol);

  console.log("signature: ", sign_msg)
}


export const despoitInit = async (proof_key: string) => {
    let deposit_msg1 = {
        auth: "authstr",
        proof_key: String(proof_key)
    }

    let shared_key_id = await post(POST_ROUTE.DEPOSIT_INIT, deposit_msg1);

    return shared_key_id
}


export const keyGen = async (
    shared_key_id: string,
    secret_key: string,
    _proof_key: string,
    _value: number,
    protocol: string
  ) => {
  // Import Rust functions
  let wasm = await import('client-wasm');

  let keygen_msg1 = {
      shared_key_id: shared_key_id,
      protocol: protocol,
  };
  // server first
  let server_resp_key_gen_first = await post(POST_ROUTE.KEYGEN_FIRST, keygen_msg1);
  let kg_party_one_first_message = server_resp_key_gen_first[1];

  // client first
  let client_resp_key_gen_first: ClientKeyGenFirstMsg =
    JSON.parse(
      wasm.KeyGen.first_message(secret_key)
    );

  // server second
  let key_gen_msg2 = {
    shared_key_id: shared_key_id,
    dlog_proof:client_resp_key_gen_first.kg_party_two_first_message.d_log_proof,
  }
  let kg_party_one_second_message = await post(POST_ROUTE.KEYGEN_SECOND, key_gen_msg2);

  // client second
  let client_resp_key_gen_second: ClientKeyGenSecondMsg =
    JSON.parse(
      wasm.KeyGen.second_message(
        JSON.stringify(kg_party_one_first_message),
        JSON.stringify(kg_party_one_second_message)
      )
    );

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

    console.log("MasterKey2: ", master_key)

    return master_key
}

// kms::ecdsa:two_party::MasterKey2
interface MasterKey2 {
  public: Party2Public,
  private: any, // Leave as Object since we dont need these items in Wallet.
  chain_code: string,
}

// kms::ecdsa:two_party::Party2Public
interface Party2Public {
  q: string,
  p2: string,
  p1: string,
  paillier_pub: any,
  c_key: string,
}


interface ClientKeyGenFirstMsg {
  kg_party_two_first_message: KeyGenFirstMsg,
  kg_ec_key_pair_party2: EcKeyPair
}

// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::KeyGenFirstMsg
interface KeyGenFirstMsg {
  d_log_proof: string,
  public_share: string
}
// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::EcKeyPair
interface EcKeyPair {
  public_share: string,
  secret_share: string,
}

interface ClientKeyGenSecondMsg {
  party_two_second_message: Party2SecondMessage,
  party_two_paillier: PaillierPublic
}

interface Party2SecondMessage {
  key_gen_second_message: KeyGenSecondMsg,
  pdl_first_message: PDLFirstMessage,
}
// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::KeyGenSecondMsg
interface KeyGenSecondMsg {
  comm_witness: string,
}

// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::PDLFirstMessage
interface PDLFirstMessage {
  c_tag: string,
  c_tag_tag: string,
}
// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::PaillierPublic
interface PaillierPublic {
    ek: string,
    encrypted_secret_share: string,
}



interface ClientSignFirstMsg {
  eph_key_gen_first_message_party_two: any,
  eph_comm_witness: any,
  eph_ec_key_pair_party2: any
}


// message should be hex string
export const sign = async (
  shared_key_id: string,
  master_key: any,
  message: string,
  protocol: string
) => {
  // Import Rust functions
  let wasm = await import('client-wasm');

  //client first
  let client_resp_sign_first: ClientSignFirstMsg =
    JSON.parse(
      wasm.Sign.first_message()
    );

  // server first
  let sign_msg1 = {
      shared_key_id: shared_key_id,
      eph_key_gen_first_message_party_two: client_resp_sign_first.eph_key_gen_first_message_party_two,
  };
  let sign_party_one_first_message = await post(POST_ROUTE.SIGN_FIRST, sign_msg1);

  //client second
  let party_two_sign_message =
    JSON.parse(
      wasm.Sign.second_message(
        JSON.stringify(master_key),
        JSON.stringify(client_resp_sign_first.eph_ec_key_pair_party2),
        JSON.stringify(client_resp_sign_first.eph_comm_witness),
        JSON.stringify(sign_party_one_first_message),
        message
      )
    );

  let sign_msg2 = {
      shared_key_id: shared_key_id,
      sign_second_msg_request: {
          protocol,
          message,
          party_two_sign_message,
      },
  };

  let signature = await post(POST_ROUTE.SIGN_SECOND, sign_msg2);

  return signature
}
