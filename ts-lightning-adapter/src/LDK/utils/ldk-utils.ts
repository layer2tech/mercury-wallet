import { getLDKClient } from "../init/importLDK.js";
import db from "../../db/database.js";
import { hexToUint8Array } from "./utils.js";

export const closeConnections = () => {
    console.log("Closing all the connections")
    getLDKClient().netHandler.stop();
}

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

export const createNewPeer = (host: string, port: number, pubkey: string): Promise<{ status: number, message?: string, error?: string, peer_id?: number }> => {
    return new Promise((resolve, reject) => {
      let peer_id: number;
      db.get(
        `SELECT id FROM peers WHERE host = ? AND port = ? AND pubkey = ?`,
        [host, port, pubkey],
        (err: any, row: any) => {
          if (err) {
            reject({ status: 500, error: "Failed to query database" });
          } else if (row) {
            resolve({ status: 409, message: "Peer already exists in the database", peer_id: row.id });
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
                  db.get(`SELECT last_insert_rowid() as peer_id`, (err: any, row: any) => {
                    if (err) {
                      reject({ status: 500, error: "Failed to get last inserted channel ID" });
                    } else {
                      peer_id = row.peer_id;
                      getLDKClient().connectToPeer(pubkey, host, port)
                      resolve({ status: 201, message: "Peer added to database", peer_id: peer_id });
                    }
                  });
                }
              }
            );
          }
        }
      );
    });
  }
  
  export const createNewChannel = (
    pubkeyHex: string,
    name: string,
    amount: number,
    push_msat: number,
    config_id: number,
    wallet_name: string,
    peer_id: number
  ): Promise<{ status: number, message?: string, error?: string, channel_id?: number }> => {
    return new Promise((resolve, reject) => {
      let channelId: number;
      let pubkey = hexToUint8Array(pubkeyHex);
  
      const selectData = "SELECT id FROM wallets WHERE name = ?";
      db.get(selectData, [wallet_name], (err: any, row: any) => {
        if (err) {
          reject({ status: 500, error: err.message });
        } else if (row) {
          let wallet_id = row.id;
          const insertData = `INSERT INTO channels (name, amount, push_msat, config_id, wallet_id, peer_id) VALUES (?,?,?,?,?,?)`;
          db.run(
            insertData,
            [name, amount, push_msat, config_id, wallet_id, peer_id],
            function (err: any, result: any) {
              if (err) {
                reject({ status: 500, error: "Failed to insert channel into database" });
              } else {
                db.get(`SELECT last_insert_rowid() as channel_id`, (err: any, row: any) => {
                  if (err) {
                    reject({ status: 500, error: "Failed to get last inserted channel ID" });
                  } else {
                    channelId = row.channel_id;
                    if (pubkey) {
                        getLDKClient().createChannel(pubkey, amount, push_msat, channelId);
                    }
                    resolve({ status: 201, message: "Channel saved and created successfully", channel_id: channelId });
                  }
                });
              }
            }
          );
        } else {
          resolve({ status: 404, error: "Wallet not found" });
        }
      });
    });
  }