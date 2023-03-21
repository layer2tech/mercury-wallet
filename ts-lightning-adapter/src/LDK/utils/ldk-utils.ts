import { getLDKClient } from "../init/getLDK.js";
import db from "../../db/db.js";
import { hexToUint8Array } from "./utils.js";

export const closeConnections = () => {
  console.log("Closing all the connections");

  let LDK = getLDKClient();
  const netSize = LDK.netHandler.length;
  for (var i = 0; i < netSize; i++) {
    LDK.netHandler[i]?.stop();
  }
};

// export const createInvoice = (amtInSats: number, invoiceExpirySecs: number, description: string) => {
//     let mSats = getLDKClient().LDK.Option_u64Z.constructor_some(BigInt(amtInSats * 1000));

//     let invoice = getLDKClient().channel_manager.create_inbound_payment(
//       mSats,
//       invoiceExpirysecs
//     );

//     let payment_hash = invoice.res.get_a();
//     let payment_secret = invoice.res.get_b();

//     let encodedInvoice = lightningPayReq.encode({
//       satoshis: amtInSats,
//       timestamp: Date.now(),
//       tags: [
//         {
//           tagName: "payment_hash",
//           data: payment_hash,
//         },
//         {
//           tagName: "payment_secret",
//           data: payment_secret,
//         },
//         {
//           tagName: "description",
//           data: description,
//         },
//       ],
//     });

//     // Hardcoded for now, needs to be changed
//     let privateKeyHex =
//       "e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734";
//     let signedInvoice = lightningPayReq.sign(encodedInvoice, privateKeyHex);
//     return signedInvoice;
// }

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

// TODO: BAD Practise, this function is doing too much, it must be broken down to do one thing. Here it inserts into a database and then calls to conenct to the channel.
export const createNewChannel = (
  pubkeyHex: string,
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
  return new Promise((resolve, reject) => {
    let channelId: number;

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
                let pubkey = hexToUint8Array(pubkeyHex);

                getLDKClient().connectToChannel(
                  pubkey,
                  amount,
                  push_msat,
                  channelId,
                  channelType
                );
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
  });
};

export const insertTxData = (
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
  return new Promise((resolve, reject) => {
    const updateData =
      "UPDATE channels SET amount=?, paid=?, txid=?, vout=? WHERE payment_address=?";
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
      } else {
        resolve({
          status: 201,
          message: "Channel saved and created successfully",
          channel_id: row.id,
          channel_type: row.public,
          push_msat: row.push_msat,
          priv_key: row.privkey,
        });
      }
    });
  });
};
