// handle all peer logic on server
import express from "express";
import {
  ChainMonitor,
  PeerManager,
  TwoTuple_PublicKeyCOption_NetAddressZZ,
} from "lightningdevkit";
const router = express.Router();
import db from "../db/db.js";
import { getLDKClient } from "../LDK/init/getLDK.js";
import { hexToUint8Array, uint8ArrayToHexString } from "../LDK/utils/utils.js";

router.get("/liveChainMonitors", async (req, res) => {
  let chainMonitor: ChainMonitor = await getLDKClient().getChainMonitor();
  if (chainMonitor) {
    res.status(200).json({ chainMonitors: chainMonitor.list_monitors() });
  } else {
    res.status(500).json("Failed to get chain monitor");
  }
});

router.get("/livePeers", async (req, res) => {
  let peerManager: PeerManager = await getLDKClient().getPeerManager();
  if (peerManager) {
    console.log("************************************");
    console.log("************************************");
    console.log("************************************");
    let peer_node_ids: TwoTuple_PublicKeyCOption_NetAddressZZ[] =
      peerManager.get_peer_node_ids();

    let peer_ids = [];

    console.log(peer_node_ids.length);

    for (var i = 0; i < peer_node_ids.length; i++) {
      console.log("get a ->", uint8ArrayToHexString(peer_node_ids[i]?.get_a()));
      peer_ids.push({
        id: i + 1,
        pubkey: uint8ArrayToHexString(peer_node_ids[i]?.get_a()),
      });
    }
    console.log("************************************");
    console.log("************************************");
    console.log("************************************");

    res.status(200).json(peer_ids);
  } else {
    res.status(500).json("Failed to get peermanager");
  }
});

let count = 1;
router.post("/connectToPeer", async (req, res) => {
  const { pubkey, host, port } = req.body;

  console.log("//////////////////////////////////////////////////////");
  console.log("//////////////////////////////////////////////////////");
  console.log("//////////////////////////////////////////////////////");
  console.log("an attempt to connect to peer has been made", count);
  count++;
  console.log("values found:", pubkey);
  console.log("//////////////////////////////////////////////////////");
  console.log("//////////////////////////////////////////////////////");
  console.log("//////////////////////////////////////////////////////");

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
        res.status(500).send("You're already connected to this peer!");
      } else {
        res.status(500).send("Error connecting to peer");
      }
    }
  }
});

// Saves the channel to the database.
router.post("/savePeerAndChannelToDb", async (req, res) => {
  console.log("[peerRoutes.ts]->router.post/savePeerAndChannelToDb");

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

  console.log(
    "[peerRoutes.ts]->router.post/savePeerAndChannelToDb->values" + amount,
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

  console.log(
    "[peerRoutes.ts]->router.post/savePeerAndChannelToDb-> Set channelType"
  );
  channelType === "Public" ? true : false;

  try {
    let channel_id = await getLDKClient().savePeerAndChannelToDatabase(
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

    if (channel_id) {
      res.status(200).json({
        status: 200,
        message: "Saved peer and channel to database.",
        channel_id: channel_id,
      });
    } else {
      res.status(500).json({
        status: 500,
        message: "Error: Failed to save peer and channel to database.",
      });
    }
  } catch (e: any) {
    res
      .status(500)
      .json({ status: 500, message: "Couldn't insert into DB: " + e?.message });
  }
});

router.post("/saveChannelPaymentInfoToDb", async (req, res) => {
  const { amount, paid, txid, vout, address } = req.body;

  console.log(
    "[peerRoutes.ts]->saveChannelPaymentInfoToDb " + amount,
    paid,
    txid,
    vout,
    address
  );

  if (address === undefined) {
    console.log(
      "[peerRoutes.ts]->saveChannelPaymentInfoToDb-> No address specified"
    );
    res.status(500).json({
      status: 500,
      message: "No address was posted to peer/saveChannelPaymentInfoToDb",
    });
  } else {
    try {
      await getLDKClient().saveChannelFundingToDatabase(
        amount,
        paid,
        txid,
        vout,
        address
      );
      res
        .status(200)
        .json({ status: 200, message: "Channel funding saved to DB" });
    } catch (e: any) {
      res.status(500).json({
        status: 500,
        message: "Couldn't save channel payment info" + e?.message,
      });
    }
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
