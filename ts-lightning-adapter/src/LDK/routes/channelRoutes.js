import express from "express";
const router = express.Router();
import db from "../../db/database.js";
import { createNewChannel } from "../../LDK/utils//ldk-utils.ts";

router.get("/activeChannels", async function (req, res) {
  db.all("SELECT * FROM channels", (err, rows) => {
    if (err) {
      throw err;
    }
    res.json(rows);
  });
});

// load channels by wallet id - single responsibility
router.get("/loadChannels/:wallet_id", (req, res) => {
  const wallet_id = req.params.wallet_id;
  const selectData = "SELECT * FROM channels WHERE wallet_id = ?";
  db.all(selectData, [wallet_id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// load channels by wallet name - does 2 things
router.get("/loadChannels/walletName/:name", (req, res) => {
  const name = req.params.name;
  const selectId = "SELECT id FROM wallets WHERE name = ?";
  db.get(selectId, [name], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (row) {
      const wallet_id = row.id;
      const selectChannels = "SELECT * FROM channels WHERE wallet_id = ?";
      db.all(selectChannels, [wallet_id], (err, rows) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(rows);
      });
    } else {
      res.status(404).json({ error: "Wallet not found" });
    }
  });
});

router.post("/createChannel", async (req, res) => {
  // use LDK.createChannel and insert into db to persist it

  const { pubkey, name, amount, push_msat, config_id, wallet_name, peer_id } =
    req.body;
  try {
    const result = await createNewChannel(pubkey, name, amount, push_msat, config_id, wallet_name, peer_id);
    res.status(result.status).json(result);
  } catch (error) {
    res.status(error.status).json(error);
  }
});

router.put("/updateChannel/:id", (req, res) => {
  // update a channel by id
  const { name, amount, push_msat, config_id, wallet_id } = req.body;
  const updateData = `UPDATE channels SET name=?, amount=?, push_msat=?, config_id=?, wallet_id=? WHERE id=?`;
  db.run(
    updateData,
    [name, amount, push_msat, config_id, wallet_id, req.params.id],
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

export default router;
