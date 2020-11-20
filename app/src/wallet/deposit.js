// pub struct DepositMsg1 {
//     pub auth: String,
//     pub proof_key: String,
// }

import { POST_ROUTE, post } from "./request";

export const deposit = async () => {
  let secret_key = "12345";
  let proof_key = "02851ad2219901fc72ea97b4d21e803c625a339f07da8c7069ea33ddd0125da84f";
  let value = 10;
  let protocol = "Deposit";

  let shared_key_id = await despoitInit(proof_key);

  let key_gen = keyGen(shared_key_id, secret_key, proof_key, value, protocol);
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
    dlog_proof:JSON.parse(kg_party_two_first_message).d_log_proof,
  }
  let kg_party_one_second_message = await post(POST_ROUTE.KEYGEN_SECOND, key_gen_msg2);

  // client second
  let res =
    JSON.parse(
      wasm.KeyGen.second_message(kg_party_one_first_message, kg_party_one_second_message)
    );

  console.log("res: ",res);
}
