/**
 * @jest-environment jsdom
 */
import { makeTesterStatecoin } from './test_data.js'
import { SWAP_STATUS } from "../swap/swap_utils";
import Swap from "../swap/swap"
import { STATECOIN_STATUS } from '../statecoin'
import * as MOCK_SERVER from '../mocks/mock_http_client'
import { Wallet, MOCK_WALLET_NAME } from '../wallet'
import { swapPhase1 as swapPhase1Steps } from '../swap/swap.phase1'
import { StateChainSig } from  '../util'
let cloneDeep = require('lodash.clonedeep');
let walletName = `${MOCK_WALLET_NAME}_swap_phase1_tests`

let bitcoin = require('bitcoinjs-lib')
// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');

const swapPhase1 = async (swap) => {
    swap.setSwapSteps(swapPhase1Steps(swap));
    let result;
    for(let i=0; i< swap.swap_steps.length; i++){
        result =  await swap.doNext()
        if(result.is_ok() === false){
            return result;
        }
    }
    return result;
}


const getWallet = async () => {
    let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, walletName);
    wallet.config.min_anon_set = 3;
    wallet.config.jest_testing_mode = true;
    wallet.http_client = http_mock;
    wallet.wasm = wasm_mock;
    return wallet;
}


describe('swapPhase1 test 1 - incorrect status', () => {
    // input /////////////////////////////////////////////////
    let statecoin = makeTesterStatecoin();
    let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
    statecoin.status = null
    
    //////////////////////////////////////////////////////////

    it('throws error on null status', async () => {
        let wallet = await getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der) 

        const input = async () => {
            return await swapPhase1(swap);
        }
        const output = `phase Phase1:pollUtxo: invalid statecoin status: ${statecoin.status}`;

        expect(input()).rejects.toThrowError(output);
    })
})