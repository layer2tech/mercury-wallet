import request from "supertest";
import express from "express";
import router from "../src/routes/serverRoutes";
import LDKClientFactory from "../src/LDK/init/LDKClientFactory";
import { MOCK_DATA } from "./mocks/MockLightningClient";
import { jest, describe, expect, it, beforeAll } from "@jest/globals";

jest.mock("../src/LDK/utils/ldk-utils.ts", () => ({
  closeConnections: jest.fn(),
}));

describe("GET Routes", () => {
  let app: any;
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(router);
    await LDKClientFactory.createLDKClient("test");
  });

  it("GET /closeConnections should call the closeConnections function", async () => {
    const response = await request(app).get("/closeConnections");

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: "Connections closed" });
  });

  it("POST /generateInvoice", async () => {
    const response = await request(app).post("/generateInvoice").send({
      amount_in_sats: MOCK_DATA.AMOUNT, 
      invoice_expiry_secs: MOCK_DATA.INVOICE_EXPIRY_SECS, 
      description: ""
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ status: 200, invoice: MOCK_DATA.INVOICE });
  });

  it("POST /sendPayment", async () => {
    const response = await request(app).post("/sendPayment").send({
      invoice: MOCK_DATA.INVOICE,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ "message": "Payment successful" });
  });
});
