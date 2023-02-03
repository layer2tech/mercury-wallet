import express from "express";
import db from "../../db/database.js";
import { getLDKClient } from "../init/importLDK.js";

import * as bitcoin from "bitcoinjs-lib";

const router = express.Router();

router.get("/LDKChannels", async function (req, res) {
  const channels = getLDKClient().getChannels();

  let activeChannels = getLDKClient().getActiveChannels();
  console.log("active channels:", activeChannels);

  console.log("channels: ", channels);

  if (channels[0]) {
    console.log("ChannelID:", channels[0].get_channel_id());

    console.log(
      "bitcoin.script",
      bitcoin.script.compile(Buffer.from(channels[0].get_channel_id()))
    );

    res.json({
      channelId: channels[0].get_channel_id().toString(),
      fundingTxo: channels[0].get_funding_txo().toString(),
      channelType: channels[0].get_channel_type().toString(),
    });
  }
});

/*
    get_channel_id(): Uint8Array;
    set_channel_id(val: Uint8Array): void;
    get_counterparty(): ChannelCounterparty;
    set_counterparty(val: ChannelCounterparty): void;
    get_funding_txo(): OutPoint;
    set_funding_txo(val: OutPoint | null): void;
    get_channel_type(): ChannelTypeFeatures;
    set_channel_type(val: ChannelTypeFeatures | null): void;
    get_short_channel_id(): Option_u64Z;
    set_short_channel_id(val: Option_u64Z): void;
    get_outbound_scid_alias(): Option_u64Z;
    set_outbound_scid_alias(val: Option_u64Z): void;
    get_inbound_scid_alias(): Option_u64Z;
    set_inbound_scid_alias(val: Option_u64Z): void;
    get_channel_value_satoshis(): bigint;
    set_channel_value_satoshis(val: bigint): void;
    get_unspendable_punishment_reserve(): Option_u64Z;
    set_unspendable_punishment_reserve(val: Option_u64Z): void;
    get_user_channel_id(): bigint;
    set_user_channel_id(val: bigint): void;
    get_balance_msat(): bigint;
    set_balance_msat(val: bigint): void;
    get_outbound_capacity_msat(): bigint;
    set_outbound_capacity_msat(val: bigint): void;
    get_next_outbound_htlc_limit_msat(): bigint;
    set_next_outbound_htlc_limit_msat(val: bigint): void;
    get_inbound_capacity_msat(): bigint;
    set_inbound_capacity_msat(val: bigint): void;
    get_confirmations_required(): Option_u32Z;
    set_confirmations_required(val: Option_u32Z): void;
    get_confirmations(): Option_u32Z;
    set_confirmations(val: Option_u32Z): void;
    get_force_close_spend_delay(): Option_u16Z;
    set_force_close_spend_delay(val: Option_u16Z): void;
    get_is_outbound(): boolean;
    set_is_outbound(val: boolean): void;
    get_is_channel_ready(): boolean;
    set_is_channel_ready(val: boolean): void;
    get_is_usable(): boolean;
    set_is_usable(val: boolean): void;
    get_is_public(): boolean;
    set_is_public(val: boolean): void;
    get_inbound_htlc_minimum_msat(): Option_u64Z;
    set_inbound_htlc_minimum_msat(val: Option_u64Z): void;
    get_inbound_htlc_maximum_msat(): Option_u64Z;
    set_inbound_htlc_maximum_msat(val: Option_u64Z): void;
    get_config(): ChannelConfig;
    set_config(val: ChannelConfig | null): void;
    static constructor_new(channel_id_arg: Uint8Array, counterparty_arg: ChannelCounterparty, funding_txo_arg: OutPoint, channel_type_arg: ChannelTypeFeatures, short_channel_id_arg: Option_u64Z, outbound_scid_alias_arg: Option_u64Z, inbound_scid_alias_arg: Option_u64Z, channel_value_satoshis_arg: bigint, unspendable_punishment_reserve_arg: Option_u64Z, user_channel_id_arg: bigint, balance_msat_arg: bigint, outbound_capacity_msat_arg: bigint, next_outbound_htlc_limit_msat_arg: bigint, inbound_capacity_msat_arg: bigint, confirmations_required_arg: Option_u32Z, confirmations_arg: Option_u32Z, force_close_spend_delay_arg: Option_u16Z, is_outbound_arg: boolean, is_channel_ready_arg: boolean, is_usable_arg: boolean, is_public_arg: boolean, inbound_htlc_minimum_msat_arg: Option_u64Z, inbound_htlc_maximum_msat_arg: Option_u64Z, config_arg: ChannelConfig): ChannelDetails;
    clone_ptr(): bigint;
    clone(): ChannelDetails;
    get_inbound_payment_scid(): Option_u64Z;
    get_outbound_payment_scid(): Option_u64Z;
    write(): Uint8Array;
    static constructor_read(ser: Uint8Array): Result_ChannelDetailsDecodeErrorZ;
*/

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
router.get("/loadChannels/:name", (req, res) => {
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

router.post("/createChannel", (req, res) => {
  // use LDK.createChannel and insert into db to persist it

  const pubkeyHex =
    "031b9eeb5f23939ed0565f49a1343b26a948a3486ae48e7db5c97ebb2b93fc8c1d";

  /*  
  const pubkey = new Uint8Array(
    pubkeyHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
  );*/

  /*
  const { name, amount, push_msat, user_id, config_id, wallet_id, peer_id } =
    req.body;
  const insertData = `INSERT INTO channels (name, amount, push_msat, user_id, config_id, wallet_id, peer_id) VALUES (?,?,?,?,?,?,?)`;
  let channelId;
  db.run(
    insertData,
    [name, amount, push_msat, user_id, config_id, wallet_id, peer_id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      channelId = this.lastID;
      getLDKClient().createChannel(pubkey, amount, push_msat, channelId);
      res.json({ message: "Channel saved successfully", id: channelId });
    }
  );*/
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

export default router;
