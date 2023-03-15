import request from "supertest";
import express from "express";
import router from "../src/routes/peerRoutes.js";

jest.mock("../src/LDK/init/importLDK", () => {
  return {
    getLDKClient: jest.fn().mockImplementation(() => {
      return {
        createPeerAndChannel: jest.fn().mockImplementation(() => {}),
        connectToPeer: jest.fn(() => {
          return true;
        }),
        openChannel: jest.fn().mockImplementation(() => {}),
      };
    }),
  };
});

jest.mock("../src/LDK/utils/ldk-utils", () => {
  return {
    createNewPeer: jest.fn(() => {
      return Promise.resolve({ status: 200, message: "Peer created" });
    }),
  };
});

describe("Peer Routes", () => {
  let app: any;
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(router);
  });

  it("POST peer/connectToPeer with valid parameters", async () => {
    const res = await request(app).post("peer/connectToPeer").send({
      pubkey:
        "028a822f5b0e4400d4a230dc619d13cc10f75ec6c277b495124d5bcb3ccbdaac54",
      host: "127.0.0.1",
      port: "9735",
    });
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe("Connected to peer");
  });

  it("POST peer/connectToPeer with missing parameters", async () => {
    const res = await request(app).post("peer/connectToPeer").send({});
    expect(res.statusCode).toBe(500);
    expect(res.text).toBe("Missing required parameters");
  });

  it("POST peer/create-channel", async () => {
    const res = await request(app).post("peer/create-channel").send({
      amount: 10000,
      pubkey: "abc",
      host: "127.0.0.1",
      port: 9735,
      channel_name: "test_channel",
      wallet_name: "test_wallet",
      channelType: "Public",
      privkey: "xyz",
      paid: true,
      payment_address: "payment_address",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Connected to peer, Channel created");
  });

  it("POST peer/open-channel", async () => {
    const response = await request(app).post("peer/open-channel").send({
      amount: 10000,
      paid: true,
      txid: "txid",
      vout: 0,
      addr: "address",
      pubkey: "pubkey",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Channel opened" });
  });

  it("POST peer/newPeer", async () => {
    const response = await request(app).post("peer/newPeer").send({
      host: "127.0.0.1",
      port: "9735",
      pubkey:
        "028a822f5b0e4400d4a230dc619d13cc10f75ec6c277b495124d5bcb3ccbdaac54",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 200, message: "Peer created" });
  });

  it("GET peer/getPeer returns a peer if found", async () => {
    const response = await request(app).get("peer/getPeer/1");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("node");
    expect(response.body).toHaveProperty("host");
    expect(response.body).toHaveProperty("port");
    expect(response.body).toHaveProperty("pubkey");
  });

  it("GET peer/getPeer returns 404 if peer is not found", async () => {
    const response = await request(app).get("peer/getPeer/not-found");

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: "Peer not found" });
  });
});
