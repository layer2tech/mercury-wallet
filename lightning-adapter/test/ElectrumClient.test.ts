import ElectrumClient from "../src/LDK/bitcoin_clients/ElectrumClient.mjs";

describe("Electrum Client", () => {
  let electrumClient: ElectrumClient;
  let bestBlockHash: any;
  let blockHeight: any;
  let latestBlockHeader: any;
  let txid: any;

  beforeAll(async () => {
    electrumClient = new ElectrumClient();
  });

  it("getBestBlockHash", async () => {
    bestBlockHash = await electrumClient.getBestBlockHash();
    expect(bestBlockHash).toEqual(expect.any(String));
  });

  it("getBlockHeight", async () => {
    blockHeight = await electrumClient.getBestBlockHeight();
    expect(blockHeight).toEqual(expect.any(Number));
  });

  it("getLatestBlockHeader", async () => {
    latestBlockHeader = await electrumClient.getBlockHeader(blockHeight);
    expect(latestBlockHeader).toEqual(expect.any(String));
  });

  it("getTxIdData", async () => {
    txid = (await ElectrumClient.get(`rest/block/${bestBlockHash}.json`)).data
      .tx[0].txid;
    const response = await electrumClient.getTxIdData(txid);
    expect(response).toHaveProperty("txid");
    expect(response).toHaveProperty("vout");
    expect(response).toHaveProperty("sequence");
  });
});
