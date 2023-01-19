// handle all peer logic on server
const LDKClient = require("../lightningClient.js");
const express = require("express");
const router = express.Router();
const db = require("../database.js");

router.post("/connectToPeer", (req, res) => {
  const { amount, channelType, pubkey, host, port } = req.body;
  console.log(amount, channelType, pubkey, host, port);

  LDKClient.connectToPeer(pubkey, host, port);

  res.send({ status: "success" });
});

router.post("/newPeer", (req, res) => {
  const { host, port, pubkey } = req.body;
  db.get(
    `SELECT * FROM peer WHERE host = ? AND port = ? AND pubkey = ?`,
    [host, port, pubkey],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: "Failed to query database" });
      } else if (row) {
        res.status(409).json({ error: "Peer already exists in the database" });
      } else {
        db.run(
          `INSERT INTO peer (host, port, pubkey) VALUES (?,?,?)`,
          [host, port, pubkey],
          (err) => {
            if (err) {
              res
                .status(500)
                .json({ error: "Failed to insert peer into database" });
            } else {
              res.status(201).json({ message: "Peer added to database" });
            }
          }
        );
      }
    }
  );
});

// get the peerlist that's already stored in the database so client can quickly re pick them and so other routes can have access
router.get("/peerlist", async function (req, res) {
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

module.exports = router;
