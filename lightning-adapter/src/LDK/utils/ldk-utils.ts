import LDKClientFactory from "../init/LDKClientFactory";
import { getDatabase } from "../../db/db";
import fs from "fs";
import { uint8ArrayToHexString, stringifyEvent } from "./utils";
import { ChannelDetails, Option_u64Z_Some } from "lightningdevkit";

export const closeConnections = () => {
  console.log("[ldk-utils.ts]: Closing all the connections");
  try {
    let LDK = LDKClientFactory.getLDKClient();
    LDK.netHandler?.stop();
  } catch (e) {
    console.error("Trying to get reference to undefined LDKClientFactory");
  }
};

export const validateInvoiceBody = (
  amount_in_sats: any,
  invoice_expiry_secs: any,
  description: any
) => {
  if (amount_in_sats === undefined) {
    throw new Error("Undefined amount_in_sats given.");
  } else if (typeof amount_in_sats !== "number" || isNaN(amount_in_sats)) {
    throw new Error(
      "Invalid amount_in_sats given. Must be a number that can be converted to a BigInt."
    );
  }

  if (invoice_expiry_secs === undefined) {
    throw new Error("Undefined invoice_expiry_secs given.");
  } else if (
    typeof invoice_expiry_secs !== "number" ||
    isNaN(invoice_expiry_secs)
  ) {
    throw new Error("Invalid invoice_expiry_secs given. Must be a number.");
  }

  if (description === undefined) {
    throw new Error("Undefined description given.");
  } else if (typeof description !== "string") {
    throw new Error("Invalid description given. Must be a string.");
  }
};

// This function is called from peerRoutes.ts /create-channel request
export const savePeerAndChannelToDatabase = async (
  amount: number,
  pubkey: string,
  host: string,
  port: number,
  channel_name: string,
  wallet_name: string,
  channelType: boolean,
  privkey: string, // Private key from txid address
  paid: boolean,
  payment_address: string // index of input
) => {
  console.log("[ldk-utils.ts] - savePeerAndChannelToDatabase");
  console.log(
    `[ldk-utils.ts] - values: amount:${amount}, 
    pubkey:${pubkey}, host:${host}, port:${port}, channel_name:${channel_name}, 
    wallet_name:${wallet_name}, channelType:${channelType}, 
    privkey:${privkey}, paid:${paid}, payment_address:${payment_address}`
  );

  // Save the peer
  try {
    const result = await saveNewPeerToDB(host, port, pubkey);
    console.log(`[ldk-utils.ts] - result: ${JSON.stringify(result)}`);
    var peer_id = result.peer_id;
    if (!peer_id) throw "[ldk-utils.ts] Error: PEER_ID undefined";
  } catch (err) {
    console.log(err);
    throw err;
  }
  console.log("[ldk-utils.ts]: Peer created, saveds its id: ", peer_id);

  let channel_id = null;
  let result;
  // Save the channel
  try {
    result = await saveNewChannelToDB(
      channel_name,
      amount,
      0,
      channelType,
      wallet_name,
      peer_id,
      privkey,
      paid,
      payment_address
    );
    console.log("[ldk-utils.ts]:" + result);
    if (result && result.channel_id) {
      console.log(result);
      channel_id = result.channel_id;
      console.log("Channel Created, saved its id: ", channel_id);
    }
  } catch (err) {
    console.log("[ldk-utils.ts]:" + err);
    throw err;
  }
  console.log("[ldk-utils.ts]: Channel Created, saved its id: ", channel_id);

  return result;
};

export const saveChannelFundingToDatabase = async (
  amount: number,
  paid: boolean,
  txid: string,
  vout: number,
  addr: string
) => {
  console.log("[ldk-utils.ts]: saveChannelFundingToDatabase");
  try {
    const result = await saveTxDataToDB(amount, paid, txid, vout, addr);
    return result;
  } catch (err) {
    console.log("[ldk-utils.ts]: " + err);
    throw err;
  }
};

export const saveNewPeerToDB = (
  host: string,
  port: number,
  pubkey: string
): Promise<{
  channel_id?: {
    status: number;
    message?: string;
    error?: string;
    peer_id?: number;
  };
  status?: number;
  message?: string;
  error?: string;
  peer_id?: number;
}> => {
  console.log("[ldk-utils.ts] - saveNewPeerToDB");
  return new Promise(async (resolve, reject) => {
    const db = await getDatabase();
    db.get(
      `SELECT id FROM peers WHERE host = ? AND port = ? AND pubkey = ?`,
      [host, port, pubkey],
      (err: any, row: any) => {
        if (err) {
          console.log(
            `[ldk-utils.ts->saveNewPeerToDB] - Error occurred during select: ${err}`
          );
          reject({ status: 500, error: "Failed to query database" });
        } else if (row) {
          console.log(
            `[ldk-utils.ts->saveNewPeerToDB] - Error occurred peer exists in database: ${row}`
          );
          resolve({
            status: 409,
            message: "Peer already exists in the database",
            peer_id: row.id,
          });
        } else {
          db.run(
            `INSERT INTO peers (host, port, pubkey) VALUES (?,?,?)`,
            [host, port, pubkey],
            function (this: any, err: any, row: any) {
              console.log(
                `[ldk-utils.ts->saveNewPeerToDB] - inserting into peers: host:${host}, port:${port}, pubkey:${pubkey}`
              );
              if (err) {
                console.log(
                  `[ldk-utils.ts] - Error occurred during insert: ${err}`
                );
                reject({
                  status: 500,
                  error: "Failed to insert peers into database",
                });
              } else {
                console.log(
                  `[ldk-utils.ts->saveNewPeerToDB] - Successful insert`
                );
                const lastID = this.lastID;
                console.log(
                  `[ldk-utils.ts->saveNewPeerToDB] - result:${lastID}`
                );
                if (lastID !== undefined) {
                  resolve({
                    status: 201,
                    message: "Peer added to database",
                    peer_id: lastID,
                  });
                } else {
                  reject({
                    status: 500,
                    error: "Failed to retrieve peer ID",
                  });
                }
              }
            }
          );
        }
      }
    );
  });
};

export const saveNewChannelToDB = (
  name: string,
  amount: number,
  push_msat: number,
  channelType: boolean,
  wallet_name: string,
  peer_id: number,
  privkey: string, // Private key from txid address
  paid: boolean,
  payment_address: string
): Promise<{
  status: number;
  message?: string;
  error?: string;
  channel_id?: number;
}> => {
  console.log("[ldk-utils.ts] - saveNewChannelToDB");
  return new Promise(async (resolve, reject) => {
    let channelId: number;
    const db = await getDatabase();
    db.get(
      `SELECT id FROM channels WHERE peer_id = ?`,
      [peer_id],
      (err: any, row: any) => {
        if (err) {
          reject({
            status: 500,
            error: "Failed to query database" + err,
          });
        } else if (row) {
          resolve({
            status: 409,
            message: "Channel already exists with this peer",
          });
        } else {
          const insertData = `INSERT INTO channels (name, amount, push_msat, public, wallet_name, peer_id, privkey, paid, payment_address) VALUES (?,?,?,?,?,?,?,?,?)`;
          db.run(
            insertData,
            [
              name,
              amount,
              push_msat,
              channelType,
              wallet_name,
              peer_id,
              privkey,
              paid,
              payment_address,
            ],
            function (err: any, result: any) {
              if (err) {
                reject({
                  status: 500,
                  error: "Failed to insert channel into database" + err,
                });
              } else {
                db.get(
                  `SELECT last_insert_rowid() as channel_id`,
                  (err: any, row: any) => {
                    if (err) {
                      reject({
                        status: 500,
                        error: "Failed to get last inserted channel ID",
                      });
                    } else {
                      channelId = row.channel_id;
                      resolve({
                        status: 201,
                        message: "Channel saved successfully",
                        channel_id: channelId,
                      });
                    }
                  }
                );
              }
            }
          );
        }
      }
    );
  });
};

export const saveTxDataToDB = (
  amount: number,
  paid: boolean,
  txid: string,
  vout: number,
  addr: string
): Promise<{
  status: number;
  message?: string;
  error?: string;
  channel_id: number;
  channel_type: boolean;
  push_msat: number;
  priv_key: string;
}> => {
  console.log("[ldk-utils.ts] - insertTxDataToDB");
  console.log(
    `[ldk-utils.ts] - values: amount:${amount}, paid:${paid}, txid:${txid}, vout:${vout}, addr:${addr}`
  );
  return new Promise(async (resolve, reject) => {
    const updateData =
      "UPDATE channels SET amount=?, paid=?, txid=?, vout=? WHERE payment_address=?";
    const db = await getDatabase();
    db.run(
      updateData,
      [amount, paid, txid, vout, addr],
      function (err: any, result: any) {
        if (err) {
          reject({
            status: 500,
            error: "Failed to insert tx data into database " + err,
          });
        }
      }
    );

    console.log("Tx data inserted");
    const getData = `SELECT id, public, push_msat, privkey FROM channels WHERE payment_address=?`;
    db.get(getData, [addr], (err: any, row: any) => {
      if (err) {
        reject({
          status: 500,
          error: "Failed to get channel data " + err,
        });
      } else if (!row) {
        reject({
          status: 404,
          error: "No channel found for payment address " + addr,
        });
      } else {
        resolve({
          status: 201,
          message: "Channel saved and updated successfully",
          channel_id: row.id,
          channel_type: row.public,
          push_msat: row.push_msat,
          priv_key: row.privkey,
        });
      }
    });
  });
};

export const saveChannelIdToDb = async (channelId: string, pubkey: string) => {
  console.log("[ldk-utils.ts] - saveChannelIdToDB");
  console.log(
    `[ldk-utils.ts] - values: channelId:${channelId}, pubkey:${pubkey}`
  );
  const updateData =
    "UPDATE channels SET channel_id = ? WHERE peer_id = ( SELECT id FROM peers WHERE pubkey = ?)";
  const db = await getDatabase();
  db.run(updateData, [channelId, pubkey], function (err: any, result: any) {
    if (err) {
      console.log("Error in saving channelId to db: " + err);
    }
  });
};

export const saveEventDataToDb = async (event: any) => {
  console.log("[ldk-utils.ts] - saveEventDataToDB");
  const event_type = Object.getPrototypeOf(event).constructor.name;
  const event_data = stringifyEvent(event);
  let channel_id_hex;
  if (
    event &&
    (event.channel_id || event.temporary_channel_id || event.via_channel_id)
  ) {
    const channel_id =
      event.channel_id || event.temporary_channel_id || event.via_channel_id;
    channel_id_hex = uint8ArrayToHexString(channel_id);
  } else {
    if (event.path) {
      const hops = event.path.get_hops();
      const short_channel_id = hops[0].get_short_channel_id();
      if (short_channel_id) {
        const channels: ChannelDetails[] =
          LDKClientFactory.getLDKClient().getChannels();
        console.log("SHORT CHANNEL ID", short_channel_id);
        channels.forEach((channel) => {
          if (
            (channel.get_outbound_payment_scid() as Option_u64Z_Some).some ===
            short_channel_id
          ) {
            channel_id_hex = uint8ArrayToHexString(channel.get_channel_id());
          }
        });
      }
    }
  }

  console.log("CHANNEL_ID_HEX", channel_id_hex);
  if (channel_id_hex) {
    const insertEventData = `INSERT INTO events (event_type, event_data, channel_id_hex) VALUES (?, ?, ?)`;
    const db = await getDatabase();
    db.run(
      insertEventData,
      [event_type, event_data, channel_id_hex],
      function (err: any) {
        if (err) {
          console.log("Error in saving event to db: " + err);
        }
        console.log("Data inserted successfully.");
      }
    );
  }
};

export const replaceTempChannelIdInDb = async (
  channel_id: string,
  temp_channel_id: string
) => {
  console.log("[ldk-utils.ts] - replaceTempChannelIdInDb");
  const updateData =
    "UPDATE events SET channel_id_hex = ? WHERE channel_id_hex = ?";
  const db = await getDatabase();
  db.run(
    updateData,
    [channel_id, temp_channel_id],
    function (err: any, result: any) {
      if (err) {
        console.log("Error in replacing channelId to db: " + err);
      }
    }
  );
};

export const checkIfChannelExists = (pubkey: string): Promise<boolean> => {
  return new Promise(async (resolve, reject) => {
    const db = await getDatabase();
    db.get(
      `SELECT channel_id FROM channels WHERE peer_id = (SELECT id FROM peers WHERE pubkey = ?)`,
      [pubkey],
      (err: any, row: any) => {
        if (err) {
          reject(err);
        } else {
          if (row && row.channel_id) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      }
    );
  });
};

export const deleteChannelById = (
  channelId: number
): Promise<{
  status: number;
  message?: string;
  error?: string;
}> => {
  return new Promise(async (resolve, reject) => {
    const db = await getDatabase();
    db.run(
      `DELETE FROM channels WHERE id = ?`,
      [channelId],
      function (err: any) {
        if (err) {
          reject({
            status: 500,
            error: "Failed to delete channel from database",
          });
        } else {
          resolve({
            status: 200,
            message: "Channel deleted successfully",
          });
        }
      }
    );
  });
};

export const deleteChannelByPaymentAddr = (
  addr: string
): Promise<{
  status: number;
  message?: string;
  error?: string;
}> => {
  return new Promise(async (resolve, reject) => {
    const db = await getDatabase();
    db.run(
      `DELETE FROM channels WHERE payment_address = ?`,
      [addr],
      function (err: any) {
        if (err) {
          reject({
            status: 500,
            error: "Failed to delete channel from database",
          });
        } else {
          resolve({
            status: 200,
            message: "Channel deleted successfully",
          });
        }
      }
    );
  });
};

export class ChannelMonitorRead {
  outpoint: Uint8Array;
  bytes: Uint8Array;

  constructor(outpoint: Uint8Array, bytes: Uint8Array) {
    this.outpoint = outpoint;
    this.bytes = bytes;
  }
}
export function readChannelsFromDictionary(file: string): ChannelMonitorRead[] {
  let channels: ChannelMonitorRead[] = [];
  try {
    if (!fs.existsSync(file)) {
      throw Error("File not found");
    }
    const dict = JSON.parse(fs.readFileSync(file, "utf-8"));

    if (!Array.isArray(dict)) {
      throw Error("Invalid dictionary format");
    }

    for (const obj of dict) {
      if (!obj.monitor_file_name || !obj.id_file_name) {
        throw Error("Invalid object in dictionary");
      }

      if (!fs.existsSync(obj.monitor_file_name)) {
        throw Error("File not found: " + obj.monitor_file_name);
      }

      if (!fs.existsSync(obj.id_file_name)) {
        throw Error("File not found: " + obj.id_file_name);
      }

      const channelmonitorbytes_read = fs.readFileSync(obj.monitor_file_name);
      const outpointbytes_read = fs.readFileSync(obj.id_file_name);

      const channelmonitor_object: ChannelMonitorRead = new ChannelMonitorRead(
        outpointbytes_read,
        channelmonitorbytes_read
      );
      channels.push(channelmonitor_object);
    }
  } catch (e) {
    throw e;
  }
  return channels;
}
