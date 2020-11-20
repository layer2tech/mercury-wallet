const axios = require('axios').default;

const state_entity_addr = "http://0.0.0.0:8000";
// const state_entity_addr = "https://fakeapi.mercurywallet.io";

export const GET_ROUTE = {
   FEES: "info/fee",
   ROOT: "info/root",
   STATECHAIN: "info/statechain",
};
Object.freeze(GET_ROUTE);

export const POST_ROUTE = {
   DEPOSIT_INIT: "deposit/init",
   KEYGEN_FIRST: "ecdsa/keygen/first",
   KEYGEN_SECOND: "ecdsa/keygen/second",
};
Object.freeze(POST_ROUTE);

export const get = async (path, params) => {
  try {
    const url = state_entity_addr + "/" + path + "/" + (params == undefined ? "" : params);
    const config = {
        method: 'get',
        url: url,
        headers: { 'Accept': 'application/json' }
    };

    let res = await axios(config);

    return res.data

  } catch (err) {
    console.log(err);
    console.log("Error connecting to StateEntity. Dummy values returned.")

    switch(path) {
      case GET_ROUTE.FEES:
        return {
          addr: "bcrt1qjjwk2rk7nuxt6c79tsxthf5rpnky0sdhjr493x",
          deposit_fee: 300,
          withdraw_fee: 300,
          interval: 100,
          init_lock: 10000
        }
      case GET_ROUTE.ROOT:
        return {
          root: "7nuxtbcrt1qhf5rpnky0xtjwk2rkky0sdhjr4sdhj6c79ts93x"
        }
      case GET_ROUTE.STATECHAIN:
        return {
          utxo: { txid: "0158f2978e5c2cf407970d7213f2b4289993b2fe3ef6aca531316cdcf347cc41", vout: 1},
          amount: 100,
          chain: [{ data: "026ff25fd651cd921fc490a6691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0e", next_state: null }]
        }
    }
  }
};


export const post = async (path, body) => {
  try {
    let url = state_entity_addr + "/" + path;

    const config = {
        method: 'post',
        url: url,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        data: body,
    };
    let res = await axios(config);

    return res.data

  } catch (err) {
    console.log(err);
    console.log("Error connecting to StateEntity. Dummy values returned.")

    switch(path) {
      case POST_ROUTE.DEPOSIT_INIT:
        return "4641e205-e4c8-4c84-b317-8818a1460731";
      case POST_ROUTE.KEYGEN_FIRST:
        return ["0b17be13-5295-48cf-acd7-8d87741a5208",
          {
            pk_commitment: "b7e7947f63febf1d12fb6468b3b811840f6b049d06ea203272c8243fdbaaf14b",
            zk_pok_commitment: "bf48f418acf689c940b68100aee32ba6a2b2aedfc5934f83aa11edf47f0610a2"
          }
        ];
      case POST_ROUTE.KEYGEN_SECOND:
        return {
          ecdh_second_message: {
            comm_witness: {
                pk_commitment_blind_factor: "c7a5bdb153b146baeb96089adfebd83e8c9e8cde557247429dc479891b4dbfda",
                zk_pok_blind_factor: "abefd16e0e5fe0d122d7de53891ef17ea56427e03bf9cca2f35f7f8156f1b1b4",
                public_share: {
                  x: "fc49aef8a9f6628e4d201787712ea0f5fc1280ab3dc6a728e5e7d4c69c8e5366",
                  y: "a99b6d63602fa914fbceb32406c5bb66850d902ae7cb5e44c0d661c4e27a2574"
                },
                d_log_proof: {
                  pk: {
                    x: "fc49aef8a9f6628e4d201787712ea0f5fc1280ab3dc6a728e5e7d4c69c8e5366",
                    y: "a99b6d63602fa914fbceb32406c5bb66850d902ae7cb5e44c0d661c4e27a2574"
                  },
                  pk_t_rand_commitment: {
                    x: "9a1f1c0967bea1ef046145f5e4620a3a4eaae1656364c5eedee07edcc137f934",
                    y: "bcf98bbe929ff82c8d5db0c179226e0024b923610e205905b92be54a97bcc525"
                  },
                  challenge_response: "7136e5997786eb7203e43808b4cd1327f2497ccd2295c7a2da5efebed366d5bf"
                }
              }
            },
            ek: {
              n: "20587908056369588235323942493016099572977557597942396357006176142791548005838821694139402420182097105165740937561977996378493110569483550576404560555982553360148874476746887165230808799724882838509113683772607021570155316015635846241091843608171824579862725937112610386880350244484268803113009181242650228674337068442140549246109924181742693998009114827766050524644258335093012838863552634637036145637611946324730546567787781336690371548287147831233090204096096854110416628736566667927855096701453391441572717073417763909168065187713075254194253991257406704172400418282279889232231216218084775787110718249920850164801"
            },
            c_key: "2424cadd058aac385889c8aacda75c36b41b5bb89d4056059d7a1fe4382cf6b638e012ced004db2fdad492dfa39337379dfffb2c636d9a944e9e45e04cddb22c04596215ee4e72a7405161de746372a4831fef13230257baaea5175864f69e7bcd8d4f22eb3729a5544f5adfd9a7794cd9781018a26c3ea845e7c2349f7d904415bea3e6eb86f16e57d6081ce6b5330525549a5f6d87e6e58a021e91f7443c0019a1d97083c0c7dda9681129ecab5da56de2c5e55eaf6e052049f53174d0d0673fe180bc96923dffbc87250a4d18f7e3ee5aadab2b9ba192d6a41b19d26f5f301036979e7751849b7851681fb854da4aa571441bd40463743b44eb435cec411067096440507b411ab260b5b571e995b2ab76a82c8352fb394ef70e12b31dd22e6400fd4707b6440a444f928f1e45b65e48ff40371a2630aa9f71e4901d5277037172a6bc6d6cc5eeb1e642e91e9cce1a7b3569411b29268f038ddb70be7d557b394b79002f4cb9a13d5ce8adb4f6d530e39a4a00d33299404c1ce45676dc6aa3b7d0df45b9a0149764da3c0388330e9f4242f90568bf43c99d1965b54244b87b2d7c73f04180a095fe993db9271f0b397741c80111f225f1f10602025e1cb9b7d6f87c93089942f2991b49c549a43b1225b1ec3e5b334776ed7f5e4cc202a9e4330000856d2fbcdf19e8d2c8a68a7efe741bee4079fc6caf6ec2a45fb780017f",
            correct_key_proof:"null",
            range_proof:"null"
          }
    }
  }
};
