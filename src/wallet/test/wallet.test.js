let bitcoin = require('bitcoinjs-lib')
import { Wallet, StateCoinList, ACTION, Config } from '../';
import { segwitAddr } from '../wallet';
import { BIP32Interface, BIP32,  fromBase58} from 'bip32';
import { ECPair, Network, Transaction } from 'bitcoinjs-lib';

describe('Wallet', function() {
  let wallet = Wallet.buildMock(bitcoin.networks.bitcoin);

  test('toJSON', function() {
    wallet.config.update({min_anon_set: 1000}) // update config to ensure defaults are not revered to after fromJSON.
    let json_wallet = JSON.parse(JSON.stringify(wallet))
    let from_json = Wallet.fromJSON(json_wallet, bitcoin.networks.bitcoin, segwitAddr, true)
    // check wallets serialize to same values (since deep equal on recursive objects is messy)
    expect(JSON.stringify(from_json)).toEqual(JSON.stringify(wallet))
  });

  test('save/load', async function() {
    wallet.save()
    let loaded_wallet = await Wallet.load(true)
    expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet))
  });

  test('save coins list', async function() {
    wallet.save();
    let num_coins_before = wallet.statecoins.coins.length;

    // new coin
    wallet.addStatecoinFromValues("103d2223-7d84-44f1-ba3e-4cd7dd418560", {public:{q: "",p2: "",p1: "",paillier_pub: {},c_key: "",},private: "",chain_code: ""}, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", ACTION.DEPOSIT)
    wallet.saveStateCoinsList();

    let loaded_wallet = await Wallet.load(true);
    let num_coins_after = loaded_wallet.statecoins.coins.length;
    expect(num_coins_after).toEqual(num_coins_before+1)
    expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet))
  });

  test('confirmMnemonicKnowledge', function() {
    expect(wallet.confirmMnemonicKnowledge([{pos: 3, word: "this"}])).toBe(false);
    expect(wallet.confirmMnemonicKnowledge([{pos: 0, word: "praise"}])).toBe(true);
    expect(wallet.confirmMnemonicKnowledge([{pos: 0, word: "praise"},{pos: 11, word: "ghost"}])).toBe(true);
  });

  test('genBtcAddress', function() {
    let addr1 = wallet.genBtcAddress();
    let addr2 = wallet.genBtcAddress();
    expect(addr1).not.toEqual(addr2)
    expect(wallet.account.containsAddress(addr1))
    expect(wallet.account.containsAddress(addr2))
  });

  test('genProofKey', function() {
    let proof_key_bip32 = wallet.genProofKey();
    let bip32 = wallet.getBIP32forProofKeyPubKey(proof_key_bip32.publicKey.toString("hex"))
    // Ensure BIP32 is correclty returned
    expect(proof_key_bip32.privateKey).toEqual(bip32.privateKey)
  });

  test('getActivityLog', function() {
    let activity_log = wallet.getActivityLog(0);
    expect(activity_log.length).toBe(0)
    activity_log = wallet.getActivityLog(2);
    expect(activity_log.length).toBe(2)
    activity_log = wallet.getActivityLog(10);
    expect(activity_log.length).toBeLessThan(10)
    for (let i = 0; i < activity_log.length; i++) {
      expect(activity_log[i]).toEqual(expect.objectContaining(
        {
          date: expect.any(Number),
          action: expect.any(String),
          value: expect.any(Number),
          funding_txid: expect.any(String)
        }))
    }
  });

  test('addStatecoin', function() {
    let [coins_before_add, total_before] = wallet.getUnspentStatecoins()
    let activity_log_before_add = wallet.getActivityLog(100)
    wallet.addStatecoinFromValues("861d2223-7d84-44f1-ba3e-4cd7dd418560", {public:{q: "",p2: "",p1: "",paillier_pub: {},c_key: "",},private: "",chain_code: ""}, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", ACTION.DEPOSIT)
    let [coins_after_add, total_after] = wallet.getUnspentStatecoins()
    let activity_log_after_add = wallet.getActivityLog(100)
    expect(coins_before_add.length).toEqual(coins_after_add.length - 1)
    expect(activity_log_before_add.length).toEqual(activity_log_after_add.length - 1)
  });
})

describe("Statecoins/Coin", () => {
  var statecoins = Wallet.buildMock().statecoins;

  test('to/from JSON', () => {
    var json = JSON.parse(JSON.stringify(statecoins))
    let from_json = StateCoinList.fromJSON(json)
    expect(statecoins).toEqual(from_json)
  });

  describe("getAllCoins", () => {
    it('Returns coins with correct data', () => {
      let coins = statecoins.getAllCoins();
      expect(coins.length).toBe(statecoins.coins.length)
      for (let i = 0; i < coins.length; i++) {
        expect(coins[i]).toEqual(expect.objectContaining(
          {
            shared_key_id: expect.any(String),
            value: expect.any(Number),
            funding_txid: expect.any(String),
            timestamp: expect.any(Number),
            swap_rounds: expect.any(Number),
          }))
      }
    });
  })

  describe("getUnspentCoins", () => {
    it('Returns only unspent coins with correct data', () => {
      let coins = statecoins.getAllCoins();
      let num_coins = coins.length;
      statecoins.setCoinSpent(coins[0].shared_key_id, "W") // set one spent
      expect(statecoins.getUnspentCoins()[0].length).toBe(num_coins-1)
      expect(coins.length).toBe(statecoins.coins.length)
    });
  })

  describe("getUnconfirmedCoins", () => {
    it('Returns only unconfirmed coins with correct data', () => {
      let coins = statecoins.getAllCoins();
      let num_coins = coins.length;
      let coin = statecoins.getCoin(coins[0].shared_key_id)
      coin.status="UNCOMFIRMED"                 // set one unconfirmed
      statecoins.setCoinFinalized(coin)
      expect(statecoins.getUnconfirmedCoins().length).toBe(num_coins-1)
      expect(coins.length).toBe(statecoins.coins.length)
    });
  })
})


describe("Config", () => {
  var config = new Config(bitcoin.networks.bitcoin, true);
  let update = {min_anon_set: 20}

  test('update', () => {
    expect(config.min_anon_set).not.toBe(20)
    config.update(update)
    expect(config.min_anon_set).toBe(20)
  });

  test('fail update invalid value', () => {
    expect(() => {  // not enough value
      config.update({invalid: ""});
    }).toThrowError("does not exist");
  })
})


describe('StateChain Entity Protocols', function() {
  // let wallet = Wallet.buildMock(bitcoin.networks.testnet);
  // // wallet.
  // wallet.config.jest_testing_mode = true; // Call mock wasm
  //
  //
  // let value = 10000
  //
  // test('Deposit init', async function() {
  //   let [shared_key_id, p_addr] = await wallet.depositInit(value)
  //   let statecoin = wallet.statecoins.getCoin(shared_key_id);
  //
  //   expect(statecoin.tx_backup).toBeNull();
  //   expect(statecoin.tx_withdraw).toBeNull();
  //   expect(statecoin.status).toBe(STATECOIN_STATUS.UNCOMFIRMED);
  //   expect(wallet.statecoins.getCoin(statecoin.shared_key_id)).toBe(statecoin)
  // });
  //
  // test('Deposit confirm', async function() {
  //   let shared_key_id = SHARED_KEY_ID;
  //   let statecoin_finalized = await wallet.depositConfirm(shared_key_id, FUNDING_TXID)
  //
  //   expect(statecoin_finalized.statechain_id.length).toBeGreaterThan(0);
  //   expect(statecoin_finalized.proof_key.length).toBeGreaterThan(0);
  //   expect(statecoin_finalized.funding_txid.length).toBeGreaterThan(0);
  //   expect(statecoin_finalized.smt_proof).not.toBeNull();
  //   expect(statecoin_finalized.status).toBe(STATECOIN_STATUS.AVAILABLE);
  // });
  //
  //
  // test('Withdraw', async function() {
  //   let statecoin_finalized = run_deposit(wallet, 10000);
  //   let shared_key_id = statecoin_finalized.shared_key_id;
  //
  //   let num_unspent_statecoins_before = wallet.getUnspentStatecoins()[0].length;
  //   let num_statecoins_before = wallet.statecoins.length;
  //
  //   let tx_withdraw = await wallet.withdraw(shared_key_id, BTC_ADDR);
  //
  //   // check statecoin
  //   let statecoin = wallet.statecoins.getCoin(shared_key_id);
  //   expect(statecoin.status).toBe(STATECOIN_STATUS.WITHDRAWN);
  //   expect(statecoin.tx_withdraw).toBe(tx_withdraw);
  //
  //   // check wallet.statecoins
  //   expect(wallet.getUnspentStatecoins()[0].length).toBe(num_unspent_statecoins_before-1);
  //   expect(wallet.statecoins.length).toBe(num_statecoins_before);
  //
  //   // check withdraw tx
  //   expect(tx_withdraw.ins.length).toBe(1);
  //   expect(tx_withdraw.ins[0].hash.reverse().toString("hex")).toBe(statecoin.funding_txid);
  //   expect(tx_withdraw.outs.length).toBe(2);
  //   expect(tx_withdraw.outs[0].value).toBeLessThan(value);
  //   expect(tx_withdraw.locktime).toBe(0);
  // });
  //
  // test('TransferSender', async function() {
  //   let statecoin_finalized = run_deposit(wallet, 10000);
  //   let shared_key_id = statecoin_finalized.shared_key_id;
  //   let rec_se_addr = statecoin_finalized.proof_key;
  //
  //   let transfer_msg3 = await wallet.transfer_sender(shared_key_id, rec_se_addr);
  //
  //   // check statecoin
  //   let statecoin = wallet.statecoins.getCoin(shared_key_id);
  //   expect(statecoin.status).toBe(STATECOIN_STATUS.SPENT);
  //
  //   // check transfer_msg data
  //   expect(transfer_msg3.shared_key_id).toBe(shared_key_id);
  //   expect(transfer_msg3.rec_se_addr.proof_key).toBe(rec_se_addr);
  //
  //   // statechain sig verifies
  //   let proof_key_der = wallet.getBIP32forProofKeyPubKey(statecoin.proof_key);
  //   expect(transfer_msg3.statechain_sig.verify(proof_key_der)).toBe(true)
  //   // t1 decryptable by proof key
  //   expect(decryptECIES(proof_key_der.privateKey.toString("hex"), transfer_msg3.t1.secret_bytes)).toBeTruthy()
  //
  //   // check new backup tx
  //   let tx_backup = bitcoin.Transaction.fromHex(transfer_msg3.tx_backup_psm.tx_hex);
  //   expect(tx_backup.ins.length).toBe(1);
  //   expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(statecoin.funding_txid);
  //   expect(tx_backup.outs.length).toBe(1);
  //   expect(tx_backup.outs[0].value).toBeLessThan(statecoin.value);
  //   expect(tx_backup.locktime).toBeLessThan(statecoin.tx_backup.locktime);
  //   // Check backuptx sends to new proof key
  //   expect(
  //     bitcoin.address.fromOutputScript(tx_backup.outs[0].script, wallet.network)
  //   ).toBe(
  //     pubKeyTobtcAddr(rec_se_addr)
  //   );
  // });
  //
  // test('TransferReceiver incorrect backup receive addr', async function() {
  //   let transfer_msg3: TransferMsg3 = BJSON.parse(lodash.cloneDeep(TRANSFER_MSG3));
  //
  //   // set backuptx receive address to wrong proof_key addr
  //   let wrong_proof_key = "028a9b66d0d2c6ef7ff44a103d44d4e9222b1fa2fd34cd5de29a54875c552abd42";
  //   let tx_backup = bitcoin.Transaction.fromHex(transfer_msg3.tx_backup_psm.tx_hex);
  //   tx_backup.outs[0].script = pubKeyToScriptPubKey(wrong_proof_key, wallet.config.network);
  //   transfer_msg3.tx_backup_psm.tx_hex = tx_backup.toHex();
  //
  //   await expect(wallet.transfer_receiver(transfer_msg3))
  //     .rejects
  //     .toThrowError("Transfer not made to this wallet.");
  // });
  //
  // test('TransferReceiver', async function() {
  //   let transfer_msg3: TransferMsg3 = BJSON.parse(lodash.cloneDeep(TRANSFER_MSG3));
  //
  //   let finalize_data = await wallet.transfer_receiver(transfer_msg3);
  //
  //   expect(finalize_data.shared_key_id).not.toBe(transfer_msg3.shared_key_id);
  // });
  //
  // test('TransferReceiverFinalize', async function() {
  //   let finalize_data: TransferFinalizeData = BJSON.parse(lodash.cloneDeep(FINALIZE_DATA));
  //   let statecoin = await wallet.transfer_receiver_finalize(finalize_data);
  //
  //   expect(statecoin.statechain_id).toBe(finalize_data.statechain_id);
  //   expect(statecoin.value).toBe(finalize_data.state_chain_data.amount);
  //   expect(statecoin.shared_key).toStrictEqual(KEYGEN_SIGN_DATA.shared_key);
  //   expect(statecoin.tx_backup).not.toBe(null);
  //   expect(statecoin.tx_withdraw).toBe(null);
  //   expect(statecoin.smt_proof).not.toBe(null);
  //   expect(statecoin.status).toBe(STATECOIN_STATUS.AVAILABLE);
  // });
})


const run_deposit = (wallet, value) => {
  let statecoin = BJSON.parse(lodash.cloneDeep(STATECOIN_CONFIRMED))
  wallet.statecoins = new StateCoinList();
  wallet.statecoins.addCoin(new StateCoin(statecoin.shared_key_id, statecoin.shared_key))
  wallet.statecoins.coins[0].tx_backup = bitcoin.Transaction.fromHex(STATECOIN_CONFERMED_BACKUPTX_HEX)
  wallet.statecoins.coins[0].proof_key = statecoin.proof_key
  wallet.statecoins.coins[0].value = statecoin.value
  wallet.statecoins.coins[0].funding_txid = statecoin.funding_txid
  wallet.statecoins.coins[0].statechain_id = statecoin.statechain_id
  wallet.statecoins.coins[0].status = "AVAILABLE"
  return statecoin
}
