import db from './db-mock.js';

test("Check that sample data is in the wallets table", (done) => {
  db.all("SELECT * FROM wallets", (err, rows) => {
    expect(rows.length).toBe(3);
    expect(rows[0].name).toBe("Mainnet Wallet 1");
    expect(rows[1].name).toBe("Testnet Wallet 1");
    expect(rows[2].name).toBe("Testnet Wallet 2");
    done();
  });
});

test("Check that sample data is in the channels table", (done) => {
  db.all("SELECT * FROM channels", (err, rows) => {
    expect(rows.length).toBe(3);
    expect(rows[0].name).toBe("channel1");
    expect(rows[1].name).toBe("testChannel");
    expect(rows[2].name).toBe("p2p");
    done();
  });
});
