jest.mock("sqlite3", () => {
  const mockDb = {
    run: jest.fn((query, values, cb) => {
      if (
        query ===
          "INSERT INTO channels (name, amount, push_msat, config_id, wallet_id) VALUES (?,?,?,?,?)" &&
        values.toString() === ["channel1", 100, 1000, 1, 1, 1].toString()
      ) {
        cb(null);
      } else {
        cb(new Error("Query failed"));
      }
    }),
  };
  return {
    Database: jest.fn(() => mockDb),
  };
});

describe("POST /createChannel", () => {
  test("It should create a new channel and return a success message", async () => {
    // mock the db.run function
    db.run = jest.fn((_, __, cb) => cb(null));

    const response = await request(app).post("/createChannel").send({
      name: "channel1",
      amount: 100,
      push_msat: 1000,
      config_id: 1,
      wallet_id: 1,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: "Channel saved successfully" });
    expect(db.run).toHaveBeenCalledWith(
      "INSERT INTO channels (name, amount, push_msat, config_id, wallet_id) VALUES (?,?,?,?,?)",
      ["channel1", 100, 1000, 1, 1],
      expect.any(Function)
    );
  });

  test("It should return an error if the query fails", async () => {
    // mock the db.run function
    db.run = jest.fn((_, __, cb) => cb(new Error("Query failed")));

    const response = await request(app).post("/createChannel").send({
      name: "channel1",
      amount: 100,
      push_msat: 1000,
      config_id: 1,
      wallet_id: 1,
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "Query failed" });
    expect(db.run).toHaveBeenCalledWith(
      "INSERT INTO channels (name, amount, push_msat, config_id, wallet_id) VALUES (?,?,?,?,?)",
      ["channel1", 100, 1000, 1, 1],
      expect.any(Function)
    );
  });
});
