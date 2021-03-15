let bitcoin = require('bitcoinjs-lib')
import { Wallet, StateCoinList, ACTION, Config } from '../';
import { SwapToken } from '../swap/swap'
import { segwitAddr } from '../wallet';
import { BIP32Interface, BIP32,  fromBase58} from 'bip32';
import { ECPair, Network, Transaction } from 'bitcoinjs-lib';

let lodash = require('lodash');

describe('Wallet', function() {
  let wallet = Wallet.buildMock(bitcoin.networks.bitcoin);


/*
  describe('swapTokenSign', function() {

    test('Gen and Verify', async function() {
      //let wasm = await wallet.getWasm(); 
      SIGNSWAPTOKEN_DATA.forEach(data => {
        let proof_key_der = BIP32Interface.fromHex(data.priv);
        let pub = proof_key_der.publicKey.toString('hex');
        expect(pub).toBe(data.pub);
        let st = JSON.parse(data.swap_token);
        let st_cls = new SwapToken(st.id, st.amount, st.time_out, st.statechain_ids);

        let swap_sig = st_cls.sign(proof_key_derdata.swap_token, proof_key_priv_str);
      expect(swap_sig.sig).toBe(data.sig);
      let ver_json = wasm.SwapTokenW.verify_sig(data.pub, data.sig, data.swap_token);
      let ver = JSON.parse(ver_json);
      expect(ver).toBe(true)
    })
  });
})
*/

  test('toJSON', function() {
    wallet.config.update({min_anon_set: 1000}) // update config to ensure defaults are not revered to after fromJSON.
    let json_wallet = JSON.parse(JSON.stringify(wallet))
    let from_json = Wallet.fromJSON(json_wallet, bitcoin.networks.bitcoin, segwitAddr, true)
    // check wallets serialize to same values (since deep equal on recursive objects is messy)
    expect(JSON.stringify(from_json)).toEqual(JSON.stringify(wallet))
  });

  test('save/load', async function() {
    wallet.save()
    let loaded_wallet = await Wallet.load('mock', '', true)
    expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet))
  });

  test('save coins list', async function() {
    wallet.save();
    let num_coins_before = wallet.statecoins.coins.length;

    // new coin
    wallet.addStatecoinFromValues("103d2223-7d84-44f1-ba3e-4cd7dd418560", {public:{q: "",p2: "",p1: "",paillier_pub: {},c_key: "",},private: "",chain_code: ""}, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", ACTION.DEPOSIT)
    wallet.saveStateCoinsList();

    let loaded_wallet = await Wallet.load('mock', '', true);
    let num_coins_after = loaded_wallet.statecoins.coins.length;
    expect(num_coins_after).toEqual(num_coins_before+1)
    expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet))
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
    wallet.addStatecoinFromValues("861d2223-7d84-44f1-ba3e-4cd7dd418560", {public:{q: "",p2: "",p1: "",paillier_pub: {},c_key: "",},private: "",chain_code: ""}, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", ACTION.DEPOSIT)
    let [coins_after_add, total_after] = wallet.getUnspentStatecoins()
    let activity_log_after_add = wallet.getActivityLog(100)
    expect(coins_before_add.length).toEqual(coins_after_add.length - 1)
    expect(activity_log_before_add.length).toEqual(activity_log_after_add.length - 1)
  });

  describe("getCoinBackupTxData", () => {
    it('shared_key_id doesnt exist', () => {
      expect(() => {
        wallet.getCoinBackupTxData("StateCoin does not exist.");
      }).toThrowError("does not exist");
    });
  })
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
            funding_vout: expect.any(Number),
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
  });

  describe("getUnconfirmedCoinsData", () => {
    it('Returns only unconfirmed coins with correct data', () => {
      let coins = statecoins.getAllCoins();
      let num_coins = coins.length;
      let coin = statecoins.getCoin(coins[0].shared_key_id)
      coin.status="UNCOMFIRMED"                 // set one unconfirmed
      statecoins.setCoinFinalized(coin)
      expect(statecoins.getUnconfirmedCoins().length).toBe(num_coins-1)
      expect(coins.length).toBe(statecoins.coins.length)
    });
  });

  describe("calcExpiryDate", () => {
    it('Calculate expiry', () => {
      let coin = lodash.clone(statecoins.coins[0]);
      let tx_backup = new Transaction();
      let locktime = 24*6*30; // month locktime
      tx_backup.locktime = locktime;
      coin.tx_backup = tx_backup;
      expect(coin.getExpiryData(locktime-1)).toEqual({blocks: 1, days: 0, months: 0, confirmations:0});            // < 1 day to go
      expect(coin.getExpiryData(locktime+1)).toEqual({blocks: 0, days: 0, months: 0, confirmations:0});          // locktime passed
      expect(coin.getExpiryData(locktime-(24*6)+1)).toEqual({blocks: (24*6)-1, days: 0, months: 0, confirmations:0});  // 1 block from 1 day
      expect(coin.getExpiryData(locktime-(24*6))).toEqual({blocks: 24*6, days: 1, months: 0, confirmations:0});    // 1 day
      expect(coin.getExpiryData(locktime-(2*24*6))).toEqual({blocks: 2*24*6, days: 2, months: 0, confirmations:0});  // 2 days
      expect(coin.getExpiryData(locktime-(29*24*6))).toEqual({blocks: 29*24*6, days: 29, months: 0, confirmations:0});  // 29 days = 0 months
      expect(coin.getExpiryData(locktime-(30*24*6))).toEqual({blocks: 30*24*6, days: 30, months: 1, confirmations:0});  // 1 month
    });
    it('no backup tx', () => {
      let coin = statecoins.coins[0];
      coin.tx_backup = null
      let expiry_data = coin.getExpiryData(999);
      expect(expiry_data.blocks).toBe(-1);
    });
  });
});


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
