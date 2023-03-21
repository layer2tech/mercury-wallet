import express from "express";
import db from "../db/db.js";

import * as bitcoin from "bitcoinjs-lib";

import { getLDKClient } from "../LDK/init/getLDK.js";
import { createNewChannel } from "../LDK/utils/ldk-utils.js";
import { uint8ArrayToHexString } from "../LDK/utils/utils.js";
import { ChannelDetails } from "lightningdevkit";

const router = express.Router();

interface Channel {
  id: number;
  name: string;
  amount: number;
  push_msat: number;
  wallet_name: string;
  peer_id: string;
  privkey: string;
  txid: string;
  vout: number;
  paid: boolean;
  payment_address: string;
}

interface DuplicateChannel extends Channel {
  count: number;
}

// Get the Node ID of our wallet
router.get("/nodeID", async function (req, res) {
  const nodeId = getLDKClient().channelManager.get_our_node_id();
  const hexNodeId = uint8ArrayToHexString(nodeId);
  res.json({ nodeID: hexNodeId });
});

// This is live channels that the LDK adapter has open - different to channels persisted in database.
router.get("/liveChannels", async function (req, res) {
  const channels: ChannelDetails[] = getLDKClient().getChannels();
  let activeChannels = getLDKClient().getActiveChannels();
  console.log("active channels:", activeChannels);
  console.log("channels: ", channels);

  let jsonChannels = [];
  if (channels && channels.length > 0) {
    for (const channel of channels) {
      jsonChannels.push({
        channelId: channel.get_channel_id().toString(),
        fundingTXO: channel.get_funding_txo().get_index().toString(),
        channelAmount: channel.get_channel_value_satoshis().toString(),
        channelType: channel.get_is_public(),
      });
    }
    res.json(jsonChannels);
  } else {
    res.json([]);
  }
});

// This gets all the channels from the database of all wallets
router.get("/allChannels", async function (req, res) {
  db.all("SELECT * FROM channels", (err: any, rows: any) => {
    if (err) {
      throw err;
    }
    res.json(rows);
  });
});

// load channels by wallet name e.g. -> localhost:3003/channel/loadChannels/vLDK
router.get("/loadChannels/:wallet_name", (req, res) => {
  const wallet_id = req.params.wallet_name;
  const selectData = `
    SELECT channels.*, peers.node, peers.pubkey, peers.host, peers.port
    FROM channels
    INNER JOIN peers ON channels.peer_id = peers.id
    WHERE channels.wallet_name = ?
  `;
  db.all(selectData, [wallet_id], (err: any, rows: any) => {
    if (err) {
      console.log(err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    if (rows && rows.length > 0) {
      res.status(200).json(rows);
    } else {
      res.json([]); // empty channels
    }
  });
});

// This updates the name of a channel by id
router.put("/updateChannelName/:id", (req, res) => {
  // update the name of a channel by id
  const { name } = req.body;

  if (!Number.isInteger(parseInt(req.params.id))) {
    res.status(400).json({ error: "Invalid channel ID" });
    return;
  }

  const updateData = `UPDATE channels SET name=? WHERE id=?`;
  db.run(updateData, [name, req.params.id], function (err: any) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: "Channel name updated successfully" });
  });
});

// This updates the paid value of a channel by id
router.put("/updateChannelPaid/:id", (req, res) => {
  // update the paid value of a channel by id
  const { paid } = req.body;

  if (!Number.isInteger(parseInt(req.params.id))) {
    res.status(400).json({ error: "Invalid channel ID" });
    return;
  }

  const updateData = `UPDATE channels SET paid=? WHERE id=?`;
  db.run(updateData, [paid, req.params.id], function (err: any) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: "Channel paid value updated successfully" });
  });
});

// This updates an entire channel by id
router.put("/updateChannel/:id", (req, res) => {
  // update a channel by id
  const {
    name,
    amount,
    push_msat = 0,
    wallet_name,
    peer_id,
    privkey,
    txid,
    vout,
    paid = false,
    payment_address,
  } = req.body;

  if (!Number.isInteger(parseInt(req.params.id))) {
    res.status(400).json({ error: "Invalid channel ID" });
    return;
  }

  const updateData = `UPDATE channels SET name=?, amount=?, push_msat=?, wallet_name=?, peer_id=?, privkey=?, txid=?, vout=?, paid=?, payment_address=?  WHERE id=?`;
  db.run(
    updateData,
    [
      name,
      amount,
      push_msat,
      wallet_name,
      peer_id,
      privkey,
      txid,
      vout,
      paid,
      payment_address,
      req.params.id,
    ],
    function (err: any) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: "Channel updated successfully" });
    }
  );
});

// This removes duplicate channels from the database
router.get("/removeDuplicateChannels", (req, res) => {
  const query = `
    DELETE FROM channels
    WHERE id NOT IN (
      SELECT MIN(id) 
      FROM channels 
      GROUP BY name, amount, push_msat, wallet_name, peer_id, privkey, txid, vout, paid, payment_address 
      HAVING COUNT(*) > 1
    )
    AND id NOT NULL
  `;

  db.run(query, [], function (err: any) {
    if (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
      return;
    }

    res.json({ message: "Duplicate channels removed successfully" });
  });
});

router.delete("/deleteChannel/:id", (req, res) => {
  // delete channel by id
  const deleteData = `DELETE FROM channels WHERE id=?`;
  db.run(deleteData, [req.params.id], function (err: any) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: "Data deleted successfully" });
  });
});

router.delete("/deleteChannelByAddr/:addr", (req, res) => {
  // delete channel by id
  const deleteData = `DELETE FROM channels WHERE payment_address=?`;
  db.run(deleteData, [req.params.addr], function (err: any) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: "Data deleted successfully" });
  });
});

export default router;
