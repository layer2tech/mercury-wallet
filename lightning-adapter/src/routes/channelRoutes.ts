import express from "express";
import db from "../db/db.js";

import LDKClientFactory from "../LDK/init/LDKClientFactory.js";
import { hexToUint8Array, uint8ArrayToHexString } from "../LDK/utils/utils.js";
import {
  ChannelDetails,
  Option_u32Z,
  Option_u32Z_None,
  Option_u32Z_Some,
  Option_u64Z_Some,
} from "lightningdevkit";

const router = express.Router();

interface Channel {
  id: number;
  hexId: string;
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

// Get the Node ID of our wallet
router.get("/nodeID", async function (req, res) {
  const nodeId = LDKClientFactory.getLDKClient().getOurNodeId();
  const hexNodeId = uint8ArrayToHexString(nodeId);
  res.json({ nodeID: hexNodeId });
});

router.get("/balance", async function (req, res) {
  // for all usable channels, add up the balance and return it
  let activeChannels = LDKClientFactory.getLDKClient().getUsableChannels();
  let total_balance: any = 0;
  activeChannels.forEach((chn: ChannelDetails) => {
    total_balance += chn.get_balance_msat();
  });
  res.json({ balance: total_balance });
});

// This is live channels that the LDK adapter has open - different to channels persisted in database.
router.get("/liveChannels", async function (req, res) {
  const channels: ChannelDetails[] =
    LDKClientFactory.getLDKClient().getChannels();
  let activeChannels = LDKClientFactory.getLDKClient().getUsableChannels();
  console.log("active channels:", activeChannels);
  console.log("channels: ", channels);

  let jsonChannels = [];
  if (channels && channels.length > 0) {
    for (const channel of channels) {
      jsonChannels.push({
        //id: channel.get_channel_id().toString(),
        channel_hexId: uint8ArrayToHexString(channel.get_channel_id()),
        usable: channel.get_is_usable(),
        ready: channel.get_is_channel_ready(),
        counterparty_hexId: uint8ArrayToHexString(
          channel.get_counterparty().get_node_id()
        ),
        funding_txo: uint8ArrayToHexString(
          channel.get_funding_txo().get_txid()
        ),
        balance_msat: channel.get_balance_msat().toString(),
        amount_in_satoshis: channel.get_channel_value_satoshis().toString(),
        public: channel.get_is_public(),
        confirmations: (channel.get_confirmations() as Option_u32Z_Some).some,
        confirmations_required: (
          channel.get_confirmations_required() as Option_u32Z_Some
        ).some,
      });
      console.log(channel.get_short_channel_id());
    }
    res.json(jsonChannels);
  } else {
    res.json([]);
  }
});

router.post("/createChannel", async (req, res) => {
  const {
    pubkey,
    amount,
    push_msat,
    channelType,
    host,
    port,
    channel_name,
    wallet_name,
    privkey,
    paid,
    payment_address,
    funding_txid,
  } = req.body;
  if (
    pubkey === undefined ||
    amount === undefined ||
    push_msat === undefined ||
    channelType === undefined ||
    host === undefined ||
    port === undefined ||
    channel_name === undefined ||
    wallet_name === undefined ||
    privkey === undefined ||
    paid === undefined ||
    payment_address === undefined ||
    funding_txid === undefined
  ) {
    res.status(500).send("Missing required parameters");
  } else {
    channelType === "Public" ? true : false;
    try {
      if (pubkey.length !== 33) {
        const connection = await LDKClientFactory.getLDKClient().createChannel(
          hexToUint8Array(pubkey),
          amount,
          push_msat,
          channelType,
          funding_txid,
          payment_address,
          {
            host,
            port,
            channel_name,
            wallet_name,
            privkey,
          }
        );
        if (connection) {
          res.status(200).send("Created Channel on LDK");
        } else {
          res.status(500).send("Failed to create Channel");
        }
      }
    } catch (e) {
      res.status(500).send("Error creating channel on LDK");
    }
  }
});

router.get("/usableChannels", async function (req, res) {
  const activeChannels: ChannelDetails[] =
    LDKClientFactory.getLDKClient().getUsableChannels();

  let jsonChannels: any = [];
  activeChannels.forEach((channel: ChannelDetails) => {
    let confirmations: Option_u32Z | Option_u32Z_Some | Option_u32Z_None | any;
    jsonChannels.push({
      channel_hexId: uint8ArrayToHexString(channel.get_channel_id()),
      balance_msat: channel.get_balance_msat(),
      counterparty_hexId: uint8ArrayToHexString(
        channel.get_counterparty().get_node_id()
      ),
      funding_txo: uint8ArrayToHexString(channel.get_funding_txo().get_txid()),
      amount_in_satoshis: channel.get_channel_value_satoshis().toString(),
      public: channel.get_is_public(),
      confirmations: confirmations?.some,
    });
  });
  res.json(jsonChannels);
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

router.get("/allEvents", async function (req, res) {
  db.all("SELECT * FROM events", (err: any, rows: any) => {
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

// takes hexadecimal format of channelId
router.delete("/forceCloseChannel/:id", async (req, res) => {
  try {
    const channel_id = req.params.id;
    const closeChannelReq =
      LDKClientFactory.getLDKClient().forceCloseChannel(channel_id);
    if (closeChannelReq) {
      res.status(200).json({ status: 200, message: "Success" });
    } else {
      res.status(500).json({ error: "Failed to force close channel" });
    }
  } catch (e) {
    console.log("Error ", e);
    res.status(500).json({ error: e });
  }
});

// takes hexadecimal format of channelId
router.delete("/mutualCloseChannel/:id", async (req, res) => {
  try {
    const channel_id = req.params.id;
    const closeChannelReq =
      LDKClientFactory.getLDKClient().mutualCloseChannel(channel_id);
    if (closeChannelReq) {
      res.status(200).json({ status: 200, message: "Success" });
    } else {
      res.status(500).json({ error: "Failed to mutual close channel" });
    }
  } catch (e) {
    console.log("Error ", e);
    res.status(500).json({ error: e });
  }
});

router.delete("/deleteChannelByPaymentAddr/:addr", (req, res) => {
  // delete channel by payment address
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
