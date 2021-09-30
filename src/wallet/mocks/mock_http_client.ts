// Mocks out server side calls to cryptographic protocols and other APIs.
// Mock Classes  are followed by mock data for full protocol runs.

import { GET_ROUTE, POST_ROUTE } from "../http_client"
import { SwapID } from "../swap/swap";
// import { SIGNSWAPTOKEN_DATA, BST_DATA } from "../test/test_data";

let cloneDeep = require('lodash.clonedeep');

export class MockHttpClient {
  get = async (path: string, _params: any) => {
    switch(path) {
      case GET_ROUTE.PING:
        return true
      case GET_ROUTE.FEES:
        console.log("mock http: GET_ROUTE.FEES")
        return cloneDeep(FEE_INFO)
      case GET_ROUTE.ROOT:
        return cloneDeep(ROOT_INFO)
      case GET_ROUTE.STATECHAIN:
        return cloneDeep(STATECHAIN_INFO)
      case GET_ROUTE.TRANSFER_BATCH:
        return {
          status: true
        }
    }
  }

  post = async (path: string, _body: any) => {
    switch(path) {
      case POST_ROUTE.KEYGEN_FIRST:
        return KEYGEN_FIRST;
      case POST_ROUTE.KEYGEN_SECOND:
        return KEYGEN_SECOND
        case POST_ROUTE.SIGN_FIRST:
          return SIGN_FIRST
        case POST_ROUTE.PREPARE_SIGN:
          return true
        case POST_ROUTE.SIGN_SECOND:
          return SIGN_SECOND
        case POST_ROUTE.SMT_PROOF:
          return SMT_PROOF
        case POST_ROUTE.DEPOSIT_INIT:
          return {id:"861d2223-7d84-44f1-ba3e-4cd7dd418560"};
        case POST_ROUTE.DEPOSIT_CONFIRM:
          return DEPOSIT_CONFIRM
        case POST_ROUTE.WITHDRAW_INIT:
          return
        case POST_ROUTE.WITHDRAW_CONFIRM:
          return WITHDRAW_SIG
        case POST_ROUTE.TRANSFER_SENDER:
          return TRANSFER_SENDER
        case POST_ROUTE.TRANSFER_RECEIVER:
          return TRANSFER_RECEIVER
        case POST_ROUTE.TRANSFER_UPDATE_MSG:
          return
        case POST_ROUTE.TRANSFER_GET_MSG:
          return TRANSFER_PUBKEY
        case POST_ROUTE.SWAP_POLL_UTXO:
          return POLL_UTXO
      }
    }

    new_tor_id = async () => {
    }
}


export const FEE_INFO = {
  address: "tb1q6xwt00hnwcrtlunvnz8u0xrtdxv5ztx7pj44cp",
  deposit: 300,
  withdraw: 141,
  interval: 100,
  initlock: 10000
}

export const ROOT_INFO = {
  id:5,
  value:[154,53,38,46,29,91,126,195,142,244,188,68,180,174,33,99,89,117,11,239,187,250,220,78,240,130,228,20,23,113,225,113],
  commitment_info:null
}

export const STATECHAIN_INFOS = [{
  utxo: "f62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3ce:1",
  amount: 1000,
  chain: [{ data: "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", next_state: null }],
  locktime: 1000
},
{
  utxo: "f62c9b74e276843a5d0fe0d3d0f3d73c06e118b822772c024aac3d840fbad3de:1",
  amount: 1000,
  chain: [{ data: "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984478", next_state: null }],
  locktime: 1000
}
]



export const STATECHAIN_INFO =  {
  utxo: "794610eff71928df4d6814843945dbe51d8d11cdbcbeb11eb1c42e8199298494:0",
  amount: 500000,
  chain: [{ data: "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", next_state: null }],
  locktime: 1000
}


// MOCK DATA

// Protocol run 1: keygen, sign
export const KEYGEN_FIRST = {userid: "861d2223-7d84-44f1-ba3e-4cd7dd418560", msg: {"pk_commitment":"fa11dbc7bc21f4bf7dd5ae4fee73d5919734c6cd144328798ae93908e47732aa","zk_pok_commitment":"fcffc8bee0287bd75005f21612f94107796de03cbff9b4041bd0bd76c86eaa57"}}
export const KEYGEN_SECOND = {msg:{ecdh_second_message:{comm_witness:{pk_commitment_blind_factor:"794ca39b924b31d303a0e52aded64b842d76b929ce391b465b92bfc214186135",zk_pok_blind_factor:"b03c0bb1091a1c70ce49180e90e036cdaaf06b78076431cf4c06c71c26e367b8",public_share:{x:"126b2fc9a9f0305d6dd07d33ac93a485690f184128447873b0723e8c08f5bfd8",y:"7bdf613daa4fe408a6f9b05e8d563e2fc0b49bb0a373f02fc03668e8a4319b11"},d_log_proof:{pk:{x:"126b2fc9a9f0305d6dd07d33ac93a485690f184128447873b0723e8c08f5bfd8",y:"7bdf613daa4fe408a6f9b05e8d563e2fc0b49bb0a373f02fc03668e8a4319b11"},pk_t_rand_commitment:{x:"72fa104a45aebedd62877f0a1ca27919bdbc7d03a8a358dca185584b5abb331c",y:"65eda73e6f8ef768e41252b4aba8fed1fe978b98c4f20fa4dc37a0f3068ebe00"},challenge_response:"ab347bc6cb587618055d2780f9df18b83cdb621dc36f10caf3b76a2b3978c54e"}}},ek:{n:"9589234529977732033915956795726858212623674242595205480720352392635586533239459142933873934127259795951307650330333203728932676734018943102298426795769397096959778729429218426434783707559096190762593241666844097805013846997715479012818811482144381502595493123738315649617220279169663190558353117479383834901156749130658642244214361400589627348071191513371040348954516355646271274086929063846753472198875295788129966614111696123182279614629489637979553720067719047976096188187866405787874290754661449435444233963291453836263110455829775366260295684444884226694602172719047771348817017022310792904793780039196883695817"},c_key:"341cac839821fddaaad4a8b6cd0cbb6f9efda87af24aeb740ef2dc31afdc19f27d45775a8353fac0ae8121904e0b1961cf68beb35799be2be35205b22b739e1dc3f58dace9d7c62fa1061d037f6481511c3b726bb59a03c46298a1bbd6fbcb2423c04f90521811e9df3779d3061bced93a35423006280647571e88fad36be0fc7be9e9e86e05380b94c7ace62f6a31ec8814aecc64f6117a5a959164e8f0d42792e4a447de5370cf62c9c79d1f92e8cfdcda6a781fc9e3e254465a91a767ee33f939c9a618ebeedafb5396092e735fb42827933d16067fbd8b3e0b4c0dff867b78c677f2ffceec927bcada6f2b54e360945f7126da5053e1f04efb15bf50b8291662be922350ca418cac5e8c9571e82ad76a7088c22a8f0c7dc237271fda56bae35a55c97c7386481fc98f001d2abf55f82b4a2deebad17e48261e70158fe076a782173bd6b6fda1bf103822909ddb5a704cb606ca47a13a21dd35186e2d86ca1978ddcd46c80881ae575302053ee68073725f0fe028fea14b45ba2dde24c9549bcb1e29bd2fb0c565bd876e799c938cfde607436ff8df257859803d126a5acc1af9af433f1c054b848323ac42240e21b78a618bd974cf1c9e68981e892a6fc14bce27849fd04bc1f751208c5bf9f536e0decb877969f1e6ae4cf4dfc987582e66e7970e4b55267db261553469b67ad5f0edfa0f00216223d1c945b511f8c6b",correct_key_proof:"",range_proof:""}};
export const SIGN_FIRST = {msg:{"d_log_proof":{"a1":{"x":"8102b1fbbd37f38202b62bfe605cb8d47ecfc2ed9745636ecb3465be5d1f4f22","y":"be6de2b4d9c3ec66859221cedd9ebc6d38211944323ad1c8f43069df480630bf"},"a2":{"x":"982fcc5533d1d24e2c95addfd4cd8141e60a0597f60fc0e09791dcbc6857582e","y":"5bb938d0b2d05b935ffc1fb0f6505cdc89aec27b527b53fe0f0a9f104e3038d8"},"z":"575e0fc996af968da088cccd96e7854dc80850ca950cfa625a67504aa428e9b1"},"public_share":{"x":"11a34497e75c0b10407056f768962e1a321523192a54159eed6ff2401c0359ce","y":"a3c688a257039b734a810f8624a105dce1ac30aded910c0f9e3a7f3aa270ddf0"},"c":{"x":"46da462399a2c8aa6df1a09672382f93dad1c394c49dc00dadd74bf0fb40859","y":"7f14fe6f77429c4f14d71714739bd17bf974c45d730eed94214afa9132f39dbb"}}};
export const SIGN_SECOND = ["signature12345","pk12345"]
export const WITHDRAW_CONFIRM = [[[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70],[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]]];
export const WITHDRAW_SIG = "12345sig"

// Protocol run 1: deposit
export const DEPOSIT_CONFIRM = {id:"21d28236-d874-f0f4-ba3e-d4184cd7d560"};
export const SMT_PROOF = [[false,[0,0,0,1,99,0]],[false,[0,1,0,4,56,0,1,0,17,99,102,51,145,151,173,227,83,241,55,101,214,218,110,154,125,84,143,167,234,38,94,112,110,9,156,250,106,115,98,17,180,31,205,253,1]],[false,[0,4,0,5,51,0,4,1,0,56,53,101,100,57,52,55,53,49,54,57,50,100,57,100,102,101,97,55,52,102,50,97,100,57,55,57,54,57,57,52,57,48,50,50,100,55,101,97,51,100,50,56,54,53,52,49,101,100,53,57,51,101,48,49,53,56,101,51,49,53,100,55,51,1]],[true,[48,50,99,54,57,100,97,100,56,55,50,53,48,98,48,51,50,102,101,52,48,53,50,50,52,48,101,97,102,53,98,56,0,5,1,0,51,52,57,49,100,54,57,51,57,100,55,99,101,52,54,98,102,55,48,51,97,51,98,49,54,57,57,55,99,99,57,54,0,5,1,0,54,52,101,99,54,98,99,55,102,55,57,52,51,52,51,97,48,99,51,54,53,49,99,48,53,55,56,102,50,53,100,102,1]]];
export const STATECOIN_PROOF_KEY_DER =
{__D:[91,132,187,246,194,102,200,228,95,20,41,15,141,217,150,68,81,68,70,52,38,193,160,147,254,118,161,99,195,181,34,31],chainCode:[48,253,142,202,107,100,179,56,6,77,52,1,25,32,108,104,140,32,74,193,169,191,255,231,9,175,34,194,10,36,145,144],network:{messagePrefix:"\u0018Bitcoin Signed Message:\n",bech32:"tb",bip32:{public:70617039,private:70615956},pubKeyHash:111,scriptHash:196,wif:239},__DEPTH:3,__INDEX:2,__PARENT_FINGERPRINT:278430330,lowR:false}

// Protocol run 1: transfer
export const TRANSFER_SENDER = {x1:{secret_bytes:[4, 246, 192, 43, 69, 23, 178, 71, 110, 243, 18, 94, 63, 218, 196, 108, 233, 206, 106, 46, 41, 119, 58, 111, 27, 34, 131, 168, 191, 159, 116, 47, 105, 16, 0, 229, 91, 242, 129, 148, 9, 32, 169, 35, 147, 81, 145, 89, 120, 113, 52, 219, 120, 240, 95, 65, 18, 151, 19, 183, 175, 85, 35, 45, 4, 31, 193, 58, 52, 12, 133, 131, 108, 240, 63, 84, 93, 72, 57, 107, 174, 117, 10, 86, 11, 178, 235, 78, 195, 200, 49, 189, 224, 117, 14, 185, 5, 56, 84, 96, 142, 194, 95, 115, 175, 248, 103, 37, 171, 122, 249, 121, 183, 251, 135, 172, 10, 43, 14, 156, 21, 216, 155, 241, 67]},proof_key:"03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477"};
export const TRANSFER_MSG3 = {shared_key_id:"96c77c1a-b3c1-4e2a-9e86-636f59306bbc",t1:{secret_bytes:[4, 236, 178, 53, 9, 218, 194, 137, 0, 80, 132, 88, 82, 233, 158, 111, 162, 176, 232, 242, 83, 145, 84, 237, 210, 14, 216, 37, 106, 178, 113, 194, 216, 124, 152, 234, 104, 207, 84, 50, 69, 2, 141, 244, 153, 196, 12, 15, 221, 230, 202, 18, 138, 142, 233, 40, 105, 46, 26, 246, 75, 65, 16, 45, 195, 220, 181, 217, 215, 157, 150, 114, 135, 83, 46, 39, 152, 130, 187, 242, 104, 125, 236, 253, 222, 76, 97, 111, 114, 95, 147, 241, 98, 85, 228, 71, 243, 74, 168, 25, 24, 237, 123, 50, 251, 204, 219, 74, 169, 37, 155, 177, 122, 36, 23, 36, 157, 169, 111, 107, 168, 152, 138, 58, 221]},statechain_sig:{purpose:"TRANSFER",data:"028a9b66d0d2c6ef7ff44a103d44d4e9222b1fa2fd34cd5de29a54875c552abd41",sig:"3044022026a22bb2b8c0e43094d9baa9de1abd1de914b59f8bbcf5b740900180da575ed10220544e27e2861edf01b5c383fc90d8b1fd41211628516789f771b2c3536e650bda"},"statechain_id":"f7ac71c1-0937-4718-bc9b-7f4d77321981",tx_backup_psm:{shared_key_ids:["96c77c1a-b3c1-4e2a-9e86-636f59306bbc"],protocol:"Transfer",tx_hex:"0200000000010194842999812ec4b11eb1bebccd118d1de5db45398414684ddf2819f7ef1046790000000000feffffff02cf960700000000001600140b6d2d569da09a1201fa2cd50264d64bafc950cdc4090000000000001600143f17a0ef09f4889e5824dd4b37dd9cc5b50089ea02483045022100f749e391fa0980cf1ecc7f3e8e48d8c1fa8f87b86e987ac7bd0533ce4d215afe02205048dc2a2fe0f51097b4b214910eb261125bd122f771d321a49fa8127dc0dfc00121039422862ce37422c170c5529e9f2d278c5f32b0d39923d3ed412a10e8352fc7e92ca61f00",input_addrs:["02303b83bc0a2980d353cc4a9474afb35e5d8d183b2ad9a1722e4a957fc15aa9b0"],input_amounts:[1000],proof_key:"03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477"},rec_se_addr:{tx_backup_addr:"tb1qsfdj64n7x6p8earaekppy0pcaxam6qeqzljw8m",proof_key:"028a9b66d0d2c6ef7ff44a103d44d4e9222b1fa2fd34cd5de29a54875c552abd41"}}
export const TRANSFER_MSG3_2 = {shared_key_id:"96c77c1a-b3c1-4e2a-9e86-636f59306bbc",t1:{secret_bytes:[4, 236, 178, 53, 9, 218, 194, 137, 0, 80, 132, 88, 82, 233, 158, 111, 162, 176, 232, 242, 83, 145, 84, 237, 210, 14, 216, 37, 106, 178, 113, 194, 216, 124, 152, 234, 104, 207, 84, 50, 69, 2, 141, 244, 153, 196, 12, 15, 221, 230, 202, 18, 138, 142, 233, 40, 105, 46, 26, 246, 75, 65, 16, 45, 195, 220, 181, 217, 215, 157, 150, 114, 135, 83, 46, 39, 152, 130, 187, 242, 104, 125, 236, 253, 222, 76, 97, 111, 114, 95, 147, 241, 98, 85, 228, 71, 243, 74, 168, 25, 24, 237, 123, 50, 251, 204, 219, 74, 169, 37, 155, 177, 122, 36, 23, 36, 157, 169, 111, 107, 168, 152, 138, 58, 221]},statechain_sig:{purpose:"TRANSFER",data:"028a9b66d0d2c6ef7ff44a103d44d4e9222b1fa2fd34cd5de29a54875c552abd41",sig:"3044022026a22bb2b8c0e43094d9baa9de1abd1de914b59f8bbcf5b740900180da575ed10220544e27e2861edf01b5c383fc90d8b1fd41211628516789f771b2c3536e650bda"},"statechain_id":"f7ac71c1-0937-4718-bc9b-7f4d77321981",tx_backup_psm:{shared_key_ids:["96c77c1a-b3c1-4e2a-9e86-636f59306bbc"],protocol:"Transfer",tx_hex:"0200000000010194842999812ec4b11eb1bebccd118d1de5db45398414684ddf2819f7ef1046790000000000feffffff02cf960700000000001600140b6d2d569da09a1201fa2cd50264d64bafc950cdc4090000000000001600143f17a0ef09f4889e5824dd4b37dd9cc5b50089ea02483045022100f749e391fa0980cf1ecc7f3e8e48d8c1fa8f87b86e987ac7bd0533ce4d215afe02205048dc2a2fe0f51097b4b214910eb261125bd122f771d321a49fa8127dc0dfc00121039422862ce37422c170c5529e9f2d278c5f32b0d39923d3ed412a10e8352fc7e92ca61f00",input_addrs:["02303b83bc0a2980d353cc4a9474afb35e5d8d183b2ad9a1722e4a957fc15aa9b0"],input_amounts:[1000],proof_key:"03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477"},rec_se_addr:{tx_backup_addr:"tb1qsfdj64n7x6p8earaekppy0pcaxam6qeqzljw8m",proof_key:"0209c0ac5eaa010d1c964209260c17f4793cd1bb967a0d715bad190dc8fae89cad"}}
export const STATECHAIN_INFO_AFTER_TRANSFER = {utxo:"794610eff71928df4d6814843945dbe51d8d11cdbcbeb11eb1c42e8199298494:0",amount:500000,chain:[{data:"03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477",next_state:null}],locktime:1990441}
export const STATECOIN_PROOF_KEY_DER_AFTER_TRANSFER = {__D:[12,167,86,244,1,71,143,177,161,102,210,121,69,80,29,138,245,154,218,28,181,82,197,152,80,157,252,180,148,244,117,184],__Q:[2,138,155,102,208,210,198,239,127,244,74,16,61,68,212,233,34,43,31,162,253,52,205,93,226,154,84,135,92,85,42,189,65],chainCode:[17,103,219,181,100,221,223,210,34,16,230,138,129,23,181,247,233,17,25,193,254,149,5,150,20,118,66,82,146,33,29,195],network:{messagePrefix:"\u0018Bitcoin Signed Message:\n",bech32:"tb",bip32:{public:70617039,private:70615956},pubKeyHash:111,scriptHash:196,wif:239},__DEPTH:3,__INDEX:3,__PARENT_FINGERPRINT:278430330,lowR:false}
export const TRANSFER_PUBKEY = {key:"03b1e51eb08539dcbf58995f9e75519071d4acd88d16314fd7231e707c75707098"}
export const TRANSFER_RECEIVER = {new_shared_key_id:"d91553ca-8cab-4eef-b315-28583fd4180b",s2_pub:{x:"abc03bfe5e2fb3d54a58069bb06cef5d25533da24d928679b1fa9e9c97b6e0e0",y:"d47dc07001729dd5adb19c52a1ce1b9c360b0e15abb5dabd652dbba787fe35c0"}}

//SwapID
export const POLL_UTXO: SwapID = { id: "00000000-0000-0000-0000-000000000001" };

//SwapID
export const POLL_SWAP_1 = "Phase1"
export const POLL_SWAP_2 = "Phase2"
export const POLL_SWAP_3 = "Phase3"
export const POLL_SWAP_4 = "Phase4"
export const POLL_SWAP_END = "End"

// export const GET_SWAP_INFO_1 = {
//   status: "Phase1",
//   swap_token: cloneDeep(SIGNSWAPTOKEN_DATA)[0].swap_token,
//   bst_sender_data: BST_DATA.bst_sender_data,
// }

export const GET_BLINDED_SPEND_SIGNATURE = {
  //s_prime: "",
}

export const REGISTER_UTXO = null;
