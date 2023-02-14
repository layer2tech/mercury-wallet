// handle all peer logic on server
import db from "../db/database.js";
import express from "express";
import { getLDKClient } from "../LDK/init/importLDK.js";
import { hexToUint8Array } from "../LDK/utils/utils.js";
const router = express.Router();

router.post("/open-channel", async (req, res) => {
  // Connects to peer and opens channel
  console.log('Req Body: ', req.body)
  const { amount, 
    channelType, 
    pubkey, 
    host, port, 
    privkey, 
    txid, 
    vout } = req.body;
  console.log("****====== RECEIVED DATA ======***")
  console.log("amount: ", amount,
  "\n ChannelType: ", channelType,
  "\nPubKey: ", pubkey,
  "\n Host: ", host, 
  "\n Port:  ", port,
  "\n PrivKey: ", privkey,
  "\n TxID: ", txid,
  "\n Vout: ", vout);

  console.log("****====== RECEIVED DATA END ======***")

  // OPEN CHANNEL FROM BELOW
  const LightningClient = getLDKClient();
  console.log('Input Tx .');
  LightningClient.setInputTx(privkey, txid, vout);
  console.log('Input Tx √');

  //pubkey must be hex string
  try{
    console.log("Connect to Peer .");
    await LightningClient.connectToPeer(pubkey, host, port);
    console.log("Connect to Peer √");
  } catch(e){
    console.log('Error: ', e)
    throw 'err at Peer';
  }

  let pubkeyArray = hexToUint8Array(pubkey);

  console.log("Connect to channel .");
  if (pubkey) {
    try{
      await LightningClient.createChannel(pubkeyArray, amount, 0, 1);
      console.log("Connect to channel √");
    } catch(e){
      console.log('Error: ', e)
      throw 'err at Channel';
    }
  }

  // res.send({ status: "success" });
});

router.post("/newPeer", (req, res) => {
  const { host, port, pubkey } = req.body;
  db.get(
    `SELECT * FROM peers WHERE host = ? AND port = ? AND pubkey = ?`,
    [host, port, pubkey],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: "Failed to query database" });
      } else if (row) {
        res.status(409).json({ error: "Peer already exists in the database" });
      } else {
        db.run(
          `INSERT INTO peers (host, port, pubkey) VALUES (?,?,?)`,
          [host, port, pubkey],
          (err) => {
            if (err) {
              res
                .status(500)
                .json({ error: "Failed to insert peers into database" });
            } else {
              res.status(201).json({ message: "Peer added to database" });
            }
          }
        );
      }
    }
  );
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
