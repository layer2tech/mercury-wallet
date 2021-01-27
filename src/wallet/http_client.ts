const axios = require('axios').default;

const state_entity_addr = "http://0.0.0.0:8000";
// const state_entity_addr = "https://fakeapi.mercurywallet.io";

export const GET_ROUTE = {
  PING: "ping",
  FEES: "info/fee",
  ROOT: "info/root",
  STATECHAIN: "info/statechain",
  TRANSFER_BATCH: "info/transfer-batch"
};
Object.freeze(GET_ROUTE);

export const POST_ROUTE = {
  KEYGEN_FIRST: "ecdsa/keygen/first",
  KEYGEN_SECOND: "ecdsa/keygen/second",
  PREPARE_SIGN: "prepare-sign",
  SIGN_FIRST: "ecdsa/sign/first",
  SIGN_SECOND: "ecdsa/sign/second",
  SMT_PROOF: "info/proof",
  DEPOSIT_INIT: "deposit/init",
  DEPOSIT_CONFIRM: "deposit/confirm",
  WITHDRAW_INIT: "withdraw/init",
  TRANSFER_SENDER: "transfer/sender",
  TRANSFER_RECEIVER: "transfer/receiver",
  TRANSFER_UPDATE_MSG: "transfer/update_msg",
  TRANSFER_GET_MSG: "transfer/get_msg"
};
Object.freeze(POST_ROUTE);

export class HttpClient {
  get = async (path: string, params: any) => {
    try {
      const url = state_entity_addr + "/" + path + "/" + (Object.entries(params).length === 0 ? "" : params);
      const config = {
          method: 'get',
          url: url,
          headers: { 'Accept': 'application/json' }
      };
      let res = await axios(config)
      let return_data = res.data

      return return_data

    } catch (err) {
      return err;
    }
  }

  post = async (path: string, body: any) => {
    try {
      let url = state_entity_addr + "/" + path;
      const config = {
          method: 'post',
          url: url,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          data: body,
      };
      let res = await axios(config)
      let return_data = res.data

      return return_data

    } catch (err) {
      return err;
    }
  };
}
