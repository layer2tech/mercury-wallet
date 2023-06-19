import { ChannelType } from "../../src/LDK/types/ChannelTypes";

export const MOCK_DATA = {
  NODE_ID: new Uint8Array([0x00, 0x01, 0x02, 0x03]),
  BLOCK_HASH:
    "0000000000009997191fe3ae4b646a4bb417d4417791310037ef4f5deeb7cc57",
  INVOICE:
    "lnbc100u1pj96z8epp5fc3vjyg5uudzx2eeykwutsed3jl97sc3s30emzem3mzf7995d40qdq5g9kxy7fqd9h8vmmfvdjscqzzsxqyz5vqsp5a9auggr2fwcmemp4lk50dcmquer39p74deut6g7rv9zpfc5kdu5q9qyyssq00qlqx98q9usndf8gxrzgajcrpl7dvffwv2tzu28ld7x9nph57rn9hk8tn9tuqhwhzgzkcd004rcl84hln7j30ef6u8w2j39hd656rgpxf37nr",
  CHANNELS: [],
  PUBKEY: "03534237af8affcf708cfe553b59fafa3a8420a4aaf1b2861d6e52df967976b53b",
  HOST: "127.0.0.1",
  PORT: 9735,
  CHANNEL_ID:
    "d6449fa9c9f4dd120411825c8357fe4a8f85a1f789776f786e264414c66cb439",
  CHANNEL_NAME: "test-channel",
  AMOUNT: 100000,
  PUSH_MSAT: 1000,
  CHANNEL_TYPE: ChannelType.Public,
  PRIVKEY: "cRrhJwXVBPHdbSRsZo31SU24zoFmy4Jsr8H1aMwRTDn3qb67zG1r",
  PAID: true,
  TXID: "6cf30a3fc3a32774494a9b04d06459f1ffd05382cf9e4e943675bea74c99a64c",
  VOUT: 1,
  PAYMENT_ADDRESS: "tb324524asda23asdsad234esdaxdasd12312311",
  INVOICE_EXPIRY_SECS: 3600,
  FUNDING_TXID:
    "1ec1ab323d1acad8bea1e24b4a9dbf5f82963838d255b8473255c07aa2b78892",
  WALLET_NAME: "Test Wallet"
};

export class MockLightningClient {
  netHandler: any;
  start() {}
  stop() {}
  updateBestBlockHeight() {
    return 1;
  }
  updateBestBlockHash() {
    return MOCK_DATA.BLOCK_HASH;
  }
  getChannels() {
    return MOCK_DATA.CHANNELS;
  }
  getOurNodeId() {
    return MOCK_DATA.NODE_ID;
  }
  connectToPeer() {
    return true;
  }
  setEventTxData() {}
  createInvoice() {
    return MOCK_DATA.INVOICE;
  }
  getUsableChannels() {
    return [];
  }
  createChannel() {
    return true;
  }
  mutualCloseChannel(pubkey: string) {
    return true;
  }
  forceCloseChannel(pubkey: string) {
    return true;
  }
  getChainMonitor() {
    return null;
  }
  getPeerManager() {
    return null;
  }
  sendPayment() {
    return true;
  }
}
