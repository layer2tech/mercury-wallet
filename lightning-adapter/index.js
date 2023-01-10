"use strict";

const express = require("express");
var cors = require("cors");
var path = require("path");
const fs = require("fs");

// to persist channels
const sqlite3 = require("sqlite3").verbose();
// Connect/create the SQLite database
const db = new sqlite3.Database("mydatabase.db", (err) => {
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
          { name: "Main Wallet" },
          { name: "Travel Wallet" },
          { name: "Savings Wallet" },
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

const PORT = 3003;
var bodyParser = require("body-parser");

/**
 * STARTING SERVER ON PORT 3003
 */
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.listen(PORT, () => {
  console.log(
    `mercury-wallet-LDK-adapter listening at http://localhost:${PORT}`
  );
});

/**
 * Load the lightning LDK
 */
async function importLDK() {
  var LightningClient = (await import("./lightning.js")).default;
  console.log("Lightning Client: ", LightningClient);
  const lightning_client = new LightningClient();
  return lightning_client;
}
const LDK = importLDK();

/*























*/

// Routes

app.post("/connectToPeer", async function (req, res) {
  // connect to the peer given -> user selects a peer from peerlist then we use this to create to the peer (they need to post the peer id to this route)
  // a session needs to be created so we can track and have only one open because if this route is refreshed and pushed 10 times we don't want it to process 10 times
  let keys = req.body;
  // => {key1: 'value1', key2: 'value2'}
  let { host, port, pubkey } = keys;

  // call this when function is implemented
  // LDK.connectToPeer(host, port, pubkey);
});

// create a channel with the values posted into this route
app.post("/createChannel", async function (req, res) {
  // Get the data to save from the request body
  let data = req.body;

  let name,
    amount,
    push_msat,
    user_id,
    config_id,
    wallet_id = { data };

  // Check if channel exists if not then insert the data into the database - needs better identifier
  db.run(
    `INSERT OR IGNORE INTO channels (name, amount, push_msat, user_id, config_id, wallet_id) VALUES (?,?,?,?,?,?)`,
    [name, amount, push_msat, user_id, config_id, wallet_id],
    function (err) {
      if (err) {
        return console.error(err.message);
      }
      console.log(`Data saved to the database with ID: ${this.lastID}`);
    }
  );

  // Send a response to the client
  res.send("Data saved to the database");

  // LDK.createChannel(sats, msats, id, userConfig);
});

app.get("/activeChannels", async function (req, res) {
  db.all("SELECT * FROM channels", (err, rows) => {
    if (err) {
      throw err;
    }
    res.json(rows);
  });
});

app.post("/sendPayment", async function (req, res) {
  // send a payment with values posted into this route ->
});

app.post("/recvPayment", async function (req, res) {
  // receive a payment
});

// gives the peerlist for the client to select from
app.get("/peerlist", async function (req, res) {
  // sample public list
  let data = [
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
  res.status(200).json(data);
});

/*



























*/

// Server exit processing

async function on_exit() {}

async function on_sig_int() {
  process.exit();
}

process.on("exit", on_exit);
process.on("SIGINT", on_sig_int);
