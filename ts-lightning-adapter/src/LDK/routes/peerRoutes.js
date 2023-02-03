// handle all peer logic on server
import express from "express";
const router = express.Router();
import db from "../../db/database.js";
import { getLDKClient } from "../../LDK/init/importLDK.ts";
import { createNewPeer } from "../../LDK/utils//ldk-utils.ts";

router.post("/connectToPeer", (req, res) => {
  const { amount, pubkey, host, port, channel_name, push_msat, wallet_name, config_id } = req.body;
  console.log(amount, pubkey, host, port, channel_name, push_msat, wallet_name, config_id);

  getLDKClient().createPeerAndChannel(amount, pubkey, host, port, channel_name, push_msat, wallet_name, config_id);
  //getLDKClient().connectToPeer(pubkey, host, port);

  res.send({ status: "success" });
});

router.post("/newPeer", async (req, res) => {
  const { host, port, pubkey } = req.body;
  try {
    const result = await createNewPeer(host, port, pubkey);
    res.status(result.status).json(result);
  } catch (error) {
    res.status(error.status).json(error);
  }
});

// gives you peer details with the peer_id
router.get("/getPeer/:peer_id", (req, res) => {
  const peer_id = req.params.peer_id;
  const selectData = "SELECT node, pubkey, host, port FROM peers WHERE id = ?";
  db.get(selectData, [peer_id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (row) {
      res.json(row);
    } else {
      res.status(404).json({ error: "Peer not found" });
    }
  });
});

// get the peerlist that's already stored in the database so client can quickly re pick them and so other routes can have access
router.get("/peerlist", async function (req, res) {
  // sample public list
  let data = [
    {
      id: 1,
      node: "WalletOfSatoshi.com",
      host: "170.75.163.209",
      port: "9735",
      pubkey:
        "035e4ff418fc8b5554c5d9eea66396c227bd429a3251c8cbc711002ba215bfc226",
    },
    {
      id: 2,
      node: "ACINQ",
      host: "3.33.236.230",
      port: "9735",
      pubkey:
        "03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f",
    },
    {
      id: 3,
      node: "CoinGate",
      host: "3.124.63.44",
      port: "9735",
      pubkey:
        "0242a4ae0c5bef18048fbecf995094b74bfb0f7391418d71ed394784373f41e4f3",
    },
  ];
  res.status(200).json(data);
});

router.get("/peers", async function (req, res) {
  db.all("SELECT * FROM peers", (err, rows) => {
    if (err) {
      throw err;
    }
    res.json(rows);
  });
});

export default router;
