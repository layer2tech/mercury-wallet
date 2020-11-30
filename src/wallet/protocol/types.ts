// Types involved in 2P-ECDSA and Mercury protocols.

// kms::ecdsa:two_party::MasterKey2
export interface MasterKey2 {
  public: Party2Public,
  private: any, // Leave as Object since we dont need these items in Wallet.
  chain_code: string,
}


// kms::ecdsa:two_party::Party2Public
export interface Party2Public {
  q: string,
  p2: string,
  p1: string,
  paillier_pub: any,
  c_key: string,
}



export interface ClientKeyGenFirstMsg {
  kg_party_two_first_message: KeyGenFirstMsg,
  kg_ec_key_pair_party2: EcKeyPair
}

// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::KeyGenFirstMsg
export interface KeyGenFirstMsg {
  d_log_proof: string,
  public_share: string
}
// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::EcKeyPair
export interface EcKeyPair {
  public_share: string,
  secret_share: string,
}



export interface ClientKeyGenSecondMsg {
  party_two_second_message: Party2SecondMessage,
  party_two_paillier: PaillierPublic
}

export interface Party2SecondMessage {
  key_gen_second_message: KeyGenSecondMsg,
  pdl_first_message: PDLFirstMessage,
}
// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::KeyGenSecondMsg
export interface KeyGenSecondMsg {
  comm_witness: string,
}

// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::PDLFirstMessage
export interface PDLFirstMessage {
  c_tag: string,
  c_tag_tag: string,
}
// multi-party-ecdsa::protocols::two_party_ecdsa::lindell_2017::party_two::PaillierPublic
export interface PaillierPublic {
    ek: string,
    encrypted_secret_share: string,
}



export interface ClientSignFirstMsg {
  eph_key_gen_first_message_party_two: any,
  eph_comm_witness: any,
  eph_ec_key_pair_party2: any
}
