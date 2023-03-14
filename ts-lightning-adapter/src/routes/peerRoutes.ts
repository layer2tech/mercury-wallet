// handle all peer logic on server
import express from "express";
const router = express.Router();
import db from "../db/db.js";
import { getLDKClient } from "../LDK/init/importLDK.js";
import { createNewPeer } from "../LDK/utils/ldk-utils.js";

router.post("/connectToPeer", async (req, res) => {
  const { pubkey, host, port } = req.body;
  if (pubkey === undefined || host === undefined || port === undefined) {
    res.status(500).send("Missing required parameters");
  } else {
    // try and connect to a peer, return success if it can, fail if it can't
    try {
      const connection = await getLDKClient().connectToPeer(pubkey, host, port);
      if (connection) {
        res.status(200).send("Connected to peer");
      } else {
        res.status(500).send("Failed to connect to peer");
      }
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.includes("already tried to connect to this peer")
      ) {
        console.log(
          "HANDLE HERE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
        );
        // Handle the error
        res.status(500).send("You're already connected to this peer!");
      } else {
        console.log(
          "NOT HANDLE >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
        );
        res.status(500).send("Error connecting to peer");
      }
    }
  }
});

router.post("/create-channel", async (req, res) => {
  const {
    amount,
    pubkey,
    host,
    port,
    channel_name,
    wallet_name,
    channelType,
    privkey,
    paid,
    payment_address,
  } = req.body;

  channelType === "Public" ? true : false;

  console.log(
    amount,
    pubkey,
    host,
    port,
    channel_name,
    wallet_name,
    channelType,
    privkey,
    paid,
    payment_address
  );

  await getLDKClient().createPeerAndChannel(
    amount,
    pubkey,
    host,
    port,
    channel_name,
    wallet_name,
    channelType,
    privkey,
    paid,
    payment_address
  );
  res.status(200).json({ message: "Connected to peer, Channel created" });
});

router.post("/open-channel", async (req, res) => {
  const { amount, paid, txid, vout, addr, pubkey } = req.body;

  console.log(amount, paid, txid, vout, addr, pubkey);

  await getLDKClient().openChannel(amount, paid, txid, vout, addr, pubkey);
  res.status(200).json({ message: "Channel opened" });
});

router.post("/newPeer", async (req, res) => {
  const { host, port, pubkey } = req.body;
  try {
    const result = await createNewPeer(host, port, pubkey);
    res.status(result.status).json(result);
  } catch (error: any) {
    res.status(error.status).json(error);
  }
});

// gives you peer details with the peer_id
router.get("/getPeer/:peer_id", (req, res) => {
  const peer_id = req.params.peer_id;
  const selectData = "SELECT node, pubkey, host, port FROM peers WHERE id = ?";
  db.get(selectData, [peer_id], (err: any, row: any) => {
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

router.get("/default_peerlist", async function (req, res) {
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

// get the peerlist that's stored in the database
router.get("/peers", async function (req, res) {
  db.all("SELECT * FROM peers", (err: any, rows: any) => {
    if (err) {
      throw err;
    }
    res.json(rows);
  });
});

export default router;
