// wallet recovery from server

import { BIP32Interface, Network, TransactionBuilder, crypto as crypto_btc, script, Transaction } from 'bitcoinjs-lib';
<<<<<<< HEAD

import { Wallet } from './wallet';
import { BACKUP_STATUS, StateCoin } from './statecoin';

let bitcoin = require('bitcoinjs-lib')
=======
import { Root, StateChainDataAPI } from './mercury/info_api';
import { Secp256k1Point } from './mercury/transfer';
import { TransferMsg3, PrepareSignTxMsg } from './mercury/transfer';


import { encrypt, decrypt } from 'eciesjs'
import { segwitAddr, Wallet } from './wallet';
import { MasterKey2 } from './mercury/ecdsa';
import { StateCoin } from './statecoin';
import { BACKUP_TX_HEX } from './test/test_data';

let bech32 = require('bech32')
let bitcoin = require('bitcoinjs-lib')
let typeforce = require('typeforce');
let types = require("./types")
let crypto = require('crypto');

>>>>>>> 8304c67fd7d79ea909457bf9e262aab254d041a2

export interface RecoveryRequest {
    key: string,
    sig: string,
}

<<<<<<< HEAD


// bamboo grass grant typical orange cry excite rate air state guilt pull
// Gen proof key. Address: tb1qgl76l9gg9qrgv9e9unsxq40dee5gvue0z2uxe2. Proof key: 03b2483ab9bea9843bd9bfb941e8c86c1308e77aa95fccd0e63c2874c0e3ead3f5
export const getAllStatecoinDataForWallet = async (wallet: Wallet) => {
  // rm coins from wallet storage
  wallet.account.coins = [];

  let recovery_datas = await wallet.recoverCoins();

  let recovery_data = recovery_datas[0];
  console.log("recovery_data: ", recovery_data)

  let priv_key = wallet.getBIP32forProofKeyPubKey(recovery_data.proof_key).privateKey!.toString("hex")
  console.log("priv_key: ", priv_key)

  let tx_backup = bitcoin.Transaction.fromHex(recovery_data.tx_hex);
  console.log("tx_backup: ", tx_backup)

  console.log("shared key public: ", recovery_data.shared_key_data)

  let master_key = {
    chain_code: [0,[]],
    private: {
      x2: priv_key
    },
    public: {
			q: {
				x: "836ce870adc409fd5dde1be2935fdd79bd49650a82230a32a14e1363ab659c1d",
				y: "5fd717e9a5acc20d2369d2d8275bbb5cdd1b92d70f54f59a22d2bc0f2423a0bc"
			},
      p2: {
        x: "b2483ab9bea9843bd9bfb941e8c86c1308e77aa95fccd0e63c2874c0e3ead3f5",
        y: "f5d76a4bc3605ae2e86312ceaf0242a285f3ca3d8711ab55a0e0a940e315ccd3"
      },
      p1: {
        x: "46dbc76f87053ca7d67976190ffb754f238d59662c173d82e369604d2c6117b",
        y: "24fe8de6c8982a16a6ed5c77464fdc041527c096f69119a688dc517fd83bb280"
      },
      paillier_pub: {
        n: "16450172521216470639210893803443229243642656500725470398106139070928230308783318961841891421810508864257162236818599047062404572263549906369602884442532399022332191693955226856880076270953706569425299749098903988209962468832657498136233458226546786846183470693482846564963682829057084074559900162242848777877568682158931894299661547748071936864214324616851206953685868503996808897083207130664562737161599970002141533431026994322854661478007747531822662449078210789033796832444474074504735849854293126403819749793194578625271477675914470181510708662733815451360434989334422778993935735444601393505029796748147665341133"
      },
      c_key: [1,
        [
          2660386353, 553401718, 2053850584, 715709524, 1444295450, 733858472, 3278517844, 3026332315, 3997981583, 1602871327, 2840045069, 1072277099, 2349670647, 1653058321, 3919894408, 3898393516, 3165738146, 2528234044, 3796714191, 1581029338, 1261337080, 799643975, 3855071873, 2422657377, 2492020614, 1738930038, 1818512325, 1245679515, 2376621267, 1198299749, 2547938016, 3919419303, 2745710697, 2293520791, 2016974647, 1469970391, 418807227, 3816687026, 3667020830, 3353266276, 2865098714, 1594314817, 1341674881, 3481853729, 3004915862, 1682673922, 1889489065, 1616209820, 2914868514, 632006103, 1884393371, 532521398, 88023442, 1773355906, 1550630678, 570247949, 3299948571, 595434879, 3894183233, 1138599348, 2112788015, 3335162903, 3710970372, 2506681158, 1024425681, 3488440270, 19229041, 3108758848, 402796426, 2870054504, 4170127586, 2614217520, 1742034180, 3909725634, 2913974428, 2556937989, 3652186022, 533316714, 2734793186, 459052461, 4233875930, 2808888764, 3103450572, 1894882554, 4000616368, 3490254568, 2196434632, 3724479703, 1166843443, 2448797240, 990784110, 451260369, 1720683861, 1458314335, 94162247, 2458198580, 4246520818, 769273462, 1638240391, 2183779007, 3036313518, 3285055473, 2754926758, 2009514894, 4293978516, 397794923, 2138907652, 1260727368, 2178999560, 2663668718, 2471647647, 3871949467, 668650636, 3538577431, 1112329462, 4219896184, 3193444364, 654136038, 4116999294, 2118386042, 3586306739, 4158326508, 170356353, 1121333448, 3342447696, 2582990178, 3726106223, 955088160
        ]
      ]
    }
  }

  let statecoin = new StateCoin(recovery_data.shared_key_id, master_key)

  statecoin.proof_key = recovery_data.proof_key
  statecoin.tx_backup = tx_backup;
  statecoin.backup_status = BACKUP_STATUS.CONFIRMED;
  statecoin.funding_vout = tx_backup.ins[0].index;
  statecoin.funding_txid = tx_backup.ins[0].hash.reverse().toString("hex");
  statecoin.statechain_id = recovery_data.statechain_id;

  // Get locktime and amount
  statecoin.value = recovery_data.amount;

  statecoin.setConfirmed();
  console.log("statecoin added: ", statecoin);
  wallet.statecoins.addCoin(statecoin);

  // wallet.saveStateCoinsList();
}
=======
export interface RecoveryDataMsg {
  shared_key_id: string,
  statechain_id: string,
  chain: StateChainDataAPI,
  tx_hex: string,
}


export const getAllStatecoinDataForWallet = (wallet: Wallet) => {
  let proof_key = wallet.getBIP32forBtcAddress("tb1qhdklzgkdla6du4tuygah0qz39cdmatdv2aherp").publicKey.toString("hex")
  let master_key: MasterKey2 = COIN["shared_key"];
  let statecoin = new StateCoin(COIN["shared_key_id"], master_key)
  let tx_backup = COIN["tx_backup"]

  statecoin.proof_key = proof_key
  statecoin.tx_backup = bitcoin.Transaction.fromHex(BACKUP_TX_HEX)
  statecoin.funding_vout = tx_backup.ins[0].index; // will come as tx hex
  statecoin.statechain_id = COIN["statechain_id"];

  // Get locktime and amount
  statecoin.value = tx_backup.outs[1].value;  // check with fee calculation
  console.log("tx_hex.ins: ", tx_backup)

  statecoin.setConfirmed();

  wallet.statecoins.addCoin(statecoin)

  // wallet.saveStateCoinsList();
}


let COIN =
  {
    "shared_key_id": "a101ec50-80a5-4bd4-baf8-8e0defc46500",
    "statechain_id": "0c43f41a-b1bc-4b3e-b4fa-d984707dbed2",
    "shared_key": {
      "public": {
        "q": {
          "x": "23e63c1a5a95b91558c059ff01812f0796300216a46c70214abd12119bbe7af0",
          "y": "af07e0f9f6a0ac4b295114f08ba3a18fd8280e606982f08d58c415d111217a5e"
        },
        "p2": {
          "x": "bc44321475ce651148b19fdbd46b5e079c1773db63914b3b4e46a53bd6caa4d3",
          "y": "d30ed70fe162d818cfad5b4b53d4f71fae3304f31c247726d59b050c843d9975"
        },
        "p1": {
          "x": "bacb3a66e1c1898c1a21e8e667512c2e592964b0e2d4089bd41d141fba7b18df",
          "y": "7c96c12f30c259431546af5b72ec0bdcfda17a6adfc94602ec7ad53a3f72d9d1"
        },
        "paillier_pub": {
          "n": "22011038159281802093465560367296173693962484244401203059755529220111214352413807702240775008752018533018673588737017924243210340576935228931879228815265609290500363162925579815839800155170643010555761583306150594735506567740691593538322485184672376470638471110386530871338628768838697952087574886449160629111193629738779148791095443260203211786893557910345980615948354643043806840529346356076119359945278550962206570009245098075029216691967199735625776491343564957018335576065952768557619329857690962359871733673219130152210108958974679553831657913053387644988113874333137893023756638224776413831867843035371925070957"
        },
        "c_key": [
          1,
          [
            812978276,
            504967579,
            279386397,
            936092296,
            4209122605,
            2513990930,
            286480679,
            1954509572,
            4248304174,
            4162140277,
            950792123,
            93380865,
            3677964237,
            73452220,
            1336839169,
            1033323471,
            1925597701,
            2883271561,
            4164905805,
            1330727042,
            3284911752,
            3895984180,
            3324741697,
            2096533037,
            3991983315,
            2230338680,
            2494793196,
            510525542,
            2724239237,
            1680805957,
            1539893674,
            2063280387,
            4033172142,
            2523415030,
            3565948651,
            523643531,
            1269031931,
            1414005408,
            86196831,
            2177660982,
            3640427056,
            1859653800,
            128198559,
            309568701,
            3701076734,
            1165583171,
            45198140,
            2042900998,
            640798975,
            882772559,
            4131860601,
            144508387,
            2775100976,
            531106473,
            4260169525,
            1702352325,
            3666181243,
            3462033303,
            1501059400,
            2795042204,
            673222323,
            3436579572,
            2926426465,
            971412506,
            3031545232,
            824345410,
            1818858148,
            341148033,
            1871766525,
            623577245,
            1826474251,
            2896086429,
            2443837240,
            2934499964,
            2451660095,
            1179502532,
            2785176489,
            1080471516,
            832528950,
            3196601407,
            3967318433,
            822009714,
            4038724324,
            1985142639,
            1849718309,
            1973070017,
            2263244678,
            3125150000,
            3782474162,
            2253819002,
            3336005668,
            2969623361,
            4272754511,
            4242200208,
            3420682501,
            31333790,
            1963804781,
            56215375,
            793297975,
            4115331587,
            17146888,
            3287456789,
            4193331817,
            1052291279,
            2886894455,
            1327431101,
            3763607556,
            1204088701,
            2562762229,
            1653293689,
            876421522,
            47508706,
            2191133993,
            3844440519,
            2590530835,
            4196846179,
            459669950,
            661433536,
            3184674204,
            1725063754,
            1668658204,
            3044259946,
            3216269405,
            2049480229,
            155395322,
            2814352262,
            3204875631,
            362497267
          ]
        ]
      },
      "private": {
        "x2": "1cf36cec721d166a03c9be69b1c2ce1f31a9ffd77e002478eb240b5008c19666"
      },
      "chain_code": [
        0,
        []
      ]
    },
    "wallet_version": "v0.2.9",
    "proof_key": "03bc44321475ce651148b19fdbd46b5e079c1773db63914b3b4e46a53bd6caa4d3",
    "value": 1000,
    "funding_txid": "4ede6424ce0e60b34f45f8422af4d2f2304fd71923cf0a121cf5e1c2b4b12269",
    "funding_vout": 0,
    "block": 1936508,
    "timestamp": 1618229169412,
    "tx_backup": {
      "version": 2,
      "locktime": 1989348,
      "ins": [
        {
          "hash": {
            "type": "Buffer",
            "data": [
              105,
              34,
              177,
              180,
              194,
              225,
              245,
              28,
              18,
              10,
              207,
              35,
              25,
              215,
              79,
              48,
              242,
              210,
              244,
              42,
              66,
              248,
              69,
              79,
              179,
              96,
              14,
              206,
              36,
              100,
              222,
              78
            ]
          },
          "index": 0,
          "script": {
            "type": "Buffer",
            "data": []
          },
          "sequence": 4294967294,
          "witness": [
            {
              "type": "Buffer",
              "data": [
                48,
                69,
                2,
                33,
                0,
                237,
                139,
                122,
                196,
                57,
                65,
                4,
                10,
                91,
                23,
                12,
                44,
                79,
                98,
                173,
                210,
                53,
                100,
                29,
                192,
                239,
                219,
                208,
                67,
                10,
                143,
                213,
                66,
                102,
                13,
                10,
                122,
                2,
                32,
                43,
                12,
                237,
                227,
                175,
                167,
                141,
                251,
                116,
                93,
                89,
                187,
                130,
                24,
                131,
                81,
                159,
                184,
                139,
                47,
                5,
                195,
                120,
                178,
                207,
                203,
                195,
                157,
                222,
                151,
                210,
                126,
                1
              ]
            },
            {
              "type": "Buffer",
              "data": [
                2,
                35,
                230,
                60,
                26,
                90,
                149,
                185,
                21,
                88,
                192,
                89,
                255,
                1,
                129,
                47,
                7,
                150,
                48,
                2,
                22,
                164,
                108,
                112,
                33,
                74,
                189,
                18,
                17,
                155,
                190,
                122,
                240
              ]
            }
          ]
        }
      ],
      "outs": [
        {
          "script": {
            "type": "Buffer",
            "data": [
              0,
              20,
              187,
              109,
              241,
              34,
              205,
              255,
              116,
              222,
              85,
              124,
              34,
              59,
              119,
              128,
              81,
              46,
              27,
              190,
              173,
              172
            ]
          },
          "value": 696
        },
        {
          "script": {
            "type": "Buffer",
            "data": [
              0,
              20,
              19,
              25,
              162,
              39,
              40,
              124,
              250,
              196,
              216,
              102,
              8,
              48,
              244,
              201,
              176,
              225,
              114,
              74,
              129,
              0
            ]
          },
          "value": 4
        }
      ]
    },
    "backup_status": "Not Final",
    "interval": 100,
    "tx_cpfp": null,
    "tx_withdraw": null,
    "smt_proof": [
      [
        false,
        [
          0,
          0,
          0,
          1,
          51,
          0
        ]
      ],
      [
        false,
        [
          0,
          1,
          0,
          4,
          51,
          0,
          1,
          0,
          5,
          97,
          119,
          48,
          156,
          62,
          45,
          178,
          41,
          149,
          94,
          213,
          192,
          233,
          101,
          48,
          64,
          120,
          192,
          170,
          120,
          122,
          161,
          72,
          246,
          200,
          146,
          92,
          52,
          197,
          116,
          243,
          26,
          38,
          1
        ]
      ],
      [
        false,
        [
          0,
          4,
          0,
          5,
          51,
          0,
          4,
          0,
          7,
          56,
          238,
          6,
          172,
          87,
          251,
          200,
          28,
          184,
          163,
          93,
          94,
          1,
          219,
          44,
          253,
          79,
          223,
          181,
          74,
          99,
          111,
          162,
          126,
          97,
          161,
          126,
          125,
          86,
          28,
          219,
          125,
          138,
          1
        ]
      ],
      [
        true,
        [
          112,
          0,
          117,
          64,
          90,
          191,
          235,
          143,
          183,
          40,
          161,
          210,
          121,
          13,
          121,
          101,
          205,
          16,
          78,
          8,
          2,
          133,
          188,
          3,
          132,
          96,
          19,
          94,
          198,
          244,
          177,
          197,
          0,
          5,
          0,
          6,
          51,
          0,
          5,
          0,
          6,
          55,
          1
        ]
      ],
      [
        false,
        [
          0,
          6,
          0,
          7,
          53,
          0,
          6,
          0,
          7,
          55,
          126,
          218,
          70,
          206,
          195,
          175,
          237,
          97,
          73,
          18,
          219,
          251,
          221,
          169,
          191,
          53,
          77,
          136,
          20,
          84,
          234,
          26,
          88,
          2,
          19,
          75,
          177,
          200,
          214,
          222,
          155,
          184,
          1
        ]
      ],
      [
        false,
        [
          0,
          7,
          0,
          13,
          52,
          101,
          0,
          7,
          0,
          9,
          53,
          97,
          32,
          117,
          101,
          10,
          235,
          159,
          104,
          117,
          135,
          173,
          151,
          16,
          232,
          237,
          104,
          29,
          158,
          196,
          204,
          31,
          144,
          228,
          121,
          178,
          250,
          245,
          130,
          162,
          156,
          85,
          220,
          30,
          1
        ]
      ],
      [
        true,
        [
          211,
          245,
          137,
          198,
          116,
          121,
          240,
          114,
          128,
          172,
          112,
          4,
          116,
          144,
          196,
          138,
          143,
          87,
          64,
          154,
          170,
          29,
          141,
          117,
          203,
          172,
          115,
          181,
          69,
          141,
          78,
          132,
          0,
          5,
          0,
          7,
          98,
          0,
          5,
          0,
          6,
          101,
          1
        ]
      ],
      [
        false,
        [
          0,
          6,
          0,
          248,
          101,
          100,
          101,
          54,
          52,
          50,
          52,
          99,
          101,
          48,
          101,
          54,
          48,
          98,
          51,
          52,
          102,
          52,
          53,
          102,
          56,
          52,
          50,
          50,
          97,
          102,
          52,
          100,
          50,
          102,
          50,
          0,
          6,
          0,
          248,
          102,
          101,
          54,
          54,
          53,
          48,
          56,
          100,
          97,
          100,
          51,
          51,
          100,
          100,
          51,
          57,
          57,
          102,
          48,
          48,
          48,
          56,
          97,
          55,
          50,
          102,
          51,
          100,
          98,
          50,
          55,
          48,
          50,
          48,
          57,
          100,
          102,
          50,
          50,
          101,
          98,
          52,
          54,
          55,
          97,
          54,
          98,
          52,
          57,
          52,
          52,
          102,
          52,
          55,
          49,
          52,
          50,
          56,
          101,
          100,
          50,
          100,
          55,
          1
        ]
      ]
    ],
    "swap_rounds": 0,
    "status": "AVAILABLE",
    "swap_status": null,
    "swap_id": null,
    "swap_info": null,
    "swap_address": null,
    "swap_my_bst_data": null,
    "swap_receiver_addr": null,
    "swap_transfer_finalized_data": null
  }
>>>>>>> 8304c67fd7d79ea909457bf9e262aab254d041a2
