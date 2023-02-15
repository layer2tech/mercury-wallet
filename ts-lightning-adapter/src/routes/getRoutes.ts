import express from "express";
const router = express.Router();
import db from "../db/db.js";
import { closeConnections } from '../LDK/utils/ldk-utils.js';

router.get("/closeConnections", async function (req, res) {
  // Closing all connections
  closeConnections();
  res.status(200).json({ message: "Connections closed" });
});

// gives wallet id from wallet name
router.get("/getWalletId/:name", (req, res) => {
  const name = req.params.name;
  const selectData = "SELECT id FROM wallets WHERE name = ?";
  db.get(selectData, [name], (err: any, row: any) => {
    if (err) {
      console.log(err)
      res.status(500).json({ error: err.message });
      return;
    }
    if (row) {
      res.status(200).json({ wallet_id: row.id });
    } else {
      res.status(404).json({ error: "Wallet not found" });
    }
  });
});

export default router;
