// Mercury deposit protocol.

import { keyGen, PROTOCOL, sign } from "./ecdsa";
import { POST_ROUTE, post } from "../request";
import { getFeeInfo } from "./util";

// Deposit coins into state entity. Returns shared_key_id, state_chain_id, funding txid,
// signed backup tx, back up transacion data and proof_key
export const deposit = async (message: string) => {
  let secret_key = "12345";
  let proof_key = "02851ad2219901fc72ea97b4d21e803c625a339f07da8c7069ea33ddd0125da84f";
  let value = 10;
  let protocol = "Deposit";

  // Get state entity fee info
  let fee_info = await getFeeInfo();

  // Init. session - Receive shared wallet ID
  let shared_key_id = await despoitInit(proof_key);
  // 2P-ECDSA with state entity to create a Shared key
  let master_key = await keyGen(shared_key_id, secret_key, proof_key, value, PROTOCOL.DEPOSIT);

  // Co-owned key address to send funds to (P_addr)
  // let pk = master_key.public.q; // co-owned key address to send funds to (P_addr)
  // let p_addr =
  //     bitcoin.payments.p2wpkh({
  //       pubkey: node.publicKey,
  //       network: bitcoin.networks.bitcoin
  //     })

  let sign_msg = await sign(shared_key_id, master_key, message, protocol);

  return sign_msg
}


const despoitInit = async (proof_key: string) => {
    let deposit_msg1 = {
        auth: "authstr",
        proof_key: String(proof_key)
    }

    let shared_key_id = await post(POST_ROUTE.DEPOSIT_INIT, deposit_msg1);

    return shared_key_id
}
