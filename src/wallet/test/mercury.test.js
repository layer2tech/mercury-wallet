import { verifySmtProof, StateChainSig, proofKeyToSCEAddress, pubKeyTobtcAddr, pubKeyToScriptPubKey, decryptECIES } from '../util';
import { Wallet, StateCoin, MockHttpClient, HttpClient, MockWasm, StateCoinList, STATECOIN_STATUS } from '../';
import { keyGen, PROTOCOL, sign } from "../mercury/ecdsa";
import { TransferMsg3, TransferFinalizeData } from "../mercury/transfer";
import { BTC_ADDR, KEYGEN_SIGN_DATA, TRANSFER_MSG3, FINALIZE_DATA, FUNDING_TXID, SHARED_KEY_ID, STATECOIN_CONFIRMED, STATECOIN_CONFERMED_BACKUPTX_HEX } from './test_data.js'

import axios_mock from 'axios';
jest.mock('axios');

let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');

let bitcoin = require('bitcoinjs-lib')
let lodash = require('lodash');
const BJSON = require('buffer-json')

describe('2P-ECDSA', function() {
  let http_client = new HttpClient();
  let wasm_client = new MockWasm();


  test('KeyGen test', async function() {
    let wasm_keygen_mock = wasm_mock.KeyGen;

    axios_mock.mockResolvedValueOnce({data: {userid: "861d2223-7d84-44f1-ba3e-4cd7dd418560", msg: {"pk_commitment":"fa11dbc7bc21f4bf7dd5ae4fee73d5919734c6cd144328798ae93908e47732aa","zk_pok_commitment":"fcffc8bee0287bd75005f21612f94107796de03cbff9b4041bd0bd76c86eaa57"}}});

    wasm_keygen_mock.first_message = jest.fn(() => JSON.stringify( {"kg_ec_key_pair_party2":{"public_share":{"x":"e963ffdfe34e63b68aeb42a5826e08af087660e0dac1c3e79f7625ca4e6ae482","y":"2a78e81b57d80c4c65c94692fa281d1a1a8875f9874c197e71a52c11d9d44c40"},"secret_share":"34c0b428488ddc6b28e05cee37e7c4533007f0861e06a2b77e71d3f133ddb81b"},"kg_party_two_first_message":{"d_log_proof":{"challenge_response":"650c256869f4b7d4e7898fad6f9ee292c7380e6e0e1433bd5ddd99e064fb1e7","pk":{"x":"e963ffdfe34e63b68aeb42a5826e08af087660e0dac1c3e79f7625ca4e6ae482","y":"2a78e81b57d80c4c65c94692fa281d1a1a8875f9874c197e71a52c11d9d44c40"},"pk_t_rand_commitment":{"x":"83c43d0ec5d7383d192c45b0e935a292e1815d8e086b144ce462dd9960b749d9","y":"5f4846d2fa055ea3a7dc06f26eefba7e7e3265a6131592f97d90c4596d25684f"}},"public_share":{"x":"e963ffdfe34e63b68aeb42a5826e08af087660e0dac1c3e79f7625ca4e6ae482","y":"2a78e81b57d80c4c65c94692fa281d1a1a8875f9874c197e71a52c11d9d44c40"}}}));

    axios_mock.mockResolvedValueOnce({data: {msg:{ecdh_second_message:{comm_witness:{pk_commitment_blind_factor:"794ca39b924b31d303a0e52aded64b842d76b929ce391b465b92bfc214186135",zk_pok_blind_factor:"b03c0bb1091a1c70ce49180e90e036cdaaf06b78076431cf4c06c71c26e367b8",public_share:{x:"126b2fc9a9f0305d6dd07d33ac93a485690f184128447873b0723e8c08f5bfd8",y:"7bdf613daa4fe408a6f9b05e8d563e2fc0b49bb0a373f02fc03668e8a4319b11"},d_log_proof:{pk:{x:"126b2fc9a9f0305d6dd07d33ac93a485690f184128447873b0723e8c08f5bfd8",y:"7bdf613daa4fe408a6f9b05e8d563e2fc0b49bb0a373f02fc03668e8a4319b11"},pk_t_rand_commitment:{x:"72fa104a45aebedd62877f0a1ca27919bdbc7d03a8a358dca185584b5abb331c",y:"65eda73e6f8ef768e41252b4aba8fed1fe978b98c4f20fa4dc37a0f3068ebe00"},challenge_response:"ab347bc6cb587618055d2780f9df18b83cdb621dc36f10caf3b76a2b3978c54e"}}},ek:{n:"9589234529977732033915956795726858212623674242595205480720352392635586533239459142933873934127259795951307650330333203728932676734018943102298426795769397096959778729429218426434783707559096190762593241666844097805013846997715479012818811482144381502595493123738315649617220279169663190558353117479383834901156749130658642244214361400589627348071191513371040348954516355646271274086929063846753472198875295788129966614111696123182279614629489637979553720067719047976096188187866405787874290754661449435444233963291453836263110455829775366260295684444884226694602172719047771348817017022310792904793780039196883695817"},c_key:"341cac839821fddaaad4a8b6cd0cbb6f9efda87af24aeb740ef2dc31afdc19f27d45775a8353fac0ae8121904e0b1961cf68beb35799be2be35205b22b739e1dc3f58dace9d7c62fa1061d037f6481511c3b726bb59a03c46298a1bbd6fbcb2423c04f90521811e9df3779d3061bced93a35423006280647571e88fad36be0fc7be9e9e86e05380b94c7ace62f6a31ec8814aecc64f6117a5a959164e8f0d42792e4a447de5370cf62c9c79d1f92e8cfdcda6a781fc9e3e254465a91a767ee33f939c9a618ebeedafb5396092e735fb42827933d16067fbd8b3e0b4c0dff867b78c677f2ffceec927bcada6f2b54e360945f7126da5053e1f04efb15bf50b8291662be922350ca418cac5e8c9571e82ad76a7088c22a8f0c7dc237271fda56bae35a55c97c7386481fc98f001d2abf55f82b4a2deebad17e48261e70158fe076a782173bd6b6fda1bf103822909ddb5a704cb606ca47a13a21dd35186e2d86ca1978ddcd46c80881ae575302053ee68073725f0fe028fea14b45ba2dde24c9549bcb1e29bd2fb0c565bd876e799c938cfde607436ff8df257859803d126a5acc1af9af433f1c054b848323ac42240e21b78a618bd974cf1c9e68981e892a6fc14bce27849fd04bc1f751208c5bf9f536e0decb877969f1e6ae4cf4dfc987582e66e7970e4b55267db261553469b67ad5f0edfa0f00216223d1c945b511f8c6b",correct_key_proof:"",range_proof:""}}});

    wasm_keygen_mock.second_message = jest.fn(() => JSON.stringify( {"party_two_paillier":{"ek":{"n":"9589234529977732033915956795726858212623674242595205480720352392635586533239459142933873934127259795951307650330333203728932676734018943102298426795769397096959778729429218426434783707559096190762593241666844097805013846997715479012818811482144381502595493123738315649617220279169663190558353117479383834901156749130658642244214361400589627348071191513371040348954516355646271274086929063846753472198875295788129966614111696123182279614629489637979553720067719047976096188187866405787874290754661449435444233963291453836263110455829775366260295684444884226694602172719047771348817017022310792904793780039196883695817"},"encrypted_secret_share":[1,[1361022059,1025283163,4026668578,1594810272,1184589741,3676706131,3837088359,3865999728,4237849986,1793380173,2006359838,1846406328,3317669715,527766024,1241318588,347923064,3901925116,3387328897,3180809457,460891672,3290579170,3091739194,871481428,3249511156,3508970924,1468372995,922717682,3487457396,3885615416,1448859766,2614295308,1237103074,3722595477,347364258,4261580778,121054704,542371432,451245360,3563880584,2711064028,2263013484,2719863633,1822718483,2802109280,688512437,468779906,3177934810,1786257779,22609415,3833749991,3739987223,1602401442,30583797,2180815088,2546415716,2922751324,1912448363,3353092978,2351081712,2910234376,3377929858,415942120,573901988,2439392233,1542785922,520417201,1839531326,155580178,4071968310,666676646,805105353,3079432063,3235903591,3635667124,3512756219,1115846963,2464626171,2947889504,1636744941,1066638490,443973347,625239465,2180816446,4258113191,3522768524,4130118777,2112173836,2033076804,1317997890,2779339030,3327090967,3363916524,1660330782,3108797134,2262848384,3351158430,2906045967,1970399375,6455396,2476954659,811711725,2649978781,86081822,1111229689,3178216626,1177127451,3143213116,298039078,938887189,4195377616,3466427490,3695139034,582433249,3191152731,897162210,485919723,81834390,182981145,2822061996,668227445,452837791,1089416643,2938416823,4193245831,1825622966,2863483531,964829149,54643400]]},"party_two_second_message":{"key_gen_second_message":{},"pdl_first_message":{"c_tag":[1,[1889027494,2306336846,1695057671,231036229,2424439511,4262384904,3129603639,101698619,232497851,699106592,2355257489,2484675823,3554134493,2261119429,56114337,290980659,4014904035,2688026357,739053541,1006425081,530116866,2410789340,1040552330,268942729,3980380963,2614110628,3298901543,384068936,707073268,2302934473,2179487281,4166731732,3755881970,1242361061,3754315348,1965612972,2142452391,1666786456,3992378912,2186937494,3686192982,3868676931,1357066153,1893321681,3070169573,785416107,155433312,2588073273,904928962,1431161939,2749691998,3319438685,3108854823,1233605225,3655284831,2347178516,887231983,3882374177,2516526914,2665119185,2905793305,1228504549,3675337847,3123419461,1950538407,596763493,3412646534,2725967020,2091237842,3178919121,102006403,3945043011,55777795,1762128325,453217105,263339027,2792804911,4194413577,3999340796,403812890,3859222616,2255051888,2486349536,1704284284,4000478903,4083630168,1363983622,1454174634,1850968395,3758887117,2617596382,2896363791,3846553200,980476691,919324096,3866731903,2370740219,2588238763,4033634546,4156699966,192831364,893515169,1706334500,335078371,2260524070,3001420985,4104849204,2453956924,78881482,1298793209,3168444769,577811392,3622702983,2685595809,2163675376,1836501488,2469877349,3476696511,1661422415,3349019895,2767750223,1710694192,1664891503,397247663,2456297919,3135972058,3412078271,250804313]],"c_tag_tag":[1,[253664711,693415116,3732571395,1634575015,2257793021,1153071686,3854263197,971675746]]}}}));

    wasm_keygen_mock.set_master_key = jest.fn(() => JSON.stringify( {"public":{"q":{"x":"4698df57e7cee6725cd108e8d84c970fece881bc7ddc83c215766bbc7c0468fe","y":"d8ba0d588c023a431b78c38fd6932eac07b21ae67a889c1b12ce1562502f90fb"},"p2":{"x":"e963ffdfe34e63b68aeb42a5826e08af087660e0dac1c3e79f7625ca4e6ae482","y":"2a78e81b57d80c4c65c94692fa281d1a1a8875f9874c197e71a52c11d9d44c40"},"p1":{"x":"126b2fc9a9f0305d6dd07d33ac93a485690f184128447873b0723e8c08f5bfd8","y":"7bdf613daa4fe408a6f9b05e8d563e2fc0b49bb0a373f02fc03668e8a4319b11"},"paillier_pub":{"n":"9589234529977732033915956795726858212623674242595205480720352392635586533239459142933873934127259795951307650330333203728932676734018943102298426795769397096959778729429218426434783707559096190762593241666844097805013846997715479012818811482144381502595493123738315649617220279169663190558353117479383834901156749130658642244214361400589627348071191513371040348954516355646271274086929063846753472198875295788129966614111696123182279614629489637979553720067719047976096188187866405787874290754661449435444233963291453836263110455829775366260295684444884226694602172719047771348817017022310792904793780039196883695817"},"c_key":[1,[1361022059,1025283163,4026668578,1594810272,1184589741,3676706131,3837088359,3865999728,4237849986,1793380173,2006359838,1846406328,3317669715,527766024,1241318588,347923064,3901925116,3387328897,3180809457,460891672,3290579170,3091739194,871481428,3249511156,3508970924,1468372995,922717682,3487457396,3885615416,1448859766,2614295308,1237103074,3722595477,347364258,4261580778,121054704,542371432,451245360,3563880584,2711064028,2263013484,2719863633,1822718483,2802109280,688512437,468779906,3177934810,1786257779,22609415,3833749991,3739987223,1602401442,30583797,2180815088,2546415716,2922751324,1912448363,3353092978,2351081712,2910234376,3377929858,415942120,573901988,2439392233,1542785922,520417201,1839531326,155580178,4071968310,666676646,805105353,3079432063,3235903591,3635667124,3512756219,1115846963,2464626171,2947889504,1636744941,1066638490,443973347,625239465,2180816446,4258113191,3522768524,4130118777,2112173836,2033076804,1317997890,2779339030,3327090967,3363916524,1660330782,3108797134,2262848384,3351158430,2906045967,1970399375,6455396,2476954659,811711725,2649978781,86081822,1111229689,3178216626,1177127451,3143213116,298039078,938887189,4195377616,3466427490,3695139034,582433249,3191152731,897162210,485919723,81834390,182981145,2822061996,668227445,452837791,1089416643,2938416823,4193245831,1825622966,2863483531,964829149,54643400]]},"private":{"x2":"34c0b428488ddc6b28e05cee37e7c4533007f0861e06a2b77e71d3f133ddb81b"},"chain_code":[0,[]]}));


    let statecoin = await keyGen(http_client, wasm_client, KEYGEN_SIGN_DATA.shared_key_id, KEYGEN_SIGN_DATA.shared_key.private.x2, KEYGEN_SIGN_DATA.protocol);
    expect(statecoin.shared_key_id).toBe(KEYGEN_SIGN_DATA.shared_key_id);
    expect(statecoin.value).toBe(0);
    expect(statecoin.shared_key).toStrictEqual(KEYGEN_SIGN_DATA.shared_key);
    expect(statecoin.tx_backup).toBe(null);
    expect(statecoin.tx_withdraw).toBe(null);
    expect(statecoin.smt_proof).toBe(null);
    expect(statecoin.status).toBe(STATECOIN_STATUS.UNCOMFIRMED);
  });

  test('Sign', async function() {
    let signature = await sign(http_client, wasm_client, KEYGEN_SIGN_DATA.shared_key_id, KEYGEN_SIGN_DATA.shared_key, KEYGEN_SIGN_DATA.signature_hash, KEYGEN_SIGN_DATA.protocol);
    expect(typeof signature).toBe('string');
  });
})


describe('StateChain Entity', function() {
  let wallet = Wallet.buildMock(bitcoin.networks.testnet);
  wallet.config.jest_testing_mode = true; // Call mock wasm

  let value = 10000

  test('Deposit init', async function() {
    let [shared_key_id, p_addr] = await wallet.depositInit(value)
    let statecoin = wallet.statecoins.getCoin(shared_key_id);

    expect(statecoin.tx_backup).toBeNull();
    expect(statecoin.tx_withdraw).toBeNull();
    expect(statecoin.status).toBe(STATECOIN_STATUS.UNCOMFIRMED);
    expect(wallet.statecoins.getCoin(statecoin.shared_key_id)).toBe(statecoin)
  });

  test('Deposit confirm', async function() {
    let shared_key_id = SHARED_KEY_ID;
    let statecoin_finalized = await wallet.depositConfirm(shared_key_id, FUNDING_TXID)

    expect(statecoin_finalized.statechain_id.length).toBeGreaterThan(0);
    expect(statecoin_finalized.proof_key.length).toBeGreaterThan(0);
    expect(statecoin_finalized.funding_txid.length).toBeGreaterThan(0);
    expect(statecoin_finalized.smt_proof).not.toBeNull();
    expect(statecoin_finalized.status).toBe(STATECOIN_STATUS.AVAILABLE);
  });


  test('Withdraw', async function() {
    let statecoin_finalized = run_deposit(wallet, 10000);
    let shared_key_id = statecoin_finalized.shared_key_id;

    let num_unspent_statecoins_before = wallet.getUnspentStatecoins()[0].length;
    let num_statecoins_before = wallet.statecoins.length;

    let tx_withdraw = await wallet.withdraw(shared_key_id, BTC_ADDR);

    // check statecoin
    let statecoin = wallet.statecoins.getCoin(shared_key_id);
    expect(statecoin.status).toBe(STATECOIN_STATUS.WITHDRAWN);
    expect(statecoin.tx_withdraw).toBe(tx_withdraw);

    // check wallet.statecoins
    expect(wallet.getUnspentStatecoins()[0].length).toBe(num_unspent_statecoins_before-1);
    expect(wallet.statecoins.length).toBe(num_statecoins_before);

    // check withdraw tx
    expect(tx_withdraw.ins.length).toBe(1);
    expect(tx_withdraw.ins[0].hash.reverse().toString("hex")).toBe(statecoin.funding_txid);
    expect(tx_withdraw.outs.length).toBe(2);
    expect(tx_withdraw.outs[0].value).toBeLessThan(value);
    expect(tx_withdraw.locktime).toBe(0);
  });

  test('TransferSender', async function() {
    let statecoin_finalized = run_deposit(wallet, 10000);
    let shared_key_id = statecoin_finalized.shared_key_id;
    let rec_se_addr = statecoin_finalized.proof_key;

    let transfer_msg3 = await wallet.transfer_sender(shared_key_id, rec_se_addr);

    // check statecoin
    let statecoin = wallet.statecoins.getCoin(shared_key_id);
    expect(statecoin.status).toBe(STATECOIN_STATUS.SPENT);

    // check transfer_msg data
    expect(transfer_msg3.shared_key_id).toBe(shared_key_id);
    expect(transfer_msg3.rec_se_addr.proof_key).toBe(rec_se_addr);

    // statechain sig verifies
    let proof_key_der = wallet.getBIP32forProofKeyPubKey(statecoin.proof_key);
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
      bitcoin.address.fromOutputScript(tx_backup.outs[0].script, wallet.network)
    ).toBe(
      pubKeyTobtcAddr(rec_se_addr)
    );
  });

  test('TransferReceiver incorrect backup receive addr', async function() {
    let transfer_msg3: TransferMsg3 = BJSON.parse(lodash.cloneDeep(TRANSFER_MSG3));

    // set backuptx receive address to wrong proof_key addr
    let wrong_proof_key = "028a9b66d0d2c6ef7ff44a103d44d4e9222b1fa2fd34cd5de29a54875c552abd42";
    let tx_backup = bitcoin.Transaction.fromHex(transfer_msg3.tx_backup_psm.tx_hex);
    tx_backup.outs[0].script = pubKeyToScriptPubKey(wrong_proof_key, wallet.config.network);
    transfer_msg3.tx_backup_psm.tx_hex = tx_backup.toHex();

    await expect(wallet.transfer_receiver(transfer_msg3))
      .rejects
      .toThrowError("Transfer not made to this wallet.");
  });

  test('TransferReceiver', async function() {
    let transfer_msg3: TransferMsg3 = BJSON.parse(lodash.cloneDeep(TRANSFER_MSG3));

    let finalize_data = await wallet.transfer_receiver(transfer_msg3);

    expect(finalize_data.shared_key_id).not.toBe(transfer_msg3.shared_key_id);
  });

  test('TransferReceiverFinalize', async function() {
    let finalize_data: TransferFinalizeData = BJSON.parse(lodash.cloneDeep(FINALIZE_DATA));
    let statecoin = await wallet.transfer_receiver_finalize(finalize_data);

    expect(statecoin.statechain_id).toBe(finalize_data.statechain_id);
    expect(statecoin.value).toBe(finalize_data.state_chain_data.amount);
    expect(statecoin.shared_key).toStrictEqual(KEYGEN_SIGN_DATA.shared_key);
    expect(statecoin.tx_backup).not.toBe(null);
    expect(statecoin.tx_withdraw).toBe(null);
    expect(statecoin.smt_proof).not.toBe(null);
    expect(statecoin.status).toBe(STATECOIN_STATUS.AVAILABLE);
  });
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
