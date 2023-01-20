const express = require("express");
const router = express.Router();
const db = require("../database.js");

router.get("/activeChannels", async function (req, res) {
  db.all("SELECT * FROM channels", (err, rows) => {
    if (err) {
      throw err;
    }
    res.json(rows);
  });
});

router.post("/createChannel", (req, res) => {
  // use LDK.createChannel and insert into db to persist it

  const { name, amount, push_msat, user_id, config_id, wallet_id } = req.body;
  const insertData = `INSERT INTO channels (name, amount, push_msat, user_id, config_id, wallet_id) VALUES (?,?,?,?,?,?)`;
  db.run(
    insertData,
    [name, amount, push_msat, user_id, config_id, wallet_id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: "Channel saved successfully" });
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
