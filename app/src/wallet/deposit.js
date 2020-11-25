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


export const despoitInit = async (proof_key) => {
    let deposit_msg1 = {
        auth: "authstr",
        proof_key: String(proof_key)
    }

    let shared_key_id = await post(POST_ROUTE.DEPOSIT_INIT, deposit_msg1);

    return shared_key_id
}


export const keyGen = async (shared_key_id, secret_key, proof_key, value, protocol) => {
  // Import Rust functions
  let wasm = await import('client-wasm');

  let keygen_msg1 = {
      shared_key_id: shared_key_id,
      protocol: protocol,
  };
  // server first
  let [id, kg_party_one_first_message] = await post(POST_ROUTE.KEYGEN_FIRST, keygen_msg1);

  //client first
  let {kg_party_two_first_message, kg_ec_key_pair_party2} =
    JSON.parse(
      wasm.KeyGen.first_message(secret_key)
    );

  // server second
  let key_gen_msg2 = {
    shared_key_id: shared_key_id,
    dlog_proof:kg_party_two_first_message.d_log_proof,
  }
  let kg_party_one_second_message = await post(POST_ROUTE.KEYGEN_SECOND, key_gen_msg2);

  // client second
  let {party_two_second_message, party_two_paillier} =
    JSON.parse(
      wasm.KeyGen.second_message(
        JSON.stringify(kg_party_one_first_message),
        JSON.stringify(kg_party_one_second_message)
      )
    );

  // Construct Rust MasterKey struct
  let master_key =
    JSON.parse(
      wasm.KeyGen.set_master_key(
        JSON.stringify(kg_ec_key_pair_party2),
        JSON.stringify(kg_party_one_second_message
                .ecdh_second_message
                .comm_witness
                .public_share),
        JSON.stringify(party_two_paillier)
    ));

    return master_key
}

// message should be hex string
export const sign = async (shared_key_id, master_key, message, protocol) => {
  // Import Rust functions
  let wasm = await import('client-wasm');

  //client first
  let {eph_key_gen_first_message_party_two, eph_comm_witness, eph_ec_key_pair_party2} =
    JSON.parse(
      wasm.Sign.first_message()
    );

  // server first
  let sign_msg1 = {
      shared_key_id: shared_key_id,
      eph_key_gen_first_message_party_two,
  };
  let sign_party_one_first_message = await post(POST_ROUTE.SIGN_FIRST, sign_msg1);

  //client second
  let party_two_sign_message =
    JSON.parse(
      wasm.Sign.second_message(
        JSON.stringify(master_key),
        JSON.stringify(eph_ec_key_pair_party2),
        JSON.stringify(eph_comm_witness),
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
