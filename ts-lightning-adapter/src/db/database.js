// to persist channels
import sqlite from 'sqlite3';
const sqlite3 = sqlite.verbose();


// Connect/create the SQLite database
const db = new sqlite3.Database("lightning.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to/Created the SQLite database.");

  // Create the 'wallets' table if it doesn't exist
  const createWalletsTable = `CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
    )`;

  db.run(createWalletsTable, (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Table 'wallets' created or already exist");

    // Insert some sample data into the 'wallets' table if there's no data
    db.get("SELECT count(*) as count FROM wallets", (err, row) => {
      if (err) {
        console.error(err.message);
      }
      if (row.count === 0) {
        console.log("Inserting sample data for table wallets ...");
        const sampleData = [
          { name: "Mainnet Wallet 1" },
          { name: "Testnet Wallet 1" },
          { name: "Testnet Wallet 2" },
        ];
        const insertData = `INSERT INTO wallets (name) VALUES (?)`;
        sampleData.forEach((data) => {
          db.run(insertData, [data.name]);
        });
      } else {
        console.log(
          "Table 'wallets' already contains data, skipping the sample data insertion."
        );
      }
    });
  });

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
  });

  // Create the 'channels' table if it doesn't exist
  const createChannelsTable = `CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        push_msat INTEGER NOT NULL,
        config_id INTEGER NOT NULL,
        wallet_id INTEGER NOT NULL,
        peer_id INTEGER NOT NULL,
        FOREIGN KEY (peer_id) REFERENCES peer(id)
    )`;

  db.run(createChannelsTable, (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Table 'channels' created or already exist");

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
            config_id: 1,
            wallet_id: 1,
            peer_id: 1,
          },
          {
            name: "testChannel",
            amount: 100000,
            push_msat: 444,
            config_id: 1,
            wallet_id: 1,
            peer_id: 2,
          },
          {
            name: "p2p",
            amount: 100000,
            push_msat: 444,
            config_id: 1,
            wallet_id: 1,
            peer_id: 3,
          },
        ];
        const insertData = `INSERT INTO channels (name, amount, push_msat, config_id, wallet_id, peer_id) VALUES (?,?,?,?,?,?,?)`;
        sampleData.forEach((data) => {
          db.run(insertData, [
            data.name,
            data.amount,
            data.push_msat,
            data.config_id,
            data.wallet_id,
            data.peer_id,
          ]);
        });
      } else {
        console.log(
          "Table 'channel' already contains data, skipping the sample data insertion."
        );
      }
    });
  });

  console.log("Insert complete");
});

export default db;
