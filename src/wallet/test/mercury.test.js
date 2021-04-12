import { verifySmtProof, StateChainSig, proofKeyToSCEAddress, pubKeyTobtcAddr, pubKeyToScriptPubKey, decryptECIES } from '../util';
import { Wallet, StateCoin, MockHttpClient, HttpClient, MockWasm, StateCoinList, STATECOIN_STATUS } from '../';
import { keyGen, PROTOCOL, sign } from "../mercury/ecdsa";
import { depositConfirm } from "../mercury/deposit";
import { withdraw } from "../mercury/withdraw";
import { transferSender, transferReceiver, transferReceiverFinalize } from "../mercury/transfer";
import { TransferMsg3, TransferFinalizeData } from "../mercury/transfer";

import { BTC_ADDR, KEYGEN_SIGN_DATA, FINALIZE_DATA, FUNDING_TXID, SHARED_KEY_ID, SIGNSWAPTOKEN_DATA, COMMITMENT_DATA } from './test_data.js'
import { SwapToken, make_swap_commitment } from '../swap/swap'
import * as MOCK_CLIENT from '../mocks/mock_wasm';
import * as MOCK_SERVER from '../mocks/mock_http_client'
import { BIP32Interface, BIP32,  fromBase58, fromSeed} from 'bip32';

let bitcoin = require('bitcoinjs-lib')
let lodash = require('lodash');
const BJSON = require('buffer-json')

// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');

describe('swapTokenSign', function() {
  
  test('Gen and Verify', async function() {
    SIGNSWAPTOKEN_DATA.forEach(data => {
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(data.priv, "hex"));
      //let proof_key_der = wallet.getBIP32forProofKeyPubKey(data.priv);
      console.log('proof_key_der', proof_key_der);
      let pub = proof_key_der.publicKey.toString('hex');
      expect(pub).toBe(data.pub);
      let st = data.swap_token;
      let st_cls = new SwapToken(st.id, st.amount, st.time_out, st.statechain_ids);

      let swap_sig = st_cls.sign(proof_key_der,data.swap_token, data.priv);
    expect(swap_sig).toBe(data.swap_token_sig);
  })
});
})

describe('commitment', function() {
test('Gen and Verify', async function() {
  wasm_mock.Commitment.make_commitment = jest.fn(() => JSON.stringify(COMMITMENT_DATA[0].batch_data));
   COMMITMENT_DATA.forEach(data => {
     console.log("commitment data: ", data);
     let batch_data = make_swap_commitment(data.statecoin, data.swap_info, wasm_mock);
     expect(batch_data.commitment).toBe(data.batch_data.commitment);
   })
 });
})


describe('2P-ECDSA', function() {
  test('KeyGen', async function() {
    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce(MOCK_SERVER.KEYGEN_FIRST)
      .mockReturnValueOnce(MOCK_SERVER.KEYGEN_SECOND);
    wasm_mock.KeyGen.first_message = jest.fn(() => MOCK_CLIENT.KEYGEN_FIRST);
    wasm_mock.KeyGen.second_message = jest.fn(() => MOCK_CLIENT.KEYGEN_SECOND);
    wasm_mock.KeyGen.set_master_key = jest.fn(() => MOCK_CLIENT.KEYGEN_SET_MASTER_KEY);

    let statecoin = await keyGen(http_mock, wasm_mock, KEYGEN_SIGN_DATA.shared_key_id, KEYGEN_SIGN_DATA.shared_key.private.x2, KEYGEN_SIGN_DATA.protocol);

    expect(statecoin.shared_key_id).toBe(KEYGEN_SIGN_DATA.shared_key_id);
    expect(statecoin.value).toBe(0);
    expect(statecoin.shared_key).toStrictEqual(KEYGEN_SIGN_DATA.shared_key);
    expect(statecoin.tx_backup).toBe(null);
    expect(statecoin.tx_withdraw).toBe(null);
    expect(statecoin.smt_proof).toBe(null);
    expect(statecoin.status).toBe(STATECOIN_STATUS.INITIALISED);
  });

  test('Sign', async function() {
    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce(true)   //POST.PREPARE_SIGN
      .mockReturnValueOnce(MOCK_SERVER.SIGN_FIRST)
      .mockReturnValueOnce(MOCK_SERVER.SIGN_SECOND);
    wasm_mock.Sign.first_message = jest.fn(() => MOCK_CLIENT.SIGN_FIRST);
    wasm_mock.Sign.second_message = jest.fn(() => MOCK_CLIENT.SIGN_SECOND);

    let signatures = await sign(http_mock, wasm_mock, [KEYGEN_SIGN_DATA.shared_key_id], [KEYGEN_SIGN_DATA.shared_key], [KEYGEN_SIGN_DATA.signature_hash], KEYGEN_SIGN_DATA, KEYGEN_SIGN_DATA.protocol);
    expect(typeof signatures[0]).toBe('string');
  });
})


describe('StateChain Entity', function() {
  let network = bitcoin.networks.testnet;

  describe('Deposit', function() {
    test('Confirm expect complete', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.FEE_INFO)
        .mockReturnValueOnce(MOCK_SERVER.ROOT_INFO);
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(true)   //POST.PREPARE_SIGN
        .mockReturnValueOnce(MOCK_SERVER.SIGN_FIRST)
        .mockReturnValueOnce(MOCK_SERVER.SIGN_SECOND)
        .mockReturnValueOnce(MOCK_SERVER.DEPOSIT_CONFIRM)
        .mockReturnValueOnce(MOCK_SERVER.SMT_PROOF);
      wasm_mock.Sign.first_message = jest.fn(() => MOCK_CLIENT.SIGN_FIRST);
      wasm_mock.Sign.second_message = jest.fn(() => MOCK_CLIENT.SIGN_SECOND);
      wasm_mock.verify_statechain_smt = jest.fn(() => true);

      let statecoin = lodash.cloneDeep(tester_statecoins[0]);
      let statecoin_finalized = await depositConfirm(http_mock,wasm_mock,network,statecoin,10);

      expect(statecoin_finalized.statechain_id.length).toBeGreaterThan(0);
      expect(statecoin_finalized.proof_key.length).toBeGreaterThan(0);
      expect(statecoin_finalized.funding_txid.length).toBeGreaterThan(0);
      expect(statecoin_finalized.smt_proof).not.toBeNull();
    });
    test('Fee too large for amount.', async function() {
      let fee_info = lodash.clone(MOCK_SERVER.FEE_INFO);
      fee_info.withdraw = 10000;

      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(fee_info)

      let statecoin = lodash.cloneDeep(tester_statecoins[0]);
      await expect(depositConfirm(http_mock,wasm_mock,network,statecoin,10))
        .rejects
        .toThrowError("Not enough value to cover fee.");
    });
    test('Proof key not valid.', async function() {
        http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.FEE_INFO)

      let statecoin = lodash.cloneDeep(tester_statecoins[0]);
      statecoin.proof_key = "a";
      await expect(depositConfirm(http_mock,wasm_mock,network,statecoin,10))
        .rejects
        .toThrowError("Expected property \"pubkey\" of type ?isPoint, got Buffer");
    });
    test('Proof key not owned by wallet.', async function() {
        http_mock.get = jest.fn().mockReset()
          .mockReturnValueOnce(MOCK_SERVER.FEE_INFO)

      let statecoin = lodash.cloneDeep(tester_statecoins[0]);
      statecoin.proof_key = "aaaaaaaad651cd921fc490a6691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0e";
      await expect(depositConfirm(http_mock,wasm_mock,network,statecoin,10))
        .rejects
        .toThrowError("Expected property \"pubkey\" of type ?isPoint, got Buffer");
    });
  });

  describe('Withdraw', function() {
    test('Expect complete', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(lodash.cloneDeep(MOCK_SERVER.STATECHAIN_INFO))
        .mockReturnValueOnce(MOCK_SERVER.FEE_INFO);
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(true)   //POST.WITHDRAW_INIT
      // Sign
      http_mock.post
        .mockReturnValueOnce(true)   //POST.PREPARE_SIGN
        .mockReturnValueOnce(MOCK_SERVER.SIGN_FIRST)
        .mockReturnValueOnce(MOCK_SERVER.SIGN_SECOND)
        .mockReturnValueOnce(MOCK_SERVER.WITHDRAW_CONFIRM);
      wasm_mock.Sign.first_message = jest.fn(() => MOCK_CLIENT.SIGN_FIRST);
      wasm_mock.Sign.second_message = jest.fn(() => MOCK_CLIENT.SIGN_SECOND);

      let statecoin = lodash.cloneDeep(tester_statecoins[0]);
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
      console.log('statecoin: {}', statecoin);
      console.log('proof_key_der: {}', proof_key_der);
      let tx_withdraw = await withdraw(http_mock, wasm_mock, network, [statecoin], [proof_key_der], BTC_ADDR);

      // check withdraw tx
      expect(tx_withdraw.ins.length).toBe(1);
      expect(tx_withdraw.ins[0].hash.reverse().toString("hex")).toBe(statecoin.funding_txid);
      expect(tx_withdraw.outs.length).toBe(2);
      expect(tx_withdraw.outs[0].value).toBeLessThan(statecoin.value);
      expect(tx_withdraw.locktime).toBe(0);
    });
    test('Already withdrawn.', async function() {
      let statechain_info = lodash.cloneDeep(MOCK_SERVER.STATECHAIN_INFO);
      statechain_info.amount = 0;
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(statechain_info)

      await expect(withdraw(http_mock, wasm_mock, network, [{}], [{}], BTC_ADDR))
        .rejects
        .toThrowError("StateChain undefined already withdrawn.");
    });
    test('StateChain not owned by this wallet.', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(lodash.cloneDeep(MOCK_SERVER.STATECHAIN_INFO))

      let statecoin = lodash.cloneDeep(tester_statecoins[0]);
      statecoin.proof_key = "aaa";
      await expect(withdraw(http_mock, wasm_mock, network, [statecoin], [{}], BTC_ADDR))
        .rejects
        .toThrowError("StateChain not owned by this Wallet. Incorrect proof key.");
    });
    test('Fee too large for amount.', async function() {
      let fee_info = lodash.clone(MOCK_SERVER.FEE_INFO);
      fee_info.withdraw = 10000;

      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(lodash.cloneDeep(MOCK_SERVER.STATECHAIN_INFO))
        .mockReturnValueOnce(fee_info)
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(true)   //POST.WITHDRAW_INIT

      let statecoin = lodash.cloneDeep(tester_statecoins[0]);
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
      await expect(withdraw(http_mock, wasm_mock, network, [statecoin], [proof_key_der], BTC_ADDR))
        .rejects
        .toThrowError("Not enough value to cover fee.");
    });
  });

  describe('Withdraw Batch', function() {
    test('Expect complete', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(lodash.cloneDeep(MOCK_SERVER.STATECHAIN_INFO))
        .mockReturnValueOnce(MOCK_SERVER.FEE_INFO);
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(true)   //POST.WITHDRAW_INIT
      // Sign
      http_mock.post
        .mockReturnValueOnce(true)   //POST.PREPARE_SIGN
        .mockReturnValueOnce(MOCK_SERVER.SIGN_FIRST)
        .mockReturnValueOnce(MOCK_SERVER.SIGN_SECOND)
        .mockReturnValueOnce(MOCK_SERVER.WITHDRAW_CONFIRM);
      wasm_mock.Sign.first_message = jest.fn(() => MOCK_CLIENT.SIGN_FIRST);
      wasm_mock.Sign.second_message = jest.fn(() => MOCK_CLIENT.SIGN_SECOND);

      let statecoins = [lodash.cloneDeep(tester_statecoins[0]), lodash.cloneDeep(tester_statecoins[1])]
      let proof_key_ders =[bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)),
        bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D))];
      console.log('statecoin: {}', statecoins[0]);
      console.log('proof_key_der: {}', proof_key_ders[0]);
      let tx_withdraw = await withdraw(http_mock, wasm_mock, network, statecoins, proof_key_ders, BTC_ADDR);

      // check withdraw tx
      expect(tx_withdraw.ins.length).toBe(2);
      expect(tx_withdraw.ins[0].hash.reverse().toString("hex")).toBe(statecoins[0].funding_txid);
      expect(tx_withdraw.ins[1].hash.reverse().toString("hex")).toBe(statecoins[1].funding_txid);
      expect(tx_withdraw.outs.length).toBe(2);
      expect(tx_withdraw.outs[0].value).toBeLessThan(statecoins[0].value + statecoins[1].value);
      expect(tx_withdraw.locktime).toBe(0);
    });
    test('Already withdrawn.', async function() {
      let statechain_info = lodash.cloneDeep(MOCK_SERVER.STATECHAIN_INFO);
      statechain_info.amount = 0;
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(statechain_info)

      await expect(withdraw(http_mock, wasm_mock, network, [{}], [{}], BTC_ADDR))
        .rejects
        .toThrowError("StateChain undefined already withdrawn.");
    });
    test('StateChain not owned by this wallet.', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(lodash.cloneDeep(MOCK_SERVER.STATECHAIN_INFO))

      let statecoin = lodash.cloneDeep(tester_statecoins[0]);
      statecoin.proof_key = "aaa";
      await expect(withdraw(http_mock, wasm_mock, network, [statecoin], [{}], BTC_ADDR))
        .rejects
        .toThrowError("StateChain not owned by this Wallet. Incorrect proof key.");
    });
    test('Fee too large for amount.', async function() {
      let fee_info = lodash.clone(MOCK_SERVER.FEE_INFO);
      fee_info.withdraw = 10000;

      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(lodash.cloneDeep(MOCK_SERVER.STATECHAIN_INFO))
        .mockReturnValueOnce(fee_info)
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(true)   //POST.WITHDRAW_INIT

      let statecoin = lodash.cloneDeep(tester_statecoins[1]);
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
      await expect(withdraw(http_mock, wasm_mock, network, [statecoin], [proof_key_der], BTC_ADDR))
        .rejects
        .toThrowError("Not enough value to cover fee.");
    });
  });

  describe('TransferSender', function() {
    test('Expect complete', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.FEE_INFO)
        .mockReturnValueOnce(lodash.cloneDeep(MOCK_SERVER.STATECHAIN_INFO))
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.TRANSFER_SENDER)
      //Sign
        .mockReturnValueOnce(true)   //POST.PREPARE_SIGN
        .mockReturnValueOnce(MOCK_SERVER.SIGN_FIRST)
        .mockReturnValueOnce(MOCK_SERVER.SIGN_SECOND)
      //POST.TRANSFER_UPDATE_MSG;
        .mockReturnValueOnce(true)
      wasm_mock.Sign.first_message = jest.fn(() => MOCK_CLIENT.SIGN_FIRST);
      wasm_mock.Sign.second_message = jest.fn(() => MOCK_CLIENT.SIGN_SECOND);

      let statecoin = lodash.cloneDeep(tester_statecoins[0]);
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
      let rec_se_addr = statecoin.proof_key;
      let transfer_msg3 = await transferSender(http_mock, wasm_mock, network, statecoin, proof_key_der, rec_se_addr);

      // check transfer_msg data
      expect(transfer_msg3.shared_key_id).toBe(tester_statecoins[0].shared_key_id);
      expect(transfer_msg3.rec_se_addr.proof_key).toBe(rec_se_addr);

      // statechain sig verifies
      // let proof_key_der = wallet.getBIP32forProofKeyPubKey(statecoin.proof_key);
      expect(transfer_msg3.statechain_sig.verify(proof_key_der)).toBe(true)
      // t1 decryptable by proof key
      expect(decryptECIES(proof_key_der.privateKey.toString("hex"), transfer_msg3.t1.secret_bytes)).toBeTruthy()

      // check new backup tx
      let tx_backup = bitcoin.Transaction.fromHex(transfer_msg3.tx_backup_psm.tx_hex);
      expect(tx_backup.ins.length).toBe(1);
      expect(tx_backup.ins[0].hash.reverse().toString("hex")).toBe(statecoin.funding_txid);
      expect(tx_backup.outs.length).toBe(1);
      expect(tx_backup.outs[0].value).toBeLessThan(statecoin.value);
      expect(tx_backup.locktime).toBeLessThan(statecoin.tx_backup.locktime);
      // Check backuptx sends to new proof key
      expect(
        bitcoin.address.fromOutputScript(tx_backup.outs[0].script, network)
      ).toBe(
        pubKeyTobtcAddr(rec_se_addr, network)
      );
    });
  })

  describe('TransferReceiver', function() {
    test('Expect complete', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.STATECHAIN_INFO_AFTER_TRANSFER)
        .mockReturnValueOnce(lodash.cloneDeep(MOCK_SERVER.STATECHAIN_INFO))
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.TRANSFER_PUBKEY)
        .mockReturnValueOnce(MOCK_SERVER.TRANSFER_RECEIVER)
      //POST.TRANSFER_UPDATE_MSG;
        .mockReturnValueOnce(true)

      let transfer_msg3 = lodash.cloneDeep(MOCK_SERVER.TRANSFER_MSG3);
      let se_rec_addr_bip32 = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER_AFTER_TRANSFER.__D));
      let finalize_data = await transferReceiver(http_mock, transfer_msg3, se_rec_addr_bip32, null);

      expect(finalize_data.shared_key_id).not.toBe(transfer_msg3.shared_key_id);
    });
    test('Invalid StateChainSig', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.STATECHAIN_INFO_AFTER_TRANSFER)

      let transfer_msg3 = lodash.cloneDeep(MOCK_SERVER.TRANSFER_MSG3);
      transfer_msg3.statechain_sig.sig = "3044022026a22bb2b8c0e43094d9baa9de1abd1de914b59f8bbcf5b740900180da575ed10220544e27e2861edf01b5c383fc90d8b1fd41211628516789f771b2c3536e650bdb";

      await expect(transferReceiver(http_mock, transfer_msg3, {}, null))
        .rejects
        .toThrowError("Invalid StateChainSig.");
    });
    test('Incorrect decryption key', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.STATECHAIN_INFO_AFTER_TRANSFER)

      let transfer_msg3 = lodash.cloneDeep(MOCK_SERVER.TRANSFER_MSG3);
      let se_rec_addr_bip32 = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER_AFTER_TRANSFER.__D));
      se_rec_addr_bip32.__D = Buffer.from("0ca756f401478fb1a166d27945501d8af59ada1cb552c598509dfcb494f475b9", "hex")

      await expect(transferReceiver(http_mock, transfer_msg3, se_rec_addr_bip32, null))
        .rejects
        .toThrowError("Unsupported state or unable to authenticate data");
    });
  });

  describe('TransferReceiverFinalize', function() {
    test('Expect complete', async function() {
      // KeyGen
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.KEYGEN_FIRST)
        .mockReturnValueOnce(MOCK_SERVER.KEYGEN_SECOND)
      // KeyGen
      wasm_mock.KeyGen.first_message = jest.fn(() => MOCK_CLIENT.KEYGEN_FIRST);
      wasm_mock.KeyGen.second_message = jest.fn(() => MOCK_CLIENT.KEYGEN_SECOND);
      wasm_mock.KeyGen.set_master_key = jest.fn(() => MOCK_CLIENT.KEYGEN_SET_MASTER_KEY);

      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(MOCK_SERVER.ROOT_INFO)
      http_mock.post
        .mockReturnValueOnce(MOCK_SERVER.SMT_PROOF);

      let finalize_data = BJSON.parse(lodash.cloneDeep(FINALIZE_DATA));
      let statecoin = await transferReceiverFinalize(http_mock, wasm_mock, finalize_data);

      expect(statecoin.statechain_id).toBe(finalize_data.statechain_id);
      expect(statecoin.value).toBe(finalize_data.state_chain_data.amount);
      expect(statecoin.shared_key).toStrictEqual(KEYGEN_SIGN_DATA.shared_key);
      expect(statecoin.tx_backup).not.toBe(null);
      expect(statecoin.tx_withdraw).toBe(null);
      expect(statecoin.smt_proof).not.toBe(null);
      expect(statecoin.status).toBe(STATECOIN_STATUS.INITIALISED);
    });
  });
});


const SHARED_KEY = {"public":{"q":{"x":"ccd65d5f8e1b5e36fcc6f75daacfb144fc4b2ef956f5968c0dd871474d38d4dd","y":"c3c7acf1b5084d0ce373a415849c6b3072441b2123cf0102f4f9bede9deed434"},"p2":{"x":"ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477","y":"1d970329ed67b215033fa4f45431aa84d5d8969189b166b8b1c995c71418fc79"},"p1":{"x":"5775571335149beef013e041916f8bd6ad74560f614e4cdcc6285cf2239804a4","y":"5d444f7986a767249ec6f624956169edd31ad34169d1e644b9948bb084155a09"},"paillier_pub":{"n":"18618973404778754190518985428533896252170868175908426298152069620162843266686340593727719917765761117728365267017152884385574431579173532202603789689258042399403850464508838324962482715255812960593375421462405196296118705922516865620487438060730020195057476921619387883344824404749260998392405042001310138908055325868010132968223806254698220349656258811324161297045756648004671649730891558015063255667266103305209518264666426136884754344645705399865342796296732565545547519164996468902145097768529183807656951187924006922284038339794011741856368099322064983876937896831825577803442314444728202710488558740408208235001"},"c_key":[1,[2802809810,2295538597,824023868,2468614206,2382410329,3498283269,542845278,2638857966,882874623,314779007,533459108,4110532496,2066816076,3866382865,1507727392,2622766556,2166819970,745160432,4007494000,2755553791,1211723955,4026434693,34787852,817363057,2111193045,1986153889,989827644,3051061802,308497917,3526483949,1313053198,3239938395,3224233175,2656233176,2735490441,528833738,2992068321,1123445282,1322576068,3634835356,3687088759,804528076,1959677799,1848875502,142865825,2608636890,120148350,3818230595,1121032084,629553958,540686410,3942881735,3193185548,3170665768,3039748817,569567082,3758896658,884071316,2728026343,3841465923,3085691968,80776206,2649739738,2735555777,1101020525,3145673761,1465495093,1214998012,3210306804,2083816658,1336173722,3059272070,4195353313,2583489626,2533717747,2110492144,1090372498,3017243663,1048666077,368350691,3098877136,1984080230,662245415,1960616310,1421703698,1721963016,2678994935,1412068076,1627969329,538142028,2155846472,1586893482,2192750863,4161389416,2390953754,2538228113,3035795711,3182964956,732329291,3763461501,1558634765,1289229671,3058158470,2534690608,3070745896,1836149201,2651117011,3055342589,2032472510,669284634,778163039,3181597927,4052939209,82895660,4122394071,3411990510,165191647,1554192820,2780054189,3864774479,1672712056,3345642895,1192039886,4199617900,2746613170,2010732704,3580851445,234733436]]},"private":{"x2":"5b84bbf6c266c8e45f14290f8dd996445144463426c1a093fe76a163c3b5221f"},"chain_code":[0,[]]};

const STATECOIN =
{"shared_key_id":"c93ad45a-00b9-449c-a804-aab5530efc90","statechain_id":"","shared_key":{"public":{"q":{"x":"ccd65d5f8e1b5e36fcc6f75daacfb144fc4b2ef956f5968c0dd871474d38d4dd","y":"c3c7acf1b5084d0ce373a415849c6b3072441b2123cf0102f4f9bede9deed434"},"p2":{"x":"ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477","y":"1d970329ed67b215033fa4f45431aa84d5d8969189b166b8b1c995c71418fc79"},"p1":{"x":"5775571335149beef013e041916f8bd6ad74560f614e4cdcc6285cf2239804a4","y":"5d444f7986a767249ec6f624956169edd31ad34169d1e644b9948bb084155a09"},"paillier_pub":{"n":"18618973404778754190518985428533896252170868175908426298152069620162843266686340593727719917765761117728365267017152884385574431579173532202603789689258042399403850464508838324962482715255812960593375421462405196296118705922516865620487438060730020195057476921619387883344824404749260998392405042001310138908055325868010132968223806254698220349656258811324161297045756648004671649730891558015063255667266103305209518264666426136884754344645705399865342796296732565545547519164996468902145097768529183807656951187924006922284038339794011741856368099322064983876937896831825577803442314444728202710488558740408208235001"},"c_key":[1,[2802809810,2295538597,824023868,2468614206,2382410329,3498283269,542845278,2638857966,882874623,314779007,533459108,4110532496,2066816076,3866382865,1507727392,2622766556,2166819970,745160432,4007494000,2755553791,1211723955,4026434693,34787852,817363057,2111193045,1986153889,989827644,3051061802,308497917,3526483949,1313053198,3239938395,3224233175,2656233176,2735490441,528833738,2992068321,1123445282,1322576068,3634835356,3687088759,804528076,1959677799,1848875502,142865825,2608636890,120148350,3818230595,1121032084,629553958,540686410,3942881735,3193185548,3170665768,3039748817,569567082,3758896658,884071316,2728026343,3841465923,3085691968,80776206,2649739738,2735555777,1101020525,3145673761,1465495093,1214998012,3210306804,2083816658,1336173722,3059272070,4195353313,2583489626,2533717747,2110492144,1090372498,3017243663,1048666077,368350691,3098877136,1984080230,662245415,1960616310,1421703698,1721963016,2678994935,1412068076,1627969329,538142028,2155846472,1586893482,2192750863,4161389416,2390953754,2538228113,3035795711,3182964956,732329291,3763461501,1558634765,1289229671,3058158470,2534690608,3070745896,1836149201,2651117011,3055342589,2032472510,669284634,778163039,3181597927,4052939209,82895660,4122394071,3411990510,165191647,1554192820,2780054189,3864774479,1672712056,3345642895,1192039886,4199617900,2746613170,2010732704,3580851445,234733436]]},"private":{"x2":"5b84bbf6c266c8e45f14290f8dd996445144463426c1a093fe76a163c3b5221f"},"chain_code":[0,[]]},"proof_key":"03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477","value":10000,"funding_txid":"f62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3ce","funding_vout":0,"timestamp":1613056711604,"tx_backup":null,"tx_withdraw":null,"smt_proof":null,"swap_rounds":0,"status":"UNCONFIRMED"}
export const STATECOIN_CONFIRMED_BACKUPTX_HEX = "02000000000101ced3ba0f843dac4a022c7722b818e1063cd7f3d0d3e00f5d3a8476e2749b2cf60000000000ffffffff01e425000000000000160014d19cb7bef37606bff26c988fc7986b6999412cde011331323334357369676e6174757265353433323149570000"

let tester_statecoins = [new StateCoin("c93ad45a-00b9-449c-a804-aab5530efc90", SHARED_KEY),
                        new StateCoin("d93ad45a-00b9-449c-a804-aab5530efc90", SHARED_KEY)];

tester_statecoins[0].proof_key = STATECOIN.proof_key;
tester_statecoins[0].value = STATECOIN.value;
tester_statecoins[0].funding_txid = STATECOIN.funding_txid;
tester_statecoins[0].funding_vout = STATECOIN.funding_vout;
tester_statecoins[0].tx_backup = bitcoin.Transaction.fromHex(STATECOIN_CONFIRMED_BACKUPTX_HEX);

tester_statecoins[1].proof_key = STATECOIN.proof_key;
tester_statecoins[1].value = STATECOIN.value;
tester_statecoins[1].funding_txid = STATECOIN.funding_txid;
tester_statecoins[1].funding_vout = STATECOIN.funding_vout;
tester_statecoins[1].tx_backup = bitcoin.Transaction.fromHex(STATECOIN_CONFIRMED_BACKUPTX_HEX);
