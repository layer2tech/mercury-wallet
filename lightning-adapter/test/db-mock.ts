// to persist channels
import sqlite from "sqlite3";
const sqlite3 = sqlite.verbose();

const isDev = true;

const sampleDataPeersTable = [
  {
    node: "WalletOfSatoshi.com",
    host: "170.75.163.209",
    port: "9735",
    pubkey:
      "035e4ff418fc8b5554c5d9eea66396c227bd429a3251c8cbc711002ba215bfc226",
  },
  {
    node: "ACINQ",
    host: "3.33.236.230",
    port: "9735",
    pubkey:
      "03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f",
  },
  {
    node: "CoinGate",
    host: "3.124.63.44",
    port: "9735",
    pubkey:
      "0242a4ae0c5bef18048fbecf995094b74bfb0f7391418d71ed394784373f41e4f3",
  },
];

const sampleDataChannelsTable = [
  {
    name: "channel1",
    amount: 100000,
    push_msat: 444,
    public: true,
    wallet_name: "satoshi",
    peer_id: 1,
    privkey: "testprivkey1",
    txid: "testtxid1",
    vout: 0,
    paid: true,
    payment_address: "tb324524asda23asdsad234esdaxdasd12312311",
  },
  {
    name: "testChannel",
    amount: 100000,
    push_msat: 444,
    public: true,
    wallet_name: "ldk1",
    peer_id: 2,
    privkey: "testprivkey2",
    txid: "testtxid2",
    vout: 1,
    paid: false,
    payment_address: "tbdsfsdrererd12fdgdfg3123145asdsa23a1",
  },
  {
    name: "p2p",
    amount: 100000,
    push_msat: 444,
    public: false,
    wallet_name: "LDK3",
    peer_id: 3,
    privkey: "testprivkey3",
    txid: "testtxid3",
    vout: 2,
    paid: true,
    payment_address: "tb3245242sadsadwe3242sadasghgvh1",
  },
];

const sampleDataEventsTable = [
  {
    event_type: "Event_FundingGenerationReady",
    event_data: `Event_FundingGenerationReady {
      ptrs_to: [object Object],
      ptr: 4304647200,
      temporary_channel_id: 614d54affc469907359be53607ed79a51f13e5b6d745a40ec015639d1390e1a7,
      counterparty_node_id: 0227e0e3a9198601964d77a5b2d9a2b21ffff59a85a85031d61c6bb27b2ece2075,
      channel_value_satoshis: 100000,
      output_script: 0020c3e6cce8fdbb4cfedde222d6669255d44566e37a553d05c3b1b06a365b0a634a,
      user_channel_id: 1329227995784915872903807060280344576,
    }`,
    channel_id_hex: "614d54affc469907359be53607ed79a51f13e5b6d745a40ec015639d1390e1a7"
  },
  {
    event_type: "Event_ChannelPending",
    event_data: `Event_ChannelPending {
      ptrs_to: [object Object],
      ptr: 4304686320,
      channel_id: e8a6f2a4f7cc9a8952622542d660934e02dcfcfc088e59710c1a1a43bed3053d,
      user_channel_id: 1329227995784915872903807060280344576,
      former_temporary_channel_id: 614d54affc469907359be53607ed79a51f13e5b6d745a40ec015639d1390e1a7,
      counterparty_node_id: 0227e0e3a9198601964d77a5b2d9a2b21ffff59a85a85031d61c6bb27b2ece2075,
      funding_txo: [object Object],
    }`,
    channel_id_hex: "e8a6f2a4f7cc9a8952622542d660934e02dcfcfc088e59710c1a1a43bed3053d"
  }
];

// Connect/create the SQLite database
export const createMockDatabase = () => {
  return new Promise<sqlite.Database>((resolve, reject) => {
    const db = new sqlite3.Database("lightning-mock.db", async (err) => {
      if (err) {
        console.error(err.message);
      }
      console.log("[db-mock.ts]: Connected to/Created the SQLite database.");

      ////////////////////////////////////////////////////////////
      //////// peerlist table ////////////////////////////////////
      ////////////////////////////////////////////////////////////

      const createPeersTable = () => {
        return new Promise<void>((resolve, reject) => {
          const createPeersTableQuery = `CREATE TABLE IF NOT EXISTS peers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              node TEXT,
              pubkey TEXT NOT NULL,
              host TEXT NOT NULL,
              port INTEGER NOT NULL
          )`;
          db.run(createPeersTableQuery, (err) => {
            if (err) {
              console.error(err.message);
              reject(err);
            }
            console.log("[db-mock.ts]: Table 'peers' created or already exist");
            resolve();
          });
        });
      };

      const createChannelsTable = () => {
        return new Promise<void>((resolve, reject) => {
          // Create the 'channels' table if it doesn't exist
          const createChannelsTableQuery = `CREATE TABLE IF NOT EXISTS channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            amount REAL NOT NULL,
            push_msat INTEGER NOT NULL,
            public BOOL NOT NULL,
            wallet_name TEXT,
            peer_id INTEGER UNIQUE,
            privkey TEXT NOT NULL,
            txid TEXT,
            vout INTEGER,
            paid BOOL NOT NULL,
            payment_address TEXT,
            channel_id TEXT,
            FOREIGN KEY (peer_id) REFERENCES peer(id)
          )`;

          db.run(createChannelsTableQuery, (err) => {
            if (err) {
              console.error(err.message);
              reject(err);
            }
            console.log("[db-mock.ts]: Table 'channels' created or already exists");
            resolve();
          });
        });
      };

      // Create the 'events' table if it doesn't exist
      const createEventsTable = () => {
        return new Promise<void>((resolve, reject) => {
          const createEventsTable = `CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            event_data TEXT NOT NULL,
            channel_id_hex INTEGER NOT NULL,
            notification_seen BOOL NOT NULL DEFAULT 0
          )`;
          db.run(createEventsTable, (err) => {
            if (err) {
              console.error(err.message);
              reject(err);
            }
            console.log("[db-mock.ts]: Table 'events' created or already exist");
            resolve();
          });
        });
      };

      try {
        // Create tables sequentially using async/await
        await createPeersTable();
        await createChannelsTable();
        await createEventsTable();

        if (isDev) {
          // Insert some sample data into the 'peers' table if there's no data
          db.get("SELECT count(*) as count FROM peers", (err, row: any) => {
            if (err) {
              console.error(err.message);
            }
            if (row.count === 0) {
              console.log(
                "[db-mock.ts]: Inserting sample data for table peers ..."
              );
              
              const insertData = `INSERT INTO peers (node, host, port, pubkey) VALUES (?,?,?,?)`;
              sampleDataPeersTable.forEach((data) => {
                db.run(insertData, [
                  data.node,
                  data.host,
                  data.port,
                  data.pubkey,
                ]);
              });
            } else {
              console.log(
                "[db-mock.ts]: Table 'peers' already contains data, skipping the sample data insertion."
              );
            }
          });

          // Insert some sample data into the 'channels' table if there's no data
          db.get("SELECT count(*) as count FROM channels", (err, row: any) => {
            if (err) {
              console.error(err.message);
            }
            if (row.count === 0) {
              console.log(
                "[db-mock.ts]: Inserting sample data for table channels ..."
              );
              
              const insertData = `INSERT INTO channels (name, amount, push_msat, public, wallet_name, peer_id, privkey, txid, vout, paid, payment_address) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
              sampleDataChannelsTable.forEach((data) => {
                db.run(insertData, [
                  data.name,
                  data.amount,
                  data.push_msat,
                  data.public,
                  data.wallet_name,
                  data.peer_id,
                  data.privkey,
                  data.txid,
                  data.vout,
                  data.paid,
                  data.payment_address,
                ]);
              });
            } else {
              console.log(
                "[db-mock.ts]: Table 'channels' already contains data, skipping the sample data insertion."
              );
            }
          });

          // Insert some sample data into the 'events' table if there's no data
          db.get("SELECT count(*) as count FROM events", (err, row: any) => {
            if (err) {
              console.error(err.message);
            }
            if (row.count === 0) {
              console.log(
                "[db-mock.ts]: Inserting sample data for table events ..."
              );
              
              const insertData = `INSERT INTO events (event_type, event_data, channel_id_hex) VALUES (?,?,?)`;
              sampleDataEventsTable.forEach((data) => {
                db.run(insertData, [
                  data.event_type,
                  data.event_data,
                  data.channel_id_hex,
                ]);
              });
            } else {
              console.log(
                "[db-mock.ts]: Table 'events' already contains data, skipping the sample data insertion."
              );
            }
          });
          
        }

        console.log("[db-mock.ts]: Table creation complete");
        resolve(db);
      } catch (error) {
        console.error("Error creating tables:", error);
        reject(error);
      }
    });
  });
};
