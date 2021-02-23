import { verifySmtProof, StateChainSig, proofKeyToSCEAddress, pubKeyTobtcAddr, pubKeyToScriptPubKey, decryptECIES } from '../util';
import { Wallet, StateCoin, MockHttpClient, HttpClient, MockWasm, StateCoinList, STATECOIN_STATUS } from '../';
import { keyGen, PROTOCOL, sign } from "../mercury/ecdsa";
import { depositConfirm } from "../mercury/deposit";
import { withdraw } from "../mercury/withdraw";
import { TransferMsg3, TransferFinalizeData } from "../mercury/transfer";

import { BTC_ADDR, KEYGEN_SIGN_DATA, TRANSFER_MSG3, FINALIZE_DATA, FUNDING_TXID, SHARED_KEY_ID, STATECOIN_CONFIRMED, STATECOIN_CONFERMED_BACKUPTX_HEX } from './test_data.js'
import { CLI_KEYGEN_FIRST, CLI_KEYGEN_SECOND, CLI_KEYGEN_SET_MASTER_KEY, CLI_SIGN_FIRST, CLI_SIGN_SECOND} from '../mocks/mock_wasm'
import { FEE_INFO, STATECHAIN_INFO, SERV_KEYGEN_FIRST, SERV_KEYGEN_SECOND, SERV_SIGN_FIRST, SERV_SIGN_SECOND, DEPOSIT_CONFIRM, ROOT_INFO, SMT_PROOF } from '../mocks/mock_http_client'

let bitcoin = require('bitcoinjs-lib')
let lodash = require('lodash');
const BJSON = require('buffer-json')

// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');


describe('2P-ECDSA', function() {

  test('KeyGen', async function() {
    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce(SERV_KEYGEN_FIRST)
      .mockReturnValueOnce(SERV_KEYGEN_SECOND);
    wasm_mock.KeyGen.first_message = jest.fn(() => CLI_KEYGEN_FIRST);
    wasm_mock.KeyGen.second_message = jest.fn(() => CLI_KEYGEN_SECOND);
    wasm_mock.KeyGen.set_master_key = jest.fn(() => CLI_KEYGEN_SET_MASTER_KEY);

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
      .mockReturnValueOnce(SERV_SIGN_FIRST)
      .mockReturnValueOnce(SERV_SIGN_SECOND);
    wasm_mock.Sign.first_message = jest.fn(() => CLI_SIGN_FIRST);
    wasm_mock.Sign.second_message = jest.fn(() => CLI_SIGN_SECOND);

    let signature = await sign(http_mock, wasm_mock, KEYGEN_SIGN_DATA.shared_key_id, KEYGEN_SIGN_DATA.shared_key, KEYGEN_SIGN_DATA.signature_hash, KEYGEN_SIGN_DATA.protocol);
    expect(typeof signature).toBe('string');
  });
})



describe('StateChain Entity', function() {
  let network = bitcoin.networks.testnet;

  describe('Deposit', function() {
    test('Confirm expect complete', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(FEE_INFO)
        .mockReturnValueOnce(ROOT_INFO);
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(true)   //POST.PREPARE_SIGN
        .mockReturnValueOnce(SERV_SIGN_FIRST)
        .mockReturnValueOnce(SERV_SIGN_SECOND)
        .mockReturnValueOnce(DEPOSIT_CONFIRM)
        .mockReturnValueOnce(SMT_PROOF);
      wasm_mock.Sign.first_message = jest.fn(() => CLI_SIGN_FIRST);
      wasm_mock.Sign.second_message = jest.fn(() => CLI_SIGN_SECOND);
      wasm_mock.verify_statechain_smt = jest.fn(() => true);

      let statecoin = lodash.cloneDeep(tester_statecoin);
      let statecoin_finalized = await depositConfirm(http_mock,wasm_mock,network,statecoin,10);

      expect(statecoin_finalized.statechain_id.length).toBeGreaterThan(0);
      expect(statecoin_finalized.proof_key.length).toBeGreaterThan(0);
      expect(statecoin_finalized.funding_txid.length).toBeGreaterThan(0);
      expect(statecoin_finalized.smt_proof).not.toBeNull();
    });
    test('Fee too large for amount.', async function() {
      let fee_info = lodash.clone(FEE_INFO);
      fee_info.withdraw = 10000;

      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(fee_info)

      let statecoin = lodash.cloneDeep(tester_statecoin);
      await expect(depositConfirm(http_mock,wasm_mock,network,statecoin,10))
        .rejects
        .toThrowError("Not enough value to cover fee.");
    });
    test('Proof key not valid.', async function() {
        http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(FEE_INFO)

      let statecoin = lodash.cloneDeep(tester_statecoin);
      statecoin.proof_key = "a";
      await expect(depositConfirm(http_mock,wasm_mock,network,statecoin,10))
        .rejects
        .toThrowError("Expected property \"pubkey\" of type ?isPoint, got Buffer");
    });
    test('Proof key not owned by wallet.', async function() {
        http_mock.get = jest.fn().mockReset()
          .mockReturnValueOnce(FEE_INFO)

      let statecoin = lodash.cloneDeep(tester_statecoin);
      statecoin.proof_key = "aaaaaaaad651cd921fc490a6691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0e";
      await expect(depositConfirm(http_mock,wasm_mock,network,statecoin,10))
        .rejects
        .toThrowError("Expected property \"pubkey\" of type ?isPoint, got Buffer");
    });
  });

  describe('Withdraw', function() {
    test('Expect complete', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(lodash.cloneDeep(STATECHAIN_INFO))
        .mockReturnValueOnce(FEE_INFO);
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(true)   //POST.WITHDRAW_INIT
      // Sign
      http_mock.post
        .mockReturnValueOnce(true)   //POST.PREPARE_SIGN
        .mockReturnValueOnce(SERV_SIGN_FIRST)
        .mockReturnValueOnce(SERV_SIGN_SECOND);
      wasm_mock.Sign.first_message = jest.fn(() => CLI_SIGN_FIRST);
      wasm_mock.Sign.second_message = jest.fn(() => CLI_SIGN_SECOND);

      let statecoin = lodash.cloneDeep(tester_statecoin);
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(STATECOIN_PROOF_KEY_DER.__D));
      let tx_withdraw = await withdraw(http_mock, wasm_mock, network, statecoin, proof_key_der, BTC_ADDR);

      // check withdraw tx
      expect(tx_withdraw.ins.length).toBe(1);
      expect(tx_withdraw.ins[0].hash.reverse().toString("hex")).toBe(statecoin.funding_txid);
      expect(tx_withdraw.outs.length).toBe(2);
      expect(tx_withdraw.outs[0].value).toBeLessThan(statecoin.value);
      expect(tx_withdraw.locktime).toBe(0);
    });
    test('Already withdrawn.', async function() {
      let statechain_info = lodash.cloneDeep(STATECHAIN_INFO);
      statechain_info.amount = 0;
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(statechain_info)

      await expect(withdraw(http_mock, wasm_mock, network, {}, {}, BTC_ADDR))
        .rejects
        .toThrowError("StateChain undefined already withdrawn.");
    });
    test('StateChain not owned by this wallet.', async function() {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(lodash.cloneDeep(STATECHAIN_INFO))

      let statecoin = lodash.cloneDeep(tester_statecoin);
      statecoin.proof_key = "aaa";
      await expect(withdraw(http_mock, wasm_mock, network, statecoin, {}, BTC_ADDR))
        .rejects
        .toThrowError("StateChain not owned by this Wallet. Incorrect proof key.");
    });
    test('Fee too large for amount.', async function() {
      let fee_info = lodash.clone(FEE_INFO);
      fee_info.withdraw = 10000;

      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(lodash.cloneDeep(STATECHAIN_INFO))
        .mockReturnValueOnce(fee_info)
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(true)   //POST.WITHDRAW_INIT

      let statecoin = lodash.cloneDeep(tester_statecoin);
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(STATECOIN_PROOF_KEY_DER.__D));
      await expect(withdraw(http_mock, wasm_mock, network, statecoin, proof_key_der, BTC_ADDR))
        .rejects
        .toThrowError("Not enough value to cover fee.");
    });
  });

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


const SHARED_KEY = {"public":{"q":{"x":"ccd65d5f8e1b5e36fcc6f75daacfb144fc4b2ef956f5968c0dd871474d38d4dd","y":"c3c7acf1b5084d0ce373a415849c6b3072441b2123cf0102f4f9bede9deed434"},"p2":{"x":"ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477","y":"1d970329ed67b215033fa4f45431aa84d5d8969189b166b8b1c995c71418fc79"},"p1":{"x":"5775571335149beef013e041916f8bd6ad74560f614e4cdcc6285cf2239804a4","y":"5d444f7986a767249ec6f624956169edd31ad34169d1e644b9948bb084155a09"},"paillier_pub":{"n":"18618973404778754190518985428533896252170868175908426298152069620162843266686340593727719917765761117728365267017152884385574431579173532202603789689258042399403850464508838324962482715255812960593375421462405196296118705922516865620487438060730020195057476921619387883344824404749260998392405042001310138908055325868010132968223806254698220349656258811324161297045756648004671649730891558015063255667266103305209518264666426136884754344645705399865342796296732565545547519164996468902145097768529183807656951187924006922284038339794011741856368099322064983876937896831825577803442314444728202710488558740408208235001"},"c_key":[1,[2802809810,2295538597,824023868,2468614206,2382410329,3498283269,542845278,2638857966,882874623,314779007,533459108,4110532496,2066816076,3866382865,1507727392,2622766556,2166819970,745160432,4007494000,2755553791,1211723955,4026434693,34787852,817363057,2111193045,1986153889,989827644,3051061802,308497917,3526483949,1313053198,3239938395,3224233175,2656233176,2735490441,528833738,2992068321,1123445282,1322576068,3634835356,3687088759,804528076,1959677799,1848875502,142865825,2608636890,120148350,3818230595,1121032084,629553958,540686410,3942881735,3193185548,3170665768,3039748817,569567082,3758896658,884071316,2728026343,3841465923,3085691968,80776206,2649739738,2735555777,1101020525,3145673761,1465495093,1214998012,3210306804,2083816658,1336173722,3059272070,4195353313,2583489626,2533717747,2110492144,1090372498,3017243663,1048666077,368350691,3098877136,1984080230,662245415,1960616310,1421703698,1721963016,2678994935,1412068076,1627969329,538142028,2155846472,1586893482,2192750863,4161389416,2390953754,2538228113,3035795711,3182964956,732329291,3763461501,1558634765,1289229671,3058158470,2534690608,3070745896,1836149201,2651117011,3055342589,2032472510,669284634,778163039,3181597927,4052939209,82895660,4122394071,3411990510,165191647,1554192820,2780054189,3864774479,1672712056,3345642895,1192039886,4199617900,2746613170,2010732704,3580851445,234733436]]},"private":{"x2":"5b84bbf6c266c8e45f14290f8dd996445144463426c1a093fe76a163c3b5221f"},"chain_code":[0,[]]};

const STATECOIN =
{"shared_key_id":"c93ad45a-00b9-449c-a804-aab5530efc90","statechain_id":"","shared_key":{"public":{"q":{"x":"ccd65d5f8e1b5e36fcc6f75daacfb144fc4b2ef956f5968c0dd871474d38d4dd","y":"c3c7acf1b5084d0ce373a415849c6b3072441b2123cf0102f4f9bede9deed434"},"p2":{"x":"ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477","y":"1d970329ed67b215033fa4f45431aa84d5d8969189b166b8b1c995c71418fc79"},"p1":{"x":"5775571335149beef013e041916f8bd6ad74560f614e4cdcc6285cf2239804a4","y":"5d444f7986a767249ec6f624956169edd31ad34169d1e644b9948bb084155a09"},"paillier_pub":{"n":"18618973404778754190518985428533896252170868175908426298152069620162843266686340593727719917765761117728365267017152884385574431579173532202603789689258042399403850464508838324962482715255812960593375421462405196296118705922516865620487438060730020195057476921619387883344824404749260998392405042001310138908055325868010132968223806254698220349656258811324161297045756648004671649730891558015063255667266103305209518264666426136884754344645705399865342796296732565545547519164996468902145097768529183807656951187924006922284038339794011741856368099322064983876937896831825577803442314444728202710488558740408208235001"},"c_key":[1,[2802809810,2295538597,824023868,2468614206,2382410329,3498283269,542845278,2638857966,882874623,314779007,533459108,4110532496,2066816076,3866382865,1507727392,2622766556,2166819970,745160432,4007494000,2755553791,1211723955,4026434693,34787852,817363057,2111193045,1986153889,989827644,3051061802,308497917,3526483949,1313053198,3239938395,3224233175,2656233176,2735490441,528833738,2992068321,1123445282,1322576068,3634835356,3687088759,804528076,1959677799,1848875502,142865825,2608636890,120148350,3818230595,1121032084,629553958,540686410,3942881735,3193185548,3170665768,3039748817,569567082,3758896658,884071316,2728026343,3841465923,3085691968,80776206,2649739738,2735555777,1101020525,3145673761,1465495093,1214998012,3210306804,2083816658,1336173722,3059272070,4195353313,2583489626,2533717747,2110492144,1090372498,3017243663,1048666077,368350691,3098877136,1984080230,662245415,1960616310,1421703698,1721963016,2678994935,1412068076,1627969329,538142028,2155846472,1586893482,2192750863,4161389416,2390953754,2538228113,3035795711,3182964956,732329291,3763461501,1558634765,1289229671,3058158470,2534690608,3070745896,1836149201,2651117011,3055342589,2032472510,669284634,778163039,3181597927,4052939209,82895660,4122394071,3411990510,165191647,1554192820,2780054189,3864774479,1672712056,3345642895,1192039886,4199617900,2746613170,2010732704,3580851445,234733436]]},"private":{"x2":"5b84bbf6c266c8e45f14290f8dd996445144463426c1a093fe76a163c3b5221f"},"chain_code":[0,[]]},"proof_key":"03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477","value":10000,"funding_txid":"f62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3ce","timestamp":1613056711604,"tx_backup":null,"tx_withdraw":null,"smt_proof":null,"swap_rounds":0,"status":"UNCOMFIRMED"}

let tester_statecoin = new StateCoin("c93ad45a-00b9-449c-a804-aab5530efc90", SHARED_KEY);
tester_statecoin.proof_key = STATECOIN.proof_key;
tester_statecoin.value = STATECOIN.value;
tester_statecoin.funding_txid = STATECOIN.funding_txid;

const STATECOIN_PROOF_KEY_DER =
{__D:[91,132,187,246,194,102,200,228,95,20,41,15,141,217,150,68,81,68,70,52,38,193,160,147,254,118,161,99,195,181,34,31],chainCode:[48,253,142,202,107,100,179,56,6,77,52,1,25,32,108,104,140,32,74,193,169,191,255,231,9,175,34,194,10,36,145,144],network:{messagePrefix:"\u0018Bitcoin Signed Message:\n",bech32:"tb",bip32:{public:70617039,private:70615956},pubKeyHash:111,scriptHash:196,wif:239},__DEPTH:3,__INDEX:2,__PARENT_FINGERPRINT:278430330,lowR:false}
