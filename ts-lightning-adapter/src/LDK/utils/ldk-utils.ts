import { getLDKClient } from "../init/importLDK.js";
import db from "../../db/db.js";
import { hexToUint8Array } from "./utils.js";
import * as lightningPayReq from "bolt11";
import * as ldk from "lightningdevkit";

export const closeConnections = () => {
  console.log("Closing all the connections");
  getLDKClient().netHandler.stop();
};

export const createInvoice = (amtInSats: number, invoiceExpirySecs: number, description: string) => {
    let mSats = ldk.Option_u64Z.constructor_some(BigInt(amtInSats * 1000));

    let invoice = getLDKClient().channelManager.create_inbound_payment(
      mSats,
      invoiceExpirySecs
    );

    let payment_hash = invoice.res.get_a();
    let payment_secret = invoice.res.get_b();

    let encodedInvoice = lightningPayReq.encode({
      satoshis: amtInSats,
      timestamp: Date.now(),
      tags: [
        {
          tagName: "payment_hash",
          data: payment_hash,
        },
        {
          tagName: "payment_secret",
          data: payment_secret,
        },
        {
          tagName: "description",
          data: description,
        },
      ],
    });

    // Hardcoded for now, needs to be changed
    let privateKeyHex =
      "e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734";
    let signedInvoice = lightningPayReq.sign(encodedInvoice, privateKeyHex);
    return signedInvoice;
}

export const createNewPeer = (
  host: string,
  port: number,
  pubkey: string
): Promise<{
  status: number;
  message?: string;
  error?: string;
  peer_id?: number;
}> => {
  return new Promise((resolve, reject) => {
    let peer_id: number;
    db.get(
      `SELECT id FROM peers WHERE host = ? AND port = ? AND pubkey = ?`,
      [host, port, pubkey],
      (err: any, row: any) => {
        if (err) {
          reject({ status: 500, error: "Failed to query database" });
        } else if (row) {
          resolve({
            status: 409,
            message: "Peer already exists in the database",
            peer_id: row.id,
          });
        } else {
          db.run(
            `INSERT INTO peers (host, port, pubkey) VALUES (?,?,?)`,
            [host, port, pubkey],
            (err: any, result: any) => {
              if (err) {
                reject({
                  status: 500,
                  error: "Failed to insert peers into database",
                });
              } else {
                db.get(
                  `SELECT last_insert_rowid() as peer_id`,
                  (err: any, row: any) => {
                    if (err) {
                      reject({
                        status: 500,
                        error: "Failed to get last inserted channel ID",
                      });
                    } else {
                      peer_id = row.peer_id;
                      getLDKClient().connectToPeer(pubkey, host, port);
                      resolve({
                        status: 201,
                        message: "Peer added to database",
                        peer_id: peer_id,
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

export const createNewChannel = (
  pubkeyHex: string,
  name: string,
  amount: number,
  push_msat: number,
  channelType: boolean,
  wallet_name: string,
  peer_id: number,
  privkey: string, // Private key from txid address
  txid: string, // txid of input for channel
  vout: number // index of input
): Promise<{
  status: number;
  message?: string;
  error?: string;
  channel_id?: number;
}> => {
  return new Promise((resolve, reject) => {
    let channelId: number;
    let pubkey = hexToUint8Array(pubkeyHex);

    const insertData = `INSERT INTO channels (name, amount, push_msat, public, wallet_name, peer_id, privkey, txid, vout) VALUES (?,?,?,?,?,?,?,?,?)`;
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
        txid,
        vout,
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
                if (pubkey) {
                  getLDKClient().connectToChannel(
                    pubkey,
                    amount,
                    push_msat,
                    channelId,
                    channelType
                  );
                }
                resolve({
                  status: 201,
                  message: "Channel saved and created successfully",
                  channel_id: channelId,
                });
              }
            }
          );
        }
      }
    );
  });
};
