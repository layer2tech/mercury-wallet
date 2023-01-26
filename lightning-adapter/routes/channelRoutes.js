const express = require("express");
const router = express.Router();
const db = require("../database.js");
const { getLDKClient } = require("../lightningClient");

router.get("/activeChannels", async function (req, res) {
  db.all("SELECT * FROM channels", (err, rows) => {
    if (err) {
      throw err;
    }
    res.json(rows);
  });
});

router.get("/channels/:wallet_name", (req, res) => {
  let walletId;
  const getWalletId = `SELECT id FROM wallets WHERE name=?`;
  db.get(getWalletId, req.params.wallet_name, function (err, wallet_id) {
    if (err) {
      throw err;
    }
    if (wallet_id) {
      walletId = wallet_id.id;
      const getChannels = `SELECT * FROM channels WHERE wallet_id=?`;
      db.all(getChannels, walletId, function (err, channels) {
        if (err) {
          throw err;
        }
        res.json(channels);
      })
    } else {
      throw new Error(`Lightning wallet with name ${req.params.wallet_name} not found`)
    }
  });
});

router.post("/createChannel", (req, res) => {
  // use LDK.createChannel and insert into db to persist it

  const pubkeyHex =
      "031b9eeb5f23939ed0565f49a1343b26a948a3486ae48e7db5c97ebb2b93fc8c1d";
  const pubkey = new Uint8Array(
      pubkeyHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
  );

  const { name, amount, push_msat, user_id, config_id, wallet_id } = req.body;
  const insertData = `INSERT INTO channels (name, amount, push_msat, user_id, config_id, wallet_id) VALUES (?,?,?,?,?,?)`;
  let channelId;
  db.run(
    insertData,
    [name, amount, push_msat, user_id, config_id, wallet_id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      channelId = this.lastID;
      getLDKClient().createChannel(pubkey, amount, push_msat, channelId);
      res.json({ message: "Channel saved successfully", id: channelId });
    }
  );
});

router.put("/updateChannel/:id", (req, res) => {
  // update a channel by id
  const { name, amount, push_msat, user_id, config_id, wallet_id } = req.body;
  const updateData = `UPDATE channels SET name=?, amount=?, push_msat=?, user_id=?, config_id=?, wallet_id=? WHERE id=?`;
  db.run(
    updateData,
    [name, amount, push_msat, user_id, config_id, wallet_id, req.params.id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: "Channel updated successfully" });
    }
  );
});

router.delete("/deleteChannel/:id", (req, res) => {
  // delete channel by id
  const deleteData = `DELETE FROM channels WHERE id=?`;
  db.run(deleteData, [req.params.id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: "Data deleted successfully" });
  });
});

module.exports = router;
