// to persist channels
const sqlite3 = require("sqlite3").verbose();
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

  // Create the 'channels' table if it doesn't exist
  const createChannelsTable = `CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        push_msat INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        config_id INTEGER NOT NULL,
        wallet_id INTEGER NOT NULL
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
            user_id: 1,
            config_id: 1,
            wallet_id: 1,
          },
          {
            name: "testChannel",
            amount: 100000,
            push_msat: 444,
            user_id: 1,
            config_id: 1,
            wallet_id: 1,
          },
          {
            name: "p2p",
            amount: 100000,
            push_msat: 444,
            user_id: 1,
            config_id: 1,
            wallet_id: 1,
          },
        ];
        const insertData = `INSERT INTO channels (name, amount, push_msat, user_id, config_id, wallet_id) VALUES (?,?,?,?,?,?)`;
        sampleData.forEach((data) => {
          db.run(insertData, [
            data.name,
            data.amount,
            data.push_msat,
            data.user_id,
            data.config_id,
            data.wallet_id,
          ]);
        });
      } else {
        console.log(
          "Table 'channel' already contains data, skipping the sample data insertion."
        );
      }
    });
  });
});

module.exports = db;
