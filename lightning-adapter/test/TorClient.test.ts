import TorClient, {
  TOR_ENDPOINT,
} from "../src/LDK/bitcoin_clients/TorClient.mjs";

describe("Tor Client", () => {
  let torClient: TorClient;
  let bestBlockHash: any;
  let blockHeight: any;
  let latestBlockHeader: any;
  let txid: any;

  beforeAll(async () => {
    torClient = new TorClient();
  });

  it("getBestBlockHash", async () => {
    bestBlockHash = await torClient.getBestBlockHash();
    expect(bestBlockHash).toEqual(expect.any(String));
  });

  it("getBlockHeight", async () => {
    blockHeight = await torClient.getBestBlockHeight();
    expect(blockHeight).toEqual(expect.any(Number));
  });

  it("getLatestBlockHeader", async () => {
    latestBlockHeader = await torClient.getBlockHeader(blockHeight);
    expect(latestBlockHeader).toEqual(expect.any(String));
  });

  it("getTxIdData", async () => {
    txid = (
      await TorClient.get(
        `${TOR_ENDPOINT}/electrs/block/${bestBlockHash}/txids`
      )
    ).data[0];
    const response = await torClient.getTxIdData(txid);
    expect(response).toHaveProperty("txid");
    expect(response).toHaveProperty("vout");
    expect(response).toHaveProperty("sequence");
  });

  it("getUtxoSpentData", async () => {
    const response = await torClient.getUtxoSpentData(txid, 0);
    expect(response).toHaveProperty("spent");
  });
});
