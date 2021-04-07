import {makeTesterStatecoin, SIGNSWAPTOKEN_DATA, COMMITMENT_DATA} from './test_data.js'
import {swapInit, swapPollUtxo, SWAP_STATUS, SwapToken, make_swap_commitment} from "../swap/swap";
import {STATECOIN_STATUS} from '../statecoin'

import * as MOCK_SERVER from '../mocks/mock_http_client'

import {fromSeed} from 'bip32';

let bitcoin = require('bitcoinjs-lib')
let lodash = require('lodash');


// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');


describe('swapToken', function() {
  test('Gen and Verify', async function() {
    SIGNSWAPTOKEN_DATA.forEach(data => {
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(data.priv, "hex"));
      expect(proof_key_der.publicKey.toString('hex')).toBe(data.pub);
      let st = data.swap_token;
      let st_cls = new SwapToken(st.id, st.amount, st.time_out, st.statechain_ids);

      let swap_sig = st_cls.sign(proof_key_der,data.swap_token, data.priv);
      expect(swap_sig).toBe(data.swap_token_sig);
    })
  });

  describe('commitment', function() {
    test('Gen and Verify', async function() {
      wasm_mock.Commitment.make_commitment = jest.fn(() => JSON.stringify(COMMITMENT_DATA[0].batch_data));
       COMMITMENT_DATA.forEach(data => {
         let batch_data = make_swap_commitment(data.statecoin, data.swap_info, wasm_mock);
         expect(batch_data.commitment).toBe(data.batch_data.commitment);
       })
     });
  })
});

describe('Swaps', function() {
  test('swapInit', async function() {
    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce()
    let statecoin = makeTesterStatecoin();
    let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

    let init = await swapInit(http_mock, statecoin, proof_key_der, 10)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.PollUtxo)

    // try again with swap_status != null
    await expect(swapInit(http_mock, statecoin, proof_key_der, 10))
      .rejects
      .toThrowError("Coin is already involved in a swap. Swap status: PollUtxo");
  })

  test('swapPollUtxo', async function() {
    let swap_id = "12345";
    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce({id: null})    // return once null => swap has not started
      .mockReturnValueOnce({id: swap_id}) // return once an id => swap has begun

    let statecoin = makeTesterStatecoin();

    // try first without swap_status == PollUtxo
    await expect(swapPollUtxo(http_mock, statecoin))
      .rejects
      .toThrowError("Coin is not yet in this phase of the swap protocol. In phase: null");

    // set swap_status as if coin had already run swapInit
    statecoin.swap_status = SWAP_STATUS.PollUtxo
    statecoin.status = STATECOIN_STATUS.AWAITING_SWAP

    // swap not yet begun
    await swapPollUtxo(http_mock, statecoin)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.PollUtxo)
    expect(statecoin.swap_id).toBe(null)
    // swap begun
    await swapPollUtxo(http_mock, statecoin)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.PollSwapInfo)
    expect(statecoin.swap_id).toBe(swap_id)
  })
})
