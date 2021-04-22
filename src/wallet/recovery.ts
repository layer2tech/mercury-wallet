// wallet recovery from server

import { Wallet } from './wallet';
import { BACKUP_STATUS, StateCoin } from './statecoin';
import { getRecoveryRequest, RecoveryDataMsg } from './mercury/info_api';

let bitcoin = require('bitcoinjs-lib')

// number of keys to generate per recovery call. If no statecoins are found for this number
// of keys then assume there are no more statecoins owned by this wallet.
const NUM_KEYS_PER_RECOVERY_ATTEMPT = 25;

// Send all proof keys to server to check for statecoins owned by this wallet.
// Should be used as a last resort only due to privacy leakage.
export const recoverCoins = async (wallet: Wallet): Promise<RecoveryDataMsg[]> => {
  let recovery_data: any = [];
  let new_recovery_data_load = [null];
  let recovery_request = [];

  // Keep grabbing data until NUM_KEYS_PER_RECOVERY_ATTEMPT keys have no statecoins
  while (new_recovery_data_load.length > 0) {
    recovery_request = [];
    for (let i=0; i<NUM_KEYS_PER_RECOVERY_ATTEMPT; i++) {
      let addr = wallet.account.nextChainAddress(0);
      recovery_request.push({key: wallet.account.derive(addr).publicKey.toString("hex"), sig: ""});
    }
    new_recovery_data_load = await getRecoveryRequest(wallet.http_client, recovery_request);
    recovery_data = recovery_data.concat(new_recovery_data_load);
  }

  // No more keys found for this wallet. Remove the NUM_KEYS_PER_RECOVERY_ATTEMPT from
  // wallets account so that the wallet can use them.
  wallet.account.chains[0].k = wallet.account.chains[0].k - NUM_KEYS_PER_RECOVERY_ATTEMPT;

  return recovery_data
}

// Gen proof key. Address: tb1qgl76l9gg9qrgv9e9unsxq40dee5gvue0z2uxe2. Proof key: 03b2483ab9bea9843bd9bfb941e8c86c1308e77aa95fccd0e63c2874c0e3ead3f5
export const addRestoredCoinDataToWallet = async (wallet: Wallet, wasm: any, recoveredCoins: RecoveryDataMsg[]) => {
  for (let i=0;i<recoveredCoins.length;i++) {
    let tx_backup = bitcoin.Transaction.fromHex(recoveredCoins[i].tx_hex);
    let shared_key= JSON.parse(recoveredCoins[i].shared_key_data)

    // convert c_key item to be clinet curv library compatible
    shared_key.c_key = JSON.parse(wasm.convert_bigint_to_client_curv_version(JSON.stringify({c_key: shared_key.c_key}), "c_key")).c_key

    // construct MasterKey1
    let master_key = {
      chain_code: [0,[]],
      private: {
        x2: wallet.getBIP32forProofKeyPubKey(recoveredCoins[i].proof_key).privateKey!.toString("hex")
      },
      public: shared_key
    }

    let statecoin = new StateCoin(recoveredCoins[i].shared_key_id, master_key)

    statecoin.proof_key = recoveredCoins[i].proof_key
    statecoin.tx_backup = tx_backup;
    statecoin.backup_status = BACKUP_STATUS.CONFIRMED;
    statecoin.funding_vout = tx_backup.ins[0].index;
    statecoin.funding_txid = tx_backup.ins[0].hash.reverse().toString("hex");
    statecoin.statechain_id = recoveredCoins[i].statechain_id;
    statecoin.value = recoveredCoins[i].amount;

    statecoin.setConfirmed();
    wallet.statecoins.addCoin(statecoin);
  }

  wallet.saveStateCoinsList();
}
