jest.mock("sqlite3", () => {
  const mockDb = {
    all: jest.fn((query, cb) => {
      if (query === "SELECT * FROM channels") {
        cb(null, [
          { id: 1, name: "channel1" },
          { id: 2, name: "channel2" },
        ]);
      } else {
        cb(new Error("Query failed"));
      }
    }),
  };
  return {
    Database: jest.fn(() => mockDb),
  };
});

describe("GET /peerlist", () => {
  test("It should return a list of peers", async () => {
    const response = await request(app).get("/peerlist");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([
      {
        node: "WalletOfSatoshi.com",
        host: "170.75.163.209",
        port: "9735",
        pubkey:
          "035e4ff418fc8b5554c5d9eea66396c227bd429a3251c8cbc711002ba215bfc226",
      },
      {
        node: "ACINQ",
        host: "3.33.236.230",
        port: "9735",
        pubkey:
          "03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f",
      },
      {
        node: "CoinGate",
        host: "3.124.63.44",
        port: "9735",
        pubkey:
          "0242a4ae0c5bef18048fbecf995094b74bfb0f7391418d71ed394784373f41e4f3",
      },
    ]);
  });
});

describe("GET /activeChannels", () => {
  test("It should return a list of active channels", async () => {
    // mock the db.all function
    db.all = jest.fn((_, cb) =>
      cb(null, [
        { id: 1, name: "channel1" },
        { id: 2, name: "channel2" },
      ])
    );

    const response = await request(app).get("/activeChannels");
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([
      { id: 1, name: "channel1" },
      { id: 2, name: "channel2" },
    ]);
    expect(db.all).toHaveBeenCalledWith(
      "SELECT * FROM channels",
      expect.any(Function)
    );
  });

  test("It should return an error if the query fails", async () => {
    // mock the db.all function
    db.all = jest.fn((_, cb) => cb(new Error("Query failed")));

    const response = await request(app).get("/activeChannels");
    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Query failed" });
    expect(db.all).toHaveBeenCalledWith(
      "SELECT * FROM channels",
      expect.any(Function)
    );
  });
});
