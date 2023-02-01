// database mock

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(":memory:");

// Create the 'wallets' table if it doesn't exist
db.exec(
  "CREATE TABLE IF NOT EXISTS wallets (id INTEGER PRIMARY KEY, name TEXT NOT NULL)"
);

// Insert sample data into the 'wallets' table
const sampleData = [
  { id: 1, name: "Mainnet Wallet 1" },
  { id: 2, name: "Testnet Wallet 1" },
  { id: 3, name: "Testnet Wallet 2" },
];
const insertData = `INSERT INTO wallets (id, name) VALUES (?, ?)`;
sampleData.forEach((data) => {
  db.run(insertData, [data.id, data.name]);
});

// Create the 'channels' table if it doesn't exist
const createChannelsTable = `CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        push_msat INTEGER NOT NULL,
        config_id INTEGER NOT NULL,
        wallet_id INTEGER NOT NULL
    )`;

db.run(createChannelsTable, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Table 'channels' created or already exist");

  // Insert sample data into the 'channels' table
  const sampleData = [
    {
      name: "channel1",
      amount: 100000,
      push_msat: 444,
      config_id: 1,
      wallet_id: 1,
    },
    {
      name: "testChannel",
      amount: 100000,
      push_msat: 444,
      config_id: 1,
      wallet_id: 1,
    },
    {
      name: "p2p",
      amount: 100000,
      push_msat: 444,
      config_id: 1,
      wallet_id: 1,
    },
  ];
  const insertData = `INSERT INTO channels (name, amount, push_msat, config_id, wallet_id) VALUES (?,?,?,?,?)`;
  sampleData.forEach((data) => {
    db.run(insertData, [
      data.name,
      data.amount,
      data.push_msat,
      data.config_id,
      data.wallet_id,
    ]);
  });
});

module.exports = db;
