import request from 'supertest';
import express from 'express';
import router from '../src/routes/getRoutes';

jest.mock('../src/LDK/utils/ldk-utils.ts', () => ({
  closeConnections: jest.fn(),
}));

describe('GET Routes', () => {
  let app: any;
  beforeAll(async () => {
    app = express().use(router);
  });

  test('GET /getWalletId should return the wallet id for a given name', async () => {
    const response = await request(app).get('/getWalletId/Mainnet Wallet 1');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ wallet_id: 1 });
  });

  test('GET /getWalletId should return a 404 error if the wallet is not found', async () => {
    const response = await request(app).get('/getWalletId/nonexistent-wallet');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Wallet not found' });
  });

  test('GET /closeConnections should call the closeConnections function', async () => {
    const response = await request(app).get('/closeConnections');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: "Connections closed" });
  });
});
