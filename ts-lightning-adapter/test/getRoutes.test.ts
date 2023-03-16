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

  test('GET /closeConnections should call the closeConnections function', async () => {
    const response = await request(app).get('/closeConnections');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ message: "Connections closed" });
  });
});
