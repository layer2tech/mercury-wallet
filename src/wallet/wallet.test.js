let bitcoin = require('bitcoinjs-lib')
import { Wallet, Statecoins, ACTION } from './';
import { segwitAddr } from './wallet';


describe('Wallet', function() {
  let wallet = Wallet.buildMock();

  describe('toJSON', function() {
    let json_wallet = JSON.stringify(wallet)
    let from_json = Wallet.fromJSON(json_wallet, bitcoin.networks.bitcoin, segwitAddr)
    // check wallets serialize to same values (since deep equal on recursive objects is messy)
    expect(JSON.stringify(from_json)).toEqual(JSON.stringify(wallet))
  });

  describe('genBtcAddress', function() {
    let addr1 = wallet.genBtcAddress();
    let addr2 = wallet.genBtcAddress();
    expect(addr1).not.toEqual(addr2)
    expect(wallet.account.containsAddress(addr1))
    expect(wallet.account.containsAddress(addr2))
  });

  describe('getActivityLog', function() {
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
          txid: expect.any(String)
        }))
    }
  });

  describe('addStatecoin', function() {
    let coins_before_add = wallet.getUnspentStatecoins()
    let activity_log_before_add = wallet.getActivityLog(100)
    wallet.addStatecoin("861d2223-7d84-44f1-ba3e-4cd7dd418560", {public:{q: "",p2: "",p1: "",paillier_pub: {},c_key: "",},private: "",chain_code: ""}, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", ACTION.DEPOSIT)
    let coins_after_add = wallet.getUnspentStatecoins()
    let activity_log_after_add = wallet.getActivityLog(100)
    expect(coins_before_add.length).toEqual(coins_after_add.length - 1)
    expect(activity_log_before_add.length).toEqual(activity_log_after_add.length - 1)
  });
})

describe("Statecoins/Coin", () => {
  var statecoins = Wallet.buildMock().statecoins;

  it('to/from JSON', () => {
    var json = JSON.stringify(statecoins)
    let from_json = Statecoins.fromJSON(json)
    expect(statecoins).toEqual(from_json)
  });

  describe("getAllCoins", () => {
    it('Returns coins with correct data', () => {
      let coins = statecoins.getAllCoins();
      expect(coins.length).toBe(statecoins.coins.length)
      for (let i = 0; i < coins.length; i++) {
        expect(coins[i]).toEqual(expect.objectContaining(
          {
            id: expect.any(String),
            value: expect.any(Number),
            txid: expect.any(String),
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
      statecoins.setCoinSpent(coins[0].id) // set one spent
      expect(statecoins.getUnspentCoins().length).toBe(num_coins-1)
      expect(coins.length).toBe(statecoins.coins.length)
    });
  })

})
