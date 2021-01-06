let typeforce = require('typeforce');

// re-export some basic types
export const Buffer256bit = typeforce.BufferN(32);
export const Hash160bit = typeforce.BufferN(20);
export const Hash256bit = typeforce.BufferN(32);
export const Number = typeforce.Number; // tslint:disable-line variable-name
export const Array = typeforce.Array;
export const Boolean = typeforce.Boolean; // tslint:disable-line variable-name
export const String = typeforce.String; // tslint:disable-line variable-name
export const UInt32 = typeforce.UInt32;
export const UInt64 = typeforce.UInt64;
export const Null = typeforce.Null;

export const OutPoint = typeforce.Object;
export const Chain = Array;

// StateChain Entity API
export const StateChainDataAPI = typeforce.compile({
    utxo: OutPoint,
    amount: UInt32,
    chain: Chain,
    locktime: UInt32,
})

export const Root = typeforce.compile({
  id: UInt32,
  value: Array,
  commitment_info: typeforce.oneOf(typeforce.Any, typeforce.Null),
});

export const FeeInfo = typeforce.compile({
  address: String,
  deposit: UInt32,
  withdraw: UInt32,
  interval: UInt32,
  initlock: UInt32
})


////////// 2P-ECDSA structs/////////////


///////////// KEYGEN /////////////

// curv::elliptic::curves::secp256_k1::Secp256k1Point
export const Secp256k1Point = typeforce.compile({
    x: String,
    y: String
})

// multi_party_ecdsa::protocols::two_party_ecdsa::lindell_2017::party_one::KeyGenFirstMsg
export const KeyGenFirstMsgParty1 = typeforce.compile({
  pk_commitment: String,
  zk_pok_commitment: String
})

// curv::cryptographic_primitives::proofs::sigma_dlog::DLogProof
// and
// curv::cryptographic_primitives::proofs::sigma_ec_ddh::ECDDHProof
export const DLogProof = typeforce.oneOf(
    {
      pk: Secp256k1Point,
      pk_t_rand_commitment: Secp256k1Point,
      challenge_response: String
    },
    {
      a1: Secp256k1Point,
      a2: Secp256k1Point,
      z: String
    }
)


// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::KeyGenFirstMsg
export const KeyGenFirstMsgParty2 = typeforce.compile({
  d_log_proof: DLogProof,
  public_share: Secp256k1Point
})
// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::EcKeyPair
export const EcKeyPair = typeforce.compile({
  public_share: Secp256k1Point,
  secret_share: String,
})
export const ClientKeyGenFirstMsg = typeforce.compile({
  kg_party_two_first_message: KeyGenFirstMsgParty2,
  kg_ec_key_pair_party2: EcKeyPair
})



// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::KeyGenSecondMsg
export const KeyGenSecondMsg = typeforce.compile({
  comm_witness: {
    pk_commitment_blind_factor: String,
    zk_pok_blind_factor: String,
    public_share: Secp256k1Point,
    d_log_proof: DLogProof
  }
})

// kms::ecdsa:two_party::party1::KeyGenParty1Message2
export const KeyGenParty1Message2 = typeforce.compile({
  ecdh_second_message: KeyGenSecondMsg,
  ek: {
    n: String
  },
  c_key: String,
  correct_key_proof: typeforce.oneOf({
    signma_vec: typeforce.oneOf(Array, Null)
  }, String),
  pdl_proof: typeforce.oneOf(Object, Null),
  pdl_statement: typeforce.oneOf(Object, Null)
})


// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::PDLFirstMessage
export const PDLFirstMessage = typeforce.compile({
  c_tag: Array,
  c_tag_tag: Array,
})
export const Party2SecondMessage = typeforce.compile({
  key_gen_second_message: Object,
  pdl_first_message: PDLFirstMessage,
})
// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::PaillierPublic
export const PaillierPublic = typeforce.compile({
    ek: {
      n: String
    },
    encrypted_secret_share: Array,
})
export const ClientKeyGenSecondMsg = typeforce.compile({
  party_two_second_message: Party2SecondMessage,
  party_two_paillier: PaillierPublic
})


// kms::ecdsa:two_party::Party2Public
export const Party2Public = typeforce.compile({
  q: Secp256k1Point,
  p2: Secp256k1Point,
  p1: Secp256k1Point,
  paillier_pub: Object,
  c_key: Array,
})
// kms::ecdsa:two_party::MasterKey2
export const MasterKey2 = typeforce.compile({
  public: Party2Public,
  private: Object, // Leave as Object since we dont need these items in Wallet.
  chain_code: Array,
})




///////////// SIGN /////////////

// multi_party_ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::EphCommWitness
export const EphCommWitness = typeforce.compile({
     pk_commitment_blind_factor: Array,
     zk_pok_blind_factor: Array,
     public_share: Secp256k1Point,
     d_log_proof: DLogProof,
     c: Secp256k1Point,
})

export const ClientSignFirstMsg = typeforce.compile({
  eph_key_gen_first_message_party_two: KeyGenFirstMsgParty1,
  eph_comm_witness: EphCommWitness,
  eph_ec_key_pair_party2: EcKeyPair
})


export const ServerSignfirstMsg = typeforce.compile({
  d_log_proof: DLogProof,
  public_share: Secp256k1Point,
  c: Secp256k1Point
})

export const ClientSignSecondMsg = typeforce.compile({
  partial_sig: {
    c3: String
  },
  second_message: KeyGenSecondMsg
})



////////// MERCURY structs/////////////


///////////// TRANSFER /////////////

export const PrepareSignTxMsg = typeforce.compile({
  shared_key_id: String,
  protocol: String,
  tx: Object,
  input_addrs: Array,
  input_amounts: Array,
  proof_key: String,
});

export const TransferMsg2 = typeforce.compile({
    x1: {
      secret_bytes: Array
    },
    proof_key: String
})

export const TransferMsg3 = typeforce.compile({
  shared_key_id: String,
  t1: String,
  statechain_sig: Object,
  state_chain_id: String,
  tx_backup_psm: PrepareSignTxMsg,
  rec_addr: String,
})

export const TransferMsg4 = typeforce.compile({
  shared_key_id: String,
  state_chain_id: String,
  t2: String, // t2 = t1*o2_inv = o1*x1*o2_inv
  statechain_sig: Object,
  o2_pub: Secp256k1Point,
  tx_backup: Object,
  batch_data: Object,
})

export const TransferMsg5 = typeforce.compile({
  new_shared_key_id: String,
  s2_pub: Secp256k1Point,
  theta: String,
})

export const TransferFinalizeData = typeforce.compile({
    new_shared_key_id: String,
    o2: String,
    s2_pub: Secp256k1Point,
    theta: String,
    state_chain_data: StateChainDataAPI,
    proof_key: String,
    state_chain_id: String,
    tx_backup_psm: PrepareSignTxMsg,
})
