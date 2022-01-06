import {makeTesterStatecoin, SIGNSWAPTOKEN_DATA, COMMITMENT_DATA} from './test_data.js'
import {swapInit, swapPhase0, swapPhase1, swapPhase2, SWAP_STATUS, POLL_UTXO, SwapToken, 
  make_swap_commitment, SwapRetryError, UI_SWAP_STATUS} from "../swap/swap";
import {STATECOIN_STATUS} from '../statecoin'

import * as MOCK_SERVER from '../mocks/mock_http_client'

import {fromSeed} from 'bip32';
import { POST_ROUTE } from '../http_client';

let cloneDeep = require('lodash.clonedeep');

let bitcoin = require('bitcoinjs-lib')

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
    statecoin.status = STATECOIN_STATUS.AVAILABLE

    let init = await swapInit(http_mock, statecoin, proof_key_der, 10)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase0)

    // try again with swap_status != null
    await expect(swapInit(http_mock, statecoin, proof_key_der, 10))
      .rejects
      .toThrowError("Coin is already involved in a swap. Swap status: Phase0");
  })

  test('swapPhase0', async function() {
    let swap_id = "12345";
    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce({id: null})    // return once null => swap has not started
      .mockReturnValueOnce({id: swap_id}) // return once an id => swap has begun

    let statecoin = makeTesterStatecoin();

    // try first without swap_status == Phase0
    statecoin.status = STATECOIN_STATUS.AWAITING_SWAP
    await expect(swapPhase0(http_mock, statecoin))
      .rejects
      .toThrowError("Coin is not yet in this phase of the swap protocol. In phase: null");

    // set swap_status as if coin had already run swapInit
    statecoin.swap_status = SWAP_STATUS.Phase0

    // swap not yet begun
    await swapPhase0(http_mock, statecoin)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase0)
    expect(statecoin.swap_id).toBe(null)
    // swap begun
    await swapPhase0(http_mock, statecoin)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase1)
    expect(statecoin.swap_id.id).toBe(swap_id)
  })

  test('swapPhase1', async function() {
    let swap_info = {
      status: SWAP_STATUS.Phase1,
      swap_token: { id: "12345", amount: 10, time_out: 15, statechain_ids: [] },
      bst_sender_data: {x: "1",q: {x:"1",y:"1"},k: "1",r_prime: {x:"1",y:"1"},}
    }
    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce({ id: "00000000-0000-0000-0000-000000000001" })    // return once a swap id => swap has started, polling utxo again
      .mockReturnValueOnce(null)    // return once null => swap has not started
      .mockReturnValueOnce(swap_info) // return once an id => swap has begun

    let statecoin = makeTesterStatecoin();
    let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

    // try first without swap_status == Phase0
    statecoin.status = STATECOIN_STATUS.AWAITING_SWAP
    await expect(swapPhase1(http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der))
      .rejects
      .toThrowError("Coin is not in this phase of the swap protocol. In phase: null");

    // Set swap_status as if coin had already run Phase0
    statecoin.swap_status = SWAP_STATUS.Phase1
    await expect(swapPhase1(http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der))
      .rejects
      .toThrowError("No Swap ID found. Swap ID should be set in Phase0.");

    // Set swap_id as if coin had already run Phase0
    statecoin.swap_id = "12345"

    // swap token not yet available
    await swapPhase1(http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der);
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase1)
    expect(statecoin.swap_address).toBe(null)
    expect(statecoin.swap_my_bst_data).toBe(null)
    // swap token available
    // await swapPhase1(http_mock, http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der)
    // expect(statecoin.swap_address).toBe(SWAP_STATUS.Phase1)
    // expect(statecoin.swap_my_bst_data).toBe(swap_info)
  })
})

describe('phase 2', function() {
  test('swapPhase2 test 1 - invalid initial statecoin state', async function() {
    
  let statecoin = makeTesterStatecoin();

  //Test invalid statecoin statuses
  for (let i=0; i< STATECOIN_STATUS.length; i++){
    if(STATECOIN_STATUS[i] !== STATECOIN_STATUS.IN_SWAP){
      const sc_status = STATECOIN_STATUS[i]
      statecoin.status=cloneDeep(sc_status)
      await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der)).rejects.toThrowError(`Coin status is not IN_SWAP. Status: ${sc_status}`)
    }
  }
  
  //Set valid statecoin status
  statecoin.status = STATECOIN_STATUS.IN_SWAP

  //Test invalid statecoin swap statuses
  for (let i=0; i< SWAP_STATUS.length; i++){
    if(SWAP_STATUS[i] !== SWAP_STATUS.Phase2){
      const swap_status = STATECOIN_STATUS[i]
      statecoin.swap_status=cloneDeep(swap_status)
      await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
        .rejects.toThrowError(`Coin is not in this phase of the swap protocol. In phase: ${swap_status}`)
    }
  }

  //Set valid swap status
  statecoin.swap_status = SWAP_STATUS.Phase2

  //Test invalid swap_id and swap_my_bst_data
  statecoin.swap_id=null
  statecoin.swap_my_bst_data=null

  await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
    .rejects.toThrowError("No Swap ID found. Swap ID should be set in Phase0.")

  //Set swap_id to some value
  statecoin.swap_id = "a swap id"

  await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
    .rejects.toThrowError("No BST data found for coin. BST data should be set in Phase1.")

  statecoin.swap_my_bst_data = "a my bst data"

})
      
test('swapPhase2 test 2 - server responds to pollSwap with miscellaneous error', async function() {
    
  let http_mock = jest.genMockFromModule('../mocks/swap/phase2/test1/mock_http_client')
  
  const server_error = () => { return new Error("Misc server error")}
  http_mock.post = jest.fn((path, body) => {
    if(path === POST_ROUTE.SWAP_POLL_SWAP){
      throw server_error()
    }
  })

  let statecoin = makeTesterStatecoin();
  let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
  
  
  //Set valid statecoin status
  statecoin.status = STATECOIN_STATUS.IN_SWAP
  //Set valid swap status
  statecoin.swap_status = SWAP_STATUS.Phase2
  //Set swap_id to some value
  statecoin.swap_id = "a swap id"
  //Set my_bst_data to some value
  statecoin.swap_my_bst_data = "a my bst data"

  const INIT_STATECOIN = cloneDeep(statecoin)
  const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

  
  //A server error will now be throw from an API call
  //The error type should be SwapRetryError 
  await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
    .rejects.toThrow(SwapRetryError)

  //The error should contain the message in server_error()
  await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
    .rejects.toThrowError(server_error())

  //Expect statecoin and proof_key_der to be unchanged
  expect(statecoin).toEqual(INIT_STATECOIN)
  expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)

  })

  test('swapPhase2 test 3 - server responds to pollSwap with null or invalid status', async function() {
    
    let http_mock = jest.genMockFromModule('../mocks/swap/phase2/test1/mock_http_client')
    
    let statecoin = makeTesterStatecoin();
    let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
    
    
    //Set valid statecoin status
    statecoin.status = STATECOIN_STATUS.IN_SWAP
    //Set valid swap status
    statecoin.swap_status = SWAP_STATUS.Phase2
    //Set swap_id to some value
    statecoin.swap_id = "a swap id"
    //Set my_bst_data to some value
    statecoin.swap_my_bst_data = "a my bst data"
  
    const INIT_STATECOIN = cloneDeep(statecoin)
    const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)
  
    http_mock.post = jest.fn((path, body) => {
      if(path === POST_ROUTE.SWAP_POLL_SWAP){
        return null
      }
    })
    await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
      .rejects.toThrow(Error)
    await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
      .rejects.toThrowError("Swap halted at phase 1")

    //Test unexpected phases
    for(let i=0; i<SWAP_STATUS.length; i++){
      const phase = SWAP_STATUS[i]
      if (phase !== SWAP_STATUS.Phase2){
        http_mock.post = jest.fn((path, body) => {
          if(path === POST_ROUTE.SWAP_POLL_SWAP){
            return phase
          }
        })
        await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
          .rejects.toThrow(Error)
        await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
          .rejects.toThrowError(`Swap error: Expected swap phase2. Received: ${phase}`)
      }
    }
      
    //Expect statecoin and proof_key_der to be unchanged
    expect(statecoin).toEqual(INIT_STATECOIN)
    expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
  
    })

    test('swapPhase2 test 4 - server responds with Error to request for blinded spend signature', async function() {
    
      let http_mock = jest.genMockFromModule('../mocks/swap/phase2/test1/mock_http_client')


      const server_bst_error = () => { return new Error("Misc server error retrieving BST")}
      
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return SWAP_STATUS.Phase2
        }
        if(path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE){
          throw server_bst_error()
        }
      })


      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
      
      
      //Set valid statecoin status
      statecoin.status = STATECOIN_STATUS.IN_SWAP
      //Set valid swap status
      statecoin.swap_status = SWAP_STATUS.Phase2
      //Set swap_id to some value
      statecoin.swap_id = "a swap id"
      //Set my_bst_data to some value
      statecoin.swap_my_bst_data = "a my bst data"
    
      const INIT_STATECOIN = cloneDeep(statecoin)
      const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)
    
     
      await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
        .rejects.toThrow(Error)
      await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
        .rejects.toThrowError(server_bst_error())
      
      //Expect statecoin and proof_key_der to be unchanged
      expect(statecoin).toEqual(INIT_STATECOIN)
      expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
    
      })

      test('swapPhase2 test 5 - an invalid data type is returned from request for BST', async function() {
    
        let http_mock = jest.genMockFromModule('../mocks/swap/phase2/test1/mock_http_client')
  
  
        let statecoin = makeTesterStatecoin();
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
        
        
        //Set valid statecoin status
        statecoin.status = STATECOIN_STATUS.IN_SWAP
        //Set valid swap status
        statecoin.swap_status = SWAP_STATUS.Phase2
        //Set swap_id to some value
        statecoin.swap_id = "a swap id"
        //Set my_bst_data to some value
        statecoin.swap_my_bst_data = "a my bst data"
      
        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)
        
        const bst_missing_s_prime_error = () => { return new Error("Expected property \"s_prime\" of type String, got undefined")}
        
        http_mock.post = jest.fn((path, body) => {
          if(path === POST_ROUTE.SWAP_POLL_SWAP){
            return SWAP_STATUS.Phase2
          }
          if(path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE){
            return {some_invalid_bst: "data"}
          }
        })

        await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
          .rejects.toThrow(Error)
        expect(statecoin).toEqual(INIT_STATECOIN)
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
        
        await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
          .rejects.toThrowError(bst_missing_s_prime_error())
        expect(statecoin).toEqual(INIT_STATECOIN)
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER) 
        })

        test('swapPhase2 test 6 - an Error is returned from the new_torid() function', async function() {
    
          let http_mock = jest.genMockFromModule('../mocks/swap/phase2/test1/mock_http_client')
    
    
          let statecoin = makeTesterStatecoin();
          let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
          
          
          //Set valid statecoin status
          statecoin.status = STATECOIN_STATUS.IN_SWAP
          //Set valid swap status
          statecoin.swap_status = SWAP_STATUS.Phase2
          //Set swap_id to some value
          statecoin.swap_id = "a swap id"
          //Set my_bst_data to some value
          statecoin.swap_my_bst_data = "a my bst data"
        
          const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)
          
          http_mock.post = jest.fn((path, body) => {
            if(path === POST_ROUTE.SWAP_POLL_SWAP){
              return SWAP_STATUS.Phase2
            }
            if(path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE){
              return {s_prime: "some sprime value"}
            }
          })
  
          const tor_id_error = () => { return new Error("Could not get new TOR ID")}
          http_mock.new_tor_id = jest.fn(() => {
            throw tor_id_error()
          })
  
          //The statecoin ui swap status is expected to be update to phase 3
          let phase3_statecoin = cloneDeep(statecoin)
          phase3_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase3
          const UI_PHASE3_STATECOIN = cloneDeep(phase3_statecoin)
  
          await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
            .rejects.toThrow(Error)
          expect(statecoin).toEqual(UI_PHASE3_STATECOIN)
          expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
          
          await expect(swapPhase2(http_mock, null, statecoin, proof_key_der, proof_key_der))
            .rejects.toThrowError(`Error getting new TOR id: ${tor_id_error().message}`)
          expect(statecoin).toEqual(UI_PHASE3_STATECOIN)
          expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
          
          })

          test('swapPhase2 test 7 - Error making blind spend token in requester_calc_s()', async function() {
    
            let http_mock = jest.genMockFromModule('../mocks/swap/phase2/test1/mock_http_client')
      
      
            let statecoin = makeTesterStatecoin();
            let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
            
            
            //Set valid statecoin status
            statecoin.status = STATECOIN_STATUS.IN_SWAP
            //Set valid swap status
            statecoin.swap_status = SWAP_STATUS.Phase2
            //Set swap_id to some value
            statecoin.swap_id = "a swap id"
            //Set my_bst_data to some value
            statecoin.swap_my_bst_data = "a my bst data"
          
            const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)
            
            http_mock.post = jest.fn((path, body) => {
              if(path === POST_ROUTE.SWAP_POLL_SWAP){
                return SWAP_STATUS.Phase2
              }
              if(path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE){
                return {s_prime: "some sprime value"}
              }
            })
            
            http_mock.new_tor_id = jest.fn(() => {
            })

            const make_rcs_error = () => { return new Error("Error in requester_calc_s")}
            //wasm_mock.BSTRequestorData = jest.
            wasm_mock.BSTRequestorData.requester_calc_s = jest.fn((_s_prime, _u, _v) => {
              throw make_rcs_error()
            })
            
            //The statecoin ui swap status is expected to be update to phase 3
            let phase4_statecoin = cloneDeep(statecoin)
            phase4_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase4
            const UI_PHASE4_STATECOIN = cloneDeep(phase4_statecoin)
    
            await expect(swapPhase2(http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der))
              .rejects.toThrow(Error)
            expect(statecoin).toEqual(UI_PHASE4_STATECOIN)
            expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
            
            await expect(swapPhase2(http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der))
              .rejects.toThrowError(`${make_rcs_error().message}`)
            expect(statecoin).toEqual(UI_PHASE4_STATECOIN)
            expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
            
            })

            test.skip('swapPhase2 test 8 - Error making blind spend token in make_blind_spend_token()', async function() {
    
              let http_mock = jest.genMockFromModule('../mocks/swap/phase2/test1/mock_http_client')
        
        
              let statecoin = makeTesterStatecoin();
              let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
              
              
              //Set valid statecoin status
              statecoin.status = STATECOIN_STATUS.IN_SWAP
              //Set valid swap status
              statecoin.swap_status = SWAP_STATUS.Phase2
              //Set swap_id to some value
              statecoin.swap_id = "a swap id"
              //Set my_bst_data to some value
              statecoin.swap_my_bst_data = "a my bst data"
            
              const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)
              
              http_mock.post = jest.fn((path, body) => {
                if(path === POST_ROUTE.SWAP_POLL_SWAP){
                  return SWAP_STATUS.Phase2
                }
                if(path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE){
                  return {s_prime: "some sprime value"}
                }
              })
              
              http_mock.new_tor_id = jest.fn(() => {
              })
  
              wasm_mock.BSTRequestorData.requester_calc_s = jest.fn((_bst_requestor_data_str, _signature_str) => {
                return { "unblinded_sig": "an_unblinded_sig_value"} 
              })

              const make_mbst_error = () => { return new Error("Error in make_blind_spend_token")}
              //wasm_mock.BSTRequestorData = jest.
              wasm_mock.BSTRequestorData.make_blind_spend_token = jest.fn((_bst_requestor_data_str, _signature_str) => {
                throw make_mbst_error()
              })
              
              //The statecoin ui swap status is expected to be update to phase 3
              let phase4_statecoin = cloneDeep(statecoin)
              phase4_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase4
              const UI_PHASE4_STATECOIN = cloneDeep(phase4_statecoin)
      
              await expect(swapPhase2(http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der))
                .rejects.toThrow(Error)
              expect(statecoin).toEqual(UI_PHASE4_STATECOIN)
              expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
              
              await expect(swapPhase2(http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der))
                .rejects.toThrowError(`${make_mbst_error().message}`)
              expect(statecoin).toEqual(UI_PHASE4_STATECOIN)
              expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
              
              })

              test(`swapPhase2 test 9 - Error calling server API ${POST_ROUTE.SWAP_SECOND}`, async function() {
    
                let http_mock = jest.genMockFromModule('../mocks/swap/phase2/test1/mock_http_client')
          
          
                let statecoin = makeTesterStatecoin();
                let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
                
                
                //Set valid statecoin status
                statecoin.status = STATECOIN_STATUS.IN_SWAP
                //Set valid swap status
                statecoin.swap_status = SWAP_STATUS.Phase2
                //Set swap_id to some value
                statecoin.swap_id = "a swap id"
                //Set my_bst_data to some value
                statecoin.swap_my_bst_data = "a my bst data"
              
                const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)
                
                const make_post_error = (path, body) => { 
                  return new Error(`Error from POST request - path: ${path}, body: ${body}`)
                }
                http_mock.post = jest.fn((path, body) => {
                  if(path === POST_ROUTE.SWAP_POLL_SWAP){
                    return SWAP_STATUS.Phase2
                  }
                  if(path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE){
                    return {s_prime: "some sprime value"}
                  }
                  if(path === POST_ROUTE.SWAP_SECOND){
                    throw make_post_error(path, body)
                  }
                })
                
                http_mock.new_tor_id = jest.fn(() => {
                })
       
                //The statecoin ui swap status is expected to be update to phase 3
                let phase4_statecoin = cloneDeep(statecoin)
                phase4_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase4
                const UI_PHASE4_STATECOIN = cloneDeep(phase4_statecoin)
        
                await expect(swapPhase2(http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der))
                  .rejects.toThrow(Error)
                expect(statecoin).toEqual(UI_PHASE4_STATECOIN)
                expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
                
                await expect(swapPhase2(http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der))
                  .rejects.toThrowError(`${make_post_error(POST_ROUTE.SWAP_SECOND,"some body").message}`)
                expect(statecoin).toEqual(UI_PHASE4_STATECOIN)
                expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
                
                })
  

})
