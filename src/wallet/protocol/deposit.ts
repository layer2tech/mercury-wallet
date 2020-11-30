// Mercury deposit protocol.

import { keyGen, sign } from "./ecdsa";
import { POST_ROUTE, post } from "../request";

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


const despoitInit = async (proof_key: string) => {
    let deposit_msg1 = {
        auth: "authstr",
        proof_key: String(proof_key)
    }

    let shared_key_id = await post(POST_ROUTE.DEPOSIT_INIT, deposit_msg1);

    return shared_key_id
}
