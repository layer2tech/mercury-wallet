import { makeTesterStatecoin, STATECOIN_SWAP_DATA, SWAP_SHARED_KEY_OUT } from './test_data.js'
import Swap from "../swap/swap"
import { STATECOIN_STATUS } from '../statecoin'
import { REQUESTOR_CALC_S, MAKE_BST, POST_BST } from '../mocks/mock_wasm'
import { SWAP_SECOND_SCE_ADDRESS } from '../mocks/mock_http_client';
import * as MOCK_SERVER from '../mocks/mock_http_client'
import { GET_ROUTE, POST_ROUTE } from '../http_client';
import { Wallet, MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD } from '../wallet';
import { ACTION } from '..';
import { Transaction } from 'bitcoinjs-lib';
import { swapInit as swapInitSteps } from '../swap/swap.init'
import { swapPhase0 as swapPhase0Steps } from '../swap/swap.phase0'
import { swapPhase1 as swapPhase1Steps } from '../swap/swap.phase1'
import { swapPhase2 as swapPhase2Steps } from '../swap/swap.phase2'
import { swapPhase3 as swapPhase3Steps } from '../swap/swap.phase3'
import { swapPhase4 as swapPhase4Steps } from '../swap/swap.phase4'
import { COMMITMENT_DATA } from './test_data.js'
import {
    SWAP_STATUS,
    UI_SWAP_STATUS
} from "../swap/swap_utils";



let walletName = `${MOCK_WALLET_NAME}_swap_init_tests`;
let mock_http_client = require('../mocks/mock_http_client');
let mock_wasm = require('../mocks/mock_wasm');

let cloneDeep = require('lodash.clonedeep');
let bitcoin = require('bitcoinjs-lib')
let test_data = require('./test_data.js')
// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
let electrum_mock = jest.genMockFromModule('../mocks/mock_electrum');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');

const post_error = (path, body) => {
    return new Error(`Error from POST request - path: ${path}, body: ${body}`)
}

const get_error = (path, params) => {
    return new Error(`Error from GET request - path: ${path}, params: ${params}`)
}

const wasm_err = (message) => {
    return new Error(`Error from wasm_mock: ${message}`)
}

const SHARED_KEY_DUMMY = { public: { q: "", p2: "", p1: "", paillier_pub: {}, c_key: "", }, private: "", chain_code: "" };

const WALLET_VERSION = require("../../../package.json").version.substring(1);

const get_proof_key_der = () => {
    return bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
}

const SWAP_SIZE = test_data.SIGNSWAPTOKEN_DATA[0].swap_token.statechain_ids.length

const getWallet = async () => {
    let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, walletName);
    wallet.config.min_anon_set = 3;
    wallet.config.jest_testing_mode = true;
    wallet.http_client = http_mock;
    wallet.wasm = wasm_mock;
    wallet.electrum_client = electrum_mock;
    return wallet;
}

const get_statecoin_in = () => {
    let statecoin = makeTesterStatecoin();
    test_data.setSwapDetails(statecoin, 'Reset')
    statecoin.status = STATECOIN_STATUS.AWAITING_SWAP
    return statecoin
}

const get_statecoin_init_out_expected = () => {
    let statecoin = makeTesterStatecoin();
    test_data.setSwapDetails(statecoin, 0);
    return statecoin;
}

const get_statecoin_phase0_out_expected = () => {
    let statecoin = makeTesterStatecoin();
    test_data.setSwapDetails(statecoin, 1);
    return statecoin;
}

const swapPhaseAll = async (swap) => {
    let swapPhases = swapInitSteps(swap).concat(
        swapPhase0Steps(swap),
        swapPhase1Steps(swap),
        swapPhase2Steps(swap),
        swapPhase3Steps(swap),
        swapPhase4Steps(swap)
    );
    swap.setSwapSteps(swapPhases);
    let result
    for (let i = 0; i < swap.swap_steps.length; i++) {
        console.error('starting swap: ' + i);
        result = await swap.doNext()
        if (result.is_ok() === false) {
            console.error('result is not ok at swap:', i);
            return result
        }
    }
    return result
}

const swapInit = async (swap) => {
    swap.setSwapSteps(swapInitSteps(swap));
    let result
    for (let i = 0; i < swap.swap_steps.length; i++) {
        result = await swap.doNext()
        if (result.is_ok() === false) {
            return result
        }
    }
    return result
}

async function swapPhase0(swap) {
    swap.setSwapSteps(swapPhase0Steps(swap))
    let result
    for (let i = 0; i < swap.swap_steps.length; i++) {
        result = await swap.doNext()
        if (result.is_ok() === false) {
            return result
        }
    }
    return result
}

async function swapPhase1(swap) {
    swap.setSwapSteps(swapPhase1Steps(swap))
    let result
    for (let i = 0; i < swap.swap_steps.length; i++) {
        result = await swap.doNext()
        if (result.is_ok() === false) {
            return result
        }
    }
    return result
}

async function swapPhase2(swap) {
    swap.setSwapSteps(swapPhase2Steps(swap))
    let result
    for (let i = 0; i < swap.swap_steps.length; i++) {
        result = await swap.doNext()
        if (result.is_ok() === false) {
            return result
        }
    }
    return result
}

async function swapPhase3(swap) {
    swap.setSwapSteps(swapPhase3Steps(swap))
    let result
    for (let i = 0; i < swap.swap_steps.length; i++) {
        result = await swap.doNext()
        if (result.is_ok() === false) {
            return result
        }
    }
    return result
}

async function swapPhase4(swap) {
    swap.setSwapSteps(swapPhase4Steps(swap))
    let result
    for (let i = 0; i < swap.swap_steps.length; i++) {
        result = await swap.doNext()
        if (result.is_ok() === false) {
            return result
        }
    }
    return result
}


const init_phase3_status = (statecoin) => {
    //Set valid statecoin status
    statecoin.status = STATECOIN_STATUS.IN_SWAP;
    //Set valid swap status
    statecoin.swap_status = SWAP_STATUS.Phase3;
    //Set swap_id to some value
    statecoin.swap_id = { "id": "f7ac71c1-0937-4718-bc9b-7f4d77321981" };
    //Set my_bst_data to some value
    statecoin.swap_my_bst_data = "a my bst data";
    //Set swap_info to some value
    statecoin.swap_info = mock_http_client.SWAP_INFO;
    //Set swap address from phase1
    statecoin.swap_address = "a swap address";
    // Set ui status
    statecoin.ui_swap_status = UI_SWAP_STATUS.Phase5;
    // Set swap receiver address to mock value
    statecoin.swap_receiver_addr = SWAP_SECOND_SCE_ADDRESS;
}

export const setSwapDetails = (statecoin, phase) => {
    let new_data = STATECOIN_SWAP_DATA[`${phase}`]
    statecoin.status = new_data.status
    statecoin.transfer_msg = new_data.transfer_msg
    statecoin.swap_status = new_data.swap_status
    statecoin.ui_swap_status = new_data.ui_swap_status
    statecoin.swap_id = new_data.swap_id
    statecoin.swap_info = new_data.swap_info
    statecoin.swap_address = new_data.swap_address
    statecoin.swap_my_bst_data = new_data.swap_my_bst_data
    statecoin.swap_receiver_addr = new_data.swap_receiver_addr
    statecoin.swap_transfer_msg = new_data.swap_transfer_msg
    statecoin.swap_batch_data = new_data.swap_batch_data
    statecoin.swap_transfer_finalized_data = new_data.swap_transfer_finalized_data
    statecoin.swap_auto = new_data.swap_autos
    return statecoin
}

const get_statecoin_out_expected = (statecoin_out, smt_proof = null) => {
    let statecoin_out_expected = get_statecoin_in()
    statecoin_out_expected.value = 100000
    statecoin_out_expected.swap_rounds = 1
    statecoin_out_expected.anon_set = 5
    statecoin_out_expected.swap_status = null
    statecoin_out_expected.swap_transfer_finalized_data = null
    statecoin_out_expected.status = STATECOIN_STATUS.AVAILABLE
    statecoin_out_expected.shared_key_id = mock_http_client.TRANSFER_FINALIZE_DATA.new_shared_key_id
    statecoin_out_expected.statechain_id = mock_http_client.TRANSFER_FINALIZE_DATA.statechain_id
    statecoin_out_expected.funding_txid = mock_http_client.RECOVERY_STATECHAIN_DATA.utxo.txid
    statecoin_out_expected.is_new = true
    statecoin_out_expected.proof_key =
        mock_http_client.RECOVERY_STATECHAIN_DATA.chain[mock_http_client.RECOVERY_STATECHAIN_DATA.chain.length - 1].data
    statecoin_out_expected.sc_address = "sc1qvl2s57h77wr93wjvtgdtkzetv2ypjw67k8qysz82zltvjgds29vq3ahfez"
    statecoin_out_expected.shared_key = SWAP_SHARED_KEY_OUT
    statecoin_out_expected.swap_my_bst_data = null
    statecoin_out_expected.swap_id = null
    statecoin_out_expected.swap_info = null
    statecoin_out_expected.timestamp = statecoin_out.timestamp
    statecoin_out_expected.tx_backup = Transaction.fromHex(
        mock_http_client.TRANSFER_FINALIZE_DATA.tx_backup_psm.tx_hex);
    statecoin_out_expected.smt_proof = smt_proof
    return statecoin_out_expected;
}

// this swap completes a full swap between 0 to 5
describe('full swap test 1 - correct swap', () => {
    // starting coin

    // make sure everything is setup for swaps
    it('should give a new statecoin', async () => {
        let statecoin = get_statecoin_in();
        const proof_key_der = get_proof_key_der()
        let wallet = await getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        // phase1 
        let final_statecoin = cloneDeep(statecoin)
        setSwapDetails(final_statecoin, 1)

        http_mock.post = jest
            .fn()
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.SWAP_REGISTER_UTXO) {
                    // do nothing
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.SWAP_POLL_UTXO) {
                    return final_statecoin.swap_id
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.SWAP_POLL_UTXO) {
                    return final_statecoin.swap_id
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.SWAP_INFO) {
                    return MOCK_SERVER.SWAP_INFO;
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.SWAP_FIRST) {
                    // no return just post
                }
            })
            // phase2
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                    return SWAP_STATUS.Phase2
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE) {
                    return { s_prime: "some sprime value" }
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.SWAP_SECOND) {
                    return SWAP_SECOND_SCE_ADDRESS
                }
            })
            // swap phase3
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                    return SWAP_STATUS.Phase4;
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.TRANSFER_SENDER) {
                    return MOCK_SERVER.TRANSFER_SENDER;
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.PREPARE_SIGN) {
                    return MOCK_SERVER.PREPARE_SIGN;
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.SIGN_FIRST) {
                    return MOCK_SERVER.SIGN_FIRST;
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.SIGN_SECOND) {
                    return MOCK_SERVER.SIGN_SECOND;
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.TRANSFER_UPDATE_MSG) {
                    return;
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === POST_ROUTE.TRANSFER_PUBKEY) {
                    return MOCK_SERVER.TRANSFER_PUBKEY;
                }
            })

        wasm_mock.BSTRequestorData.requester_calc_s = jest.fn((_bst_requestor_data_str, _signature_str) => {
            return JSON.stringify(REQUESTOR_CALC_S)
        })

        //wasm_mock.BSTRequestorData = jest.
        wasm_mock.BSTRequestorData.make_blind_spend_token = jest.fn((_bst_requestor_data_str, _signature_str) => {
            return JSON.stringify(MAKE_BST)
        })

        // phase3
        wasm_mock.Sign.first_message = jest.fn((_secret_key) => {
            return mock_wasm.SIGN_FIRST
        })

        wasm_mock.Sign.second_message = jest.fn((_secret_key) => {
            return mock_wasm.SIGN_SECOND
        })

        wasm_mock.Commitment.make_commitment = jest.fn(() => JSON.stringify(COMMITMENT_DATA[0].batch_data));

        http_mock.new_tor_id = jest.fn(() => {

        })

        //Phase3
        let statecoin3 = makeTesterStatecoin();
        init_phase3_status(statecoin3);
        let tm3 = cloneDeep(http_mock.TRANSFER_MSG3)
        tm3.statechain_id = statecoin3.swap_info.swap_token.statechain_ids[0]
        const tm3_const = tm3

        http_mock.get = jest
            .fn()
            // phase1
            .mockImplementationOnce((path, body) => {
                if (path === GET_ROUTE.STATECOIN) {
                    return MOCK_SERVER.STATECOIN_INFO;
                }
            })
            // phase3
            .mockImplementationOnce((path, body) => {
                if (path === GET_ROUTE.FEES) {
                    return MOCK_SERVER.FEE_INFO;
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === GET_ROUTE.STATECOIN) {
                    return MOCK_SERVER.STATECOIN_INFO;
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === GET_ROUTE.TRANSFER_GET_MSG_ADDR) {
                    return [tm3_const]
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === GET_ROUTE.STATECHAIN) {
                    return MOCK_SERVER.STATECHAIN_INFO;
                }
            })
            .mockImplementationOnce((path, body) => {
                if (path === GET_ROUTE.STATECHAIN_OWNER) {
                    return MOCK_SERVER.STATECOIN_PROOF_KEY_DER_AFTER_TRANSFER;
                }
                if (path === GET_ROUTE.FEES) {
                    return MOCK_SERVER.FEE_INFO;
                }
            })

        //mock_electrum 
        electrum_mock.importAddresses = jest.fn(([addr], heightDiff) => {
            return "";
        });
        electrum_mock.getScriptHashListUnspent = jest.fn((param1) => {
            return [{
                tx_hash:
                    "794610eff71928df4d6814843945dbe51d8d11cdbcbeb11eb1c42e8199298494",
                tx_pos: 0,
                height: 1936508,
                value: 500000
            }];
        });
        electrum_mock.getTransaction = jest.fn((param1) => {
            return new Promise(function (resolve) {
                resolve({
                    txid:
                        'c33c88b149ec86eb99f1b5d6177ccd198833b07735bfd3049d2dd90c9c0328fc',
                    hash:
                        '47cb606ed7f772a6fbc0e41f3a084e4e54f2ceafffef51c2349ce663ff3095ed',
                    version: 1,
                    size: 208,
                    vsize: 181,
                    weight: 724,
                    locktime: 0,
                    vin:
                        [{
                            coinbase:
                                '03238b1d255c20444d47424c4f434b434841494e205c000000008e5373053f687aabe5e90f0b2e874a00',
                            sequence: 0
                        }],
                    vout:
                        [{ value: 0.09946406, n: 0, scriptPubKey: [Object] },
                        { value: 0, n: 1, scriptPubKey: [Object] }],
                    hex:
                        '010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff2a03238b1d255c20444d47424c4f434b434841494e205c000000008e5373053f687aabe5e90f0b2e874a00000000000226c597000000000017a9141fd814800f2ab24cbfd0500ed647de4dcb2a7a9f870000000000000000266a24aa21a9ed8fc48c645e0004f8f3c8e771d55a761b14102477ba1c66a58fa70c3069f3cb540120000000000000000000000000000000000000000000000000000000000000000000000000',
                    blockhash:
                        '0000000000011ff22e58f08aa4b0f4ab891fd60ba97818237105d10670ecae0c',
                    confirmations: 120,
                    time: 1613408329,
                    blocktime: 1613408329
                })
            });
        });

        // phase1
        wasm_mock.BSTRequestorData.setup = jest.fn((_r_prime_str, _m) => {
            return JSON.stringify({
                "u": "u",
                "v": "v",
                "r": { "x": "x", "y": "y" },
                "e_prime": "e_prime",
                "m": "m"
            });
        });

        await swapPhaseAll(swap);
        console.error(statecoin.swap_id);
        expect(statecoin.swap_id).not.toEqual(null);
    });
});