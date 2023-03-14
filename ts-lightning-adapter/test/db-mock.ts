// to persist channels
import sqlite from "sqlite3";
const sqlite3 = sqlite.verbose();

const isDev = true;

// Connect/create the SQLite database
const db = new sqlite3.Database("lightning-mock.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to/Created the SQLite database.");

  ////////////////////////////////////////////////////////////
  //////// peerlist table ////////////////////////////////////
  ////////////////////////////////////////////////////////////

  const createPeersTable = `CREATE TABLE IF NOT EXISTS peers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node TEXT,
      pubkey TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL
  )`;
  db.run(createPeersTable, (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Table 'peers' created or already exist");

    if (isDev) {
      const sampleData = [
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
      ];

      sampleData.forEach((data) => {
        db.get(
          `SELECT * FROM peers WHERE pubkey = ?`,
          [data.pubkey],
          (err, row) => {
            if (err) {
              console.error(err.message);
            }
            if (!row) {
              db.run(
                `INSERT INTO peers (node, host, port, pubkey) VALUES (?,?,?,?)`,
                [data.node, data.host, data.port, data.pubkey],
                (err) => {
                  if (err) {
                    console.error(err.message);
                  }
                }
              );
            }
          }
        );
      });
    }
  });

  // Create the 'channels' table if it doesn't exist
  const createChannelsTable = `CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    amount REAL NOT NULL,
    push_msat INTEGER NOT NULL,
    public BOOL NOT NULL,
    wallet_name TEXT,
    peer_id INTEGER UNIQUE,
    privkey TEXT NOT NULL,
    txid TEXT,
    vout INTEGER,
    paid BOOL NOT NULL,
    payment_address TEXT,
    FOREIGN KEY (peer_id) REFERENCES peer(id)
  )`;

  db.run(createChannelsTable, (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Table 'channels' created or already exists");

    if (isDev) {
      // Insert some sample data into the 'channels' table if there's no data
      db.get("SELECT count(*) as count FROM channels", (err, row) => {
        if (err) {
          console.error(err.message);
        }
        if (row.count === 0) {
          console.log("Inserting sample data for table channels ...");
          const sampleData = [
            {
              name: "channel1",
              amount: 100000,
              push_msat: 444,
              public: true,
              wallet_name: "satoshi",
              peer_id: 1,
              privkey: "testprivkey1",
              txid: "testtxid1",
              vout: 0,
              paid: true,
              payment_address: "tb324524asda23asdsad234esdaxdasd12312311",
            },
            {
              name: "testChannel",
              amount: 100000,
              push_msat: 444,
              public: true,
              wallet_name: "ldk1",
              peer_id: 2,
              privkey: "testprivkey2",
              txid: "testtxid2",
              vout: 1,
              paid: false,
              payment_address: "tbdsfsdrererd12fdgdfg3123145asdsa23a1",
            },
            {
              name: "p2p",
              amount: 100000,
              push_msat: 444,
              public: false,
              wallet_name: "LDK3",
              peer_id: 3,
              privkey: "testprivkey3",
              txid: "testtxid3",
              vout: 2,
              paid: true,
              payment_address: "tb3245242sadsadwe3242sadasghgvh1",
            },
          ];
          const insertData = `INSERT INTO channels (name, amount, push_msat, public, wallet_name, peer_id, privkey, txid, vout, paid, payment_address) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
          sampleData.forEach((data) => {
            db.run(insertData, [
              data.name,
              data.amount,
              data.push_msat,
              data.public,
              data.wallet_name,
              data.peer_id,
              data.privkey,
              data.txid,
              data.vout,
              data.paid,
              data.payment_address,
            ]);
          });
        } else {
          console.log(
            "Table 'channels' already contains data, skipping the sample data insertion."
          );
        }
      });
    }
  });

  console.log("Insert complete");
});

export default db;
